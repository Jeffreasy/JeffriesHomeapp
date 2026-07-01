import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that points to where the precache manifest should be injected.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && pathname.startsWith("/api/"),
    method: "GET",
    handler: new NetworkOnly(),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  // Offline fallback (M5): navigations that miss both network and cache get a
  // minimal Dutch offline document instead of the browser's error page.
  // public/offline.html is precached via the injected manifest (public/ files
  // are included by @serwist/next's default globPublicPatterns).
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_ALL_CACHES") {
    (event as any).waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            // Only wipe runtime caches (cached API/user data). The serwist
            // precache holds the app shell + offline fallback; deleting it
            // would break offline navigation until the next SW update (L6).
            .filter((cacheName) => !cacheName.includes("precache"))
            .map((cacheName) => {
              return caches.delete(cacheName);
            })
        );
      })
    );
  }
});
