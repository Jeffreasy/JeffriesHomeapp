"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  );

  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </QueryClientProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
