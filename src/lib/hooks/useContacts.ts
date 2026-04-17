"use client";

/**
 * useContacts — fetches and caches the contacts list.
 *
 * Phase 1 (Supabase not configured): seeds the store from mock data once.
 * Phase 2: fetches from /api/contacts with optional filtering.
 *
 * Call at the Clients page level. Individual detail pages use useContact(id).
 */

import { useEffect, useCallback, useRef } from "react";
import { useContactsStore, type ContactWithRelations } from "@/stores/contacts";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { Contact } from "@/types/contact";

interface UseContactsOptions {
  q?: string;
  stage?: string;
  importance?: string;
  sort?: "last_interaction_at" | "relationship_score" | "name" | "created_at";
  limit?: number;
  offset?: number;
}

export function useContacts(options: UseContactsOptions = {}) {
  const { q = "", stage, importance, sort = "last_interaction_at", limit = 50, offset = 0 } =
    options;

  const { setContacts, setLoading, setError, listIds, contacts, loading, error } =
    useContactsStore();

  // Track whether we've seeded mock data already (Phase 1 only)
  const seededRef = useRef(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured()) {
      // Phase 1: lazy-load mock data once
      if (!seededRef.current) {
        seededRef.current = true;
        const { getMockContacts } = await import("@/lib/mock-data");
        const mocks = getMockContacts();
        setContacts(mocks);
      } else {
        setLoading(false);
      }
      return;
    }

    // Phase 2: real API
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (stage) params.set("stage", stage);
    if (importance) params.set("importance", importance);
    params.set("sort", sort);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    try {
      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch contacts: ${res.statusText}`);
      const data = (await res.json()) as { contacts: Contact[] };

      // API returns contacts without sections/interactions — add empty arrays for now.
      // Detail page loads sections + interactions separately via useContact(id).
      const withRelations: ContactWithRelations[] = data.contacts.map((c) => ({
        ...c,
        sections: [],
        interactions: [],
      }));
      setContacts(withRelations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
      setLoading(false);
    }
  }, [q, stage, importance, sort, limit, offset, setContacts, setLoading, setError]);

  useEffect(() => {
    void fetchContacts();
  }, [fetchContacts]);

  const contactList = listIds.map((id) => contacts[id]).filter(Boolean);

  return {
    contacts: contactList,
    loading,
    error,
    refetch: fetchContacts,
  };
}
