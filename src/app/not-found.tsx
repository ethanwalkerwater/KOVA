import Link from "next/link";

/**
 * 404 — rendered by Next.js when notFound() is called or a route doesn't match.
 * This is a Server Component (no "use client" needed).
 */

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-8 text-center bg-surface-primary gap-4">
      <div className="w-16 h-16 rounded-full bg-surface-secondary flex items-center justify-center mb-2">
        <span className="text-fg-muted text-3xl font-bold">?</span>
      </div>
      <h1 className="text-fg-primary font-bold text-xl">Page not found</h1>
      <p className="text-fg-muted text-sm max-w-xs">
        This page doesn&apos;t exist or was removed.
      </p>
      <Link
        href="/home"
        className="mt-2 px-5 py-2.5 rounded-xl bg-accent text-fg-inverse text-sm font-semibold"
      >
        Go to Home
      </Link>
    </div>
  );
}
