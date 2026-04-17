"use client";

/**
 * useSuggestions — fetches daily follow-up suggestions.
 *
 * Phase 1: returns suggestions from getMockFollowupSuggestions() with a static reason.
 * Phase 2: fetches from /api/suggestions/daily.
 *
 * Also exposes markDone / markLater to create interaction records that
 * feed back into the AI pipeline (updates stage, next_followup_at, etc.).
 */

import { useState, useEffect, useCallback } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { useUIStore } from "@/stores/ui";
import type { DailySuggestion } from "@/app/api/suggestions/daily/route";
import type { Contact } from "@/types/contact";

// Re-export so HomeScreen doesn't need to import from the API route
export type { DailySuggestion };

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<DailySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useUIStore();

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      // Phase 1: build suggestions from mock data
      const { getMockFollowupSuggestions } = await import("@/lib/mock-data");
      const contacts = getMockFollowupSuggestions();
      const mock: DailySuggestion[] = contacts.map((c: Contact) => ({
        contact: c,
        reason: c.followup_reason ?? c.suggested_next_step ?? "Follow-up due",
        urgency: c.importance === "high" ? 2 : c.importance === "medium" ? 1 : 0,
      }));
      setSuggestions(mock);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/suggestions/daily?limit=5");
      if (!res.ok) throw new Error(`Failed to fetch suggestions (${res.status})`);
      const data = (await res.json()) as { suggestions: DailySuggestion[] };
      setSuggestions(data.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSuggestions();
  }, [fetchSuggestions]);

  /** Mark a follow-up as done — creates a followup_done interaction. */
  const markDone = useCallback(
    async (contactId: string) => {
      // Optimistically remove from list
      setSuggestions((prev) => prev.filter((s) => s.contact.id !== contactId));

      if (!isSupabaseConfigured()) {
        addToast("Marked done (demo mode)", "success");
        return;
      }

      try {
        await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact_id: contactId,
            type: "followup_done",
            raw_content: "Follow-up completed",
          }),
        });
        addToast("Follow-up marked done", "success");
      } catch {
        // Non-fatal — optimistic removal already done
      }
    },
    [addToast],
  );

  /** Defer a follow-up — creates a followup_skipped interaction. */
  const markLater = useCallback(
    async (contactId: string) => {
      // Optimistically remove from list
      setSuggestions((prev) => prev.filter((s) => s.contact.id !== contactId));

      if (!isSupabaseConfigured()) {
        addToast("Deferred (demo mode)", "info");
        return;
      }

      try {
        await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact_id: contactId,
            type: "followup_skipped",
            raw_content: "Follow-up deferred",
          }),
        });
        addToast("Follow-up deferred", "info");
      } catch {
        // Non-fatal
      }
    },
    [addToast],
  );

  return {
    suggestions,
    loading,
    error,
    markDone,
    markLater,
    refetch: fetchSuggestions,
  };
}
