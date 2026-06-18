"use client";

import { AlertTriangle, ArrowUpRight, BookOpenText, BrainCircuit, CheckCircle2, ClipboardList, Download, FileText, Layers3, Printer, RotateCcw, Search, ShieldCheck } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import {
  getLaventeCarePdfUrl,
  getLaventeCarePdfViewerUrl,
  LAVENTECARE_DOCUMENT_TOTAL,
  LAVENTECARE_DOCUMENTS_BY_KEY,
  LAVENTECARE_LEGAL_STACK,
  LAVENTECARE_PRICING,
} from "@/lib/laventecare";
import { formatDate, label } from "./LaventeCareUtils";
import { EmptyState } from "./LaventeCareCards";
import type { DossierAdviceItem, DossierDocumentItem, DocumentItem } from "./LaventeCareTypes";
import { LaventeCareDocumentSuitePanel } from "./LaventeCareDocumentSuitePanel";

export function LaventeCareKnowledgeView({
  search,
  setSearch,
  documents,
  documentGroups,
  dossierDocuments,
  dossierAdvice,
  dossierAdviceLoading,
  dossierAdviceError,
  onRetryDossierAdvice,
}: {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  documents: DocumentItem[];
  documentGroups: [string, DocumentItem[]][];
  dossierDocuments: DossierDocumentItem[];
  dossierAdvice?: DossierAdviceItem;
  dossierAdviceLoading?: boolean;
  dossierAdviceError?: boolean;
  onRetryDossierAdvice?: () => void;
}) {
  const dossierKeys = new Set(dossierDocuments.map((document) => document.document_key));
  const indexedKeys = new Set(documents.map((document) => documentKeyOf(document)).filter(Boolean));
  const knownDefinitions = documents
    .map((document) => LAVENTECARE_DOCUMENTS_BY_KEY[documentKeyOf(document)])
    .filter(Boolean);
  const externallyUsable = knownDefinitions.filter((document) => document.visibility !== "internal").length;
  const filteredCount = documentGroups.reduce((total, [, docs]) => total + docs.length, 0);

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

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <KnowledgeMetric label="Catalogus" value={`${indexedKeys.size}/${LAVENTECARE_DOCUMENT_TOTAL}`} detail="geindexeerd" />
          <KnowledgeMetric label="Extern bruikbaar" value={externallyUsable} detail="publiek, contract of op aanvraag" />
          <KnowledgeMetric label="Dossiergebruik" value={dossierKeys.size} detail="vastgelegd als PDF" />
          <KnowledgeMetric label="Zoekresultaat" value={filteredCount} detail={search.trim() ? "gefilterd" : "zichtbaar"} />
        </div>

        <DossierAdvicePanel advice={dossierAdvice} loading={dossierAdviceLoading} error={dossierAdviceError} onRetry={onRetryDossierAdvice} />

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
                  const documentKey = documentKeyOf(doc);
                  const definition = LAVENTECARE_DOCUMENTS_BY_KEY[documentKey];
                  const isInDossier = dossierKeys.has(documentKey);
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
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <KnowledgePill value={definition?.badge ?? label(doc.categorie)} tone="amber" />
                      {definition?.funnelStage ? <KnowledgePill value={label(definition.funnelStage)} tone="sky" /> : null}
                      {definition?.visibility ? <KnowledgePill value={visibilityLabel(definition.visibility)} tone={definition.visibility === "internal" ? "slate" : "emerald"} /> : null}
                      {isInDossier ? <KnowledgePill value="In dossier" tone="emerald" /> : null}
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{doc.samenvatting}</p>
                    {definition?.services?.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {definition.services.map((service) => (
                          <span key={service} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                            {service}
                          </span>
                        ))}
                      </div>
                    ) : null}
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
        <div className="glass min-w-0 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-300" />
            <h2 className="text-lg font-bold text-white">Kennisintegratie</h2>
          </div>
          <div className="mt-4 grid gap-2">
            <IntegrationRow label="AI zoeklaag" value={`${documents.length} documenten`} ready={documents.length > 0} />
            <IntegrationRow label="PDF Studio" value={`${LAVENTECARE_DOCUMENT_TOTAL} templates`} ready={indexedKeys.size >= LAVENTECARE_DOCUMENT_TOTAL} />
            <IntegrationRow label="Klantdossiers" value={`${dossierDocuments.length} vastgelegd`} ready={dossierDocuments.length > 0} />
            <IntegrationRow label="Extern delen" value={`${externallyUsable} bruikbaar`} ready={externallyUsable > 0} />
          </div>
        </div>

        <div className="glass min-w-0 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-sky-300" />
            <h2 className="text-lg font-bold text-white">Recent in dossiers</h2>
          </div>
          <div className="mt-4 space-y-2">
            {dossierDocuments.length > 0 ? (
              dossierDocuments.slice(0, 5).map((document) => (
                <a
                  key={document.id}
                  href={getLaventeCarePdfViewerUrl({ documentKey: document.document_key, theme: document.theme === "print" ? "print" : "screen" })}
                  className="block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.06]"
                >
                  <span className="block truncate text-xs font-semibold text-slate-200">{document.titel}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                    {document.context_title ?? label(document.context_type)} - {formatDate(document.created_at)}
                  </span>
                </a>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-500">Nog geen kennisdocumenten als klantdossier vastgelegd.</p>
            )}
          </div>
        </div>

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

function documentKeyOf(document: DocumentItem) {
  return document.document_key || document.documentKey || "";
}

function visibilityLabel(value: string) {
  if (value === "public") return "Publiek";
  if (value === "send_only") return "Op aanvraag";
  if (value === "internal") return "Intern";
  if (value === "contract") return "Contract";
  return label(value);
}

function DossierAdvicePanel({
  advice,
  loading,
  error,
  onRetry,
}: {
  advice?: DossierAdviceItem;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  if (loading && !advice) {
    return (
      <div className="mt-4 border-y border-white/10 py-4">
        <div className="flex items-center gap-2">
          <BrainCircuit size={17} className="text-sky-300" />
          <h3 className="text-sm font-bold text-white">AI-dossieradvies</h3>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-sky-400/40" />
        </div>
        <p className="mt-2 text-sm text-slate-500">Dossierdekking en kennisadvies laden...</p>
      </div>
    );
  }

  if (error && !advice) {
    return (
      <div className="mt-4 border-y border-white/10 py-4">
        <div className="flex items-center gap-2">
          <BrainCircuit size={17} className="text-rose-300" />
          <h3 className="text-sm font-bold text-white">AI-dossieradvies</h3>
        </div>
        <p className="mt-2 text-sm text-rose-300">Het AI-dossieradvies kon niet worden geladen.</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
          >
            <RotateCcw size={13} /> Opnieuw proberen
          </button>
        ) : null}
      </div>
    );
  }

  if (!advice) return null;

  const missingCount = advice.requirements.filter((item) => item.status === "missing").length;
  const attentionCount = advice.requirements.filter((item) => item.status === "attention").length;
  const topRecommendations = advice.recommendations.slice(0, 3);
  const isGlobalAdvice = advice.target.kind === "laventecare" || (advice.target.kind === "query" && !advice.target.id);
  const matchedDossierDocuments = advice.matchedDossierDocuments ?? advice.presentDocuments.length;
  const totalDossierDocuments = advice.totalDossierDocuments ?? matchedDossierDocuments;
  const dossierCountLabel = isGlobalAdvice
    ? `${matchedDossierDocuments}/${totalDossierDocuments} dossierstukken meegenomen`
    : `${matchedDossierDocuments} dossierstuk(ken) gekoppeld`;

  return (
    <div className="mt-4 border-y border-white/10 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BrainCircuit size={17} className="text-sky-300" />
            <h3 className="text-sm font-bold text-white">AI-dossieradvies</h3>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            {advice.target.title}
            {advice.target.subtitle ? ` - ${advice.target.subtitle}` : ""} · {dossierCountLabel}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${adviceStatusClass(advice.status)}`}>
            {adviceStatusLabel(advice.status)}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-bold text-slate-300">
            {advice.coverage}% dekking
          </span>
        </div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${advice.coverage >= 80 ? "bg-emerald-400" : advice.coverage >= 50 ? "bg-amber-400" : "bg-rose-400"}`}
          style={{ width: `${Math.max(4, Math.min(100, advice.coverage))}%` }}
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Bouwblokken</p>
            <p className="text-xs font-semibold text-slate-500">{missingCount} mist · {attentionCount} aandacht</p>
          </div>
          <div className="mt-2 space-y-2">
            {advice.requirements.map((requirement) => (
              <div key={requirement.key} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${requirementDotClass(requirement.status)}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-200">{requirement.label}</span>
                  <span className="block text-xs leading-5 text-slate-500">{requirement.reason}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 border-t border-white/10 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-300" />
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Aanbevolen documenten</p>
          </div>
          <div className="mt-2 space-y-2">
            {topRecommendations.length > 0 ? (
              topRecommendations.map((item) => {
                const documentKey = item.document.document_key || "";
                const content = (
                  <>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-200 group-hover:text-white">{item.document.titel}</span>
                      <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-slate-500">
                        {item.reasons.slice(0, 2).join(" · ")}
                      </span>
                    </span>
                    <span className={`h-fit rounded-full border px-2 py-0.5 text-[11px] font-bold ${item.alreadyInDossier ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"}`}>
                      {item.alreadyInDossier ? "Dossier" : item.priority}
                    </span>
                  </>
                );
                const className = "group grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg px-0 py-1.5";
                if (!documentKey) {
                  return (
                    <div key={item.document.id} className={className}>
                      {content}
                    </div>
                  );
                }
                return (
                  <a
                    key={item.document.id}
                    href={getLaventeCarePdfViewerUrl({ documentKey, theme: "screen" })}
                    className={className}
                  >
                    {content}
                  </a>
                );
              })
            ) : (
              <p className="text-sm leading-6 text-slate-500">Nog geen aanbevelingen beschikbaar.</p>
            )}
          </div>
        </div>
      </div>

      {advice.nextActions.length > 0 ? (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Volgende acties</p>
          <ul className="mt-2 space-y-1.5">
            {advice.nextActions.slice(0, 3).map((action) => (
              <li key={action} className="text-sm leading-6 text-slate-400">
                {action}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function adviceStatusLabel(status: string) {
  if (status === "klaar") return "Klaar";
  if (status === "aandacht") return "Aandacht";
  if (status === "onvolledig") return "Onvolledig";
  if (status === "documentbasis_leeg") return "Kennisbank leeg";
  if (status === "mist_context") return "Context mist";
  return label(status);
}

function adviceStatusClass(status: string) {
  if (status === "klaar") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (status === "aandacht") return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  return "border-rose-500/20 bg-rose-500/10 text-rose-300";
}

function requirementDotClass(status: string) {
  if (status === "ok") return "bg-emerald-400";
  if (status === "attention") return "bg-amber-400";
  return "bg-rose-400";
}

function KnowledgeMetric({ label: metricLabel, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-normal text-slate-500">{metricLabel}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      <p className="mt-0.5 truncate text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function KnowledgePill({ value, tone }: { value: string; tone: "amber" | "sky" | "emerald" | "slate" }) {
  const className = {
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-200",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    slate: "border-white/10 bg-white/[0.03] text-slate-400",
  }[tone];

  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${className}`}>{value}</span>;
}

function IntegrationRow({ label: rowLabel, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="min-w-0 truncate text-sm font-semibold text-slate-200">{rowLabel}</span>
      <span className={ready ? "shrink-0 text-xs font-bold text-emerald-300" : "shrink-0 text-xs font-bold text-amber-300"}>
        {value}
      </span>
    </div>
  );
}
