/// <reference lib="webworker" />

/**
 * Service Worker — powered by Serwist.
 *
 * Caching strategy:
 * - App shell (HTML/JS/CSS): NetworkFirst so the app always gets updates,
 *   but falls back to cache when offline.
 * - Static assets (/icons/, /_next/static/): CacheFirst with a long TTL —
 *   they're content-hashed so it's safe to serve stale indefinitely.
 * - API routes: NetworkOnly — we never want stale data served from cache.
 *   Offline interactions are handled client-side via Dexie (see useSyncPending).
 *
 * The `defaultCache` list from @serwist/next covers all the standard
 * Next.js-specific patterns (RSC prefetch, HTML, chunks) with sensible
 * strategies, so we compose on top of it.
 */

import { defaultCache } from "@serwist/next/worker";
import { Serwist, NetworkOnly, CacheFirst, ExpirationPlugin } from "serwist";
import type { PrecacheEntry } from "serwist";

// Serwist injects __SW_MANIFEST at build time — declare it here so TypeScript
// doesn't complain. The global augmentation merges with ServiceWorkerGlobalScope.
declare global {
  interface ServiceWorkerGlobalScope {
    __SW_MANIFEST: Array<PrecacheEntry | string>;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // API routes — always go to network; never cache
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    // Supabase API calls — always network
    {
      matcher: ({ url }) => url.hostname.includes("supabase"),
      handler: new NetworkOnly(),
    },
    // Static icons — cache-first, immutable (content-hashed names)
    {
      matcher: ({ url }) => url.pathname.startsWith("/icons/"),
      handler: new CacheFirst({
        cacheName: "icons",
        plugins: [
          new ExpirationPlugin({
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          }),
        ],
      }),
    },
    // Spread Next.js defaults (handles RSC, HTML, JS chunks)
    ...defaultCache,
  ],
});

serwist.addEventListeners();
