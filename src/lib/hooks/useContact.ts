"use client";

/**
 * useContact — fetches a single contact with all sections and interactions.
 *
 * Phase 1: returns the contact from the mock data (getMockContact).
 * Phase 2: fetches from Supabase via separate API routes for sections + interactions,
 *          then merges into the contacts store.
 */

import { useEffect, useState } from "react";
import { useContactsStore, selectContact } from "@/stores/contacts";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { ContactWithRelations } from "@/stores/contacts";
import type { Section } from "@/types/section";
import type { Interaction } from "@/types/interaction";

export function useContact(id: string) {
  const upsertContact = useContactsStore((s) => s.upsertContact);
  const setSections = useContactsStore((s) => s.setSections);
  const cached = useContactsStore(selectContact(id));

  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function load() {
      setLoading(true);
      setError(null);

      if (!isSupabaseConfigured()) {
        // Phase 1: load from mock data
        const { getMockContact } = await import("@/lib/mock-data");
        const mock = getMockContact(id);
        if (mock) {
          upsertContact(mock);
        } else {
          setError("Contact not found");
        }
        setLoading(false);
        return;
      }

      // Phase 2: fetch contact metadata, sections, and interactions in parallel
      try {
        const [contactRes, sectionsRes, interactionsRes] = await Promise.all([
          fetch(`/api/contacts/${id}`),
          fetch(`/api/sections?contact_id=${id}`),
          fetch(`/api/interactions?contact_id=${id}`),
        ]);

        if (!contactRes.ok) throw new Error(`Contact not found (${contactRes.status})`);

        const { contact } = (await contactRes.json()) as { contact: ContactWithRelations };
        const { sections } = sectionsRes.ok
          ? ((await sectionsRes.json()) as { sections: Section[] })
          : { sections: [] };
        const { interactions } = interactionsRes.ok
          ? ((await interactionsRes.json()) as { interactions: Interaction[] })
          : { interactions: [] };

        upsertContact({ ...contact, sections, interactions });
        setSections(id, sections);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contact");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id, upsertContact, setSections]);

  return {
    contact: cached ?? null,
    loading,
    error,
  };
}
