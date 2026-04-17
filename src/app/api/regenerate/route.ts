/**
 * POST /api/regenerate
 *
 * Runs the full Tier 2 regeneration for a contact:
 * 1. Fetches all interactions for the contact
 * 2. Calls GPT-4o with the full log
 * 3. Validates output for hallucinations
 * 4. Writes updated metadata + sections back to Supabase
 *
 * Body: { contact_id: string }
 * Returns: { success: boolean, validationErrors?: string[], estimatedCostUsd: number }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runTier2 } from "@/lib/ai/regenerate";
import type { Interaction } from "@/types/interaction";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
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

  // Verify the contact belongs to the user (RLS would also catch this)
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", contact_id)
    .eq("owner_id", user.id)
    .single();

  if (contactError || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Fetch all interactions for this contact
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

  // Run Tier 2 regeneration
  let result;
  try {
    result = await runTier2(interactions);
  } catch (err) {
    console.error("[regenerate] AI call failed:", err);
    return NextResponse.json({ error: "AI regeneration failed" }, { status: 502 });
  }

  const { output, validation, estimatedCostUsd } = result;

  // Log validation warnings — don't block on them but report
  if (!validation.valid) {
    console.warn("[regenerate] Validation warnings for contact", contact_id, validation.errors);
  }

  // Write metadata to contacts table
  const { metadata, metadata_sources } = output;
  if (Object.keys(metadata).length > 0) {
    const { error: metaError } = await supabase
      .from("contacts")
      .update({
        ...metadata,
        updated_at: new Date().toISOString(),
      })
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

  // Update last_interaction_at via helper function
  await supabase.rpc("touch_contact", { p_contact_id: contact_id });

  // Fetch the updated contact + sections to return to the client
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
    validationErrors: validation.valid ? undefined : validation.errors,
    estimatedCostUsd,
    metadata_sources,
    // Return updated data so the client can refresh its cache
    contact: updatedContact,
    sections: updatedSections ?? [],
  });
}
