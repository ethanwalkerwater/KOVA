-- ============================================================
-- Migration 002: Production hardening
-- ============================================================
--
-- Changes:
--   1. contacts.last_tier1_at — tracks the last time Tier 1 AI regeneration
--      ran for a contact. Used by the interactions route to debounce rapid
--      successive AI calls: if Tier 1 ran within the last 10 seconds, the
--      next interaction skips it (still saves the interaction; the metadata
--      will be updated by the next non-debounced call or manual regeneration).
--
--   2. contacts.tier1_count — cumulative Tier 1 call count per contact.
--      Useful for debugging and cost attribution dashboards.
-- ============================================================

alter table public.contacts
  add column if not exists last_tier1_at timestamptz,
  add column if not exists tier1_count integer default 0;

comment on column public.contacts.last_tier1_at is
  'Timestamp of the last Tier 1 AI regeneration for this contact.
   Used by /api/interactions to skip redundant AI calls when multiple
   interactions arrive within a short window (<= 10s).';

comment on column public.contacts.tier1_count is
  'Total number of Tier 1 AI regeneration calls for this contact.
   Incremented by /api/interactions each time Tier 1 runs.';
