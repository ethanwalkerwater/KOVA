/**
 * Estimates GPT-4o token usage and USD cost for a regeneration run.
 *
 * Pricing assumptions (update when OpenAI changes prices):
 *   gpt-4o:      $2.50 / 1M input tokens,  $10.00 / 1M output tokens
 *   gpt-4o-mini: $0.15 / 1M input tokens,  $0.60  / 1M output tokens
 *
 * Token estimation heuristic: ~1 token per 4 characters (English prose).
 * The system prompt adds ~800 tokens of fixed overhead.
 * Output is estimated at 1,500 tokens for metadata-only, 4,000 for full regen.
 */

import type { Interaction } from "@/types/interaction";
import type { RegenerationModel, RegenerationTier } from "./types";

// ── Pricing ─────────────────────────────────────────────────────────────────

const PRICING: Record<RegenerationModel, { inputPerM: number; outputPerM: number }> = {
  "gpt-4o": { inputPerM: 2.5, outputPerM: 10.0 },
  "gpt-4o-mini": { inputPerM: 0.15, outputPerM: 0.6 },
};

const SYSTEM_PROMPT_TOKENS = 800;
const CHARS_PER_TOKEN = 4;

function estimatedOutputTokens(tier: RegenerationTier): number {
  // Tier 1: only 5 metadata fields
  if (tier === "immediate") return 300;
  // Tier 2/3: full metadata + 5 markdown sections
  return 4_000;
}

function modelForTier(tier: RegenerationTier): RegenerationModel {
  return tier === "immediate" ? "gpt-4o-mini" : "gpt-4o";
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface CostEstimate {
  /** Estimated total input tokens (system prompt + interaction content) */
  inputTokens: number;
  /** Estimated total output tokens */
  outputTokens: number;
  /** Combined input + output tokens */
  totalTokens: number;
  /** Estimated USD cost */
  usd: number;
  /** Which model was assumed */
  model: RegenerationModel;
}

/**
 * Estimate cost for regenerating a contact given its interactions.
 *
 * @param interactions All interactions for the contact
 * @param tier Which regeneration tier to estimate for
 * @returns Cost breakdown
 *
 * @example
 * const estimate = estimateCost(interactions, "debounced");
 * console.log(`~${estimate.totalTokens} tokens, ~$${estimate.usd.toFixed(4)}`);
 */
export function estimateCost(
  interactions: Interaction[],
  tier: RegenerationTier = "debounced",
): CostEstimate {
  const model = modelForTier(tier);
  const pricing = PRICING[model] ?? PRICING["gpt-4o"];

  // Estimate input tokens from interaction content
  const interactionChars = interactions.reduce((sum, i) => sum + (i.raw_content?.length ?? 0), 0);
  const interactionTokens = Math.ceil(interactionChars / CHARS_PER_TOKEN);
  const inputTokens = SYSTEM_PROMPT_TOKENS + interactionTokens;

  const outputTokens = estimatedOutputTokens(tier);
  const totalTokens = inputTokens + outputTokens;

  const usd =
    (inputTokens / 1_000_000) * pricing.inputPerM + (outputTokens / 1_000_000) * pricing.outputPerM;

  return { inputTokens, outputTokens, totalTokens, usd, model };
}

/**
 * Human-readable summary of the cost estimate.
 *
 * @example "~3,200 tokens (~$0.008) via gpt-4o"
 */
export function formatCostEstimate(estimate: CostEstimate): string {
  const tokens = estimate.totalTokens.toLocaleString();
  const usd = estimate.usd < 0.001 ? "<$0.001" : `~$${estimate.usd.toFixed(3)}`;
  return `~${tokens} tokens (${usd}) via ${estimate.model}`;
}
