"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";
import { SearchField } from "@/components/ui/SearchField";
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";
import { cn } from "@/lib/utils";
import { surfaceVariants } from "@/components/ui/Surface";
import { AlertTriangle, ArrowUpRight, BookOpenText, BrainCircuit, CheckCircle2, ClipboardList, Download, FileText, Layers3, Loader2, Printer, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  getLaventeCarePdfUrl,
  getLaventeCarePdfViewerUrl,
  LAVENTECARE_DOCUMENT_TOTAL,
  LAVENTECARE_DOCUMENTS_BY_KEY,
  LAVENTECARE_LEGAL_STACK,
  LAVENTECARE_PRICING,
} from "@/lib/laventecare";
import { dossierDocumentViewerHref, formatDate, label } from "./LaventeCareUtils";
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
  // Directe feedback op PDF-links: generatie kan even duren, dus de geklikte
  // link toont een paar seconden een laadindicator.
  const [busyPdfKey, setBusyPdfKey] = useState<string | null>(null);
  const busyPdfTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (busyPdfTimerRef.current !== null) {
        window.clearTimeout(busyPdfTimerRef.current);
      }
    };
  }, []);

  const markPdfBusy = (key: string) => {
    setBusyPdfKey(key);
    if (busyPdfTimerRef.current !== null) {
      window.clearTimeout(busyPdfTimerRef.current);
    }
    busyPdfTimerRef.current = window.setTimeout(
      () => setBusyPdfKey((current) => (current === key ? null : current)),
      4000,
    );
  };

  const dossierKeys = new Set(dossierDocuments.map((document) => document.document_key));
  const indexedKeys = new Set(documents.map((document) => documentKeyOf(document)).filter(Boolean));
  const knownDefinitions = documents
    .map((document) => LAVENTECARE_DOCUMENTS_BY_KEY[documentKeyOf(document)])
    .filter(Boolean);
  const externallyUsable = knownDefinitions.filter((document) => document.visibility !== "internal").length;
  const filteredCount = documentGroups.reduce((total, [, docs]) => total + docs.length, 0);

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-5")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Kennisbasis</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--color-text)]">Bedrijfsdocumentatie</h2>
          </div>
          <SearchField
            label="Doorzoek bedrijfsdocumentatie"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={search ? () => setSearch("") : undefined}
            placeholder="Zoek documentatie"
            wrapperClassName="w-full sm:w-72"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <KnowledgeMetric label="Catalogus" value={`${indexedKeys.size}/${LAVENTECARE_DOCUMENT_TOTAL}`} detail="geïndexeerd" />
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
            <details key={category} open={search.trim().length > 0} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 marker:hidden">
                <span className="flex min-w-0 items-center gap-2">
                  <ClipboardList size={15} className="shrink-0 text-[var(--color-text-muted)]" />
                  <span className="truncate text-sm font-bold capitalize text-[var(--color-text)]">{category}</span>
                </span>
                <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                  {docs.length}
                </span>
              </summary>
              <div className="grid gap-3 border-t border-[var(--color-border)] p-3 md:grid-cols-2">
                {docs.map((doc) => {
                  const documentKey = documentKeyOf(doc);
                  const definition = LAVENTECARE_DOCUMENTS_BY_KEY[documentKey];
                  const isInDossier = dossierKeys.has(documentKey);
                  return (
                  <div key={documentKey || doc.titel} className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-4")}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                        <FileText size={16} className="text-[var(--color-primary-hover)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="line-clamp-2 text-sm font-semibold text-[var(--color-text)]">{doc.titel}</h4>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{label(doc.fase ?? undefined)} - {doc.versie ?? "2026-04"}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <KnowledgePill value={definition?.badge ?? label(doc.categorie)} tone="accent" />
                      {definition?.funnelStage ? <KnowledgePill value={label(definition.funnelStage)} tone="info" /> : null}
                      {definition?.visibility ? <KnowledgePill value={visibilityLabel(definition.visibility)} tone={definition.visibility === "internal" ? "neutral" : "success"} /> : null}
                      {isInDossier ? <KnowledgePill value="In dossier" tone="success" /> : null}
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--color-text-muted)]">{doc.samenvatting}</p>
                    {definition?.services?.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {definition.services.map((service) => (
                          <span key={service} className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-micro font-semibold text-[var(--color-text-muted)]">
                            {service}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {documentKey && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3">
                        <a
                          href={getLaventeCarePdfViewerUrl({ documentKey, theme: "screen" })}
                          onClick={() => markPdfBusy(`${documentKey}:preview`)}
                          title="PDF-generatie kan even duren"
                          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-info-border)] bg-[var(--color-info-subtle)] px-3 text-xs font-semibold text-[var(--color-info)] transition-colors hover:bg-[var(--color-info-border)]"
                        >
                          {busyPdfKey === `${documentKey}:preview` ? (
                            <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
                          ) : (
                            <ArrowUpRight size={14} />
                          )}
                          Preview
                        </a>
                        <a
                          href={getLaventeCarePdfUrl({ documentKey, theme: "screen", delivery: "download" })}
                          onClick={() => markPdfBusy(`${documentKey}:screen`)}
                          title="PDF-generatie kan even duren"
                          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)]"
                        >
                          {busyPdfKey === `${documentKey}:screen` ? (
                            <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
                          ) : (
                            <Download size={14} />
                          )}
                          Screen
                        </a>
                        <a
                          href={getLaventeCarePdfUrl({ documentKey, theme: "print", delivery: "download" })}
                          onClick={() => markPdfBusy(`${documentKey}:print`)}
                          title="PDF-generatie kan even duren"
                          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] px-3 text-xs font-semibold text-[var(--color-primary-hover)] transition-colors hover:bg-[var(--color-primary-border)]"
                        >
                          {busyPdfKey === `${documentKey}:print` ? (
                            <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
                          ) : (
                            <Printer size={14} />
                          )}
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
        <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-5")}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--color-success)]" />
            <h2 className="text-lg font-bold text-[var(--color-text)]">Kennisintegratie</h2>
          </div>
          <div className="mt-4 grid gap-2">
            <IntegrationRow label="AI zoeklaag" value={`${documents.length} documenten`} ready={documents.length > 0} />
            <IntegrationRow label="PDF Studio" value={`${LAVENTECARE_DOCUMENT_TOTAL} templates`} ready={indexedKeys.size >= LAVENTECARE_DOCUMENT_TOTAL} />
            <IntegrationRow label="Klantdossiers" value={`${dossierDocuments.length} vastgelegd`} ready={dossierDocuments.length > 0} />
            <IntegrationRow label="Extern delen" value={`${externallyUsable} bruikbaar`} ready={externallyUsable > 0} />
          </div>
        </div>

        <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-5")}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-[var(--color-info)]" />
            <h2 className="text-lg font-bold text-[var(--color-text)]">Recent in dossiers</h2>
          </div>
          <div className="mt-4 space-y-2">
            {dossierDocuments.length > 0 ? (
              dossierDocuments.slice(0, 5).map((document) => (
                <a
                  key={document.id}
                  // L2: viewer-URL MET de gelogde contextparams uit de
                  // opgeslagen pdf_url (gepersonaliseerd document).
                  href={dossierDocumentViewerHref(document)}
                  className="flex min-h-11 flex-col justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  <span className="block truncate text-xs font-semibold text-[var(--color-text)]">{document.titel}</span>
                  <span className="mt-0.5 block truncate text-micro text-[var(--color-text-muted)]">
                    {document.context_title ?? label(document.context_type)} - {formatDate(document.created_at)}
                  </span>
                </a>
              ))
            ) : (
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">Nog geen kennisdocumenten als klantdossier vastgelegd.</p>
            )}
          </div>
        </div>

        <LaventeCareDocumentSuitePanel />

        <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-5")}>
          <div className="flex items-center gap-2">
            <BookOpenText size={18} className="text-[var(--color-primary-hover)]" />
            <h2 className="text-lg font-bold text-[var(--color-text)]">Juridische stapel</h2>
          </div>
          <div className="mt-4 space-y-2">
            {LAVENTECARE_LEGAL_STACK.map((item, index) => (
              <div key={item} className={cn(surfaceVariants({ padding: "none" }), "flex items-center gap-3 min-w-0 px-3 py-2")}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-hover)] text-xs font-bold text-[var(--color-text-muted)]">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-[var(--color-text)]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-5")}>
          <div className="flex items-center gap-2">
            <Layers3 size={18} className="text-[var(--color-info)]" />
            <h2 className="text-lg font-bold text-[var(--color-text)]">Prijsankers</h2>
          </div>
          <div className="mt-4 space-y-3">
            {LAVENTECARE_PRICING.map((price) => (
              <div key={price.key} className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-3")}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{price.title}</p>
                  <p className="shrink-0 text-right text-xs font-bold text-[var(--color-info)]">{price.price}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">{price.note}</p>
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
      <div className="mt-4 border-y border-[var(--color-border)] py-4">
        <div className="flex items-center gap-2">
          <BrainCircuit size={17} className="text-[var(--color-info)]" />
          <h3 className="text-sm font-bold text-[var(--color-text)]">AI-dossieradvies</h3>
        </div>
        <Skeleton className="mt-3 h-2 w-full rounded-full" />
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Dossierdekking en kennisadvies laden...</p>
      </div>
    );
  }

  if (error && !advice) {
    return (
      <div className="mt-4 border-y border-[var(--color-border)] py-4">
        <div className="flex items-center gap-2">
          <BrainCircuit size={17} className="text-[var(--color-danger)]" />
          <h3 className="text-sm font-bold text-[var(--color-text)]">AI-dossieradvies</h3>
        </div>
        <p className="mt-2 text-sm text-[var(--color-danger)]">Het AI-dossieradvies kon niet worden geladen.</p>
        {onRetry ? (
          <Button className="mt-3" size="sm" onClick={onRetry}>
            <RotateCcw size={14} aria-hidden="true" /> Opnieuw proberen
          </Button>
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
    <div className="mt-4 border-y border-[var(--color-border)] py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BrainCircuit size={17} className="text-[var(--color-info)]" />
            <h3 className="text-sm font-bold text-[var(--color-text)]">AI-dossieradvies</h3>
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
            {advice.target.title}
            {advice.target.subtitle ? ` - ${advice.target.subtitle}` : ""} · {dossierCountLabel}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Badge tone={advice.status === "klaar" ? "success" : advice.status === "aandacht" ? "warning" : "danger"}>
            {adviceStatusLabel(advice.status)}
          </Badge>
          <Badge tone="neutral">{advice.coverage}% dekking</Badge>
        </div>
      </div>

      <Progress
        value={advice.coverage}
        label="Dossierdekking"
        tone={advice.coverage >= 80 ? "success" : advice.coverage >= 50 ? "warning" : "danger"}
        className="mt-3"
      />

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Bouwblokken</p>
            <p className="text-xs font-semibold text-[var(--color-text-muted)]">{missingCount} mist · {attentionCount} aandacht</p>
          </div>
          <div className="mt-2 space-y-2">
            {advice.requirements.map((requirement) => (
              <div key={requirement.key} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${requirementDotClass(requirement.status)}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--color-text)]">{requirement.label}</span>
                  <span className="block text-xs leading-5 text-[var(--color-text-muted)]">{requirement.reason}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 border-t border-[var(--color-border)] pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-[var(--color-warning)]" />
            <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Aanbevolen documenten</p>
          </div>
          <div className="mt-2 space-y-2">
            {topRecommendations.length > 0 ? (
              topRecommendations.map((item) => {
                const documentKey = item.document.document_key || "";
                const content = (
                  <>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[var(--color-text)] group-hover:text-[var(--color-text)]">{item.document.titel}</span>
                      <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-[var(--color-text-muted)]">
                        {item.reasons.slice(0, 2).join(" · ")}
                      </span>
                    </span>
                    <span className={`h-fit rounded-full border px-2 py-0.5 text-micro font-bold ${item.alreadyInDossier ? "border-[var(--color-success-border)] bg-[var(--color-success-subtle)] text-[var(--color-success)]" : "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-warning)]"}`}>
                      {item.alreadyInDossier ? "Dossier" : item.priority}
                    </span>
                  </>
                );
                const className = "group grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-0 py-1.5";
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
              <p className="text-sm leading-6 text-[var(--color-text-muted)]">Nog geen aanbevelingen beschikbaar.</p>
            )}
          </div>
        </div>
      </div>

      {advice.nextActions.length > 0 ? (
        <div className="mt-4 border-t border-[var(--color-border)] pt-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Volgende acties</p>
          <ul className="mt-2 space-y-1.5">
            {advice.nextActions.slice(0, 3).map((action) => (
              <li key={action} className="text-sm leading-6 text-[var(--color-text-muted)]">
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


function requirementDotClass(status: string) {
  const tone: UiTone = status === "ok" ? "success" : status === "attention" ? "warning" : "danger";
  return uiToneClasses[tone].dot;
}

function KnowledgeMetric({ label: metricLabel, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
      <p className="text-micro font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">{metricLabel}</p>
      <p className="mt-1 text-xl font-bold text-[var(--color-text)]">{value}</p>
      <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{detail}</p>
    </div>
  );
}

function KnowledgePill({ value, tone }: { value: string; tone: UiTone }) {
  return <Badge tone={tone} size="sm">{value}</Badge>;
}

function IntegrationRow({ label: rowLabel, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
      <span className="min-w-0 truncate text-sm font-semibold text-[var(--color-text)]">{rowLabel}</span>
      <span className={ready ? "shrink-0 text-xs font-bold text-[var(--color-success)]" : "shrink-0 text-xs font-bold text-[var(--color-warning)]"}>
        {value}
      </span>
    </div>
  );
}
