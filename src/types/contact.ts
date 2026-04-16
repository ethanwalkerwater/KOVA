import type { Section } from "./section";

export type ContactSource = "voice" | "card_ocr" | "text" | "photo" | "manual" | "web_search";
export type Importance = "high" | "medium" | "low";

export interface Contact {
  id: string;
  owner_id: string;
  display_name: string;
  avatar_color: string;
  importance: Importance;
  tags: string[];
  source: ContactSource | null;
  last_interaction_at: string | null;
  next_followup_at: string | null;
  created_at: string;
  updated_at: string;
  sections?: Section[];
}
