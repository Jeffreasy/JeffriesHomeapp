"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { MotionConfig } from "framer-motion";
import { defaultShouldDehydrateQuery, QueryClient, useQueryClient, type QueryKey } from "@tanstack/react-query";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { useEffect, useState } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { PwaRegistry } from "@/components/pwa/PwaRegistry";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { registerQueryClient } from "@/lib/api";

const PERSIST_DENY_PREFIXES = [
  "/notes",
  "/personal-events",
  "/schedule",
  "/sync",
  "sync-status",
  // Orval-generated salary/payslip keys are ["/loonstroken", …] / ["/salary", …].
  "/loonstroken",
  "/salary",
  // LaventeCare hooks use plain ["laventecare", …] keys (no slash) — the old
  // "/laventecare" entry never matched, so client dossiers/invoices/mail
  // bodies ended up in IndexedDB anyway (R6, privacy-sensitive).
  "laventecare",
];

// Invalidate the persisted cache whenever the deployed build changes, so a
// fresh deploy never hydrates stale query shapes into new code (L4).
const PERSIST_BUSTER = process.env.NEXT_PUBLIC_BUILD_ID ?? "jeffries-2026-07-01";


function shouldPersistQuery(queryKey: QueryKey) {
  const first = queryKey[0];
  return typeof first !== "string" || !PERSIST_DENY_PREFIXES.some((prefix) => first.startsWith(prefix));
}

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
    })
  );

  return (
    <ClerkProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          buster: PERSIST_BUSTER,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              defaultShouldDehydrateQuery(query) && shouldPersistQuery(query.queryKey),
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
      </PersistQueryClientProvider>
    </ClerkProvider>
  );
}
