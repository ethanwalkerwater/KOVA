/**
 * GET /api/contacts
 *
 * Returns the current user's contacts with optional filtering/sorting.
 *
 * Query params:
 * - q: full-text search query
 * - stage: filter by pipeline stage
 * - importance: filter by importance
 * - sort: 'last_interaction_at' | 'relationship_score' | 'name' | 'created_at' (default: last_interaction_at)
 * - limit: number (default 50)
 * - offset: number (default 0)
 *
 * POST /api/contacts
 *
 * Creates a new contact with an initial interaction.
 * Body: { name: string, raw_content: string, type: InteractionType, source_context?: string }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { InteractionType } from "@/types/interaction";

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

  // Full-text search across name/company/ai_summary/key_topics
  if (q.trim()) {
    query = query.textSearch("name,company,title,ai_summary", q.trim().split(/\s+/).join(" & "), {
      type: "websearch",
    });
  }

  // Stage filter
  if (stage) {
    query = query.eq("stage", stage);
  }

  // Importance filter
  if (importance) {
    query = query.eq("importance", importance);
  }

  // Sorting
  const validSorts = ["last_interaction_at", "relationship_score", "name", "created_at"];
  const safeSort = validSorts.includes(sort) ? sort : "last_interaction_at";
  query = query.order(safeSort, { ascending: safeSort === "name", nullsFirst: false });

  // Pagination
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

  // Create the contact first
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .insert({
      owner_id: user.id,
      name: name.trim(),
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
      source_context: source_context ?? null,
      ai_generated: false,
    })
    .select()
    .single();

  if (interactionError) {
    console.error("[contacts POST] Failed to create interaction:", interactionError);
    // Contact was created — return it even if interaction failed
    return NextResponse.json({ contact, interaction: null }, { status: 207 });
  }

  // Trigger Tier 2 regeneration (inline for now — background job in production)
  const origin = request.nextUrl.origin;
  fetch(`${origin}/api/regenerate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Forward cookies for auth in the same session
      Cookie: request.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ contact_id: contact.id }),
  }).catch((err) => {
    console.warn("[contacts POST] Background regeneration failed:", err);
  });

  return NextResponse.json({ contact, interaction }, { status: 201 });
}
