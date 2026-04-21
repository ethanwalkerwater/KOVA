"use client";

/**
 * useContacts — fetches and caches the contacts list.
 *
 * Phase 1 (Supabase not configured): seeds the store from mock data once.
 * Phase 2: fetches from /api/contacts with optional filtering + pagination.
 *
 * Exposes `loadMore` for progressive pagination (50 per page).
 * Call at the Clients page level. Individual detail pages use useContact(id).
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { useContactsStore, type ContactWithRelations } from "@/stores/contacts";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { Contact } from "@/types/contact";

const PAGE_SIZE = 50;

interface UseContactsOptions {
  q?: string;
  stage?: string;
  importance?: string;
  sort?: "last_interaction_at" | "relationship_score" | "name" | "created_at";
}

export function useContacts(options: UseContactsOptions = {}) {
  const { q = "", stage, importance, sort = "last_interaction_at" } = options;

  const { setContacts, appendContacts, setLoading, setError, listIds, contacts, loading, error } =
    useContactsStore();

  // Track whether we've seeded mock data already (Phase 1 only)
  const seededRef = useRef(false);
  // Current page offset for the active query
  const [offset, setOffset] = useState(0);
  // Whether there are potentially more pages to load
  const [hasMore, setHasMore] = useState(false);
  // Loading state specifically for "load more" (separate from initial load spinner)
  const [loadingMore, setLoadingMore] = useState(false);

  // Reset pagination whenever query params change
  useEffect(() => {
    setOffset(0);
    setHasMore(false);
  }, [q, stage, importance, sort]);

  const fetchContacts = useCallback(
    async (pageOffset: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
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
        setLoadingMore(false);
        return;
      }

      // Phase 2: real API
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (stage) params.set("stage", stage);
      if (importance) params.set("importance", importance);
      params.set("sort", sort);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(pageOffset));

      try {
        const res = await fetch(`/api/contacts?${params.toString()}`);
        if (!res.ok) throw new Error(`Failed to fetch contacts: ${res.statusText}`);
        const data = (await res.json()) as { contacts: Contact[] };

        const withRelations: ContactWithRelations[] = data.contacts.map((c) => ({
          ...c,
          sections: [],
          interactions: [],
        }));

        if (append) {
          appendContacts(withRelations);
        } else {
          setContacts(withRelations);
        }

        // If we got a full page, there might be more
        setHasMore(data.contacts.length === PAGE_SIZE);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contacts");
        if (!append) setLoading(false);
      } finally {
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, stage, importance, sort, setContacts, appendContacts, setLoading, setError],
  );

  // Initial load (or when filters change — offset resets to 0 above)
  useEffect(() => {
    void fetchContacts(0, false);
  }, [fetchContacts]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    void fetchContacts(nextOffset, true);
  }, [loadingMore, hasMore, offset, fetchContacts]);

  const contactList = listIds.map((id) => contacts[id]).filter(Boolean);

  return {
    contacts: contactList,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMore,
    refetch: () => fetchContacts(0, false),
  };
}
