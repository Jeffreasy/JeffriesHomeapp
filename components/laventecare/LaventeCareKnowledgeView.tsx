"use client";

import { ArrowUpRight, BookOpenText, ClipboardList, Download, FileText, Layers3, Printer, Search } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import {
  getLaventeCarePdfUrl,
  getLaventeCarePdfViewerUrl,
  LAVENTECARE_LEGAL_STACK,
  LAVENTECARE_PRICING,
} from "@/lib/laventecare";
import { label } from "./LaventeCareUtils";
import { EmptyState } from "./LaventeCareCards";
import type { DocumentItem } from "./LaventeCareTypes";
import { LaventeCareDocumentSuitePanel } from "./LaventeCareDocumentSuitePanel";

export function LaventeCareKnowledgeView({
  search,
  setSearch,
  documentGroups,
}: {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  documentGroups: [string, DocumentItem[]][];
}) {
  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="glass min-w-0 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Kennisbasis</p>
            <h2 className="mt-1 text-lg font-bold text-white">Bedrijfsdocumentatie</h2>
          </div>
          <div className="search-bar w-full sm:w-72">
            <Search size={16} className="search-bar__icon" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Zoek documentatie"
              className="search-bar__input"
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {documentGroups.length === 0 ? (
            <EmptyState
              title={search ? "Geen documenten gevonden" : "Documentbasis nog leeg"}
              body={search ? "Pas je zoekterm aan of initialiseer de documentbasis opnieuw." : "Initialiseer de documentbasis bovenaan om LaventeCare-documentatie doorzoekbaar te maken."}
            />
          ) : documentGroups.map(([category, docs]) => (
            <details key={category} open={search.trim().length > 0} className="rounded-lg border border-white/10 bg-white/[0.03]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 marker:hidden">
                <span className="flex min-w-0 items-center gap-2">
                  <ClipboardList size={15} className="shrink-0 text-slate-400" />
                  <span className="truncate text-sm font-bold capitalize text-slate-200">{category}</span>
                </span>
                <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs text-slate-500">
                  {docs.length}
                </span>
              </summary>
              <div className="grid gap-3 border-t border-white/10 p-3 md:grid-cols-2">
                {docs.map((doc) => {
                  const documentKey = doc.document_key || doc.documentKey || "";
                  return (
                  <div key={documentKey || doc.titel} className="glass min-w-0 p-4 bg-[var(--color-surface)]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                        <FileText size={16} className="text-amber-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="line-clamp-2 text-sm font-semibold text-white">{doc.titel}</h4>
                        <p className="mt-1 text-xs text-slate-500">{label(doc.fase ?? undefined)} - {doc.versie ?? "2026-04"}</p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{doc.samenvatting}</p>
                    {documentKey && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                        <a
                          href={getLaventeCarePdfViewerUrl({ documentKey, theme: "screen" })}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20"
                        >
                          <ArrowUpRight size={14} />
                          Preview
                        </a>
                        <a
                          href={getLaventeCarePdfUrl({ documentKey, theme: "screen", delivery: "download" })}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06]"
                        >
                          <Download size={14} />
                          Screen
                        </a>
                        <a
                          href={getLaventeCarePdfUrl({ documentKey, theme: "print", delivery: "download" })}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
                        >
                          <Printer size={14} />
                          Print
                        </a>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <LaventeCareDocumentSuitePanel />

        <div className="glass min-w-0 p-5">
          <div className="flex items-center gap-2">
            <BookOpenText size={18} className="text-amber-300" />
            <h2 className="text-lg font-bold text-white">Juridische stapel</h2>
          </div>
          <div className="mt-4 space-y-2">
            {LAVENTECARE_LEGAL_STACK.map((item, index) => (
              <div key={item} className="flex items-center gap-3 glass min-w-0 px-3 py-2 bg-[var(--color-surface)]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-hover)] text-xs font-bold text-slate-400">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass min-w-0 p-5">
          <div className="flex items-center gap-2">
            <Layers3 size={18} className="text-violet-300" />
            <h2 className="text-lg font-bold text-white">Prijsankers</h2>
          </div>
          <div className="mt-4 space-y-3">
            {LAVENTECARE_PRICING.map((price) => (
              <div key={price.key} className="glass min-w-0 p-3 bg-[var(--color-surface)]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{price.title}</p>
                  <p className="shrink-0 text-right text-xs font-bold text-violet-200">{price.price}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">{price.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
