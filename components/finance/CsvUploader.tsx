"use client";

import { useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Progress } from "@/components/ui/Progress";
import { Surface, surfaceVariants } from "@/components/ui/Surface";
import { parseRabobankCsv, type ParseResult } from "@/lib/rabobank-csv";
import { importTransactionsBatch } from "@/lib/financeImport";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type UploadState = "idle" | "parsing" | "preview" | "importing" | "done" | "stopped" | "error";

interface ImportProgress {
  chunk:    number;
  total:    number;
  /** Aantal transacties dat door de importlus is verwerkt. */
  verwerkt: number;
  /** Totaal aantal transacties in het gekozen bestand. */
  totaalTx: number;
  toegevoegd:   number;
  overgeslagen: number;
}

interface CsvUploaderProps {
  /** Called after a successful import so the parent can refresh its data. */
  onImported?: () => void;
}

export function CsvUploader({ onImported }: CsvUploaderProps = {}) {
  const [state, setState]           = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [progress, setProgress]     = useState<ImportProgress | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  // F6: na een klik op "Stoppen" is de knop uitgeschakeld en toont "Stoppen…"
  // tot de lopende chunk is afgerond — dubbelklikken/onzekerheid voorkomen.
  const [stopRequested, setStopRequested] = useState(false);
  const abortRef                    = useRef(false);
  // Elke import-run krijgt een eigen id; een verouderde run mag de state van
  // een nieuwere flow (na reset of nieuwe upload) niet meer overschrijven.
  const runIdRef                    = useRef(0);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  const { user } = useUser();
  const userId = user?.id ?? "";

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErrorMsg("Alleen .csv bestanden worden geaccepteerd.");
      setState("error");
      return;
    }

    setState("parsing");
    setErrorMsg(null);

    try {
      const result = await parseRabobankCsv(file);
      setParseResult(result);
      setState("preview");
    } catch (err) {
      setErrorMsg(`Parser fout: ${err instanceof Error ? err.message : "Onbekende fout"}`);
      setState("error");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    if (!parseResult) return;
    const runId = ++runIdRef.current;
    setState("importing");
    abortRef.current = false;
    setStopRequested(false);

    const CHUNK = 200; // Kleinere chunks = betere voortgangsindicator
    const totaalTx = parseResult.transactions.length;
    const total = Math.ceil(totaalTx / CHUNK);
    let toegevoegd = 0;
    let overgeslagen = 0;
    let verwerkt = 0;

    try {
      for (let i = 0, chunk = 0; i < totaalTx; i += CHUNK, chunk++) {
        if (abortRef.current) break;

        const slice = parseResult.transactions.slice(i, i + CHUNK);
        const rawRes = await importTransactionsBatch(userId, slice);
        const res = rawRes.data;

        // Ensure properties exist before adding
        const isObj = typeof res === 'object' && res !== null;
        toegevoegd   += (isObj && 'inserted' in res ? res.inserted : 0) ?? 0;
        overgeslagen += (isObj && 'skipped' in res ? res.skipped : 0) ?? 0;
        verwerkt     += slice.length;

        if (runIdRef.current !== runId) return; // reset/nieuwe flow gestart
        setProgress({ chunk: chunk + 1, total, verwerkt, totaalTx, toegevoegd, overgeslagen });
      }

      // Guard: als er intussen een reset of nieuwe import is gestart mag deze
      // afgeronde (of afgebroken) run de nieuwe flow niet meer overschrijven.
      if (runIdRef.current !== runId) return;

      // The page owns the live transactions list; ask it to refresh so the
      // newly imported rows appear (also after a stop: partial rows are in).
      onImported?.();
      // Een gestopte import is géén geslaagde import — toon een aparte state
      // zodat "Import geslaagd!" nooit op een afgebroken run verschijnt.
      // (Stop ná de laatste chunk telt gewoon als geslaagd.)
      setState(abortRef.current && verwerkt < totaalTx ? "stopped" : "done");
    } catch (err) {
      if (runIdRef.current !== runId) return;
      setErrorMsg(`Import fout: ${err instanceof Error ? err.message : "Onbekende fout"}`);
      setState("error");
    }
  };

  const reset = () => {
    runIdRef.current++;
    abortRef.current = true;
    setState("idle");
    setParseResult(null);
    setProgress(null);
    setErrorMsg(null);
    setStopRequested(false);
  };

  const progressPct = progress ? Math.round((progress.chunk / progress.total) * 100) : 0;

  return (
    <div className="flex min-h-40 items-stretch">
      <AnimatePresence mode="wait">
        {/* ─── DROP ZONE ───────────────────────────────────────────────────── */}
        {(state === "idle" || state === "error") && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={cn(
              surfaceVariants({
                tone: state === "error" ? "danger" : isDragOver ? "accent" : "subtle",
                radius: "lg",
                padding: "lg",
              }),
              "flex min-h-44 flex-1 flex-col items-center justify-center gap-3 border-2 border-dashed text-center transition-colors",
              isDragOver && "border-[var(--color-primary)]",
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="text-[var(--color-text-muted)]" size={28} aria-hidden="true" />
            <div>
              <p className="font-semibold text-[var(--color-text)]">Sleep je Rabobank CSV hier naartoe</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Alleen .csv-bestanden worden geaccepteerd</p>
            </div>
            <input
              ref={fileInputRef}
              id="csv-input"
              type="file"
              accept=".csv"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                // Reset zodat hetzelfde bestand opnieuw kiezen wél een change-event geeft.
                e.target.value = "";
              }}
            />
            <Button type="button" variant="primary" onClick={() => fileInputRef.current?.click()}>
              Kies bestand
            </Button>
            {state === "error" && errorMsg && (
              <p role="alert" className="flex items-start gap-2 text-sm font-medium text-[var(--color-danger)]">
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{errorMsg}</span>
              </p>
            )}
          </motion.div>
        )}

        {/* ─── PARSING ─────────────────────────────────────────────────────── */}
        {state === "parsing" && (
          <motion.div key="parsing" className="flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <FeedbackState
              tone="loading"
              compact
              title="CSV verwerken"
              description="Het bestand wordt gecontroleerd en voorbereid."
              className="h-full"
            />
          </motion.div>
        )}

        {/* ─── PREVIEW ─────────────────────────────────────────────────────── */}
        {state === "preview" && parseResult && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(surfaceVariants({ tone: "default", radius: "lg", padding: "md" }), "flex-1")}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-info-subtle)]">
                <FileText className="text-[var(--color-info)]" size={20} aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold text-[var(--color-text)]">Klaar om te importeren</h3>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Controleer de samenvatting voor je doorgaat.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Surface tone="subtle" radius="sm" padding="xs">
                <span className="block text-lg font-bold tabular-nums text-[var(--color-text)]">{parseResult.transactions.length.toLocaleString("nl")}</span>
                <span className="text-xs text-[var(--color-text-muted)]">transacties</span>
              </Surface>
              <Surface tone="subtle" radius="sm" padding="xs">
                <span className="block text-sm font-semibold tabular-nums text-[var(--color-text)]">{parseResult.vanDatum}</span>
                <span className="text-xs text-[var(--color-text-muted)]">van</span>
              </Surface>
              <Surface tone="subtle" radius="sm" padding="xs">
                <span className="block text-sm font-semibold tabular-nums text-[var(--color-text)]">{parseResult.totDatum}</span>
                <span className="text-xs text-[var(--color-text-muted)]">tot</span>
              </Surface>
              <Surface tone="warning" radius="sm" padding="xs">
                <span className="block text-lg font-bold tabular-nums text-[var(--color-warning)]">{parseResult.aantalIntern.toLocaleString("nl")}</span>
                <span className="text-xs text-[var(--color-text-muted)]">intern</span>
              </Surface>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="primary" onClick={handleImport}>
                Importeer {parseResult.transactions.length.toLocaleString("nl")} transacties
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>Annuleren</Button>
            </div>
          </motion.div>
        )}

        {/* ─── IMPORTING ───────────────────────────────────────────────────── */}
        {state === "importing" && (
          <motion.div
            key="importing"
            className={cn(surfaceVariants({ tone: "subtle", radius: "lg", padding: "md" }), "flex flex-1 flex-col justify-center")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--color-text)]">Opslaan in database</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{progressPct}% verwerkt</p>
              </div>
              <span className="text-sm font-bold tabular-nums text-[var(--color-primary)]">{progressPct}%</span>
            </div>
            <Progress value={progressPct} label="Voortgang CSV-import" className="mt-4" />
            {progress && (
              <p className="mt-2 text-xs text-[var(--color-text-subtle)]">
                +{progress.toegevoegd} nieuw · {progress.overgeslagen} al bekend
              </p>
            )}
            {/* Alleen de abort-vlag zetten: de importlus rondt de lopende chunk
                af en toont daarna de "gestopt"-state met het echte resultaat.
                F6: de knop is daarna disabled + "Stoppen…" tot die chunk landt. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-4 self-start"
              disabled={stopRequested}
              onClick={() => {
                abortRef.current = true;
                setStopRequested(true);
              }}
            >
              {stopRequested ? "Stoppen…" : "Stoppen"}
            </Button>
          </motion.div>
        )}

        {/* ─── STOPPED ─────────────────────────────────────────────────────── */}
        {state === "stopped" && progress && (
          <motion.div
            key="stopped"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(surfaceVariants({ tone: "warning", radius: "lg", padding: "md" }), "flex flex-1 flex-col items-center justify-center text-center")}
          >
            <AlertCircle className="text-[var(--color-warning)]" size={28} aria-hidden="true" />
            <p className="mt-3 font-semibold text-[var(--color-text)]">Import gestopt</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {progress.verwerkt.toLocaleString("nl")} van {progress.totaalTx.toLocaleString("nl")} transacties verwerkt
            </p>
            <div className="mt-4 grid w-full max-w-sm grid-cols-2 gap-2">
              <Surface tone="success" radius="sm" padding="xs">
                <span className="block text-lg font-bold tabular-nums text-[var(--color-success)]">+{progress.toegevoegd.toLocaleString("nl")}</span>
                <span className="text-xs text-[var(--color-text-muted)]">nieuw</span>
              </Surface>
              <Surface tone="subtle" radius="sm" padding="xs">
                <span className="block text-lg font-bold tabular-nums text-[var(--color-text)]">{progress.overgeslagen.toLocaleString("nl")}</span>
                <span className="text-xs text-[var(--color-text-muted)]">al bekend</span>
              </Surface>
            </div>
            <Button type="button" variant="ghost" className="mt-4" onClick={reset}>Nog een CSV</Button>
          </motion.div>
        )}

        {/* ─── DONE ────────────────────────────────────────────────────────── */}
        {state === "done" && progress && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(surfaceVariants({ tone: "success", radius: "lg", padding: "md" }), "flex flex-1 flex-col items-center justify-center text-center")}
          >
            <CheckCircle className="text-[var(--color-success)]" size={28} aria-hidden="true" />
            <p className="mt-3 font-semibold text-[var(--color-text)]">Import geslaagd</p>
            <div className="mt-4 grid w-full max-w-sm grid-cols-2 gap-2">
              <Surface tone="success" radius="sm" padding="xs">
                <span className="block text-lg font-bold tabular-nums text-[var(--color-success)]">+{progress.toegevoegd.toLocaleString("nl")}</span>
                <span className="text-xs text-[var(--color-text-muted)]">nieuw</span>
              </Surface>
              <Surface tone="subtle" radius="sm" padding="xs">
                <span className="block text-lg font-bold tabular-nums text-[var(--color-text)]">{progress.overgeslagen.toLocaleString("nl")}</span>
                <span className="text-xs text-[var(--color-text-muted)]">al bekend</span>
              </Surface>
            </div>
            <Button type="button" variant="ghost" className="mt-4" onClick={reset}>Nog een CSV</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
