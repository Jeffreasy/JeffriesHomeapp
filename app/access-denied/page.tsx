"use client";

import { SignOutButton, useAuth } from "@clerk/nextjs";
import { ArrowRight, LogOut, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Surface } from "@/components/ui/Surface";

export default function AccessDeniedPage() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <main
      id="main"
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[var(--color-background)] px-4 py-10 text-[var(--color-text)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--color-danger-subtle),transparent_42%)]"
      />

      <Surface
        aria-labelledby="access-denied-title"
        tone="danger"
        radius="lg"
        padding="lg"
        className="relative w-full max-w-md text-center"
      >
        <Surface
          tone="danger"
          radius="lg"
          padding="none"
          className="mx-auto flex h-14 w-14 items-center justify-center text-[var(--color-danger)]"
        >
          <ShieldX size={25} aria-hidden="true" />
        </Surface>

        <p className="mt-5 text-micro font-bold uppercase tracking-[0.18em] text-[var(--color-danger)]">
          Toegang beveiligd
        </p>
        <h1 id="access-denied-title" className="mt-2 text-xl font-bold text-[var(--color-text)]">
          Dit account heeft geen toegang
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          Deze Homeapp is uitsluitend beschikbaar voor de ingestelde eigenaar. Er zijn geen
          persoonlijke gegevens geladen.
        </p>

        <div className="mt-6">
          {!isLoaded ? (
            <Button fullWidth loading loadingLabel="Account controleren" disabled />
          ) : isSignedIn ? (
            <SignOutButton redirectUrl="/sign-in">
              <Button fullWidth variant="secondary">
                <LogOut size={16} aria-hidden="true" />
                Uitloggen en ander account kiezen
              </Button>
            </SignOutButton>
          ) : (
            <ButtonLink href="/sign-in" fullWidth variant="primary">
              Naar inloggen
              <ArrowRight size={16} aria-hidden="true" />
            </ButtonLink>
          )}
        </div>
      </Surface>
    </main>
  );
}
