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

export type CaptureMode = "text" | "scan";

interface UIState {
  // ── Capture modal ──────────────────────────────────────────────────────────
  /** Whether the new-interaction capture sheet is open. */
  captureOpen: boolean;
  /** Pre-populated contact ID when capturing for a specific contact. */
  captureContactId: string | null;
  /** Optional text to pre-fill when the sheet opens (e.g. from ChatInputBar). */
  captureInitialText: string | null;
  /** Initial tab to activate in the capture sheet. */
  captureMode: CaptureMode;

  openCapture: (contactId?: string, initialText?: string, mode?: CaptureMode) => void;
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

  // ── Follow-up badge ────────────────────────────────────────────────────────
  /** Number of pending follow-ups today — drives the Home tab badge. */
  pendingSuggestionCount: number;
  setPendingSuggestionCount: (count: number) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  captureOpen: false,
  captureContactId: null,
  captureInitialText: null,
  captureMode: "text",

  openCapture: (contactId, initialText, mode = "text") =>
    set({
      captureOpen: true,
      captureContactId: contactId ?? null,
      captureInitialText: initialText ?? null,
      captureMode: mode,
    }),
  closeCapture: () =>
    set({
      captureOpen: false,
      captureContactId: null,
      captureInitialText: null,
      captureMode: "text",
    }),

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

  pendingSuggestionCount: 0,
  setPendingSuggestionCount: (count) => set({ pendingSuggestionCount: count }),
}));
