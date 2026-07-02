"use client";

/**
 * Global error boundary (FH3) — replaces the ROOT layout when it crashes, so
 * it must render its own <html>/<body>. globals.css is not guaranteed to be
 * loaded here, hence the inline styles matching the app theme (#0a0a0f).
 */

// A ChunkLoadError means the deployed build changed under this tab: the old
// chunk URLs are gone, so reset() can never succeed — only a hard reload
// fetches the new build (M6, kiosk-relevant).
function isChunkLoadError(error: Error) {
  return (
    error.name === "ChunkLoadError" || /Loading chunk|ChunkLoadError/.test(error.message ?? "")
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
            aria-hidden
          >
            !
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "#ffffff" }}>
            {chunkError ? "Nieuwe versie beschikbaar" : "Er ging iets mis"}
          </h1>
          <p style={{ fontSize: 13, lineHeight: "20px", color: "#94a3b8", margin: "0 0 8px" }}>
            {chunkError
              ? "De app is bijgewerkt sinds deze pagina is geladen. Herlaad om de nieuwste versie te gebruiken."
              : "De app kon niet worden weergegeven. Probeer het opnieuw of herlaad de app."}
          </p>
          {/* Raw error text only as a small secondary detail line — never as
              the headline (L3/L6): it is usually English developer jargon. */}
          {!chunkError && error?.message ? (
            <p
              style={{
                fontSize: 11,
                lineHeight: "16px",
                color: "#64748b",
                margin: "0 0 16px",
                overflowWrap: "break-word",
              }}
            >
              {error.message}
            </p>
          ) : (
            <div style={{ height: 8 }} />
          )}
          <button
            onClick={() => (chunkError ? window.location.reload() : reset())}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255, 255, 255, 0.08)",
              background: "#12121a",
              color: "#cbd5e1",
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
