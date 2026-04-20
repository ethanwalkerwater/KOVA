"use client";

/**
 * useSyncPending — drains offline pending queues when the browser comes online.
 *
 * Two queues are drained in order:
 *
 *   1. pending_contacts — new contacts created offline (POST /api/contacts).
 *      Must run BEFORE interactions so that any interactions referencing a
 *      local contact ID can have their contact_id patched to the real server ID.
 *
 *   2. pending_sync (interactions) — notes added offline to existing contacts
 *      (POST /api/interactions). Skips any entries whose contact_id is still a
 *      local ID (i.e. the parent contact hasn't synced yet).
 *
 * Call once at the app root (e.g. in AuthProvider or main layout).
 * On mount + on navigator.onLine events this hook re-fires.
 * Failed syncs increment attempt_count for exponential back-off (max 5 tries).
 */

import { useEffect, useCallback, useRef } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { useContactsStore } from "@/stores/contacts";
import type { Contact } from "@/types/contact";
import type { Interaction } from "@/types/interaction";
import type { ContactWithRelations } from "@/stores/contacts";

const MAX_ATTEMPTS = 5;

export function useSyncPending() {
  const syncingRef = useRef(false);
  const { replaceContact, upsertContact, contacts } = useContactsStore();

  const drainQueue = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    if (syncingRef.current) return;
    if (!navigator.onLine) return;

    syncingRef.current = true;

    try {
      const {
        getPendingContacts,
        getPendingInteractions,
        markSynced,
        removePendingContact,
        patchInteractionContactId,
        getDb,
      } = await import("@/lib/db/dexie");

      // ── Step 1: Sync pending contacts ────────────────────────────────────────
      const pendingContacts = await getPendingContacts();

      for (const item of pendingContacts) {
        if (item.attempt_count >= MAX_ATTEMPTS) continue;

        try {
          const payload = JSON.parse(item.payload) as Record<string, unknown>;
          const res = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            const data = (await res.json()) as {
              contact: Contact;
              interaction: Interaction;
              contact_update?: Partial<Contact>;
            };
            const freshContact = { ...data.contact, ...(data.contact_update ?? {}) };
            const realContactWithRelations: ContactWithRelations = {
              ...freshContact,
              sections: [],
              interactions: [data.interaction],
              pending: false,
            };

            // Replace stub contact in Zustand (local_id → real server ID)
            replaceContact(item.local_id, realContactWithRelations);

            // Patch any pending interaction payloads that reference the local ID
            await patchInteractionContactId(item.local_id, freshContact.id);

            // Remove stub from Dexie (contacts cache + pending_contacts table)
            await removePendingContact(item.local_id);
          } else {
            const db = getDb();
            await db.pending_contacts.update(item.local_id, {
              attempt_count: item.attempt_count + 1,
            });
          }
        } catch {
          const { getDb: getDbInner } = await import("@/lib/db/dexie");
          const db = getDbInner();
          await db.pending_contacts
            .update(item.local_id, { attempt_count: item.attempt_count + 1 })
            .catch(() => null);
        }
      }

      // ── Step 2: Sync pending interactions ────────────────────────────────────
      const pendingInteractions = await getPendingInteractions();
      if (pendingInteractions.length === 0) return;

      for (const item of pendingInteractions) {
        if (item.attempt_count >= MAX_ATTEMPTS) continue;

        try {
          const payload = JSON.parse(item.payload) as Record<string, unknown>;

          // Skip if the parent contact is still a local stub (not yet synced)
          if (
            typeof payload.contact_id === "string" &&
            payload.contact_id.startsWith("local_")
          ) {
            continue;
          }

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

            // Patch the pending flag in Zustand for the real interaction
            const contactId = payload.contact_id as string;
            const cached = contacts[contactId];
            if (cached) {
              const patchedInteractions = cached.interactions.map((i) =>
                i.id === item.local_id
                  ? { ...i, id: interaction.id, pending: false }
                  : i,
              );
              upsertContact({ ...cached, interactions: patchedInteractions });
            }
          } else {
            const db = getDb();
            await db.pending_sync.update(item.local_id, {
              attempt_count: item.attempt_count + 1,
            });
          }
        } catch {
          const { getDb: getDbInner } = await import("@/lib/db/dexie");
          const db = getDbInner();
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
  }, [replaceContact, upsertContact, contacts]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Attempt on mount (catches reconnects after page was open offline)
    void drainQueue();

    // Attempt whenever the browser comes back online
    window.addEventListener("online", drainQueue);
    return () => window.removeEventListener("online", drainQueue);
  }, [drainQueue]);
}
