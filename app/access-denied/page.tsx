"use client";

import { SignOutButton, useAuth } from "@clerk/nextjs";
import { ArrowRight, Loader2, LogOut, ShieldX } from "lucide-react";
import Link from "next/link";

export default function AccessDeniedPage() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <main
      id="main"
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[var(--color-background)] px-4 py-10 text-[var(--color-text)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.12),transparent_42%)]"
      />

      <section
        aria-labelledby="access-denied-title"
        className="relative w-full max-w-md rounded-3xl border border-rose-500/20 bg-[var(--color-surface)] p-6 text-center shadow-2xl sm:p-8"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/25 bg-rose-500/10 text-rose-300">
          <ShieldX size={25} aria-hidden="true" />
        </div>

        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-300/80">
          Toegang beveiligd
        </p>
        <h1 id="access-denied-title" className="mt-2 text-xl font-bold text-white">
          Dit account heeft geen toegang
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          Deze Homeapp is uitsluitend beschikbaar voor de ingestelde eigenaar. Er zijn geen
          persoonlijke gegevens geladen.
        </p>

        <div className="mt-6">
          {!isLoaded ? (
            <button
              type="button"
              disabled
              aria-busy="true"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-4 text-sm font-semibold text-[var(--color-text-muted)]"
            >
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Account controleren
            </button>
          ) : isSignedIn ? (
            <SignOutButton redirectUrl="/sign-in">
              <button
                type="button"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-bold text-amber-200 transition-colors hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
              >
                <LogOut size={16} aria-hidden="true" />
                Uitloggen en ander account kiezen
              </button>
            </SignOutButton>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-bold text-amber-200 transition-colors hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
            >
              Naar inloggen
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
