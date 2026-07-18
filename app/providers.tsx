"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { MotionConfig } from "framer-motion";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { ToastProvider } from "@/components/ui/Toast";
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
        <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
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
      <h2 id={titleId} className="mb-1 text-base font-semibold text-[var(--color-text)]">
        Je sessie is verlopen
      </h2>
      <p id={descriptionId} className="mb-5 text-sm text-[var(--color-text-muted)]">
        Log opnieuw in om verder te gaan. Je openstaande invoer blijft staan tot je hierop klikt.
      </p>
      <button
        ref={reloginRef}
        type="button"
        onClick={relogin}
        className="min-h-11 w-full rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 px-4 text-sm font-bold text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        Opnieuw inloggen
      </button>
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
          <ErrorBoundary>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
          </ErrorBoundary>
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
    <ClerkProvider>
      <PwaRegistry />
      <IdentityScopedProviders>{children}</IdentityScopedProviders>
    </ClerkProvider>
  );
}
