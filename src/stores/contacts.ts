/**
 * Contacts store — in-memory cache of contacts + their sections/interactions.
 *
 * Phase 1: seeded from mock-data, no Supabase.
 * Phase 2: populated by useContacts hook which calls Supabase.
 *
 * The store is intentionally simple — it's a read cache + optimistic update layer.
 * All writes go through the API routes; successful writes update the cache.
 */

import { create } from "zustand";
import type { Contact } from "@/types/contact";
import type { Interaction } from "@/types/interaction";
import type { Section } from "@/types/section";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContactWithRelations extends Contact {
  sections: Section[];
  interactions: Interaction[];
}

interface ContactsState {
  /** All contacts for the current user, keyed by ID. */
  contacts: Record<string, ContactWithRelations>;
  /** Contacts sorted/filtered for the list view. */
  listIds: string[];
  loading: boolean;
  error: string | null;

  // ── Mutations ──────────────────────────────────────────────────────────────

  /** Replace the full contacts map (initial load). */
  setContacts: (contacts: ContactWithRelations[]) => void;

  /** Update or insert a single contact in the cache. */
  upsertContact: (contact: ContactWithRelations) => void;

  /** Append a new interaction to an existing contact (optimistic). */
  appendInteraction: (contactId: string, interaction: Interaction) => void;

  /** Replace all sections for a contact after AI regeneration. */
  setSections: (contactId: string, sections: Section[]) => void;

  /** Update a single section (e.g., after user override or restore). */
  upsertSection: (contactId: string, section: Section) => void;

  /** Set list order (after search/filter). */
  setListIds: (ids: string[]) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useContactsStore = create<ContactsState>((set) => ({
  contacts: {},
  listIds: [],
  loading: false,
  error: null,

  setContacts: (contacts) => {
    const map: Record<string, ContactWithRelations> = {};
    const ids: string[] = [];
    for (const c of contacts) {
      map[c.id] = c;
      ids.push(c.id);
    }
    set({ contacts: map, listIds: ids, loading: false, error: null });
  },

  upsertContact: (contact) =>
    set((state) => {
      const isNew = !(contact.id in state.contacts);
      return {
        contacts: { ...state.contacts, [contact.id]: contact },
        listIds: isNew ? [...state.listIds, contact.id] : state.listIds,
      };
    }),

  appendInteraction: (contactId, interaction) =>
    set((state) => {
      const contact = state.contacts[contactId];
      if (!contact) return state;
      return {
        contacts: {
          ...state.contacts,
          [contactId]: {
            ...contact,
            interactions: [interaction, ...contact.interactions],
            last_interaction_at: interaction.created_at,
          },
        },
      };
    }),

  setSections: (contactId, sections) =>
    set((state) => {
      const contact = state.contacts[contactId];
      if (!contact) return state;
      return {
        contacts: {
          ...state.contacts,
          [contactId]: { ...contact, sections },
        },
      };
    }),

  upsertSection: (contactId, section) =>
    set((state) => {
      const contact = state.contacts[contactId];
      if (!contact) return state;
      const sections = contact.sections.map((s) => (s.slug === section.slug ? section : s));
      if (!sections.find((s) => s.slug === section.slug)) sections.push(section);
      return {
        contacts: {
          ...state.contacts,
          [contactId]: { ...contact, sections },
        },
      };
    }),

  setListIds: (listIds) => set({ listIds }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectContact = (id: string) => (state: ContactsState) => state.contacts[id];

export const selectContactList = (state: ContactsState) =>
  state.listIds.map((id) => state.contacts[id]).filter(Boolean);
