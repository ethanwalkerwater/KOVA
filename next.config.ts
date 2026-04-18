import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Disable service worker in development to avoid stale-cache headaches.
  // The PWA manifest + icons still work; only the offline layer is skipped.
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Serwist injects a webpack plugin. Next.js 16 requires an explicit
  // turbopack config alongside any webpack config to avoid a hard error.
  // An empty object is sufficient — it tells Next.js "Turbopack is intended".
  // The Serwist SW is built via webpack; in Turbopack dev mode the SW is
  // disabled anyway (see `disable` above), so there's no conflict at runtime.
  turbopack: {},
};

export default withSerwist(nextConfig);
