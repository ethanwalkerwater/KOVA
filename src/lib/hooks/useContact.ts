"use client";

/**
 * useContact — fetches a single contact with all sections and interactions.
 *
 * Phase 1: returns the contact from the mock data (getMockContact).
 * Phase 2: fetches from Supabase via separate API routes for sections + interactions,
 *          then merges into the contacts store.
 *
 * Surfaces a semantic `errorKind` so the UI can render distinct messaging for
 * 404 vs 5xx vs offline — rather than a single "Contact not found" screen.
 */

import { useEffect, useState, useCallback } from "react";
import { useContactsStore, selectContact } from "@/stores/contacts";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { isLocalId } from "@/lib/db/dexie";
import type { ContactWithRelations } from "@/stores/contacts";
import type { Section } from "@/types/section";
import type { Interaction } from "@/types/interaction";

export type ContactErrorKind = "not_found" | "server_error" | "offline" | "unknown";

export function useContact(id: string) {
  const upsertContact = useContactsStore((s) => s.upsertContact);
  const setSections = useContactsStore((s) => s.setSections);
  const cached = useContactsStore(selectContact(id));

  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ContactErrorKind | null>(null);

  const load = useCallback(
    async (opts: { cold: boolean }) => {
      if (!id) return;
      if (isLocalId(id)) {
        setLoading(false);
        return;
      }

      if (opts.cold) setLoading(true);
      setError(null);
      setErrorKind(null);

      if (!isSupabaseConfigured()) {
        const { getMockContact } = await import("@/lib/mock-data");
        const mock = getMockContact(id);
        if (mock) {
          upsertContact(mock);
        } else {
          setError("Contact not found");
          setErrorKind("not_found");
        }
        setLoading(false);
        return;
      }

      // Pre-flight offline check — cheaper than failing through fetch rejection.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (opts.cold) {
          setError("You appear to be offline");
          setErrorKind("offline");
        }
        setLoading(false);
        return;
      }

      try {
        const [contactRes, sectionsRes, interactionsRes] = await Promise.all([
          fetch(`/api/contacts/${id}`),
          fetch(`/api/sections?contact_id=${id}`),
          fetch(`/api/interactions?contact_id=${id}`),
        ]);

        if (!contactRes.ok) {
          const kind: ContactErrorKind =
            contactRes.status === 404
              ? "not_found"
              : contactRes.status >= 500
                ? "server_error"
                : "unknown";
          if (opts.cold) {
            setError(`Request failed (${contactRes.status})`);
            setErrorKind(kind);
          }
          setLoading(false);
          return;
        }

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
        // Network-level failure (DNS, CORS, aborted, offline mid-flight).
        if (opts.cold) {
          const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
          setError(err instanceof Error ? err.message : "Failed to load contact");
          setErrorKind(isOffline ? "offline" : "server_error");
        } else {
          console.warn("[useContact] Background refresh failed:", err);
        }
      } finally {
        setLoading(false);
      }
    },
    [id, upsertContact, setSections],
  );

  useEffect(() => {
    void load({ cold: !cached });
    // Intentionally omit `cached` from deps — `load` is stable per id, and re-running
    // whenever the cache changes would cause infinite re-fetches on upsert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const refetch = useCallback(() => load({ cold: true }), [load]);

  return {
    contact: cached ?? null,
    loading,
    error,
    errorKind,
    refetch,
  };
}
