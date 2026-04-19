/**
 * In-memory sliding-window rate limiter.
 *
 * Good for single-instance deployments (dev, small production).
 * For multi-instance Vercel deployments, swap the store for
 * Upstash Redis + @upstash/ratelimit — same interface.
 *
 * Usage:
 *   const { allowed, retryAfterMs } = checkRateLimit("regenerate", userId, {
 *     maxRequests: 5,
 *     windowMs: 60_000,
 *   });
 *   if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
 */

interface RateLimitOptions {
  /** Max requests allowed in the window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds until the oldest request falls out of the window. */
  retryAfterMs: number;
  /** Requests remaining in the current window. */
  remaining: number;
}

// key → sorted array of request timestamps (ms)
const store = new Map<string, number[]>();

// Cleanup interval — prune stale windows every 5 min
setInterval(
  () => {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
      if (timestamps.length === 0 || now - timestamps[timestamps.length - 1]! > 3_600_000) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

export function checkRateLimit(
  /** Logical name of the endpoint, e.g. "regenerate" */
  endpoint: string,
  /** Per-user key, e.g. user ID */
  userId: string,
  options: RateLimitOptions,
): RateLimitResult {
  const { maxRequests, windowMs } = options;
  const key = `${endpoint}:${userId}`;
  const now = Date.now();
  const cutoff = now - windowMs;

  // Get existing timestamps, drop those outside the window
  const raw = store.get(key) ?? [];
  const windowed = raw.filter((t) => t > cutoff);

  if (windowed.length >= maxRequests) {
    // Oldest request determines when they can retry
    const oldest = windowed[0]!;
    const retryAfterMs = oldest + windowMs - now;
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0), remaining: 0 };
  }

  // Record this request
  windowed.push(now);
  store.set(key, windowed);

  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: maxRequests - windowed.length,
  };
}

/**
 * Build a rate-limit error response with Retry-After header.
 */
export function rateLimitResponse(retryAfterMs: number) {
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded", retryAfter: retryAfterSec }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}
