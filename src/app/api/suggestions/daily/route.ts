/**
 * GET /api/suggestions/daily
 *
 * Returns contacts that need a follow-up today. Priority order:
 * 1. next_followup_at <= today (overdue / due today)
 * 2. importance=high + no interaction in 14+ days
 * 3. importance=medium + no interaction in 30+ days
 *
 * Capped at 10 suggestions. Each item includes a follow-up reason
 * (existing followup_reason field or AI-generated).
 *
 * Query params:
 * - limit: max suggestions (default 5, max 10)
 * - ai: "1" to generate personalized reasons via GPT (default off)
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/types/contact";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DailySuggestion {
  contact: Contact;
  /** Why we're surfacing this contact today. */
  reason: string;
  /** How urgent: 0=low … 2=high */
  urgency: 0 | 1 | 2;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "5", 10), 10);
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Fetch candidates: contacts with a due follow-up or high/medium importance
  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("owner_id", user.id)
    .or(`next_followup_at.lte.${todayEnd.toISOString()},importance.eq.high,importance.eq.medium`)
    .not("stage", "in", '("closed_won","closed_lost")')
    .order("next_followup_at", { ascending: true, nullsFirst: false })
    .limit(50); // over-fetch then rank client-side

  if (error) {
    console.error("[suggestions/daily]", error);
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
  }

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // ── Rank & filter ────────────────────────────────────────────────────────────

  const suggestions: DailySuggestion[] = [];

  for (const c of contacts as Contact[]) {
    if (suggestions.length >= limit) break;

    const daysSinceLast = c.last_interaction_at
      ? Math.floor((now.getTime() - new Date(c.last_interaction_at).getTime()) / DAY_MS)
      : 999;

    const hasOverdueFollowup = c.next_followup_at
      ? new Date(c.next_followup_at) <= todayEnd
      : false;

    // Determine if this contact warrants a suggestion
    let reason: string | null = null;
    let urgency: 0 | 1 | 2 = 0;

    if (hasOverdueFollowup) {
      reason =
        c.followup_reason ??
        (c.suggested_next_step ? `Suggested: ${c.suggested_next_step}` : "Follow-up due today");
      urgency = 2;
    } else if (c.importance === "high" && daysSinceLast >= 14) {
      reason = `High priority contact — ${daysSinceLast} days since last interaction`;
      urgency = 1;
    } else if (c.importance === "medium" && daysSinceLast >= 30) {
      reason = `${daysSinceLast} days since last contact — time to reconnect`;
      urgency = 0;
    } else {
      // Not urgent enough to surface today
      continue;
    }

    suggestions.push({ contact: c, reason, urgency });
  }

  // Sort: urgency desc, then by last_interaction_at asc (most stale first)
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
