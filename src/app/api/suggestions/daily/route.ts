/**
 * GET /api/suggestions/daily
 *
 * Returns contacts that need a follow-up today. Priority order:
 * 1. next_followup_at <= today (overdue / due today) — fetched separately so
 *    they always appear regardless of how many high/medium contacts exist (H3 fix)
 * 2. importance=high + no interaction in 14+ days
 * 3. importance=medium + no interaction in 30+ days
 *
 * Capped at 10 suggestions. Each item includes a follow-up reason.
 *
 * Query params:
 * - limit: max suggestions (default 5, max 10)
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import type { Contact } from "@/types/contact";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DailySuggestion {
  contact: Contact;
  reason: string;
  urgency: 0 | 1 | 2;
}

const ACTIVE_STAGES = '("closed_won","closed_lost")';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 120 suggestion fetches per hour per user (~2/min, enough for auto-refresh)
  const rl = checkRateLimit("suggestions_daily", user.id, { maxRequests: 120, windowMs: 60 * 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "5", 10), 10);
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // H3 fix: run two separate queries.
  //
  // Query A: overdue/due-today follow-ups — these are always surfaced first
  // regardless of how many importance-based candidates exist.
  //
  // Query B: importance-based cadence — high (14 days), medium (30 days).
  // We fetch up to (limit * 5) rows so even if many contacts exist the ranker
  // can find the most-stale ones.
  const [{ data: overdueRows, error: err1 }, { data: cadenceRows, error: err2 }] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("*")
        .eq("owner_id", user.id)
        .lte("next_followup_at", todayEnd.toISOString())
        .not("stage", "in", ACTIVE_STAGES)
        .order("next_followup_at", { ascending: true })
        .limit(limit),

      supabase
        .from("contacts")
        .select("*")
        .eq("owner_id", user.id)
        .is("next_followup_at", null) // don't double-count scheduled ones
        .or("importance.eq.high,importance.eq.medium")
        .not("stage", "in", ACTIVE_STAGES)
        .order("last_interaction_at", { ascending: true, nullsFirst: true })
        .limit(limit * 5),
    ]);

  if (err1 || err2) {
    console.error("[suggestions/daily]", err1 ?? err2);
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
  }

  const seenIds = new Set<string>();
  const suggestions: DailySuggestion[] = [];

  // Process overdue contacts first (urgency 2)
  for (const c of (overdueRows ?? []) as Contact[]) {
    if (suggestions.length >= limit) break;
    if (seenIds.has(c.id)) continue;
    seenIds.add(c.id);

    const reason =
      c.followup_reason ??
      (c.suggested_next_step ? `Suggested: ${c.suggested_next_step}` : "Follow-up due today");

    suggestions.push({ contact: c, reason, urgency: 2 });
  }

  // Fill remaining slots with cadence-based contacts
  for (const c of (cadenceRows ?? []) as Contact[]) {
    if (suggestions.length >= limit) break;
    if (seenIds.has(c.id)) continue;

    const daysSinceLast = c.last_interaction_at
      ? Math.floor((now.getTime() - new Date(c.last_interaction_at).getTime()) / DAY_MS)
      : 999;

    let reason: string | null = null;
    let urgency: 0 | 1 | 2 = 0;

    if (c.importance === "high" && daysSinceLast >= 14) {
      reason = `High priority — ${daysSinceLast} days since last interaction`;
      urgency = 1;
    } else if (c.importance === "medium" && daysSinceLast >= 30) {
      reason = `${daysSinceLast} days since last contact — time to reconnect`;
      urgency = 0;
    } else {
      continue;
    }

    seenIds.add(c.id);
    suggestions.push({ contact: c, reason, urgency });
  }

  // Final sort: urgency desc, then most-stale first
  suggestions.sort((a, b) => {
    if (b.urgency !== a.urgency) return b.urgency - a.urgency;
    const aLast = a.contact.last_interaction_at
      ? new Date(a.contact.last_interaction_at).getTime()
      : 0;
    const bLast = b.contact.last_interaction_at
      ? new Date(b.contact.last_interaction_at).getTime()
      : 0;
    return aLast - bLast;
  });

  return NextResponse.json({ suggestions: suggestions.slice(0, limit) });
}
