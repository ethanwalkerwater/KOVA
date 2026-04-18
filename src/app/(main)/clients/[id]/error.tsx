"use client";

/**
 * Route-level error boundary for the contact detail page.
 * Shown when ContactDetailScreen throws — e.g. a bad API response or
 * an unexpected null that bypasses TypeScript types at runtime.
 */

import Link from "next/link";

interface ErrorPageProps {
  error: Error;
  reset: () => void;
}

export default function ContactDetailError({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60dvh] px-8 text-center gap-3">
      <p className="text-fg-primary font-semibold text-base">Failed to load contact</p>
      <p className="text-fg-muted text-sm max-w-xs">
        {error.message ?? "Something went wrong loading this contact."}
      </p>
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl bg-accent text-fg-inverse text-sm font-medium"
        >
          Try again
        </button>
        <Link
          href="/clients"
          className="px-4 py-2 rounded-xl bg-surface-secondary text-fg-secondary text-sm font-medium border border-border"
        >
          Back to Clients
        </Link>
      </div>
    </div>
  );
}
