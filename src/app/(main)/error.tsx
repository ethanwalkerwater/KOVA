"use client";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <p className="text-fg-primary font-semibold text-lg mb-2">Something went wrong</p>
      <p className="text-fg-muted text-sm mb-6">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="bg-accent text-white rounded-full px-6 py-2 text-sm font-semibold"
      >
        Try again
      </button>
    </div>
  );
}
