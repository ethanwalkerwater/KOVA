"use client";

/**
 * AuthProvider — subscribes to Supabase auth state and syncs it to useAuthStore.
 *
 * Phase 1 (no NEXT_PUBLIC_SUPABASE_URL): does nothing, auth store stays loading=true → false.
 * Phase 2: getSession() on mount + onAuthStateChange subscription.
 *
 * Renders children immediately (no loading gate) — individual pages handle their own
 * loading/redirect logic via middleware and useAuthStore.loading.
 */

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { useSyncPending } from "@/lib/hooks/useSyncPending";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setSession, setLoading } = useAuthStore();

  // Drain offline sync queue whenever we come online
  useSyncPending();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Phase 1: no auth needed, mark loading done immediately
      setLoading(false);
      return;
    }

    // Lazy import so the supabase client is not created in Phase 1 builds
    // where env vars are absent (would throw at createBrowserClient).
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();

      // Hydrate from existing session immediately
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
      });

      // Subscribe to all future auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

      return () => {
        subscription.unsubscribe();
      };
    });
  }, [setSession, setLoading]);

  return <>{children}</>;
}
