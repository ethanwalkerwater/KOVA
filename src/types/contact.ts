import type { Section } from "./section";
import type { Interaction } from "./interaction";

export type ContactSource = "voice" | "card_ocr" | "text" | "photo" | "manual" | "web_search";

export type Importance = "high" | "medium" | "low";

export type PipelineStage =
  | "new_lead"
  | "contacted"
  | "engaged"
  | "negotiating"
  | "closed_won"
  | "closed_lost"
  | "dormant";

export interface Contact {
  id: string;
  owner_id: string;

  // ── Identity (extracted from interactions) ──
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  location: string | null;

  // ── Pipeline (AI-inferred from interaction patterns) ──
  stage: PipelineStage;
  importance: Importance;
  tags: string[];
  source: ContactSource | null;
  last_interaction_at: string | null;
  next_followup_at: string | null;
  followup_reason: string | null;

  // ── Company Intelligence (AI-extracted) ──
  company_industry: string | null;
  company_size: string | null;
  company_stage: string | null;
  company_hq: string | null;
  company_description: string | null;

  // ── Deal Tracking (AI-inferred) ──
  deal_value: number | null;
  deal_currency: string;
  deal_probability: number | null;
  expected_close_date: string | null;

  // ── AI-Generated (computed on regeneration) ──
  ai_summary: string | null;
  relationship_score: number | null;
  key_topics: string[];
  suggested_next_step: string | null;

  // ── System ──
  created_at: string;
  updated_at: string;

  // ── Joined data (populated on detail fetch) ──
  sections?: Section[];
  interactions?: Interaction[];
}
