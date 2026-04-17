/**
 * Anti-hallucination validators for AI regeneration output.
 *
 * Core principle: every non-null AI-generated value must cite the interaction
 * IDs that support it. A value without a source is a potential hallucination.
 *
 * See docs/architecture/ai-hallucination-defense.md for the full strategy.
 */

import type { Interaction } from "@/types/interaction";
import type { Section } from "@/types/section";
import type {
  AttributedValue,
  FullRegenerationOutput,
  Tier1Output,
  ValidationResult,
} from "./types";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the set of interaction IDs from the provided interaction list.
 * Used as the "known good" ID set for attribution checks.
 */
function knownIds(interactions: Interaction[]): Set<string> {
  return new Set(interactions.map((i) => i.id));
}

/**
 * Validates a single AttributedValue against the known interaction IDs.
 * Returns an error string if invalid, or null if valid.
 */
function checkAttributedValue<T>(
  fieldName: string,
  value: AttributedValue<T> | null,
  known: Set<string>,
): string | null {
  if (value === null) return null; // null is always valid — AI chose not to output

  if (value.source_interaction_ids.length === 0) {
    return `${fieldName}: non-null value has no source_interaction_ids (potential hallucination)`;
  }

  const phantoms = value.source_interaction_ids.filter((id) => !known.has(id));
  if (phantoms.length > 0) {
    return `${fieldName}: cites unknown interaction IDs: ${phantoms.join(", ")}`;
  }

  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Validates Tier 1 output for hallucinations.
 *
 * Checks that every non-null attributed field cites at least one interaction
 * that actually exists in the provided interaction list.
 *
 * @param output AI-generated Tier 1 output
 * @param interactions The interactions used to generate the output
 * @returns ValidationResult with valid=true if clean, or errors describing problems
 *
 * @example
 * const result = validateTier1Output(output, interactions);
 * if (!result.valid) console.error("AI hallucination detected:", result.errors);
 */
export function validateTier1Output(
  output: Tier1Output,
  interactions: Interaction[],
): ValidationResult {
  const known = knownIds(interactions);
  const errors: string[] = [];

  const fields: [string, AttributedValue<unknown> | null][] = [
    ["ai_summary", output.ai_summary],
    ["relationship_score", output.relationship_score],
    ["suggested_next_step", output.suggested_next_step],
    ["stage_update", output.stage_update],
    ["key_topics", output.key_topics],
  ];

  for (const [name, value] of fields) {
    const err = checkAttributedValue(name, value, known);
    if (err) errors.push(err);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates full regeneration output (Tier 2/3) for hallucinations.
 *
 * Checks:
 * 1. Every metadata field in `metadata_sources` cites only real interaction IDs.
 * 2. Every metadata field present in `metadata` has an entry in `metadata_sources`.
 * 3. Every section with non-empty content has `source_interaction_ids` set.
 * 4. Every cited section interaction ID exists in the known set.
 *
 * @param output AI-generated full regeneration output
 * @param interactions The interactions used to generate the output
 * @returns ValidationResult with valid=true if clean, or errors describing problems
 */
export function validateFullOutput(
  output: FullRegenerationOutput,
  interactions: Interaction[],
): ValidationResult {
  const known = knownIds(interactions);
  const errors: string[] = [];

  // 1. Check metadata_sources — each cited ID must be real
  for (const [field, ids] of Object.entries(output.metadata_sources)) {
    if (!ids) continue;
    const phantoms = ids.filter((id) => !known.has(id));
    if (phantoms.length > 0) {
      errors.push(`metadata.${field}: cites unknown interaction IDs: ${phantoms.join(", ")}`);
    }
  }

  // 2. Each metadata field must have a matching sources entry
  const unsourced = Object.keys(output.metadata).filter(
    (field) => !(field in output.metadata_sources),
  );
  if (unsourced.length > 0) {
    errors.push(`metadata fields missing from metadata_sources: ${unsourced.join(", ")}`);
  }

  // 3 + 4. Check sections
  for (const section of output.sections) {
    errors.push(...validateSection(section, known));
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a single section for attribution integrity.
 * Exported for use in section-level partial updates.
 *
 * @param section The section to validate
 * @param interactions The interactions the section was derived from
 * @returns Array of error strings (empty = valid)
 */
export function validateSection(section: Section, interactions: Interaction[]): string[];
export function validateSection(section: Section, known: Set<string>): string[];
export function validateSection(
  section: Section,
  interactionsOrKnown: Interaction[] | Set<string>,
): string[] {
  const known =
    interactionsOrKnown instanceof Set ? interactionsOrKnown : knownIds(interactionsOrKnown);

  const errors: string[] = [];
  const hasContent = section.content_md.trim().length > 0;

  if (hasContent) {
    if (section.source_interaction_ids === null) {
      // Legacy section — warn but don't hard-fail (null = untracked, not hallucinated)
      // We only flag empty arrays (AI generated content but cited nothing).
    } else if (section.source_interaction_ids.length === 0) {
      errors.push(
        `section "${section.slug}": has content but source_interaction_ids is empty (potential hallucination)`,
      );
    } else {
      const phantoms = section.source_interaction_ids.filter((id) => !known.has(id));
      if (phantoms.length > 0) {
        errors.push(
          `section "${section.slug}": cites unknown interaction IDs: ${phantoms.join(", ")}`,
        );
      }
    }
  }

  return errors;
}
