/**
 * Client-safe environment variables (NEXT_PUBLIC_* only).
 * Safe to import in Client Components, Server Components, and API routes.
 *
 * Variables are validated at module load time so misconfiguration is caught
 * early rather than at runtime deep in the call stack.
 *
 * During Phase 1 (mock data), Supabase vars are optional so local dev works
 * without a Supabase project. They become required in Phase 2.
 */

import { z } from "zod";

const clientEnvSchema = z.object({
  // Supabase (optional in Phase 1, required in Phase 2)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),

  // Feature flags (.default must come before .transform; after transform the
  // type is boolean and .default() would expect a boolean, not a string)
  NEXT_PUBLIC_ENABLE_VOICE: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  NEXT_PUBLIC_ENABLE_REGENERATION: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
});

const _parsed = clientEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_ENABLE_VOICE: process.env.NEXT_PUBLIC_ENABLE_VOICE,
  NEXT_PUBLIC_ENABLE_REGENERATION: process.env.NEXT_PUBLIC_ENABLE_REGENERATION,
});

if (!_parsed.success) {
  console.error("Invalid client environment variables:", _parsed.error.flatten().fieldErrors);
}

export const clientEnv = _parsed.success ? _parsed.data : clientEnvSchema.parse({});
