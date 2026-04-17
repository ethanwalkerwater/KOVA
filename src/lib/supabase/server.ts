/**
 * Server-side Supabase client — for Server Components, Route Handlers, and Server Actions.
 *
 * Uses @supabase/ssr createServerClient with Next.js cookie access.
 * Must only be called in server contexts (not Client Components).
 *
 * @example
 * // In a Server Component or Route Handler:
 * import { createClient } from "@/lib/supabase/server";
 * const supabase = await createClient();
 * const { data } = await supabase.from("contacts").select("*");
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — cookies can't be set here.
            // This is fine if you have middleware refreshing user sessions.
          }
        },
      },
    },
  );
}

/**
 * Service-role client — bypasses RLS. Only use in trusted server code.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
 */
export async function createServiceClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // no-op in Server Components
          }
        },
      },
    },
  );
}
