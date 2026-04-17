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
  const { contacts, appendInteraction, upsertContact } = useContactsStore();
  const { addToast } = useUIStore();

  const interactions = contacts[contactId]?.interactions ?? [];

  const append = useCallback(
    async (options: AppendOptions): Promise<AppendResult | null> => {
      if (!isSupabaseConfigured()) {
        // Phase 1: no-op, show toast
        addToast("Connect Supabase to save interactions", "info");
        return null;
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

        // Optimistic update — add interaction to store immediately
        appendInteraction(contactId, data.interaction);

        // If Tier 1 ran and returned updated metadata, patch the contact cache
        if (data.tier1 && typeof data.tier1 === "object") {
          const tier1 = data.tier1 as { output?: Partial<Contact> };
          const cached = contacts[contactId];
          if (cached && tier1.output) {
            upsertContact({ ...cached, ...tier1.output });
          }
        }

        addToast("Saved", "success");
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save";
        addToast(message, "error");
        return null;
      }
    },
    [contactId, contacts, appendInteraction, upsertContact, addToast],
  );

  return {
    interactions,
    append,
  };
}
