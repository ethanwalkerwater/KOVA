/**
 * UI store — ephemeral UI state that doesn't belong in URL or server state.
 *
 * Things like: capture modal open/closed, active search query,
 * which contact is being viewed, toast notifications.
 */

import { create } from "zustand";

export type ToastVariant = "info" | "success" | "error";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface UIState {
  // ── Capture modal ──────────────────────────────────────────────────────────
  /** Whether the new-interaction capture sheet is open. */
  captureOpen: boolean;
  /** Pre-populated contact ID when capturing for a specific contact. */
  captureContactId: string | null;

  openCapture: (contactId?: string) => void;
  closeCapture: () => void;

  // ── Search ─────────────────────────────────────────────────────────────────
  contactSearchQuery: string;
  setContactSearchQuery: (query: string) => void;

  // ── Toasts ─────────────────────────────────────────────────────────────────
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;

  // ── Regeneration state ─────────────────────────────────────────────────────
  /** Contact IDs currently being regenerated — used to show spinners. */
  regeneratingContactIds: Set<string>;
  setRegenerating: (contactId: string, regenerating: boolean) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  captureOpen: false,
  captureContactId: null,

  openCapture: (contactId) => set({ captureOpen: true, captureContactId: contactId ?? null }),
  closeCapture: () => set({ captureOpen: false, captureContactId: null }),

  contactSearchQuery: "",
  setContactSearchQuery: (query) => set({ contactSearchQuery: query }),

  toasts: [],
  addToast: (message, variant = "info") =>
    set((state) => ({
      toasts: [...state.toasts, { id: String(++toastCounter), message, variant }],
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  regeneratingContactIds: new Set(),
  setRegenerating: (contactId, regenerating) =>
    set((state) => {
      const next = new Set(state.regeneratingContactIds);
      if (regenerating) next.add(contactId);
      else next.delete(contactId);
      return { regeneratingContactIds: next };
    }),
}));
