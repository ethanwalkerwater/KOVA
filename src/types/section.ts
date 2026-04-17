export type SectionSlug = "profile" | "company" | "outreach" | "research" | "follow-up" | string; // allows custom sections

export interface Section {
  id: string;
  contact_id: string;
  slug: SectionSlug;
  title: string;
  content_md: string; // full markdown content (AI-generated)
  summary: string | null; // AI one-liner for table view
  regenerated_at: string; // when AI last rebuilt this section
  interaction_count: number; // how many interactions were used to generate
  /**
   * IDs of the interactions this section was derived from.
   * Used for hallucination detection — every non-empty section should cite at
   * least one interaction. Null means the section was created before attribution
   * was tracked (legacy); empty array means AI produced content without any
   * supporting interaction (potential hallucination).
   */
  source_interaction_ids: string[] | null;
  /**
   * User-authored markdown that overrides the AI-generated `content_md`.
   * When set, SectionRenderer displays this content instead of the AI version.
   * Users can always restore the AI version by clearing this field.
   * Null means no override — AI content is the canonical view.
   */
  user_overrides_md?: string | null;
  /** ISO timestamp of when the user last set an override. */
  overridden_at?: string | null;
  /** Optional user note explaining why they overrode the AI content. */
  override_reason?: string | null;
}

export const DEFAULT_SECTIONS: { slug: SectionSlug; title: string }[] = [
  { slug: "profile", title: "Profile" },
  { slug: "company", title: "Company" },
  { slug: "outreach", title: "Outreach" },
  { slug: "follow-up", title: "Follow-up" },
  { slug: "research", title: "Research" },
];
