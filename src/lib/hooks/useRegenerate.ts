"use client";

/**
 * useRegenerate — triggers Tier 2 full regeneration for a contact.
 *
 * Phase 1: no-op (shows toast).
 * Phase 2: POST /api/regenerate → updates Zustand store with new sections/metadata.
 *
 * Returns { regenerating, trigger }.
 */

import { useState, useCallback } from "react";
import { useContactsStore } from "@/stores/contacts";
import { useUIStore } from "@/stores/ui";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { Section } from "@/types/section";
import type { Contact } from "@/types/contact";

interface RegenerateResponse {
  contact: Contact;
  sections: Section[];
}

export function useRegenerate(contactId: string) {
  const [regenerating, setRegenerating] = useState(false);
  const upsertContact = useContactsStore((s) => s.upsertContact);
  const setSections = useContactsStore((s) => s.setSections);
  const { addToast } = useUIStore();

  const trigger = useCallback(async () => {
    if (!contactId) return;

    if (!isSupabaseConfigured()) {
      addToast("Connect Supabase to regenerate with real AI", "info");
      return;
    }

    setRegenerating(true);

    try {
      const res = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contactId }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Regeneration failed (${res.status})`);
      }

      const data = (await res.json()) as RegenerateResponse;

      // Merge updated metadata + sections into store.
      // Use getState() to read current snapshot — avoids stale closure on contacts map.
      const cached = useContactsStore.getState().contacts[contactId];
      if (cached) {
        upsertContact({
          ...cached,
          ...data.contact,
          sections: data.sections,
          interactions: cached.interactions,
        });
        setSections(contactId, data.sections);
      }

      addToast("Profile regenerated", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Regeneration failed", "error");
    } finally {
      setRegenerating(false);
    }
  }, [contactId, upsertContact, setSections, addToast]);

  return { regenerating, trigger };
}
