export type InteractionType =
  | "voice_memo" // voice recording transcription
  | "text_note" // manually typed note
  | "photo" // photo with optional caption
  | "meeting_note" // structured meeting note
  | "email_snippet" // pasted email excerpt
  | "ai_research" // AI web search results
  | "followup_done" // user marked follow-up complete
  | "followup_skipped" // user deferred follow-up
  | "card_scan" // business card OCR result
  | "import"; // imported from external source

export interface Interaction {
  id: string;
  contact_id: string;
  owner_id: string;
  type: InteractionType;
  raw_content: string; // original input exactly as entered
  media_url: string | null; // for photos/voice recordings
  source_context: string | null; // e.g. "SaaStr Shanghai Day 2"
  ai_generated: boolean;
  created_at: string;
  // NOTE: no updated_at — interactions are immutable (append-only)
}
