/**
 * GET /api/contacts/:id
 *
 * Returns a single contact by ID, verifying ownership via owner_id.
 *
 * Returns: { contact: Contact }
 *
 * ---
 *
 * PATCH /api/contacts/:id
 *
 * Partial update of mutable contact metadata fields.
 * AI-generated fields should be updated via /api/regenerate instead.
 *
 * Body: Partial<Contact> (only identity + pipeline fields accepted)
 *
 * Returns: { contact: Contact }
 *
 * ---
 *
 * DELETE /api/contacts/:id
 *
 * Deletes a contact and all associated interactions + sections (CASCADE).
 *
 * Returns: { success: true }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Fields that callers are allowed to PATCH directly (not AI-managed)
const PATCHABLE_FIELDS = new Set([
  "name",
  "title",
  "company",
  "email",
  "phone",
  "linkedin_url",
  "location",
  "stage",
  "importance",
  "tags",
  "source",
  "next_followup_at",
  "followup_reason",
  "deal_value",
  "deal_currency",
  "deal_probability",
  "expected_close_date",
]);

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json({ contact: data });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Strip any fields callers shouldn't update directly
  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (PATCHABLE_FIELDS.has(key)) {
      update[key] = value;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No patchable fields provided" }, { status: 400 });
  }

  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("contacts")
    .update(update)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error || !data) {
    console.error("[contacts PATCH]", error);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }

  return NextResponse.json({ contact: data });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership first
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const { error } = await supabase.from("contacts").delete().eq("id", id);

  if (error) {
    console.error("[contacts DELETE]", error);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
