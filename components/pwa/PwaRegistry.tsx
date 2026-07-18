"use client";

import { useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { surfaceVariants } from "@/components/ui/Surface";
import { reportClientError } from "@/lib/observability/client-events";
import { decideControllerChange } from "@/lib/pwa-update";
import { cn } from "@/lib/utils";

export function PwaRegistry() {
  const [isOffline, setIsOffline] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let updateInterval: ReturnType<typeof setInterval> | undefined;
    let registration: ServiceWorkerRegistration | undefined;
    let hadController = Boolean(navigator.serviceWorker?.controller);

    const inspectInstallingWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (
          !cancelled &&
          worker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          setUpdateReady(true);
        }
      });
    };

    const handleUpdateFound = () => {
      inspectInstallingWorker(registration?.installing ?? null);
    };

    const registerServiceWorker = () => {
      if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

      navigator.serviceWorker
        .register("/sw.js")
        .then((nextRegistration) => {
          if (cancelled) return;
          registration = nextRegistration;
          if (registration.waiting) setUpdateReady(true);
          inspectInstallingWorker(registration.installing);
          registration.addEventListener("updatefound", handleUpdateFound);
          updateInterval = setInterval(() => {
            registration?.update().catch((error) => reportClientError(error, "pwa"));
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          if (!cancelled) reportClientError(error, "pwa");
        });
    };

    const handleControllerChange = () => {
      const decision = decideControllerChange(hadController);
      hadController = decision.hadController;
      if (decision.promptForUpdate) setUpdateReady(true);
    };
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const connectionSyncFrame = window.requestAnimationFrame(() => {
      setIsOffline(!window.navigator.onLine);
    });

    if (document.readyState === "complete") registerServiceWorker();
    else window.addEventListener("load", registerServiceWorker);
    navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(connectionSyncFrame);
      window.removeEventListener("load", registerServiceWorker);
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
      registration?.removeEventListener("updatefound", handleUpdateFound);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (updateInterval !== undefined) clearInterval(updateInterval);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-[var(--layer-status)] flex flex-col items-center gap-2">
      <AnimatePresence>
        {isOffline ? (
          <motion.div
            key="offline"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            role="status"
            className={cn(surfaceVariants({ tone: "danger", radius: "lg", padding: "sm" }), "pointer-events-auto flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold backdrop-blur-md")}
          >
            <WifiOff size={16} aria-hidden="true" />
            <span>Offline modus actief</span>
          </motion.div>
        ) : null}
        {updateReady ? (
          <motion.div
            key="update"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            role="status"
            className={cn(surfaceVariants({ tone: "accent", radius: "lg", padding: "sm" }), "pointer-events-auto flex min-h-11 max-w-md items-center gap-3 text-sm backdrop-blur-md")}
          >
            <RefreshCw size={16} className="shrink-0 text-[var(--color-primary-hover)]" aria-hidden="true" />
            <span className="min-w-0 flex-1">Nieuwe versie gereed</span>
            <Button size="sm" variant="primary" onClick={() => window.location.reload()}>
              Nu herladen
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
