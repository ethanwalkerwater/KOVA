/**
 * Next.js Middleware — refreshes Supabase Auth session on every request.
 *
 * This is the recommended @supabase/ssr pattern for Next.js App Router.
 * It ensures:
 * 1. The session cookie is refreshed before it expires.
 * 2. Unauthenticated requests to protected routes are redirected to /login.
 * 3. Authenticated requests to /login are redirected to /home.
 *
 * Protected routes: everything under /(main)/ — i.e., /home, /clients, /leads, /me
 * Public routes: /login, /auth/callback, static assets
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/auth/callback", "/reset-password"];
// Routes that authenticated users should not see (redirect → /home)
const AUTH_ONLY_ROUTES = ["/login"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Only run auth logic if Supabase is configured (Phase 2+).
  // In Phase 1 (no env vars), skip auth entirely.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Phase 1: no auth, pass through
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh the session (important — do not remove)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some((r) => pathname.startsWith(r));

  // Redirect authenticated users away from login
  if (user && isAuthOnlyRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  // Redirect unauthenticated users to login for protected routes
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder files (icons/)
     * - /api/* routes — each API handler does its own auth check and returns
     *   JSON 401; middleware would return an HTML 307 redirect instead, which
     *   breaks every fetch() caller. Session refresh for API routes isn't needed
     *   because the Supabase client re-reads the cookie on each server request.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|icons/|api/).*)",
  ],
};
