/**
 * Auth store — holds the current user session from Supabase Auth.
 *
 * Populated by the root layout / auth provider on mount.
 * Phase 1: always null (mock data, no auth required).
 * Phase 2: set from supabase.auth.getSession() + onAuthStateChange().
 */

import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;

  /** Call from your auth provider on initial load and auth state changes. */
  setSession: (session: Session | null) => void;
  /** Mark auth as fully initialised (even if no session). */
  setLoading: (loading: boolean) => void;
  /** Clear session on sign-out. */
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      loading: false,
    }),

  setLoading: (loading) => set({ loading }),

  signOut: () =>
    set({
      session: null,
      user: null,
      loading: false,
    }),
}));
