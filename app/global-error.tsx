"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/observability/client-events";

function isChunkLoadError(error: Error) {
  return error.name === "ChunkLoadError" || /Loading chunk|ChunkLoadError/.test(error.message ?? "");
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, "global", error.digest);
  }, [error]);

  const chunkError = isChunkLoadError(error);

  return (
    <html lang="nl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0f",
          color: "#f1f5f9",
          fontFamily: "Inter, system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
          colorScheme: "dark",
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              border: "1px solid rgba(239, 68, 68, 0.2)",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#f87171",
              fontSize: 22,
              fontWeight: 700,
            }}
            aria-hidden="true"
          >
            !
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "#ffffff" }}>
            {chunkError ? "Nieuwe versie beschikbaar" : "Er ging iets mis"}
          </h1>
          <p style={{ fontSize: 13, lineHeight: "20px", color: "#94a3b8", margin: "0 0 16px" }}>
            {chunkError
              ? "De app is bijgewerkt sinds deze pagina is geladen. Herlaad om de nieuwste versie te gebruiken."
              : "De app kon niet veilig worden weergegeven. Probeer het opnieuw of herlaad de app."}
          </p>
          {error.digest ? (
            <p style={{ fontSize: 11, color: "#8b98a9", margin: "0 0 16px" }}>
              Referentie {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => (chunkError ? window.location.reload() : reset())}
            style={{
              minHeight: 44,
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255, 255, 255, 0.08)",
              background: "#12121a",
              color: "#f1f5f9",
              fontSize: 14,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            {chunkError ? "App herladen" : "Opnieuw proberen"}
          </button>
        </div>
      </body>
    </html>
  );
}
