/**
 * POST /api/interactions
 *
 * Appends a new interaction for an existing contact, then triggers
 * Tier 1 AI regeneration (cheap, fast — updates 5 metadata fields).
 *
 * Tier 2 (full regeneration) is triggered separately via a debounce
 * mechanism (see docs/architecture/ai-regeneration.md).
 *
 * Body: {
 *   contact_id: string,
 *   type: InteractionType,
 *   raw_content: string,
 *   source_context?: string,
 *   media_url?: string,
 * }
 *
 * Returns: {
 *   interaction: Interaction,
 *   tier1: { output, validation, estimatedCostUsd } | null,
 * }
 *
 * ---
 *
 * GET /api/interactions?contact_id=xxx
 *
 * Returns all interactions for a contact (newest first).
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runTier1 } from "@/lib/ai/regenerate";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import type { Interaction, InteractionType } from "@/types/interaction";
import type { Database } from "@/types/database";

type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];

const VALID_TYPES: InteractionType[] = [
  "voice_memo",
  "text_note",
  "photo",
  "meeting_note",
  "email_snippet",
  "ai_research",
  "followup_done",
  "followup_skipped",
  "card_scan",
  "import",
];

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: max 60 interactions per hour per user (Tier 1 GPT on each)
  const rl = checkRateLimit("interactions", user.id, { maxRequests: 60, windowMs: 60 * 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  let body: {
    contact_id?: string;
    type?: string;
    raw_content?: string;
    source_context?: string;
    media_url?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { contact_id, type, raw_content, source_context, media_url } = body;

  if (!contact_id || !type || !raw_content?.trim()) {
    return NextResponse.json(
      { error: "contact_id, type, and raw_content are required" },
      { status: 400 },
    );
  }

  if (raw_content.length > 50_000) {
    return NextResponse.json(
      { error: "raw_content too large (max 50,000 chars)" },
      { status: 413 },
    );
  }

  if (!VALID_TYPES.includes(type as InteractionType)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  // Verify the contact belongs to the user; also fetch last_tier1_at for debounce check.
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id, last_tier1_at, tier1_count")
    .eq("id", contact_id)
    .eq("owner_id", user.id)
    .single();

  if (contactError || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Insert the new interaction (append-only — never update)
  const { data: inserted, error: insertError } = await supabase
    .from("interactions")
    .insert({
      contact_id,
      owner_id: user.id,
      type: type as InteractionType,
      raw_content: raw_content.trim(),
      source_context: source_context ?? null,
      media_url: media_url ?? null,
      ai_generated: false,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    console.error("[interactions] Insert failed:", insertError);
    return NextResponse.json({ error: "Failed to save interaction" }, { status: 500 });
  }

  const interaction = inserted as Interaction;

  // Always stamp last_interaction_at; apply Tier 1 metadata on top if available.
  // Special handling for follow-up lifecycle interactions.
  const contactUpdate = {
    last_interaction_at: interaction.created_at,
  } as ContactUpdate;

  if (type === "followup_done") {
    // Clear the follow-up so the contact doesn't re-appear in tomorrow's list
    contactUpdate.next_followup_at = null;
    contactUpdate.followup_reason = null;
  } else if (type === "followup_skipped") {
    // Defer by 7 days
    const deferred = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    contactUpdate.next_followup_at = deferred.toISOString();
  }

  // Tier 1 debounce — if Tier 1 ran within the last 10 seconds for this contact,
  // skip it to avoid redundant AI calls during rapid interaction bursts (e.g. at
  // an event, scanning 5 cards in quick succession). The interaction is still
  // saved; the next non-debounced call or manual regeneration will pick it up.
  const TIER1_DEBOUNCE_MS = 10_000;
  const lastTier1 = contact?.last_tier1_at ? new Date(contact.last_tier1_at).getTime() : 0;
  const tier1Debounced = Date.now() - lastTier1 < TIER1_DEBOUNCE_MS;

  let tier1Result = null;
  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY);

  if (openAiConfigured && !tier1Debounced) {
    try {
      tier1Result = await runTier1(interaction);

      if (tier1Result.output && tier1Result.validation.valid) {
        const { output } = tier1Result;

        if (output.ai_summary) contactUpdate.ai_summary = output.ai_summary.value;
        if (output.relationship_score)
          contactUpdate.relationship_score = output.relationship_score.value;
        if (output.suggested_next_step)
          contactUpdate.suggested_next_step = output.suggested_next_step.value;
        if (output.stage_update) contactUpdate.stage = output.stage_update.value;
        if (output.key_topics) {
          // Merge with existing topics (dedup)
          const { data: existing } = await supabase
            .from("contacts")
            .select("key_topics")
            .eq("id", contact_id)
            .single();

          contactUpdate.key_topics = Array.from(
            new Set([...(existing?.key_topics ?? []), ...output.key_topics.value]),
          );
        }
      }
      // Stamp Tier 1 timestamp + increment counter for debounce tracking
      contactUpdate.last_tier1_at = new Date().toISOString();
      contactUpdate.tier1_count = ((contact?.tier1_count ?? 0) + 1);
    } catch (err) {
      console.error("[interactions] Tier 1 failed (non-fatal):", err);
    }
  }

  await supabase.from("contacts").update(contactUpdate).eq("id", contact_id);

  // Return the updated metadata fields so the client can patch the store
  // without a full page reload. Only include fields that were actually updated.
  const updatedContactFields = { ...contactUpdate };

  return NextResponse.json({
    interaction,
    contact_update: updatedContactFields,
    tier1: tier1Result
      ? {
          output: tier1Result.output,
          validation: tier1Result.validation,
          estimatedCostUsd: tier1Result.estimatedCostUsd,
        }
      : null,
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contactId = request.nextUrl.searchParams.get("contact_id");
  if (!contactId) {
    return NextResponse.json({ error: "contact_id query param is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .eq("contact_id", contactId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch interactions" }, { status: 500 });
  }

  return NextResponse.json({ interactions: data ?? [] });
}
