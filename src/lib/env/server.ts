/**
 * Server-only environment variables.
 * DO NOT import this in Client Components — it exposes secrets.
 * Use `import { serverEnv } from "@/lib/env/server"` only in:
 *   - src/app/api/**\/route.ts
 *   - Server Components / Server Actions
 *   - Next.js middleware
 *
 * Variables are validated at module load time. Missing required vars throw
 * at startup so deployments fail fast rather than at runtime.
 */

import { z } from "zod";

const serverEnvSchema = z.object({
  // Supabase (optional in Phase 1, required in Phase 2)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // OpenAI (optional in Phase 1, required in Phase 2)
  OPENAI_API_KEY: z.string().startsWith("sk-").optional(),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  OPENAI_MODEL_FALLBACK: z.string().default("gpt-4o-mini"),

  // Web search (at least one required when search feature is enabled)
  TAVILY_API_KEY: z.string().optional(),
  SERPER_API_KEY: z.string().optional(),
});

const _parsed = serverEnvSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error("Invalid server environment variables:", _parsed.error.flatten().fieldErrors);
}

export const serverEnv = _parsed.success ? _parsed.data : serverEnvSchema.parse({});

/** Throws if Phase 2 backend vars are missing. Call at the top of API routes that need them. */
export function requirePhase2Env(): void {
  if (!serverEnv.NEXT_PUBLIC_SUPABASE_URL || !serverEnv.OPENAI_API_KEY) {
    throw new Error(
      "Phase 2 environment variables not configured. " +
        "Copy .env.example → .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and OPENAI_API_KEY.",
    );
  }
}
