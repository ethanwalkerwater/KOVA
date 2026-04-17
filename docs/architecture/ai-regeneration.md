# AI Regeneration Architecture

> Last updated: Phase 1 → Phase 2 transition planning

## The Problem

Kova's core promise: every piece of information a user captures (voice memo, text note, photo,
meeting note) is turned into organized, structured contact intelligence automatically. The AI
reads all raw interactions and regenerates clean markdown sections + queryable metadata.

The naive implementation (regenerate everything on every interaction) is unsustainable at scale:
- 100 interactions × 4,000 tokens/regeneration = $0.10–$0.30 per new note
- 100 users × 10 notes/day = $100–$300/day before Phase 2 even launches

This document describes a tiered cost control strategy.

---

## Tiered Regeneration Strategy

### Tier 1 — Immediate (cheap, ~$0.003)

**When:** Every new interaction.
**Model:** `gpt-4o-mini` (10x cheaper than gpt-4o).
**Scope:** Only update the 5 AI-generated metadata fields:
  - `ai_summary` (one-liner)
  - `relationship_score` (0–100)
  - `suggested_next_step`
  - `stage` inference
  - `key_topics` update

**Input:** The new interaction only (not the full log).
**Output:** Partial metadata update, no section rewrites.

```
New interaction added
      ↓
Tier 1 (gpt-4o-mini, ~200 tokens)
      ↓
Update: ai_summary, score, next_step, stage, topics
      ↓
UI refreshes immediately
```

### Tier 2 — Debounced (mid, ~$0.05)

**When:** 30 seconds after the last interaction in a burst (debounced).
**Model:** `gpt-4o`.
**Scope:** Full metadata extraction + all 5 markdown sections.
**Input:** All interactions for the contact (full log).

Debouncing prevents a user adding 5 interactions in a row from triggering 5 full regenerations.
Only the final state (after the burst) triggers the expensive regeneration.

```
5 interactions added in 20 seconds
      ↓
Debounce: 30s timer resets each time
      ↓
Timer fires: Tier 2 (gpt-4o, full log)
      ↓
Update: all metadata + sections
```

### Tier 3 — Manual / Scheduled (full, ~$0.08–0.15)

**When:**
  a. User explicitly clicks "Regenerate" on a contact
  b. Weekly cron: regenerate all contacts with new interactions since last full regen
  c. After a web search enrichment (ai_research interaction)

**Model:** `gpt-4o`.
**Scope:** Full regeneration with web-aware reasoning.
**Note:** This is the only tier that reads `ai_research` interactions for company intel updates.

---

## Incremental Strategy

Not every new interaction warrants a full regeneration. Use a "significance score" to decide:

| Interaction type | Tier 1 | Tier 2 trigger? |
|------------------|--------|-----------------|
| `followup_done` / `followup_skipped` | Yes | Only if stage change likely |
| `text_note` (short) | Yes | Only if 5+ notes since last Tier 2 |
| `meeting_note` | Yes | Always |
| `voice_memo` | Yes | If > 200 chars |
| `ai_research` | Yes | Always (forces Tier 3) |
| `card_scan` | Yes | Always (identity update) |
| `email_snippet` | Yes | If > 100 chars |

Threshold: trigger Tier 2 when `interactions_since_last_full_regen >= 5`.

---

## Caching Strategy

Avoid re-processing the same inputs:

```
Hash of interactions[] → cached regeneration result
TTL: 7 days (or until new interaction added)
Storage: Redis (Upstash) in Phase 2
```

Cache key: `sha256(contact_id + sorted interaction IDs + last_interaction_at)`

If the hash matches, return cached result instead of calling GPT-4o.

---

## Cost Estimation

See `src/lib/ai/cost-estimator.ts` for the implementation.

| Scenario | Tier | Tokens | Cost |
|----------|------|--------|------|
| Quick note (short) | 1 | ~200 | $0.0001 |
| Meeting note (long) | 1 + 2 | ~2,500 | $0.005 |
| Card scan + notes | 1 + 2 | ~3,000 | $0.006 |
| Manual regeneration (50 interactions) | 3 | ~8,000 | $0.024 |
| Web enrichment | 1 + 3 | ~10,000 | $0.030 |

Estimated cost per active user per month: **$1–3** at typical usage.

---

## Phase 2 Implementation Plan

1. `src/lib/ai/types.ts` — TypeScript contracts for all tiers
2. `src/lib/ai/cost-estimator.ts` — token + USD estimation
3. `src/app/api/interactions/route.ts` — POST new interaction → trigger Tier 1
4. `src/app/api/regenerate/route.ts` — POST contact_id → run full regeneration
5. Debounce queue: use Supabase edge function or Vercel cron
6. Cache layer: Upstash Redis in Phase 3

---

## Anti-Hallucination Notes

AI-generated values must cite source interactions. See `docs/architecture/ai-hallucination-defense.md`.

- GPT-4o prompt must include: "Only output a field value if explicitly stated or strongly implied.
  Return null otherwise."
- Each output field includes `source_interaction_ids: string[]` for auditability.
- Validator in `src/lib/ai/validators.ts` checks that cited IDs exist in the input.
