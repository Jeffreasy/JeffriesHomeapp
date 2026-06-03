"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { defaultShouldDehydrateQuery, QueryClient, QueryClientProvider, type QueryKey } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { useEffect, useState } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { PwaRegistry } from "@/components/pwa/PwaRegistry";

const PERSIST_DENY_PREFIXES = ["/notes", "/personal-events", "/schedule", "/sync", "sync-status"];

function shouldPersistQuery(queryKey: QueryKey) {
  const first = queryKey[0];
  return typeof first !== "string" || !PERSIST_DENY_PREFIXES.some((prefix) => first.startsWith(prefix));
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: true,
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
            retry: 1,
          },
        },
      })
  );

  const [persister, setPersister] = useState<ReturnType<typeof createAsyncStoragePersister> | null>(null);

  useEffect(() => {
    setPersister(
      createAsyncStoragePersister({
        storage: {
          getItem: async (key) => (await get(key)) || null,
          setItem: async (key, value) => await set(key, value),
          removeItem: async (key) => await del(key),
        },
      })
    );
  }, []);

  return (
    <ClerkProvider>
      {persister ? (
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister,
            dehydrateOptions: {
              shouldDehydrateQuery: (query) =>
                defaultShouldDehydrateQuery(query) && shouldPersistQuery(query.queryKey),
            },
          }}
        >
          <ToastProvider>
            <ConfirmProvider>
              <PwaRegistry />
              {children}
            </ConfirmProvider>
          </ToastProvider>
        </PersistQueryClientProvider>
      ) : (
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ConfirmProvider>
              <PwaRegistry />
              {children}
            </ConfirmProvider>
          </ToastProvider>
        </QueryClientProvider>
      )}
    </ClerkProvider>
  );
}
