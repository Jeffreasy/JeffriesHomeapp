"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Route-level error boundary (FH3) — catches render/data errors below the
 * root layout so the user gets a themed Dutch recovery screen instead of
 * Next's generic error page. Styled to match components/ui/ErrorBoundary.
 */

// A ChunkLoadError means the deployed build changed under this tab: the old
// chunk URLs are gone, so reset() can never succeed — only a hard reload
// fetches the new build (M6, kiosk-relevant).
function isChunkLoadError(error: Error) {
  return (
    error.name === "ChunkLoadError" || /Loading chunk|ChunkLoadError/.test(error.message ?? "")
  );
}

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error boundary caught:", error);
  }, [error]);

  const chunkError = isChunkLoadError(error);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-12 text-center text-slate-100">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
        <AlertTriangle size={22} className="text-red-400" />
      </div>
      <h1 className="mb-1 text-base font-semibold text-slate-200">
        {chunkError ? "Nieuwe versie beschikbaar" : "Er ging iets mis"}
      </h1>
      <p className="mb-2 max-w-xs text-xs leading-5 text-slate-500">
        {chunkError
          ? "De app is bijgewerkt sinds deze pagina is geladen. Herlaad om de nieuwste versie te gebruiken."
          : "De pagina kon niet worden weergegeven. Probeer het opnieuw of ga terug naar het dashboard."}
      </p>
      {/* Raw error text only as a small secondary detail line — never as the
          headline (L3/L6): it is usually English developer jargon. */}
      {!chunkError && error?.message ? (
        <p className="mb-4 max-w-xs break-words text-[11px] leading-4 text-slate-600">
          {error.message}
        </p>
      ) : (
        <span className="mb-2" />
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => (chunkError ? window.location.reload() : reset())}
          className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <RefreshCw size={13} />
          {chunkError ? "App herladen" : "Opnieuw proberen"}
        </button>
        <Link
          href="/"
          className="flex items-center rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/10"
        >
          Naar Dashboard
        </Link>
      </div>
    </div>
  );
}
