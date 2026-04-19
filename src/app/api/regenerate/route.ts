/**
 * POST /api/regenerate
 *
 * Runs the full Tier 2 regeneration for a contact:
 * 1. Fetches all interactions for the contact
 * 2. Calls GPT-4o with the full log
 * 3. Validates output — aborts if validation fails (H2 fix)
 * 4. Writes updated metadata (non-null AI values only, H1 fix) + sections
 *
 * Body: { contact_id: string }
 * Returns: { success: boolean, validationErrors?: string[], estimatedCostUsd: number }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runTier2 } from "@/lib/ai/regenerate";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import type { Interaction } from "@/types/interaction";
import type { Database } from "@/types/database";

type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];

/**
 * Fields that users can edit directly in ContactEditSheet.
 * AI regeneration must NEVER overwrite these with null/undefined —
 * user-entered values are not captured in any interaction and would be
 * permanently lost. AI may update these only when it has a non-null value.
 */
const USER_OWNED_FIELDS = new Set([
  "name", "email", "phone", "linkedin_url", "title", "company", "location",
  "stage", "importance", "next_followup_at", "followup_reason", "tags",
]);

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: max 5 full regenerations per minute per user
  const rl = checkRateLimit("regenerate", user.id, { maxRequests: 5, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  let body: { contact_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { contact_id } = body;
  if (!contact_id) {
    return NextResponse.json({ error: "contact_id is required" }, { status: 400 });
  }

  // Verify ownership (RLS also catches this, but explicit is better)
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", contact_id)
    .eq("owner_id", user.id)
    .single();

  if (contactError || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const { data: interactionRows, error: fetchError } = await supabase
    .from("interactions")
    .select("*")
    .eq("contact_id", contact_id)
    .order("created_at", { ascending: true });

  if (fetchError) {
    return NextResponse.json({ error: "Failed to fetch interactions" }, { status: 500 });
  }

  const interactions = (interactionRows ?? []) as Interaction[];

  if (interactions.length === 0) {
    return NextResponse.json({ error: "No interactions to regenerate from" }, { status: 422 });
  }

  let result;
  try {
    result = await runTier2(interactions);
  } catch (err) {
    console.error("[regenerate] AI call failed:", err);
    return NextResponse.json({ error: "AI regeneration failed" }, { status: 502 });
  }

  const { output, validation, estimatedCostUsd } = result;

  // H2 fix: if validation fails, refuse to persist — the AI output cites phantom
  // interaction IDs or contains unsourced fields, which means we can't trust it.
  if (!validation.valid) {
    console.warn("[regenerate] Validation failed for contact", contact_id, validation.errors);
    return NextResponse.json(
      {
        success: false,
        validationErrors: validation.errors,
        estimatedCostUsd,
        message: "AI output failed validation — not persisted",
      },
      { status: 422 },
    );
  }

  // H1 fix: build the metadata update with only non-null values.
  // For user-owned fields, never write null (it would erase data the user typed
  // in ContactEditSheet that isn't captured in any interaction).
  // For AI-only fields (ai_summary, relationship_score, etc.), allow them to be
  // set/updated freely since they are 100% AI-derived.
  const { metadata, metadata_sources } = output;
  const { interactions: _i, sections: _s, ...rawMeta } = metadata as {
    interactions?: unknown;
    sections?: unknown;
    [key: string]: unknown;
  };

  const dbMetadata: ContactUpdate = {};
  for (const [key, value] of Object.entries(rawMeta)) {
    if (value === null || value === undefined) {
      // Never write null for user-owned fields
      if (USER_OWNED_FIELDS.has(key)) continue;
    }
    if (value !== undefined) {
      (dbMetadata as Record<string, unknown>)[key] = value;
    }
  }

  if (Object.keys(dbMetadata).length > 0) {
    dbMetadata.updated_at = new Date().toISOString();
    const { error: metaError } = await supabase
      .from("contacts")
      .update(dbMetadata)
      .eq("id", contact_id);

    if (metaError) {
      console.error("[regenerate] Failed to write metadata:", metaError);
    }
  }

  // Upsert sections
  const sectionErrors: string[] = [];
  for (const section of output.sections) {
    const { error: sectionError } = await supabase.from("sections").upsert(
      {
        contact_id,
        slug: section.slug,
        title: section.title,
        content_md: section.content_md,
        summary: section.summary ?? null,
        source_interaction_ids: section.source_interaction_ids ?? [],
        regenerated_at: new Date().toISOString(),
        interaction_count: interactions.length,
      },
      { onConflict: "contact_id,slug" },
    );

    if (sectionError) {
      sectionErrors.push(`section ${section.slug}: ${sectionError.message}`);
    }
  }

  await supabase.rpc("touch_contact", { p_contact_id: contact_id });

  const [{ data: updatedContact }, { data: updatedSections }] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", contact_id).single(),
    supabase
      .from("sections")
      .select("*")
      .eq("contact_id", contact_id)
      .order("slug", { ascending: true }),
  ]);

  return NextResponse.json({
    success: sectionErrors.length === 0,
    sectionErrors: sectionErrors.length > 0 ? sectionErrors : undefined,
    estimatedCostUsd,
    metadata_sources,
    contact: updatedContact,
    sections: updatedSections ?? [],
  });
}
