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
  // Track whether we've completed at least one successful load — distinguishes
  // the first cold fetch (show skeleton) from subsequent refetches (dim list).
  const hasLoadedOnceRef = useRef(false);
  // Current page offset for the active query
  const [offset, setOffset] = useState(0);
  // Whether there are potentially more pages to load
  const [hasMore, setHasMore] = useState(false);
  // Total count reported by the server for the active query — drives the
  // "Showing X of Y" label and the visibility of the Load more button.
  const [total, setTotal] = useState<number | null>(null);
  // Loading state specifically for "load more" (separate from initial load spinner)
  const [loadingMore, setLoadingMore] = useState(false);
  // In-flight state for search / filter / sort changes after the first load.
  // Separate from `loading` so the UI can dim the stale list instead of
  // flashing a skeleton on every keystroke.
  const [searching, setSearching] = useState(false);

  // Reset pagination whenever query params change
  useEffect(() => {
    setOffset(0);
    setHasMore(false);
    setTotal(null);
  }, [q, stage, importance, sort]);

  const fetchContacts = useCallback(
    async (pageOffset: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else if (hasLoadedOnceRef.current) {
        // Not the first load — keep existing list visible, use searching flag
        setSearching(true);
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
        setSearching(false);
        hasLoadedOnceRef.current = true;
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
        const data = (await res.json()) as { contacts: Contact[]; total?: number };

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

        // Prefer the server-reported total when available; fall back to
        // "got a full page => probably more" if the count query silently
        // failed server-side (graceful degrade).
        if (typeof data.total === "number") {
          setTotal(data.total);
          const loadedCount = pageOffset + data.contacts.length;
          setHasMore(loadedCount < data.total);
        } else {
          setHasMore(data.contacts.length === PAGE_SIZE);
        }
        hasLoadedOnceRef.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contacts");
        if (!append) setLoading(false);
      } finally {
        setLoadingMore(false);
        setSearching(false);
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
    searching,
    error,
    hasMore,
    loadingMore,
    loadMore,
    total,
    refetch: () => fetchContacts(0, false),
  };
}
