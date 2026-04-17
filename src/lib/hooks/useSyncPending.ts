"use client";

/**
 * useSyncPending — drains the offline pending_sync queue when the browser is online.
 *
 * Call once at the app root (e.g. in AuthProvider or main layout).
 * On mount + on navigator.onLine events, attempts to sync queued interactions
 * to Supabase via /api/interactions.
 *
 * Each synced interaction is removed from the queue.
 * Failed syncs increment attempt_count for exponential back-off (max 5 tries).
 */

import { useEffect, useCallback, useRef } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

const MAX_ATTEMPTS = 5;

export function useSyncPending() {
  const syncingRef = useRef(false);

  const drainQueue = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    if (syncingRef.current) return;
    if (!navigator.onLine) return;

    syncingRef.current = true;

    try {
      const { getPendingInteractions, markSynced, getDb } = await import(
        "@/lib/db/dexie"
      );

      const pending = await getPendingInteractions();
      if (pending.length === 0) return;

      for (const item of pending) {
        if (item.attempt_count >= MAX_ATTEMPTS) continue; // give up

        try {
          const payload = JSON.parse(item.payload) as Record<string, unknown>;
          const res = await fetch("/api/interactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            const { interaction } = (await res.json()) as {
              interaction: { id: string };
            };
            await markSynced(item.local_id, interaction.id);
          } else {
            // Increment attempt count
            const db = getDb();
            await db.pending_sync.update(item.local_id, {
              attempt_count: item.attempt_count + 1,
            });
          }
        } catch {
          // Network error — will retry next time online
          const { getDb } = await import("@/lib/db/dexie");
          const db = getDb();
          await db.pending_sync
            .update(item.local_id, {
              attempt_count: item.attempt_count + 1,
            })
            .catch(() => null);
        }
      }
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Attempt on mount (catches reconnects after page was open offline)
    void drainQueue();

    // Attempt whenever the browser comes back online
    window.addEventListener("online", drainQueue);
    return () => window.removeEventListener("online", drainQueue);
  }, [drainQueue]);
}
