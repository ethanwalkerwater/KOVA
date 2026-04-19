/**
 * GET /api/contacts
 *
 * Returns the current user's contacts with optional filtering/sorting.
 *
 * Query params:
 * - q: full-text search query (ilike across name/company/title/ai_summary)
 * - stage: filter by pipeline stage
 * - importance: filter by importance
 * - sort: 'last_interaction_at' | 'relationship_score' | 'name' | 'created_at' (default: last_interaction_at)
 * - limit: number (default 50)
 * - offset: number (default 0)
 *
 * POST /api/contacts
 *
 * Creates a new contact with an initial interaction, then runs Tier 1
 * regeneration inline (fast metadata extraction). No background HTTP call.
 *
 * Body: { name: string, raw_content: string, type: InteractionType, source_context?: string }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runTier1 } from "@/lib/ai/regenerate";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import type { Interaction, InteractionType } from "@/types/interaction";
import type { Database } from "@/types/database";

type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];

const VALID_TYPES: InteractionType[] = [
  "voice_memo", "text_note", "photo", "meeting_note", "email_snippet",
  "ai_research", "followup_done", "followup_skipped", "card_scan", "import",
];

const MAX_RAW_CONTENT = 50_000; // ~50 KB

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const stage = searchParams.get("stage");
  const importance = searchParams.get("importance");
  const sort = searchParams.get("sort") ?? "last_interaction_at";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  let query = supabase.from("contacts").select("*").eq("owner_id", user.id);

  // Full-text search — ilike across key columns.
  // NOTE: textSearch() requires a stored tsvector column; the contacts_search_idx
  // is a GIN index on a computed expression, not a column — so textSearch() breaks
  // at runtime. ilike is correct at MVP scale; add a generated search_vector column
  // and switch to an RPC with websearch_to_tsquery for large datasets.
  if (q.trim()) {
    const safe = q.trim().replace(/[%_]/g, "\\$&"); // escape ilike wildcards
    query = query.or(
      `name.ilike.%${safe}%,company.ilike.%${safe}%,title.ilike.%${safe}%,ai_summary.ilike.%${safe}%`,
    );
  }

  if (stage) query = query.eq("stage", stage);
  if (importance) query = query.eq("importance", importance);

  const validSorts = ["last_interaction_at", "relationship_score", "name", "created_at"];
  const safeSort = validSorts.includes(sort) ? sort : "last_interaction_at";
  query = query.order(safeSort, { ascending: safeSort === "name", nullsFirst: false });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("[contacts GET]", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }

  return NextResponse.json({ contacts: data ?? [], total: count ?? 0 });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate-limit new contact creation (includes inline Tier 1 GPT call)
  const rl = checkRateLimit("contacts:create", user.id, { maxRequests: 20, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  let body: {
    name?: string;
    raw_content?: string;
    type?: string;
    source_context?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, raw_content, type = "text_note", source_context } = body;

  if (!name?.trim() || !raw_content?.trim()) {
    return NextResponse.json({ error: "name and raw_content are required" }, { status: 400 });
  }

  if (raw_content.length > MAX_RAW_CONTENT) {
    return NextResponse.json(
      { error: `raw_content too large (max ${MAX_RAW_CONTENT} chars)` },
      { status: 413 },
    );
  }

  if (!VALID_TYPES.includes(type as InteractionType)) {
    return NextResponse.json({ error: `Invalid interaction type: ${type}` }, { status: 400 });
  }

  // Create the contact
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .insert({ owner_id: user.id, name: name.trim() })
    .select()
    .single();

  if (contactError || !contact) {
    console.error("[contacts POST] Failed to create contact:", contactError);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }

  // Create the first interaction
  const { data: interaction, error: interactionError } = await supabase
    .from("interactions")
    .insert({
      contact_id: contact.id,
      owner_id: user.id,
      type: type as InteractionType,
      raw_content: raw_content.trim(),
      source_context: source_context ?? null,
      ai_generated: false,
    })
    .select()
    .single();

  if (interactionError || !interaction) {
    console.error("[contacts POST] Failed to create interaction:", interactionError);
    // Delete the orphaned contact to maintain the invariant:
    // every contact must have ≥1 interaction.
    await supabase.from("contacts").delete().eq("id", contact.id);
    return NextResponse.json({ error: "Failed to create interaction" }, { status: 500 });
  }

  // Run Tier 1 inline — cheap, fast, single-interaction metadata extraction.
  // Tier 2 (full sections regeneration) is triggered by the client's Regenerate
  // button, or automatically once the contact accumulates more interactions.
  let tier1Result = null;
  if (process.env.OPENAI_API_KEY) {
    try {
      tier1Result = await runTier1(interaction as Interaction);

      if (tier1Result.output && tier1Result.validation.valid) {
        const { output } = tier1Result;
        const update: ContactUpdate = {};

        // Tier1Output fields: ai_summary, relationship_score, suggested_next_step,
        // stage_update (rename → stage), key_topics
        if (output.ai_summary?.value) update.ai_summary = output.ai_summary.value;
        if (output.relationship_score?.value != null)
          update.relationship_score = output.relationship_score.value;
        if (output.suggested_next_step?.value)
          update.suggested_next_step = output.suggested_next_step.value;
        if (output.stage_update?.value)
          update.stage = output.stage_update.value as ContactUpdate["stage"];
        if (output.key_topics?.value?.length) update.key_topics = output.key_topics.value;

        if (Object.keys(update).length > 0) {
          update.updated_at = new Date().toISOString();
          await supabase.from("contacts").update(update).eq("id", contact.id);
        }
      }
    } catch (err) {
      console.warn("[contacts POST] Tier 1 failed (non-fatal):", err);
    }
  }

  return NextResponse.json({ contact, interaction, tier1: tier1Result }, { status: 201 });
}
