"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { parseLoonstrookPDFs, type ParseResult, type ParsedLoonstrook } from "@/lib/loonstrook-pdf";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";

type UploadState = "idle" | "parsing" | "preview" | "importing" | "done" | "error";

interface ImportResult {
  toegevoegd: number;
  bijgewerkt: number;
}

export function LoonstrookUploader() {
  const [state, setState]           = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const { user } = useUser();
  const bulkUpsert = useMutation(api.loonstroken.bulkUpsert);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const pdfs = Array.from(files).filter(f => f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) {
      setErrorMsg("Alleen .pdf bestanden worden geaccepteerd.");
      setState("error");
      return;
    }

    setState("parsing");
    setErrorMsg(null);

    try {
      const result = await parseLoonstrookPDFs(pdfs);
      if (result.items.length === 0 && result.errors.length > 0) {
        setErrorMsg(result.errors.join("\n"));
        setState("error");
        return;
      }
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
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleImport = async () => {
    if (!parseResult || !user?.id) return;
    setState("importing");

    try {
      const payload = parseResult.items.map((ls) => ({
        jaar:             ls.jaar,
        periode:          ls.periode,
        periodeLabel:     ls.periodeLabel,
        type:             ls.type,
        netto:            ls.netto,
        brutoBetaling:    ls.brutoBetaling,
        brutoInhouding:   ls.brutoInhouding,
        salarisBasis:     ls.salarisBasis,
        ortTotaal:        ls.ortTotaal,
        ortDetail:        JSON.stringify(ls.ortDetail),
        amtZeerintensief: ls.amtZeerintensief ?? undefined,
        pensioenpremie:   ls.pensioenpremie ?? undefined,
        loonheffing:      ls.loonheffing ?? undefined,
        reiskosten:       ls.reiskosten ?? undefined,
        vakantietoeslag:  ls.vakantietoeslag ?? undefined,
        ejuBedrag:        ls.ejuBedrag ?? undefined,
        toeslagBalansvlf: ls.toeslagBalansvlf ?? undefined,
        extraUrenBedrag:  ls.extraUrenBedrag ?? undefined,
        schaalnummer:     ls.schaalnummer,
        trede:            ls.trede,
        parttimeFactor:   ls.parttimeFactor,
        uurloon:          ls.uurloon ?? undefined,
        componenten:      JSON.stringify(ls.componenten),
        cumulatieven:     Object.keys(ls.cumulatieven).length > 0 ? JSON.stringify(ls.cumulatieven) : undefined,
      }));

      const res = await bulkUpsert({ userId: user.id, loonstroken: payload });
      setImportResult(res);
      setState("done");
    } catch (err) {
      setErrorMsg(`Import fout: ${err instanceof Error ? err.message : "Onbekende fout"}`);
      setState("error");
    }
  };

  const reset = () => {
    setState("idle");
    setParseResult(null);
    setImportResult(null);
    setErrorMsg(null);
  };

  const fmt = (n: number) => n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });

  return (
    <div className="finance-uploader">
      <AnimatePresence mode="wait">
        {/* ─── DROP ZONE ───────────────────────────────────────────────── */}
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
            <p className="dropzone__title">Sleep je loonstroken PDF&apos;s hier naartoe</p>
            <p className="dropzone__sub" style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
              Meerdere bestanden tegelijk mogelijk
            </p>
            <label className="btn btn--primary" htmlFor="pdf-input">Kies bestanden</label>
            <input id="pdf-input" type="file" accept=".pdf" multiple className="visually-hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)} />
            {state === "error" && errorMsg && (
              <div className="dropzone__error"><AlertCircle size={15} /><span>{errorMsg}</span></div>
            )}
          </motion.div>
        )}

        {/* ─── PARSING ─────────────────────────────────────────────────── */}
        {state === "parsing" && (
          <motion.div key="parsing" className="uploader-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 className="spinner" size={24} /><p>PDF&apos;s verwerken…</p>
          </motion.div>
        )}

        {/* ─── PREVIEW ─────────────────────────────────────────────────── */}
        {state === "preview" && parseResult && (
          <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="upload-preview">
            <FileText className="upload-preview__icon" size={24} />
            <h3 className="upload-preview__title">
              {parseResult.items.length} loonstroken herkend
            </h3>

            {/* Preview table */}
            <div style={{ maxHeight: 280, overflowY: "auto", width: "100%", marginTop: 12 }}>
              <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-muted)" }}>Periode</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--text-muted)" }}>Netto</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--text-muted)" }}>Salaris</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", color: "var(--text-muted)" }}>ORT</th>
                    <th style={{ textAlign: "center", padding: "6px 8px", color: "var(--text-muted)" }}>FWP</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.items.map((ls) => (
                    <tr key={ls.periodeLabel} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 600 }}>{ls.periodeLabel}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: "#34d399" }}>{fmt(ls.netto)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(ls.salarisBasis)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: "#60a5fa" }}>{fmt(ls.ortTotaal)}</td>
                      <td style={{ padding: "6px 8px", textAlign: "center", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        {ls.schaalnummer}-{ls.trede}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Skipped / errors */}
            {parseResult.skipped.length > 0 && (
              <p style={{ fontSize: "0.72rem", color: "#f59e0b", marginTop: 8 }}>
                ⚠ Overgeslagen (geen loonstrook): {parseResult.skipped.join(", ")}
              </p>
            )}
            {parseResult.errors.length > 0 && (
              <p style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: 4 }}>
                Fouten: {parseResult.errors.join(", ")}
              </p>
            )}

            <div className="upload-preview__actions">
              <button className="btn btn--primary" onClick={handleImport}>
                Importeer {parseResult.items.length} loonstroken
              </button>
              <button className="btn btn--ghost" onClick={reset}>Annuleren</button>
            </div>
          </motion.div>
        )}

        {/* ─── IMPORTING ───────────────────────────────────────────────── */}
        {state === "importing" && (
          <motion.div key="importing" className="uploader-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Loader2 className="spinner" size={22} /><p>Opslaan in Convex…</p>
          </motion.div>
        )}

        {/* ─── DONE ────────────────────────────────────────────────────── */}
        {state === "done" && importResult && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="upload-done">
            <CheckCircle className="upload-done__icon" size={28} />
            <p className="upload-done__title">Import geslaagd!</p>
            <div className="preview-stats">
              <div className="preview-stat preview-stat--success">
                <span className="preview-stat__value">+{importResult.toegevoegd}</span>
                <span className="preview-stat__label">nieuw</span>
              </div>
              <div className="preview-stat">
                <span className="preview-stat__value">{importResult.bijgewerkt}</span>
                <span className="preview-stat__label">bijgewerkt</span>
              </div>
            </div>
            <button className="btn btn--ghost" onClick={reset}>Nog meer uploaden</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
