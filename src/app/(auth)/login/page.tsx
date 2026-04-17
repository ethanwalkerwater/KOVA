"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

type Mode = "sign_in" | "sign_up";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Phase 1: Supabase not configured — skip auth entirely
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-dvh bg-surface-secondary flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-10 flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-2xl bg-accent flex items-center justify-center">
            <span className="text-fg-inverse font-bold text-xl">K</span>
          </div>
          <h1 className="text-fg-primary font-semibold text-2xl tracking-tight">Kova</h1>
          <p className="text-fg-secondary text-sm text-center">Relationship intelligence for B2B sales</p>
        </div>
        <div className="w-full max-w-sm bg-surface-primary rounded-2xl border border-border p-6 shadow-sm flex flex-col gap-4">
          <p className="text-fg-primary font-semibold text-center">Demo Mode</p>
          <p className="text-fg-secondary text-sm text-center leading-relaxed">
            Supabase is not configured. You&apos;re running in demo mode with mock data.
          </p>
          <button
            onClick={() => router.push("/home")}
            className="h-11 rounded-xl bg-accent text-fg-inverse font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            Continue in Demo Mode
          </button>
          <p className="text-fg-muted text-xs text-center">
            Add{" "}
            <code className="bg-surface-secondary px-1 py-0.5 rounded text-xs">NEXT_PUBLIC_SUPABASE_URL</code>
            {" "}&amp;{" "}
            <code className="bg-surface-secondary px-1 py-0.5 rounded text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
            {" "}to .env.local to enable real accounts.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      if (mode === "sign_up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setSuccess("Check your email for the confirmation link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/home");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-surface-secondary flex flex-col items-center justify-center px-6 py-12">
      {/* Logo / wordmark */}
      <div className="mb-10 flex flex-col items-center gap-2">
        <div className="h-12 w-12 rounded-2xl bg-accent flex items-center justify-center">
          <span className="text-fg-inverse font-bold text-xl">K</span>
        </div>
        <h1 className="text-fg-primary font-semibold text-2xl tracking-tight">Kova</h1>
        <p className="text-fg-secondary text-sm text-center">
          {mode === "sign_in" ? "Sign in to your account" : "Create your account"}
        </p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm bg-surface-primary rounded-2xl border border-border p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-fg-primary text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 rounded-xl border border-border bg-surface-secondary px-3 text-fg-primary text-sm placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-fg-primary text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete={mode === "sign_up" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
              className="h-11 rounded-xl border border-border bg-surface-secondary px-3 text-fg-primary text-sm placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          {/* Error / success */}
          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p
              role="status"
              className="text-sm text-accent-green bg-accent-green-light rounded-lg px-3 py-2"
            >
              {success}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-xl bg-accent text-fg-inverse font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Loading…" : mode === "sign_in" ? "Sign in" : "Create account"}
          </button>
        </form>

        {/* Mode toggle */}
        <p className="mt-5 text-center text-sm text-fg-secondary">
          {mode === "sign_in" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "sign_in" ? "sign_up" : "sign_in");
              setError(null);
              setSuccess(null);
            }}
            className="text-accent font-medium hover:underline"
          >
            {mode === "sign_in" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
