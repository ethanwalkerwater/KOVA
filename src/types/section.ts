export type SectionSlug =
  | "profile"
  | "company"
  | "outreach"
  | "research"
  | "follow-up"
  | string; // allows custom sections

export interface Section {
  id: string;
  contact_id: string;
  slug: SectionSlug;
  title: string;
  content_md: string;           // full markdown content (AI-generated)
  summary: string | null;       // AI one-liner for table view
  regenerated_at: string;       // when AI last rebuilt this section
  interaction_count: number;    // how many interactions were used to generate
}

export const DEFAULT_SECTIONS: { slug: SectionSlug; title: string }[] = [
  { slug: "profile", title: "Profile" },
  { slug: "company", title: "Company" },
  { slug: "outreach", title: "Outreach" },
  { slug: "follow-up", title: "Follow-up" },
  { slug: "research", title: "Research" },
];
