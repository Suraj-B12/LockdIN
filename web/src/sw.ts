/// <reference lib="webworker" />
/* =====================================================================
   LockdIN custom service worker (vite-plugin-pwa `injectManifest`).

   This is the ONE service worker registered at root scope. It does two jobs:

   1. OneSignal Web Push — `importScripts` pulls in OneSignal's worker SDK at
      the very top (must be first, before any other work). OneSignal is told to
      use THIS file (see src/lib/onesignal.ts: serviceWorkerPath: "sw.js",
      serviceWorkerOverrideForTypical: true), so it never registers its own
      OneSignalSDKWorker.js — avoiding the "two SWs, one scope" conflict.

   2. PWA precache + runtime caching — Workbox precaches the app shell (the
      `self.__WB_MANIFEST` is injected at build time by vite-plugin-pwa) and
      runtime-caches the avatar PNGs (which are excluded from the precache to
      keep first install lean — see vite.config.ts injectManifest.globIgnores).

   NOTE: importing OneSignal from the CDN means the SW needs network on first
   install to fetch it; this matches OneSignal's documented v16 setup.
   ===================================================================== */
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

// OneSignal's service-worker SDK. Must be imported before anything else so its
// push/notification event listeners are registered first.
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// In a module service worker `self` is the ServiceWorkerGlobalScope. The DOM lib
// (from tsconfig) types the global `self` as Window, so we re-type it locally.
// `__WB_MANIFEST` is the precache manifest placeholder vite-plugin-pwa replaces
// at build time; it MUST appear literally in the source for injection to work.
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Precache + serve the app shell (HTML/JS/CSS/fonts/icons).
precacheAndRoute(self.__WB_MANIFEST);

// Avatar PNGs: cache-first, capped + expiring, so they load instantly offline
// without bloating the precache. (Moved here from the old generateSW config.)
registerRoute(
  ({ url }) => url.pathname.startsWith("/avatars/"),
  new CacheFirst({
    cacheName: "lockdin-avatars",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 160,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Let the page tell a waiting SW to activate immediately (registerType:
// "autoUpdate" posts SKIP_WAITING after detecting an update).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
