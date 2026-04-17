import { describe, it, expect } from "vitest";
import { validateTier1Output, validateFullOutput, validateSection } from "./validators";
import type { Interaction } from "@/types/interaction";
import type { Section } from "@/types/section";
import type { Tier1Output, FullRegenerationOutput } from "./types";
import type { Contact } from "@/types/contact";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeInteraction(id: string): Interaction {
  return {
    id,
    contact_id: "contact-1",
    owner_id: "user-1",
    type: "text_note",
    raw_content: `Content for ${id}`,
    media_url: null,
    source_context: null,
    ai_generated: false,
    created_at: "2026-04-17T12:00:00Z",
  };
}

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: "section-1",
    contact_id: "contact-1",
    slug: "profile",
    title: "Profile",
    content_md: "Some AI-generated profile content.",
    summary: null,
    regenerated_at: "2026-04-17T12:00:00Z",
    interaction_count: 1,
    source_interaction_ids: ["interaction-1"],
    ...overrides,
  };
}

const INTERACTIONS = [makeInteraction("interaction-1"), makeInteraction("interaction-2")];

// ── validateTier1Output ───────────────────────────────────────────────────────

describe("validateTier1Output", () => {
  it("returns valid=true for all-null output (AI chose not to populate anything)", () => {
    const output: Tier1Output = {
      ai_summary: null,
      relationship_score: null,
      suggested_next_step: null,
      stage_update: null,
      key_topics: null,
    };
    const result = validateTier1Output(output, INTERACTIONS);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns valid=true when all fields cite real interaction IDs", () => {
    const output: Tier1Output = {
      ai_summary: { value: "Good rapport", source_interaction_ids: ["interaction-1"] },
      relationship_score: { value: 75, source_interaction_ids: ["interaction-1", "interaction-2"] },
      suggested_next_step: { value: "Follow up", source_interaction_ids: ["interaction-2"] },
      stage_update: { value: "engaged", source_interaction_ids: ["interaction-1"] },
      key_topics: { value: ["cloud", "security"], source_interaction_ids: ["interaction-1"] },
    };
    const result = validateTier1Output(output, INTERACTIONS);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when a field has no source_interaction_ids (empty array)", () => {
    const output: Tier1Output = {
      ai_summary: { value: "Hallucinated summary", source_interaction_ids: [] },
      relationship_score: null,
      suggested_next_step: null,
      stage_update: null,
      key_topics: null,
    };
    const result = validateTier1Output(output, INTERACTIONS);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/ai_summary.*no source_interaction_ids/);
  });

  it("fails when a field cites a phantom interaction ID", () => {
    const output: Tier1Output = {
      ai_summary: { value: "Summary", source_interaction_ids: ["phantom-id"] },
      relationship_score: null,
      suggested_next_step: null,
      stage_update: null,
      key_topics: null,
    };
    const result = validateTier1Output(output, INTERACTIONS);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/phantom-id/);
  });

  it("accumulates errors for multiple invalid fields", () => {
    const output: Tier1Output = {
      ai_summary: { value: "Bad", source_interaction_ids: [] },
      relationship_score: { value: 50, source_interaction_ids: ["ghost-1"] },
      suggested_next_step: null,
      stage_update: null,
      key_topics: null,
    };
    const result = validateTier1Output(output, INTERACTIONS);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it("returns valid=true with 0 interactions when all fields are null", () => {
    const output: Tier1Output = {
      ai_summary: null,
      relationship_score: null,
      suggested_next_step: null,
      stage_update: null,
      key_topics: null,
    };
    const result = validateTier1Output(output, []);
    expect(result.valid).toBe(true);
  });

  it("fails when 0 interactions but output has non-null attributed values", () => {
    const output: Tier1Output = {
      ai_summary: { value: "Invented", source_interaction_ids: ["interaction-1"] },
      relationship_score: null,
      suggested_next_step: null,
      stage_update: null,
      key_topics: null,
    };
    const result = validateTier1Output(output, []);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/interaction-1/);
  });
});

