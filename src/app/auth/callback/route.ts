/**
 * Supabase Auth callback route.
 *
 * Handles:
 * - Email confirmation links (magic link / email OTP)
 * - OAuth redirects (Google, LinkedIn — Phase 2+)
 *
 * After exchanging the code for a session, redirects to the "next" param
 * (set by middleware when redirecting to /login) or /home.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect to the originally-requested page (or /home)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — redirect to login with an error indicator
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
