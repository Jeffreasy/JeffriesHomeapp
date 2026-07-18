"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { MotionConfig } from "framer-motion";
import { defaultShouldDehydrateQuery, QueryClient, useQueryClient } from "@tanstack/react-query";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { useEffect, useId, useRef, useState } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { OverlaySurface } from "@/components/ui/OverlaySurface";
import { PwaRegistry } from "@/components/pwa/PwaRegistry";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { registerQueryClient, registerSessionExpiredHandler } from "@/lib/api";
import { shouldPersistQuery } from "@/lib/query-persistence";

// Invalidate the persisted cache whenever the deployed build changes, so a
// fresh deploy never hydrates stale query shapes into new code (L4).
const PERSIST_BUSTER = process.env.NEXT_PUBLIC_BUILD_ID ?? "jeffries-2026-07-01";



function AuthCachePurger() {
  const { isSignedIn, isLoaded } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      queryClient.clear();
      del("REACT_QUERY_OFFLINE_CACHE").catch((err) =>
        console.error("Failed to delete offline cache:", err)
      );
      if (typeof window !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "CLEAR_ALL_CACHES" });
      }
    }
  }, [isSignedIn, isLoaded, queryClient]);

  return null;
}


// Persistent, blocking session-expired overlay (R3-H3). Driven by a one-shot
// module-level signal the api layer fires on any 401. Sits above everything
// (z-[120], above toast 110) so an open dirty form survives until the user
// chooses to re-login — no silent hard-redirect can steal their input.
function SessionExpiredOverlay() {
  const [expired, setExpired] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const reloginRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    registerSessionExpiredHandler(() => setExpired(true));
  }, []);

  const relogin = () => {
    if (typeof window === "undefined") return;
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/sign-in?redirect_url=${redirect}`;
  };

  return (
    <OverlaySurface
      open={expired}
      onClose={() => {}}
      role="alertdialog"
      presentation="dialog"
      maxWidth="sm"
      ariaLabelledBy={titleId}
      ariaDescribedBy={descriptionId}
      closeOnBackdrop={false}
      closeOnEscape={false}
      priority="critical"
      initialFocusRef={reloginRef}
      backdropClassName="bg-black/70"
      className="rounded-2xl border border-[var(--color-border)] bg-[rgba(15,23,42,0.97)] p-6 text-center shadow-2xl"
    >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="text-amber-400"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 id={titleId} className="mb-1 text-base font-semibold text-white">
          Je sessie is verlopen
        </h2>
        <p id={descriptionId} className="mb-5 text-sm text-slate-400">
          Log opnieuw in om verder te gaan. Je openstaande invoer blijft staan tot je hierop klikt.
        </p>
        <button
          ref={reloginRef}
          type="button"
          onClick={relogin}
          className="min-h-11 w-full rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 px-4 text-sm font-bold text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90"
        >
          Opnieuw inloggen
        </button>
    </OverlaySurface>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 10_000,
          refetchOnWindowFocus: true,
          gcTime: 1000 * 60 * 60 * 24, // 24 hours
          retry: 1,
        },
        mutations: {
          // Writes must NOT pause silently when offline (the default
          // networkMode:'online' parks the promise forever, so a note save
          // looks "saving" but is dropped on tab close). 'always' makes an
          // offline write fail fast → the editor surfaces the error and keeps
          // the user's typed content instead of losing it.
          networkMode: "always",
        },
      },
    });
    // Expose the client to lib/api's 401 handler (L5) without a circular import.
    registerQueryClient(client);
    return client;
  });

  // Pure config object — creating it does NOT touch window/indexedDB (the
  // idb-keyval calls only run when the persister is actually used, which
  // happens client-side inside PersistQueryClientProvider). Creating it
  // synchronously means we always render ONE provider tree: the old
  // "null persister → swap providers in an effect" pattern remounted the
  // whole app one frame after first paint (hydration flicker, M1).
  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: {
        getItem: async (key) => (await get(key)) || null,
        setItem: async (key, value) => await set(key, value),
        removeItem: async (key) => await del(key),
      },
      // Serializing the whole cache on every poll tick (default 1s throttle) is
      // main-thread pressure on a long-running kiosk (R3). 5s coalesces bursts
      // without breaking offline-restore — the last write still lands.
      throttleTime: 5000,
    })
  );

  return (
    <ClerkProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          buster: PERSIST_BUSTER,
          // Match gcTime (24h): a persisted cache older than this is dropped on
          // restore rather than hydrating stale data into a fresh session.
          maxAge: 1000 * 60 * 60 * 24,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              defaultShouldDehydrateQuery(query) &&
              shouldPersistQuery(query.queryKey, query.meta),
          },
        }}
      >
        <AuthCachePurger />
        <ToastProvider>
          <ConfirmProvider>
            <PwaRegistry />
            <ErrorBoundary>
              <MotionConfig reducedMotion="user">{children}</MotionConfig>
            </ErrorBoundary>
          </ConfirmProvider>
        </ToastProvider>
        <SessionExpiredOverlay />
      </PersistQueryClientProvider>
    </ClerkProvider>
  );
}
