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

  // Verify the contact belongs to the user
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id")
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

  // Run Tier 1 regeneration (non-blocking best-effort)
  // In production this should be a background job / edge function.
  // For Phase 2 we run it inline but don't fail the request if it errors.
  let tier1Result = null;
  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY);

  if (openAiConfigured) {
    try {
      tier1Result = await runTier1(interaction);

      // Apply non-null Tier 1 output to the contact
      if (tier1Result.output && tier1Result.validation.valid) {
        const { output } = tier1Result;
        const update = {} as ContactUpdate;

        if (output.ai_summary) update.ai_summary = output.ai_summary.value;
        if (output.relationship_score) update.relationship_score = output.relationship_score.value;
        if (output.suggested_next_step)
          update.suggested_next_step = output.suggested_next_step.value;
        if (output.stage_update) update.stage = output.stage_update.value;
        if (output.key_topics) {
          // Merge with existing topics (dedup)
          const { data: existing } = await supabase
            .from("contacts")
            .select("key_topics")
            .eq("id", contact_id)
            .single();

          const merged = Array.from(
            new Set([...(existing?.key_topics ?? []), ...output.key_topics.value]),
          );
          update.key_topics = merged;
        }

        if (Object.keys(update).length > 0) {
          update.last_interaction_at = interaction.created_at;
          await supabase.from("contacts").update(update).eq("id", contact_id);
        }
      }
    } catch (err) {
      console.error("[interactions] Tier 1 failed (non-fatal):", err);
    }
  }

  return NextResponse.json({
    interaction,
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
