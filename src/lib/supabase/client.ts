/**
 * Browser-side Supabase client — safe to import in Client Components.
 *
 * Uses @supabase/ssr createBrowserClient so cookies are managed automatically.
 * In Phase 1 (no real Supabase) this file can be imported but not actually called.
 *
 * @example
 * "use client";
 * import { createClient } from "@/lib/supabase/client";
 * const supabase = createClient();
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
