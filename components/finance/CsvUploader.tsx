"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { parseRabobankCsv, type ParseResult } from "@/lib/rabobank-csv";
import { useTransactions } from "@/hooks/useTransactions";
import { motion, AnimatePresence } from "framer-motion";

type UploadState = "idle" | "parsing" | "preview" | "importing" | "done" | "error";

interface ImportProgress {
  chunk:    number;
  total:    number;
  toegevoegd:   number;
  overgeslagen: number;
  bijgewerkt:    number;
}

export function CsvUploader() {
  const [state, setState]           = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [progress, setProgress]     = useState<ImportProgress | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const abortRef                    = useRef(false);

  const { importBatch, resetPagination } = useTransactions();

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
    setState("importing");
    abortRef.current = false;

    const CHUNK = 200; // Kleinere chunks = betere voortgangsindicator
    const total = Math.ceil(parseResult.transactions.length / CHUNK);
    let toegevoegd = 0;
    let overgeslagen = 0;
    let bijgewerkt = 0;

    try {
      for (let i = 0, chunk = 0; i < parseResult.transactions.length; i += CHUNK, chunk++) {
        if (abortRef.current) break;

        const slice = parseResult.transactions.slice(i, i + CHUNK);
        const res = await importBatch({ transactions: slice });
        toegevoegd   += res.toegevoegd;
        overgeslagen += res.overgeslagen;
        bijgewerkt    += res.bijgewerkt ?? 0;

        setProgress({ chunk: chunk + 1, total, toegevoegd, overgeslagen, bijgewerkt });
      }

      resetPagination();
      setState("done");
    } catch (err) {
      setErrorMsg(`Import fout: ${err instanceof Error ? err.message : "Onbekende fout"}`);
      setState("error");
    }
  };

  const reset = () => {
    abortRef.current = true;
    setState("idle");
    setParseResult(null);
    setProgress(null);
    setErrorMsg(null);
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
            <label className="btn btn--primary" htmlFor="csv-input">Kies bestand</label>
            <input id="csv-input" type="file" accept=".csv" className="visually-hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
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
            <p>Opslaan in Convex… {progressPct}%</p>
            <div className="progress-bar">
              <div className="progress-bar__fill" style={{ width: `${progressPct}%` }} />
            </div>
            {progress && (
              <p className="progress-sub">
                +{progress.toegevoegd} nieuw · {progress.bijgewerkt} bijgewerkt · {progress.overgeslagen} al bekend
              </p>
            )}
            <button className="btn btn--ghost btn--sm" onClick={reset}>Stoppen</button>
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
                <span className="preview-stat__value">{progress.bijgewerkt.toLocaleString("nl")}</span>
                <span className="preview-stat__label">bijgewerkt</span>
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
