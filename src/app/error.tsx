"use client";

/**
 * Root error boundary — catches unhandled errors from any route in the app.
 * Next.js automatically renders this when a server or client component throws.
 *
 * This is the last-resort fallback. Route-level error.tsx files (e.g. in
 * (main)/clients/[id]/) can provide more contextual recovery UI.
 */

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-8 text-center bg-surface-primary gap-4">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
        <span className="text-red-500 text-2xl">!</span>
      </div>
      <h1 className="text-fg-primary font-bold text-xl">Something went wrong</h1>
      <p className="text-fg-muted text-sm max-w-xs">
        {error.message ?? "An unexpected error occurred. Your data is safe."}
      </p>
      <button
        onClick={reset}
        className="mt-2 px-5 py-2.5 rounded-xl bg-accent text-fg-inverse text-sm font-semibold"
      >
        Try again
      </button>
    </div>
  );
}
