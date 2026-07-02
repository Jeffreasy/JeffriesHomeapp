"use client";

import { useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { parseRabobankCsv, type ParseResult } from "@/lib/rabobank-csv";
import { importTransactionsBatch } from "@/lib/financeImport";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="finance-uploader">
      <AnimatePresence mode="wait">
        {/* ─── DROP ZONE ───────────────────────────────────────────────────── */}
        {(state === "idle" || state === "error") && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`dropzone ${isDragOver ? "dropzone--over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="dropzone__icon" size={28} />
            <p className="dropzone__title">Sleep je Rabobank CSV hier naartoe</p>
            {/* L13: input vóór het label zodat peer-focus-visible werkt — een
                toetsenbordgebruiker die naar de (verborgen) input tabt ziet nu
                een zichtbare focusring op de "Kies bestand"-knop. */}
            <input id="csv-input" type="file" accept=".csv" className="peer visually-hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                // Reset zodat hetzelfde bestand opnieuw kiezen wél een change-event geeft.
                e.target.value = "";
              }} />
            <label
              className="btn btn--primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber-400"
              htmlFor="csv-input"
            >
              Kies bestand
            </label>
            {state === "error" && errorMsg && (
              <div className="dropzone__error"><AlertCircle size={15} /><span>{errorMsg}</span></div>
            )}
          </motion.div>
        )}

        {/* ─── PARSING ─────────────────────────────────────────────────────── */}
        {state === "parsing" && (
          <motion.div key="parsing" className="uploader-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 className="spinner" size={24} /><p>CSV verwerken…</p>
          </motion.div>
        )}

        {/* ─── PREVIEW ─────────────────────────────────────────────────────── */}
        {state === "preview" && parseResult && (
          <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="upload-preview">
            <FileText className="upload-preview__icon" size={24} />
            <h3 className="upload-preview__title">Klaar om te importeren</h3>
            <div className="preview-stats">
              <div className="preview-stat">
                <span className="preview-stat__value">{parseResult.transactions.length.toLocaleString("nl")}</span>
                <span className="preview-stat__label">transacties</span>
              </div>
              <div className="preview-stat">
                <span className="preview-stat__value">{parseResult.vanDatum}</span>
                <span className="preview-stat__label">van</span>
              </div>
              <div className="preview-stat">
                <span className="preview-stat__value">{parseResult.totDatum}</span>
                <span className="preview-stat__label">tot</span>
              </div>
              <div className="preview-stat preview-stat--warn">
                <span className="preview-stat__value">{parseResult.aantalIntern.toLocaleString("nl")}</span>
                <span className="preview-stat__label">intern</span>
              </div>
            </div>
            <div className="upload-preview__actions">
              <button className="btn btn--primary" onClick={handleImport}>
                Importeer {parseResult.transactions.length.toLocaleString("nl")} transacties
              </button>
              <button className="btn btn--ghost" onClick={reset}>Annuleren</button>
            </div>
          </motion.div>
        )}

        {/* ─── IMPORTING ───────────────────────────────────────────────────── */}
        {state === "importing" && (
          <motion.div key="importing" className="uploader-status uploader-status--progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 className="spinner" size={22} />
            <p>Opslaan in database… {progressPct}%</p>
            <div className="progress-bar">
              <div className="progress-bar__fill" style={{ width: `${progressPct}%` }} />
            </div>
            {progress && (
              <p className="progress-sub">
                +{progress.toegevoegd} nieuw · {progress.overgeslagen} al bekend
              </p>
            )}
            {/* Alleen de abort-vlag zetten: de importlus rondt de lopende chunk
                af en toont daarna de "gestopt"-state met het echte resultaat.
                F6: de knop is daarna disabled + "Stoppen…" tot die chunk landt. */}
            <button
              className="btn btn--ghost btn--sm"
              disabled={stopRequested}
              onClick={() => {
                abortRef.current = true;
                setStopRequested(true);
              }}
            >
              {stopRequested ? "Stoppen…" : "Stoppen"}
            </button>
          </motion.div>
        )}

        {/* ─── STOPPED ─────────────────────────────────────────────────────── */}
        {state === "stopped" && progress && (
          <motion.div key="stopped" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="upload-done">
            <AlertCircle className="upload-done__icon" size={28} style={{ color: "#fbbf24" }} />
            <p className="upload-done__title">
              Import gestopt — {progress.verwerkt.toLocaleString("nl")} van {progress.totaalTx.toLocaleString("nl")} geïmporteerd
            </p>
            <div className="preview-stats">
              <div className="preview-stat preview-stat--success">
                <span className="preview-stat__value">+{progress.toegevoegd.toLocaleString("nl")}</span>
                <span className="preview-stat__label">nieuw</span>
              </div>
              <div className="preview-stat">
                <span className="preview-stat__value">{progress.overgeslagen.toLocaleString("nl")}</span>
                <span className="preview-stat__label">al bekend</span>
              </div>
            </div>
            <button className="btn btn--ghost" onClick={reset}>Nog een CSV</button>
          </motion.div>
        )}

        {/* ─── DONE ────────────────────────────────────────────────────────── */}
        {state === "done" && progress && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="upload-done">
            <CheckCircle className="upload-done__icon" size={28} />
            <p className="upload-done__title">Import geslaagd!</p>
            <div className="preview-stats">
              <div className="preview-stat preview-stat--success">
                <span className="preview-stat__value">+{progress.toegevoegd.toLocaleString("nl")}</span>
                <span className="preview-stat__label">nieuw</span>
              </div>
              <div className="preview-stat">
                <span className="preview-stat__value">{progress.overgeslagen.toLocaleString("nl")}</span>
                <span className="preview-stat__label">al bekend</span>
              </div>
            </div>
            <button className="btn btn--ghost" onClick={reset}>Nog een CSV</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
