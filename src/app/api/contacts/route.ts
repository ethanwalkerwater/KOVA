/**
 * GET /api/contacts
 *
 * Returns the current user's contacts with optional filtering/sorting.
 *
 * Query params:
 * - q: full-text search across name/company/title/ai_summary AND section content_md
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
import { runTier1, runParseContact } from "@/lib/ai/regenerate";
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

  // Rate limit: 200 contact list fetches per hour (search/filter triggers this)
  const rlGet = checkRateLimit("contacts_list", user.id, { maxRequests: 200, windowMs: 60 * 60_000 });
  if (!rlGet.allowed) return rateLimitResponse(rlGet.retryAfterMs);

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const stage = searchParams.get("stage");
  const importance = searchParams.get("importance");
  const sort = searchParams.get("sort") ?? "last_interaction_at";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const validSorts = ["last_interaction_at", "relationship_score", "name", "created_at"];
  const safeSort = validSorts.includes(sort) ? sort : "last_interaction_at";

  // When a search query is present, gather extra contact IDs from section content
  // so searches like "cloud migration" or "budget approved" surface the right contacts.
  let sectionMatchIds: string[] = [];
  if (q.trim()) {
    const safe = q.trim().replace(/[%_]/g, "\\$&");
    const { data: sectionMatches } = await supabase
      .from("sections")
      .select("contact_id")
      .or(`content_md.ilike.%${safe}%,summary.ilike.%${safe}%`)
      // Only sections owned by this user (via the contact foreign key)
      .in(
        "contact_id",
        supabase
          .from("contacts")
          .select("id")
          .eq("owner_id", user.id) as unknown as string[],
      );
    sectionMatchIds = [...new Set((sectionMatches ?? []).map((r) => r.contact_id as string))];
  }

  let query = supabase.from("contacts").select("*").eq("owner_id", user.id);

  // Full-text search — ilike across contact fields + section content.
  // NOTE: textSearch() requires a stored tsvector column; the contacts_search_idx
  // is a GIN index on a computed expression, not a column — so textSearch() breaks
  // at runtime. ilike is correct at MVP scale; add a generated search_vector column
  // and switch to an RPC with websearch_to_tsquery for large datasets.
  if (q.trim()) {
    const safe = q.trim().replace(/[%_]/g, "\\$&"); // escape ilike wildcards

    const orClauses = [
      `name.ilike.%${safe}%`,
      `company.ilike.%${safe}%`,
      `title.ilike.%${safe}%`,
      `ai_summary.ilike.%${safe}%`,
    ];

    if (sectionMatchIds.length > 0) {
      // PostgREST .or() syntax for `id IN (...)`: id.in.(uuid1,uuid2,...)
      orClauses.push(`id.in.(${sectionMatchIds.join(",")})`);
    }

    query = query.or(orClauses.join(","));
  }

  if (stage) query = query.eq("stage", stage);
  if (importance) query = query.eq("importance", importance);

  query = query.order(safeSort, { ascending: safeSort === "name", nullsFirst: false });
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error("[contacts GET]", error);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }

  return NextResponse.json({ contacts: data ?? [], total: data?.length ?? 0 });
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

  if (!raw_content?.trim()) {
    return NextResponse.json({ error: "raw_content is required" }, { status: 400 });
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

  // Resolve contact name — either from the request body or AI-extracted from the note.
  let resolvedName = name?.trim() ?? "";
  let extractedTitle: string | null = null;
  let extractedCompany: string | null = null;
  let extractedEmail: string | null = null;
  let extractedPhone: string | null = null;
  let extractedContext: string | null = source_context?.trim() ?? null;

  if (!resolvedName && process.env.OPENAI_API_KEY) {
    const parsed = await runParseContact(raw_content.trim());
    if (parsed?.name) {
      resolvedName = parsed.name;
      extractedTitle = parsed.title;
      extractedCompany = parsed.company;
      extractedEmail = parsed.email;
      extractedPhone = parsed.phone;
      // Use AI-extracted context only if the caller didn't supply one
      if (!extractedContext) extractedContext = parsed.source_context;
    }
  }

  if (!resolvedName) {
    return NextResponse.json(
      { error: "Could not determine contact name. Please provide a name or mention it in your note." },
      { status: 400 },
    );
  }

  // Create the contact — seed with any identity fields extracted by AI
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .insert({
      owner_id: user.id,
      name: resolvedName,
      ...(extractedTitle && { title: extractedTitle }),
      ...(extractedCompany && { company: extractedCompany }),
      ...(extractedEmail && { email: extractedEmail }),
      ...(extractedPhone && { phone: extractedPhone }),
    })
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
      source_context: extractedContext,
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
  // Always stamp last_interaction_at; additionally apply Tier 1 metadata if available.
  const contactUpdate: ContactUpdate = {
    last_interaction_at: interaction.created_at,
    updated_at: new Date().toISOString(),
  };

  if (process.env.OPENAI_API_KEY) {
    try {
      tier1Result = await runTier1(interaction as Interaction);

      if (tier1Result.output && tier1Result.validation.valid) {
        const { output } = tier1Result;
        if (output.ai_summary?.value) contactUpdate.ai_summary = output.ai_summary.value;
        if (output.relationship_score?.value != null)
          contactUpdate.relationship_score = output.relationship_score.value;
        if (output.suggested_next_step?.value)
          contactUpdate.suggested_next_step = output.suggested_next_step.value;
        if (output.stage_update?.value)
          contactUpdate.stage = output.stage_update.value as ContactUpdate["stage"];
        if (output.key_topics?.value?.length)
          contactUpdate.key_topics = output.key_topics.value;
      }
    } catch (err) {
      console.warn("[contacts POST] Tier 1 failed (non-fatal):", err);
    }
  }

  await supabase.from("contacts").update(contactUpdate).eq("id", contact.id);

  // Return contact_update alongside the base contact so the client can apply
  // Tier 1 results without a second round-trip (same pattern as interactions POST).
  return NextResponse.json(
    { contact, interaction, contact_update: contactUpdate, tier1: tier1Result },
    { status: 201 },
  );
}
