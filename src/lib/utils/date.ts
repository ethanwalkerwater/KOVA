/**
 * Format a date string as a human-readable relative time.
 * Returns "Xm ago", "Xh ago", "Xd ago", "Xwk ago", "Xmo ago", or "Xy ago".
 * Uses client-side Date.now() — must be called after hydration.
 */
export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}wk ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`; // Use 365 for year boundary (fixes the 360-day edge case)
  return `${Math.floor(days / 365)}y ago`;
}

/**
 * Format a date string as a short absolute date: "Apr 16, 2026"
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
