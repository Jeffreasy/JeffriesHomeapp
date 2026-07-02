"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PwaRegistry() {
  const [isOffline, setIsOffline] = useState(() =>
    typeof window === "undefined" ? false : !window.navigator.onLine
  );

  useEffect(() => {
    let updateInterval: ReturnType<typeof setInterval> | undefined;

    const registerServiceWorker = () => {
      // Only register the production SW build (L12) — in dev @serwist/next is
      // disabled, so registering would serve a stale public/sw.js and cache
      // dev responses.
      if (process.env.NODE_ENV !== "production") return;
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered with scope:", registration.scope);
            // Periodically check for a new deploy (M6) so long-lived tabs
            // (kiosk!) pick up the new build instead of eventually dying on a
            // ChunkLoadError against deleted chunk URLs.
            updateInterval = setInterval(() => {
              registration.update().catch(() => {});
            }, 60 * 60 * 1000);
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      }
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // The window `load` event may already have fired by the time this effect
    // runs (hydration after load) — in that case the listener would never
    // fire and the service worker would silently never register.
    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("load", registerServiceWorker);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (updateInterval !== undefined) clearInterval(updateInterval);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/20 px-4 py-1.5 text-sm font-semibold text-rose-200 shadow-lg backdrop-blur-md"
        >
          <WifiOff size={16} />
          <span>Offline modus actief</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
