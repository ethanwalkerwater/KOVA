/**
 * Returns true when Supabase environment variables are present.
 *
 * Use this to switch between real Supabase data and mock data.
 * Phase 1 (demo) → false → mock data
 * Phase 2+ (real) → true → Supabase
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
