"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * /reset-password
 *
 * Users land here after clicking the password-reset email link.
 * The /auth/callback route has already exchanged the code for a session,
 * so we just need to call updateUser({ password }) with the new value.
 */
export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      // Brief pause so user sees the success message before redirect
      setTimeout(() => router.push("/home"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
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
        <p className="text-fg-secondary text-sm text-center">Choose a new password</p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm bg-surface-primary rounded-2xl border border-border p-6 shadow-sm">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="h-12 w-12 rounded-full bg-accent-green-light flex items-center justify-center">
              <svg
                className="w-6 h-6 text-accent-green"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-fg-primary font-semibold text-center">Password updated!</p>
            <p className="text-fg-secondary text-sm text-center">Taking you to your contacts...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* New password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-fg-primary text-sm font-medium">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                className="h-11 rounded-xl border border-border bg-surface-secondary px-3 text-fg-primary text-sm placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm" className="text-fg-primary text-sm font-medium">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                className="h-11 rounded-xl border border-border bg-surface-secondary px-3 text-fg-primary text-sm placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>

            {/* Error */}
            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="h-11 rounded-xl bg-accent text-fg-inverse font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Updating…" : "Set new password"}
            </button>
          </form>
        )}

        {/* Back to sign in */}
        {!success && (
          <p className="mt-5 text-center text-sm text-fg-secondary">
            Remember it?{" "}
            <a href="/login" className="text-accent font-medium hover:underline">
              Sign in
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
