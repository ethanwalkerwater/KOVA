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
  /**
   * True for contacts created offline that haven't yet synced to the server.
   * Local-only flag — never sent to Supabase.
   */
  pending?: boolean;
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

  /** Remove a contact from the cache (after successful DELETE). */
  removeContact: (id: string) => void;

  /**
   * Replace a pending (offline-created) contact with the real server-assigned one.
   * Moves the contact from oldId → newContact.id, preserving list position.
   */
  replaceContact: (oldId: string, newContact: ContactWithRelations) => void;

  /** Append a new interaction to an existing contact (optimistic). */
  appendInteraction: (contactId: string, interaction: Interaction) => void;

  /** Replace all sections for a contact after AI regeneration. */
  setSections: (contactId: string, sections: Section[]) => void;

  /** Update a single section (e.g., after user override or restore). */
  upsertSection: (contactId: string, section: Section) => void;

  /** Set list order (after search/filter). */
  setListIds: (ids: string[]) => void;

  /**
   * Append the next page of contacts to the existing list.
   * Used for "load more" pagination — preserves contacts already in the map.
   */
  appendContacts: (contacts: ContactWithRelations[]) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useContactsStore = create<ContactsState>((set) => ({
  contacts: {},
  listIds: [],
  loading: false,
  error: null,

  setContacts: (contacts) =>
    set((state) => {
      const map: Record<string, ContactWithRelations> = {};
      const ids: string[] = [];

      // Preserve any offline-pending contacts (local_ IDs) — they don't exist
      // on the server yet, so they won't appear in any API response.
      for (const [id, c] of Object.entries(state.contacts)) {
        if (c.pending) {
          map[id] = c;
          ids.push(id);
        }
      }

      for (const c of contacts) {
        const existing = state.contacts[c.id];
        // The list API returns empty sections/interactions arrays.
        // Preserve any already-loaded relations so navigating back to a detail
        // page doesn't briefly flash empty sections after the user visited it.
        map[c.id] = {
          ...c,
          sections: existing?.sections?.length ? existing.sections : c.sections,
          interactions: existing?.interactions?.length ? existing.interactions : c.interactions,
        };
        ids.push(c.id);
      }
      return { contacts: map, listIds: ids, loading: false, error: null };
    }),

  upsertContact: (contact) =>
    set((state) => {
      const isNew = !(contact.id in state.contacts);
      return {
        contacts: { ...state.contacts, [contact.id]: contact },
        listIds: isNew ? [...state.listIds, contact.id] : state.listIds,
      };
    }),

  removeContact: (id) =>
    set((state) => {
      const { [id]: _removed, ...remaining } = state.contacts;
      return {
        contacts: remaining,
        listIds: state.listIds.filter((lid) => lid !== id),
      };
    }),

  replaceContact: (oldId, newContact) =>
    set((state) => {
      // Swap the old (local) ID for the real server ID in both the map and the list.
      const { [oldId]: _stub, ...remaining } = state.contacts;
      const listIds = state.listIds.map((lid) =>
        lid === oldId ? newContact.id : lid,
      );
      return {
        contacts: { ...remaining, [newContact.id]: newContact },
        listIds,
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

  appendContacts: (newContacts) =>
    set((state) => {
      const map = { ...state.contacts };
      const newIds: string[] = [];
      for (const c of newContacts) {
        if (c.id in map) continue; // skip duplicates (shouldn't happen with offset, but safe)
        const existing = map[c.id];
        map[c.id] = {
          ...c,
          sections: existing?.sections?.length ? existing.sections : c.sections,
          interactions: existing?.interactions?.length ? existing.interactions : c.interactions,
        };
        newIds.push(c.id);
      }
      return {
        contacts: map,
        listIds: [...state.listIds, ...newIds],
        loading: false,
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
