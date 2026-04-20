/**
 * Core AI regeneration engine.
 *
 * Reads all interactions for a contact, calls GPT-4o, validates output
 * for hallucinations, then writes metadata + sections back to Supabase.
 *
 * Two entry points:
 * - runTier1: cheap/fast — one interaction, 5 metadata fields only
 * - runTier2: full — all interactions, all metadata + 5 sections
 */

import OpenAI from "openai";
import type { Interaction } from "@/types/interaction";
import type { FullRegenerationOutput, Tier1Output, ValidationResult } from "./types";
import {
  TIER1_SYSTEM_PROMPT,
  TIER2_SYSTEM_PROMPT,
  PARSE_CONTACT_SYSTEM_PROMPT,
  buildTier1UserPrompt,
  buildTier2UserPrompt,
  buildParseContactPrompt,
} from "./prompts";
import { validateTier1Output, validateFullOutput } from "./validators";
import { estimateCost } from "./cost-estimator";

// ── OpenAI client (lazy — only instantiated in server contexts) ───────────────

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

// ── Tier 1 ────────────────────────────────────────────────────────────────────

export interface Tier1Result {
  output: Tier1Output;
  validation: ValidationResult;
  /** Cost estimate for logging/billing. */
  estimatedCostUsd: number;
}

/**
 * Run Tier 1 regeneration: single new interaction → 5 metadata fields.
 *
 * @param interaction The newly-added interaction to process.
 * @returns Tier 1 output + validation result.
 */
export async function runTier1(interaction: Interaction): Promise<Tier1Result> {
  const model = process.env.OPENAI_MODEL_FALLBACK ?? "gpt-4o-mini";
  const { usd } = estimateCost([interaction], "immediate");

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: TIER1_SYSTEM_PROMPT },
      { role: "user", content: buildTier1UserPrompt(interaction) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1, // low temperature for consistent extraction
  });

  const raw = completion.choices[0].message.content ?? "{}";
  let output: Tier1Output;

  try {
    output = JSON.parse(raw) as Tier1Output;
  } catch {
    output = {
      ai_summary: null,
      relationship_score: null,
      suggested_next_step: null,
      stage_update: null,
      key_topics: null,
    };
  }

  const validation = validateTier1Output(output, [interaction]);

  return { output, validation, estimatedCostUsd: usd };
}

// ── Parse contact (initial identity extraction) ───────────────────────────────

export interface ParseContactResult {
  name: string | null;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  source_context: string | null;
  interaction_type: string | null;
}

/**
 * Extract initial identity information from a raw note.
 * Used when creating a new contact without a known name — the AI reads the
 * raw note and returns whatever identity fields it can find.
 *
 * Returns null if the API call fails or produces no parseable output.
 */
export async function runParseContact(rawInput: string): Promise<ParseContactResult | null> {
  const model = process.env.OPENAI_MODEL_FALLBACK ?? "gpt-4o-mini";
  const openai = getOpenAI();

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: PARSE_CONTACT_SYSTEM_PROMPT },
        { role: "user", content: buildParseContactPrompt(rawInput) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const raw = completion.choices[0].message.content ?? "{}";
    return JSON.parse(raw) as ParseContactResult;
  } catch (err) {
    console.warn("[runParseContact] failed (non-fatal):", err);
    return null;
  }
}

// ── Tier 2/3 ──────────────────────────────────────────────────────────────────

export interface Tier2Result {
  output: FullRegenerationOutput;
  validation: ValidationResult;
  estimatedCostUsd: number;
}

/**
 * Run Tier 2/3 full regeneration: all interactions → all metadata + sections.
 *
 * @param interactions All interactions for the contact (chronological order preferred).
 * @returns Full regeneration output + validation result.
 */
export async function runTier2(interactions: Interaction[]): Promise<Tier2Result> {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  const { usd } = estimateCost(interactions, "debounced");

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: TIER2_SYSTEM_PROMPT },
      { role: "user", content: buildTier2UserPrompt(interactions) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 8000,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  let output: FullRegenerationOutput;

  try {
    output = JSON.parse(raw) as FullRegenerationOutput;
  } catch {
    output = {
      metadata: {},
      metadata_sources: {},
      sections: [],
    };
  }

  // Ensure sections always have source_interaction_ids (may be missing from AI output)
  output.sections = output.sections.map((s) => ({
    ...s,
    source_interaction_ids: s.source_interaction_ids ?? [],
  }));

  const validation = validateFullOutput(output, interactions);

  return { output, validation, estimatedCostUsd: usd };
}
