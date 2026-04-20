/**
 * GET /api/sections?contact_id=xxx
 *
 * Returns all AI-generated sections for a contact.
 * Verifies contact ownership before returning.
 *
 * Returns: { sections: Section[] }
 *
 * ---
 *
 * PATCH /api/sections/:id
 * (see /api/sections/[id]/route.ts)
 *
 * Updates a section's content_md — used for user overrides.
 * To fully regenerate, use POST /api/regenerate instead.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 300 section reads per hour per user (cheap DB query)
  const rl = checkRateLimit("sections_read", user.id, { maxRequests: 300, windowMs: 60 * 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const contactId = request.nextUrl.searchParams.get("contact_id");
  if (!contactId) {
    return NextResponse.json({ error: "contact_id query param is required" }, { status: 400 });
  }

  // Verify the contact belongs to the user
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .eq("owner_id", user.id)
    .single();

  if (contactError || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .eq("contact_id", contactId)
    .order("regenerated_at", { ascending: false });

  if (error) {
    console.error("[sections GET]", error);
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }

  return NextResponse.json({ sections: data ?? [] });
}
