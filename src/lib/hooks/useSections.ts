"use client";

/**
 * useSections — manages section overrides and re-fetches after regeneration.
 *
 * Phase 1: no-op overrides (toast only).
 * Phase 2: PATCH /api/sections/:id for overrides, DELETE for restore-AI.
 *
 * The section data itself is fetched by useContact; this hook only provides
 * the override/restore actions and triggers store updates.
 */

import { useCallback } from "react";
import { useContactsStore } from "@/stores/contacts";
import { useUIStore } from "@/stores/ui";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { Section } from "@/types/section";

export function useSections(contactId: string) {
  const upsertSection = useContactsStore((s) => s.upsertSection);
  const sections = useContactsStore((s) => s.contacts[contactId]?.sections ?? []);
  const addToast = useUIStore((s) => s.addToast);

  /** Save a user override to a section. */
  const override = useCallback(
    async (section: Section, overrideMd: string, reason?: string): Promise<void> => {
      if (!isSupabaseConfigured()) {
        // Phase 1: optimistic local-only update
        upsertSection(contactId, {
          ...section,
          user_overrides_md: overrideMd,
          overridden_at: new Date().toISOString(),
          override_reason: reason ?? null,
        });
        addToast("Section saved (local only — connect Supabase to persist)", "info");
        return;
      }

      try {
        const res = await fetch(`/api/sections/${section.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_overrides_md: overrideMd, override_reason: reason }),
        });
        if (!res.ok) throw new Error(`Failed to save override (${res.status})`);
        const { section: updated } = (await res.json()) as { section: Section };
        upsertSection(contactId, updated);
        addToast("Section saved", "success");
      } catch (err) {
        addToast(err instanceof Error ? err.message : "Failed to save", "error");
      }
    },
    [contactId, upsertSection, addToast],
  );

  /** Restore a section to its AI-generated content (clear override). */
  const restoreAI = useCallback(
    async (section: Section): Promise<void> => {
      if (!isSupabaseConfigured()) {
        upsertSection(contactId, {
          ...section,
          user_overrides_md: null,
          overridden_at: null,
          override_reason: null,
        });
        addToast("Restored to AI version (local only)", "info");
        return;
      }

      try {
        const res = await fetch(`/api/sections/${section.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_overrides_md: null, override_reason: null }),
        });
        if (!res.ok) throw new Error(`Failed to restore (${res.status})`);
        const { section: updated } = (await res.json()) as { section: Section };
        upsertSection(contactId, updated);
        addToast("Restored to AI version", "success");
      } catch (err) {
        addToast(err instanceof Error ? err.message : "Failed to restore", "error");
      }
    },
    [contactId, upsertSection, addToast],
  );

  return { sections, override, restoreAI };
}