// ── validateFullOutput ────────────────────────────────────────────────────────

describe("validateFullOutput", () => {
  function makeOutput(overrides: Partial<FullRegenerationOutput> = {}): FullRegenerationOutput {
    return {
      metadata: { name: "Lisa Chen", company: "NovaTech" } as Partial<Contact>,
      metadata_sources: {
        name: ["interaction-1"],
        company: ["interaction-2"],
      },
      sections: [makeSection({ slug: "profile", source_interaction_ids: ["interaction-1"] })],
      ...overrides,
    };
  }

  it("returns valid=true for a correctly attributed output", () => {
    const result = validateFullOutput(makeOutput(), INTERACTIONS);
    expect(result.valid).toBe(true);
  });

  it("fails when metadata_sources cites a phantom interaction ID", () => {
    const output = makeOutput({
      metadata_sources: { name: ["phantom-id"] },
    });
    const result = validateFullOutput(output, INTERACTIONS);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/metadata\.name.*phantom-id/);
  });

  it("fails when metadata field has no entry in metadata_sources", () => {
    const output = makeOutput({
      metadata: { name: "Lisa", company: "NovaTech", email: "lisa@nova.io" } as Partial<Contact>,
      metadata_sources: { name: ["interaction-1"], company: ["interaction-1"] },
      // email is in metadata but not in metadata_sources
    });
    const result = validateFullOutput(output, INTERACTIONS);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/email/);
  });

  it("fails when a section cites a phantom interaction ID", () => {
    const output = makeOutput({
      sections: [makeSection({ source_interaction_ids: ["ghost-section"] })],
    });
    const result = validateFullOutput(output, INTERACTIONS);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/ghost-section/);
  });

  it("accumulates errors from metadata and sections", () => {
    const output = makeOutput({
      metadata_sources: { name: ["phantom-meta"] },
      sections: [makeSection({ source_interaction_ids: ["phantom-section"] })],
    });
    const result = validateFullOutput(output, INTERACTIONS);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ── validateSection ───────────────────────────────────────────────────────────

describe("validateSection", () => {
  it("returns no errors for a section with valid attribution", () => {
    const section = makeSection({ source_interaction_ids: ["interaction-1"] });
    const errors = validateSection(section, INTERACTIONS);
    expect(errors).toHaveLength(0);
  });

  it("returns no errors for an empty-content section with no attribution", () => {
    const section = makeSection({ content_md: "", source_interaction_ids: [] });
    const errors = validateSection(section, INTERACTIONS);
    expect(errors).toHaveLength(0);
  });

  it("returns no errors when source_interaction_ids is null (legacy section)", () => {
    // null means pre-attribution tracking — we don't hard-fail on legacy data
    const section = makeSection({ source_interaction_ids: null });
    const errors = validateSection(section, INTERACTIONS);
    expect(errors).toHaveLength(0);
  });

  it("returns an error when content is non-empty but source_interaction_ids is []", () => {
    const section = makeSection({
      content_md: "Some content the AI invented",
      source_interaction_ids: [],
    });
    const errors = validateSection(section, INTERACTIONS);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/source_interaction_ids is empty/);
  });

  it("returns an error when a section cites a phantom interaction ID", () => {
    const section = makeSection({ source_interaction_ids: ["phantom-id"] });
    const errors = validateSection(section, INTERACTIONS);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/phantom-id/);
  });

  it("accepts a Set<string> as the second argument", () => {
    const known = new Set(["interaction-1", "interaction-2"]);
    const section = makeSection({ source_interaction_ids: ["interaction-1"] });
    const errors = validateSection(section, known);
    expect(errors).toHaveLength(0);
  });

  it("reports the section slug in error messages for traceability", () => {
    const section = makeSection({ slug: "company", source_interaction_ids: [] });
    const errors = validateSection(section, INTERACTIONS);
    expect(errors[0]).toMatch(/company/);
  });
});
