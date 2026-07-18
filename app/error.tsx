"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { reportClientError } from "@/lib/observability/client-events";

function isChunkLoadError(error: Error) {
  return error.name === "ChunkLoadError" || /Loading chunk|ChunkLoadError/.test(error.message ?? "");
}

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, "route", error.digest);
  }, [error]);

  const chunkError = isChunkLoadError(error);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
        <AlertTriangle size={22} className="text-rose-300" aria-hidden="true" />
      </div>
      <h1 className="text-base font-semibold text-[var(--color-text)]">
        {chunkError ? "Nieuwe versie beschikbaar" : "Er ging iets mis"}
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--color-text-muted)]">
        {chunkError
          ? "De app is bijgewerkt sinds deze pagina is geladen. Herlaad om de nieuwste versie te gebruiken."
          : "De pagina kon niet veilig worden weergegeven. Probeer het opnieuw of ga terug naar het dashboard."}
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-[var(--color-text-subtle)]">Referentie {error.digest}</p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={() => (chunkError ? window.location.reload() : reset())}>
          <RefreshCw size={14} aria-hidden="true" />
          {chunkError ? "App herladen" : "Opnieuw proberen"}
        </Button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          Naar Dashboard
        </Link>
      </div>
    </div>
  );
}
