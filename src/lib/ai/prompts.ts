/**
 * System prompts for the AI regeneration pipeline.
 *
 * Anti-hallucination rules are embedded directly in every prompt:
 * - Output null for any field not explicitly supported by the interactions.
 * - Every field value must include the interaction IDs that support it.
 * - Never invent information not present in the source interactions.
 */

import type { Interaction } from "@/types/interaction";

// ── Tier 1 — Immediate (gpt-4o-mini) ─────────────────────────────────────────

export const TIER1_SYSTEM_PROMPT = `You are a B2B relationship intelligence assistant. You read a single new interaction and update 5 metadata fields about the contact.

RULES:
- Only output a field value if it is explicitly stated or strongly implied by the interaction.
- Return null for any field you cannot determine from this interaction alone.
- Every non-null field MUST include "source_interaction_ids" citing the interaction ID(s) that support it.
- Do NOT invent, infer beyond what's stated, or hallucinate.
- relationship_score: integer 0–100 (0=hostile/lost, 50=neutral, 75=warm, 90+=very strong). Use null if you can't judge from this single interaction.
- stage values: new_lead | contacted | engaged | negotiating | closed_won | closed_lost | dormant

Respond with valid JSON only. No markdown, no explanation.`;

export function buildTier1UserPrompt(interaction: Interaction): string {
  return JSON.stringify(
    {
      interaction: {
        id: interaction.id,
        type: interaction.type,
        raw_content: interaction.raw_content,
        source_context: interaction.source_context,
        created_at: interaction.created_at,
      },
      output_schema: {
        ai_summary: "{ value: string, source_interaction_ids: [string] } | null",
        relationship_score: "{ value: number (0–100), source_interaction_ids: [string] } | null",
        suggested_next_step: "{ value: string, source_interaction_ids: [string] } | null",
        stage_update:
          "{ value: 'new_lead'|'contacted'|'engaged'|'negotiating'|'closed_won'|'closed_lost'|'dormant', source_interaction_ids: [string] } | null",
        key_topics:
          "{ value: string[], source_interaction_ids: [string] } | null — merge with existing topics",
      },
    },
    null,
    2,
  );
}

// ── Tier 2/3 — Full regeneration (gpt-4o) ────────────────────────────────────

export const TIER2_SYSTEM_PROMPT = `You are a B2B relationship intelligence assistant. You read ALL interactions for a contact and produce a comprehensive, structured profile.

RULES:
1. ATTRIBUTION: Every non-null metadata field MUST include "source_interaction_ids" listing the interaction IDs that support the value. Do not output a field if you cannot cite a source.
2. NO HALLUCINATION: Only output what is explicitly stated or strongly implied. Return null for unknown fields.
3. SECTIONS: Write in clean, professional markdown. Use ## for section headers, bullet points for lists.
4. CHRONOLOGY: Process interactions in order (oldest first) to track relationship progression.
5. CONFLICTS: If interactions contradict each other, use the most recent one and note the discrepancy.

stage values: new_lead | contacted | engaged | negotiating | closed_won | closed_lost | dormant
importance values: high | medium | low
relationship_score: integer 0–100

Respond with valid JSON only matching the output_schema exactly.`;

