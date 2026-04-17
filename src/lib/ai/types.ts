/**
 * TypeScript contracts for the AI regeneration pipeline.
 * Implementation lives in Phase 2; these types define the interface now
 * so mock and real implementations are interchangeable.
 */

import type { Contact } from "@/types/contact";
import type { Interaction, InteractionType } from "@/types/interaction";
import type { Section } from "@/types/section";

// ──────────────────────────────────────────────────────────────────────────────
// Regeneration tiers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Which tier of regeneration to run. Higher tiers are more expensive but
 * more thorough. See docs/architecture/ai-regeneration.md for full details.
 */
export type RegenerationTier =
  | "immediate" // Tier 1: gpt-4o-mini, single new interaction, metadata-only
  | "debounced" // Tier 2: gpt-4o, full log, after 30s debounce
  | "scheduled" // Tier 3: weekly cron, full regen
  | "manual"; // Tier 3: user-initiated, full regen including web research

/**
 * Which model to use for a given regeneration.
 * Stored as a string to allow new models without code changes.
 */
export type RegenerationModel = "gpt-4o" | "gpt-4o-mini" | (string & {});

// ──────────────────────────────────────────────────────────────────────────────
// Result types
// ──────────────────────────────────────────────────────────────────────────────

/**
 * The AI's output for a single contact field, with provenance.
 * Every non-null field must cite the interaction(s) that support it.
 */
export interface AttributedValue<T> {
  value: T;
  source_interaction_ids: string[]; // IDs of interactions that support this value
}

/**
 * Metadata output from Tier 1 (immediate, cheap).
 * Only the 5 AI-generated fields — no sections, no identity extraction.
 */
export interface Tier1Output {
  ai_summary: AttributedValue<string> | null;
  relationship_score: AttributedValue<number> | null;
  suggested_next_step: AttributedValue<string> | null;
  /** Inferred pipeline stage change, if any */
  stage_update: AttributedValue<Contact["stage"]> | null;
  /** Updated topic list (merged with existing) */
  key_topics: AttributedValue<string[]> | null;
}

/**
 * Full metadata output from Tier 2/3.
 * Covers all contact fields AI can extract + markdown sections.
 * Sections are optional in Tier 2 (metadata-first); required in Tier 3.
 */
export interface FullRegenerationOutput {
  /** All contact metadata fields AI can extract/infer */
  metadata: Partial<Contact>;
  /**
   * Per-field attribution — maps contact field names to the interaction IDs
   * that support the value. Fields with no attribution should not be in metadata.
   */
  metadata_sources: Partial<Record<keyof Contact, string[]>>;
  /** Regenerated markdown sections (profile, company, outreach, follow-up, research) */
  sections: Section[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Pipeline interfaces
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Input to any regeneration run.
 */
export interface RegenerationInput {
  contactId: string;
  interactions: Interaction[];
  /** Current contact state (for incremental updates) */
  previousMetadata?: Contact;
  /** Which tier to run */
  tier: RegenerationTier;
}

/**
 * Queue interface for managing regeneration jobs.
 * Debounces bursts of interactions so Tier 2 fires once per burst.
 */
export interface RegenerationQueue {
  /** Add a new interaction to the queue — may trigger Tier 1 immediately */
  enqueue(contactId: string, trigger: InteractionType): Promise<void>;
  /** Force Tier 2 regeneration now (bypasses debounce) */
  flush(contactId: string): Promise<void>;
  /** Check current queue status for a contact */
  getStatus(contactId: string): "pending" | "running" | "idle";
}

// ──────────────────────────────────────────────────────────────────────────────
// Validation contract
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Result of validating an AI regeneration output for hallucinations.
 * See src/lib/ai/validators.ts for the implementation.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
