"use client";

import { useCallback, useId, useState, type DragEvent } from "react";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import type { ParseResult } from "@/lib/loonstrook-pdf";
import { getGetLoonstrokenQueryKey, usePostLoonstrokenImport } from "@/lib/api/generated/loonstroken/loonstroken";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { AppIcon } from "@/components/ui/AppIcon";
import { usePrivacy } from "@/hooks/usePrivacy";
import { Button, buttonVariants } from "@/components/ui/Button";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Surface } from "@/components/ui/Surface";
import { SurfaceHeader } from "@/components/ui/SurfaceHeader";
import { cn } from "@/lib/utils";

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
  const fileInputId = useId();

  const { user } = useUser();
  const queryClient = useQueryClient();
  const { mutateAsync: importLoonstroken } = usePostLoonstrokenImport();
  // L10/finance-mask: netto/salaris/ORT in de preview zijn bedragen — respecteer
  // dezelfde privacy-scope als de rest van finance/salaris.
  const { mask } = usePrivacy("finance");

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
      // PDF.js is a large browser dependency. Load it only after the user has
      // selected a valid PDF instead of adding it to every roster visit.
      const { parseLoonstrookPDFs } = await import("@/lib/loonstrook-pdf");
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

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
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

      const response = await importLoonstroken({ data: { userId: user.id, items: payload } });
      // H7: de backend doet nu een echte upsert (ON CONFLICT DO UPDATE) en
      // rapporteert een waarheidsgetrouwe `updated`-telling. Lees die direct;
      // val voor oude backends terug op total - inserted (dan == updated).
      const apiRes = response.data as unknown as { inserted: number; updated?: number; total: number };
      const bijgewerkt = apiRes.updated ?? apiRes.total - apiRes.inserted;
      const res = { toegevoegd: apiRes.inserted, bijgewerkt };
      
      await queryClient.invalidateQueries({ queryKey: getGetLoonstrokenQueryKey() });

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

  if (state === "parsing" || state === "importing") {
    return (
      <FeedbackState
        tone="loading"
        title={state === "parsing" ? "PDF’s verwerken…" : "Loonstroken opslaan…"}
        description="Dit kan een paar seconden duren."
        compact
      />
    );
  }

  if (state === "preview" && parseResult) {
    return (
      <Surface tone="elevated" padding="md" aria-live="polite">
        <SurfaceHeader
          icon={<AppIcon name="file" tone="info" size="md" />}
          eyebrow="Importcontrole"
          title={`${parseResult.items.length} loonstroken herkend`}
          headingLevel={3}
        />

        <div className="mt-4 max-h-72 w-full overflow-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full min-w-[32rem] border-collapse text-xs">
            <caption className="sr-only">Voorvertoning van herkende loonstroken</caption>
            <thead className="sticky top-0 bg-[var(--color-surface-elevated)] text-[var(--color-text-subtle)]">
              <tr className="border-b border-[var(--color-border)]">
                <th scope="col" className="px-3 py-2 text-left font-semibold">Periode</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Netto</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Salaris</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">ORT</th>
                <th scope="col" className="px-3 py-2 text-center font-semibold">FWP</th>
              </tr>
            </thead>
            <tbody>
              {parseResult.items.map((ls) => (
                <tr key={ls.periodeLabel} className="border-b border-[var(--color-border)] last:border-b-0">
                  <th scope="row" className="px-3 py-2 text-left font-semibold text-[var(--color-text)]">{ls.periodeLabel}</th>
                  <td className="px-3 py-2 text-right font-medium text-[var(--color-success)]">{mask(fmt(ls.netto))}</td>
                  <td className="px-3 py-2 text-right text-[var(--color-text-muted)]">{mask(fmt(ls.salarisBasis))}</td>
                  <td className="px-3 py-2 text-right font-medium text-[var(--color-info)]">{mask(fmt(ls.ortTotaal))}</td>
                  <td className="px-3 py-2 text-center text-micro text-[var(--color-text-subtle)]">
                    {ls.schaalnummer}-{ls.trede}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {parseResult.skipped.length > 0 ? (
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--color-warning)]" role="status">
            <AppIcon name="warning" tone="accent" size="xs" />
            <span>Overgeslagen (geen loonstrook): {parseResult.skipped.join(", ")}</span>
          </p>
        ) : null}
        {parseResult.errors.length > 0 ? (
          <p className="mt-2 text-xs leading-5 text-[var(--color-danger)]" role="alert">
            Fouten: {parseResult.errors.join(", ")}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={reset}>Annuleren</Button>
          <Button variant="primary" onClick={handleImport}>
            Importeer {parseResult.items.length} loonstroken
          </Button>
        </div>
      </Surface>
    );
  }

  if (state === "done" && importResult) {
    return (
      <Surface tone="success" padding="lg" role="status" aria-live="polite" className="text-center">
        <CheckCircle className="mx-auto text-[var(--color-success)]" size={30} aria-hidden="true" />
        <h3 className="mt-3 text-base font-semibold text-[var(--color-text)]">Import geslaagd</h3>
        <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2">
          <Surface tone="success" radius="md" padding="sm">
            <span className="block text-lg font-bold text-[var(--color-success)]">+{importResult.toegevoegd}</span>
            <span className="text-xs text-[var(--color-text-muted)]">nieuw</span>
          </Surface>
          <Surface tone="subtle" radius="md" padding="sm">
            <span className="block text-lg font-bold text-[var(--color-text)]">{importResult.bijgewerkt}</span>
            <span className="text-xs text-[var(--color-text-muted)]">bijgewerkt</span>
          </Surface>
        </div>
        <Button className="mt-5" variant="ghost" onClick={reset}>Nog meer uploaden</Button>
      </Surface>
    );
  }

  return (
    <Surface
      tone={state === "error" ? "danger" : "subtle"}
      padding="lg"
      className={cn(
        "flex min-h-52 flex-col items-center justify-center border-dashed text-center transition-colors duration-[var(--motion-fast)] motion-reduce:transition-none",
        isDragOver && "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
        <Upload size={26} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-[var(--color-text)]">Sleep je loonstroken-PDF’s hierheen</h3>
      <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">Meerdere bestanden tegelijk mogelijk</p>

      <input
        id={fileInputId}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="peer sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) handleFiles(files);
          event.target.value = "";
        }}
      />
      <label
        className={cn(
          buttonVariants({ variant: "primary" }),
          "mt-4 cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-primary)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--color-background)]",
        )}
        htmlFor={fileInputId}
      >
        Kies bestanden
      </label>

      {state === "error" && errorMsg ? (
        <p className="mt-4 flex max-w-lg items-start gap-2 text-xs leading-5 text-[var(--color-danger)]" role="alert">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </p>
      ) : null}
    </Surface>
  );
}
