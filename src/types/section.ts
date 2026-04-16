export type SectionSlug = "profile" | "company" | "outreach" | "research" | "follow-up" | string;

export interface Section {
  id: string;
  contact_id: string;
  slug: SectionSlug;
  title: string;
  content_md: string;
  summary: string | null;
  ai_generated: boolean;
  updated_at: string;
}

export const DEFAULT_SECTIONS: { slug: SectionSlug; title: string }[] = [
  { slug: "profile", title: "Profile" },
  { slug: "company", title: "Company" },
  { slug: "outreach", title: "Outreach" },
  { slug: "follow-up", title: "Follow-up" },
  { slug: "research", title: "Research" },
];