export function buildTier2UserPrompt(interactions: Interaction[]): string {
  const sorted = [...interactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return JSON.stringify(
    {
      interactions: sorted.map((i) => ({
        id: i.id,
        type: i.type,
        raw_content: i.raw_content,
        source_context: i.source_context,
        ai_generated: i.ai_generated,
        created_at: i.created_at,
      })),
      output_schema: {
        metadata: {
          // Identity
          name: "string | null",
          title: "string | null",
          company: "string | null",
          email: "string | null",
          phone: "string | null",
          linkedin_url: "string | null",
          location: "string | null",
          // Pipeline
          stage: "PipelineStage | null",
          importance: "'high'|'medium'|'low' | null",
          next_followup_at: "ISO date string | null",
          followup_reason: "string | null",
          // Company
          company_industry: "string | null",
          company_size: "string | null",
          company_stage: "string | null",
          company_hq: "string | null",
          company_description: "string | null",
          // Deal
          deal_value: "number | null",
          deal_currency: "string (default USD) | null",
          deal_probability: "integer 0–100 | null",
          expected_close_date: "ISO date string | null",
          // AI
          ai_summary: "string (1 sentence) | null",
          relationship_score: "integer 0–100 | null",
          key_topics: "string[] | null",
          suggested_next_step: "string | null",
        },
        metadata_sources:
          "Record<fieldName, interactionId[]> — only include fields present in metadata",
        sections: [
          {
            slug: "profile",
            title: "Profile",
            content_md: "markdown string",
            summary: "one-liner string | null",
            source_interaction_ids: "interactionId[]",
          },
          {
            slug: "company",
            title: "Company",
            content_md: "markdown string",
            summary: "one-liner string | null",
            source_interaction_ids: "interactionId[]",
          },
          {
            slug: "outreach",
            title: "Outreach",
            content_md: "markdown string — chronological interaction history",
            summary: "one-liner string | null",
            source_interaction_ids: "interactionId[]",
          },
          {
            slug: "follow-up",
            title: "Follow-up",
            content_md: "markdown string — next actions and reasoning",
            summary: "one-liner string | null",
            source_interaction_ids: "interactionId[]",
          },
          {
            slug: "research",
            title: "Research",
            content_md:
              "markdown string — web research findings (from ai_research interactions only)",
            summary: "one-liner string | null",
            source_interaction_ids: "interactionId[] — only ai_research interaction IDs",
          },
        ],
      },
    },
    null,
    2,
  );
}

// ── Web research synthesis ────────────────────────────────────────────────────

export const WEB_RESEARCH_SYSTEM_PROMPT = `You are a B2B relationship intelligence assistant. You receive raw web search results about a person and their company, then synthesize them into a structured research note.

RULES:
1. Only include facts explicitly stated in the search results. Never invent, infer, or hallucinate.
2. Write in clear, professional prose — as if briefing a salesperson before a meeting.
3. Keep it concise: 150-250 words total.
4. Cite the source URLs inline where possible.
5. Structure the output as plain markdown with these sections (omit any with no data):
   ## About [Name]
   ## Company: [Company Name]
   ## Recent Activity
   ## Potential Talking Points

Respond with a single markdown string (no JSON wrapping).`;

export function buildWebResearchPrompt(
  name: string,
  company: string | null,
  searchResults: string,
): string {
  return JSON.stringify(
    {
      subject: { name, company },
      search_results: searchResults,
      instruction: "Synthesize the search results into a research note following the system prompt rules.",
    },
    null,
    2,
  );
}

// ── Lead discovery ────────────────────────────────────────────────────────────

export const LEAD_DISCOVERY_SYSTEM_PROMPT = `You are a B2B lead research assistant. Given a description of an ideal lead, search results, and any identified prospects, extract structured lead information.

RULES:
1. Only include people/companies explicitly mentioned in the search results.
2. Each lead must have at minimum: name, company, title (or role description).
3. Do NOT hallucinate names, companies, or contact details.
4. Relevance score 0-100: how well they match the ideal lead description.

Respond with valid JSON only.`;

export function buildLeadDiscoveryPrompt(query: string, searchResults: string): string {
  return JSON.stringify(
    {
      ideal_lead_description: query,
      search_results: searchResults,
      output_schema: {
        leads: [
          {
            name: "string",
            title: "string | null",
            company: "string | null",
            location: "string | null",
            summary: "string — 1-2 sentences about why they match",
            relevance_score: "integer 0-100",
            source_url: "string | null",
          },
        ],
      },
    },
    null,
    2,
  );
}

// ── Initial contact parse (from first interaction) ────────────────────────────

export const PARSE_CONTACT_SYSTEM_PROMPT = `You are a B2B relationship intelligence assistant. You read a raw note about a new contact and extract initial identity information.

RULES:
- Only extract what is explicitly stated. Return null for unknown fields.
- name is required — if you cannot find a name, return null for all fields.
- Do not invent or infer beyond what's stated.

Respond with valid JSON only.`;

export function buildParseContactPrompt(rawInput: string): string {
  return JSON.stringify(
    {
      raw_input: rawInput,
      output_schema: {
        name: "string | null — full name if mentioned",
        title: "string | null — job title if mentioned",
        company: "string | null — company name if mentioned",
        email: "string | null",
        phone: "string | null",
        source_context: "string | null — where/how they met (e.g. 'SaaStr Shanghai 2026')",
        interaction_type:
          "'voice_memo'|'text_note'|'meeting_note'|'card_scan'|'email_snippet'|'import'",
      },
    },
    null,
    2,
  );
}
