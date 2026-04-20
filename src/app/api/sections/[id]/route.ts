/**
 * PATCH /api/sections/:id
 *
 * Updates a section — used exclusively for user overrides.
 * Only `user_overrides_md` and `override_reason` are patchable via this route.
 * To regenerate the AI content, use POST /api/regenerate instead.
 *
 * Body: {
 *   user_overrides_md: string | null,  -- null clears the override (restores AI version)
 *   override_reason?: string | null,
 * }
 *
 * Returns: { section: Section }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import type { Database } from "@/types/database";

type SectionUpdate = Database["public"]["Tables"]["sections"]["Update"];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 100 section overrides per hour per user
  const rl = checkRateLimit("sections_patch", user.id, { maxRequests: 100, windowMs: 60 * 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  let body: { user_overrides_md?: string | null; override_reason?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Verify the section belongs to a contact owned by this user
  const { data: existing, error: fetchError } = await supabase
    .from("sections")
    .select("id, contact_id")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  // Ownership check via contacts table
  const { data: contact, error: ownerError } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", existing.contact_id)
    .eq("owner_id", user.id)
    .single();

  if (ownerError || !contact) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const update: SectionUpdate = {};

  // Only allow override fields to be patched here
  if ("user_overrides_md" in body) {
    update.user_overrides_md = body.user_overrides_md ?? null;
    // Set or clear override timestamp
    update.overridden_at = body.user_overrides_md ? new Date().toISOString() : null;
  }
  if ("override_reason" in body) {
    update.override_reason = body.override_reason ?? null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No patchable fields provided" }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("sections")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (updateError || !updated) {
    console.error("[sections PATCH]", updateError);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }

  return NextResponse.json({ section: updated });
}
