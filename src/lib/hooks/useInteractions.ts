"use client";

/**
 * useInteractions — append-only interaction management for a contact.
 *
 * Phase 1: returns mock interactions from the store (seeded by useContact).
 * Phase 2: POST to /api/interactions, optimistically updates store,
 *          then refreshes contact metadata after Tier 1 AI runs.
 */

import { useCallback } from "react";
import { useContactsStore } from "@/stores/contacts";
import { useUIStore } from "@/stores/ui";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { Interaction, InteractionType } from "@/types/interaction";
import type { Contact } from "@/types/contact";

interface AppendOptions {
  contact_id: string;
  type: InteractionType;
  raw_content: string;
  source_context?: string;
  media_url?: string;
}

interface AppendResult {
  interaction: Interaction;
  tier1: unknown | null;
}

export function useInteractions(contactId: string) {
  const appendInteraction = useContactsStore((s) => s.appendInteraction);
  const upsertContact = useContactsStore((s) => s.upsertContact);
  const { addToast } = useUIStore();

  // Read interactions directly from the store — re-renders when this contact updates
  const interactions = useContactsStore((s) => s.contacts[contactId]?.interactions ?? []);

  const append = useCallback(
    async (options: AppendOptions): Promise<AppendResult | null> => {
      if (!isSupabaseConfigured()) {
        // Phase 1: no-op, show toast
        addToast("Connect Supabase to save interactions", "info");
        return null;
      }

      // ── Offline-first: write locally before hitting the network ──────────────
      let localId: string | null = null;
      try {
        const { localInteractionId, cacheInteraction, queuePendingSync } =
          await import("@/lib/db/dexie");

        localId = localInteractionId();

        const localInteraction = {
          id: localId,
          contact_id: options.contact_id,
          owner_id: "", // will be set by server; blank until synced
          type: options.type,
          raw_content: options.raw_content,
          source_context: options.source_context ?? null,
          media_url: options.media_url ?? null,
          ai_generated: false,
          created_at: new Date().toISOString(),
          pending: true,
        };

        await cacheInteraction(localInteraction);

        // Optimistically add to store (pending indicator shown to user)
        appendInteraction(contactId, localInteraction);

        // Queue for sync in case we go offline before the request completes
        if (!navigator.onLine) {
          await queuePendingSync(localId, options);
          addToast("Saved offline — will sync when online", "info");
          return null;
        }
      } catch {
        // IndexedDB unavailable (private browsing, storage blocked) — continue without cache
      }

      try {
        const res = await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Failed to save interaction (${res.status})`);
        }

        const data = (await res.json()) as AppendResult;

        // Replace the optimistic local entry with the confirmed server record
        if (localId) {
          try {
            const { markSynced } = await import("@/lib/db/dexie");
            await markSynced(localId, data.interaction.id);
          } catch {
            // Non-fatal
          }
        }

        appendInteraction(contactId, data.interaction);

        // If Tier 1 ran and returned updated metadata, patch the contact cache.
        // Use getState() to avoid a stale closure on the contacts map.
        if (data.tier1 && typeof data.tier1 === "object") {
          const tier1 = data.tier1 as { output?: Partial<Contact> };
          const cached = useContactsStore.getState().contacts[contactId];
          if (cached && tier1.output) {
            upsertContact({ ...cached, ...tier1.output });
          }
        }

        addToast("Saved", "success");
        return data;
      } catch (err) {
        // Network failed after optimistic write — queue for retry
        if (localId) {
          try {
            const { queuePendingSync } = await import("@/lib/db/dexie");
            await queuePendingSync(localId, options);
          } catch {
            // IndexedDB unavailable
          }
        }
        const message = err instanceof Error ? err.message : "Failed to save";
        addToast(`${message} — queued for retry`, "error");
        return null;
      }
    },
    [contactId, appendInteraction, upsertContact, addToast],
  );

  return {
    interactions,
    append,
  };
}
