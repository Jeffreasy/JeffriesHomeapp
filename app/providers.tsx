"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { MotionConfig } from "framer-motion";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { ToastProvider } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { OverlaySurface } from "@/components/ui/OverlaySurface";
import { PwaRegistry } from "@/components/pwa/PwaRegistry";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { registerSessionExpiredHandler } from "@/lib/api";
import { queryRetryDelay, shouldRetryQuery } from "@/lib/query-retry";

function clearRuntimeCaches() {
  if (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    navigator.serviceWorker.controller
  ) {
    navigator.serviceWorker.controller.postMessage({ type: "CLEAR_ALL_CACHES" });
  }
}

function AuthLoadingState() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-background px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div>
        <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)] motion-reduce:animate-none" />
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">Veilige sessie controleren…</p>
      </div>
    </div>
  );
}

function SessionExpiredOverlay() {
  const [expired, setExpired] = useState(false);
  const queryClient = useQueryClient();
  const titleId = useId();
  const descriptionId = useId();
  const reloginRef = useRef<HTMLButtonElement>(null);

  useEffect(
    () =>
      registerSessionExpiredHandler(() => {
        queryClient.clear();
        clearRuntimeCaches();
        setExpired(true);
      }),
    [queryClient],
  );

  const relogin = () => {
    if (typeof window === "undefined") return;
    // Never forward route query data to an identity provider.
    const redirect = encodeURIComponent(window.location.pathname);
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
      backdropClassName="bg-[var(--color-overlay)]"
      className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] p-6 text-center shadow-[var(--shadow-overlay)]"
    >
      <Surface
        tone="warning"
        radius="lg"
        padding="none"
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-[var(--color-warning)]"
      >
        <Lock size={22} aria-hidden="true" />
      </Surface>
      <h2 id={titleId} className="mb-1 text-base font-semibold text-[var(--color-text)]">
        Je sessie is verlopen
      </h2>
      <p id={descriptionId} className="mb-5 text-sm text-[var(--color-text-muted)]">
        Log opnieuw in om verder te gaan. Je openstaande invoer blijft staan tot je hierop klikt.
      </p>
      <Button ref={reloginRef} type="button" variant="primary" fullWidth onClick={relogin}>
        Opnieuw inloggen
      </Button>
    </OverlaySurface>
  );
}

function SessionDataProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: true,
            gcTime: 1000 * 60 * 60,
            retry: shouldRetryQuery,
            retryDelay: queryRetryDelay,
          },
          mutations: {
            // Writes fail immediately while offline; open form state can then
            // remain visible for an explicit retry instead of silently parking.
            networkMode: "always",
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </ConfirmProvider>
      </ToastProvider>
      <SessionExpiredOverlay />
    </QueryClientProvider>
  );
}

function IdentityScopedProviders({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const identity = userId ?? "signed-out";
  const previousIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    const previousIdentity = previousIdentityRef.current;
    if (previousIdentity !== null && previousIdentity !== identity) {
      clearRuntimeCaches();
    }
    previousIdentityRef.current = identity;
  }, [identity, isLoaded]);

  if (!isLoaded) return <AuthLoadingState />;

  // A Clerk identity transition creates a completely new QueryClient. Query
  // keys therefore never carry owner data into a signed-out/non-owner session.
  return (
    <SessionDataProviders key={identity}>
      {children}
    </SessionDataProviders>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-in">
      <MotionConfig reducedMotion="user">
        <PwaRegistry />
        <IdentityScopedProviders>{children}</IdentityScopedProviders>
      </MotionConfig>
    </ClerkProvider>
  );
}
