"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { useState, useEffect } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { PwaRegistry } from "@/components/pwa/PwaRegistry";

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

  const [persister, setPersister] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPersister(
        createAsyncStoragePersister({
          storage: {
            getItem: async (key) => await get(key) || null,
            setItem: async (key, value) => await set(key, value),
            removeItem: async (key) => await del(key),
          },
        })
      );
    }
  }, []);

  return (
    <ClerkProvider>
      {persister ? (
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
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
