"use client";

import { Button } from "@/components/ui/Button";
import { SearchField } from "@/components/ui/SearchField";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import { surfaceVariants } from "@/components/ui/Surface";
import { useMemo, useState } from "react";
import { ArrowUpRight, Building2, Download, FileCheck2, FileText, ShieldCheck, Workflow } from "lucide-react";
import type { LCCockpit } from "@/lib/api";
import {
  type LaventeCarePdfDossierContext,
  type LaventeCarePdfTheme,
  getLaventeCarePdfTemplateProfile,
  getLaventeCarePdfStructuredSections,
  getLaventeCarePdfUrl,
  getLaventeCarePdfViewerUrl,
  isLaventeCarePdfTheme,
  LAVENTECARE_PDF_REGISTRY,
  LAVENTECARE_PROCESS_STAGES,
  LAVENTECARE_PROFILE,
} from "@/lib/laventecare";
import type { CompanyItem, DossierDocumentItem, LeadItem, ProjectItem, WorkstreamItem } from "./LaventeCareTypes";
import { dossierDocumentViewerHref, formatDate, formatMoney, label, projectFaseLabel, projectStatusLabel } from "./LaventeCareUtils";

const priorityDocuments = [
  "introductie",
  "voorstel-template",
  "sla-agreement",
  "security-one-pager",
] as const;

type DossierContextOption = {
  key: string;
  label: string;
  subtext: string;
  context: LaventeCarePdfDossierContext;
};

export type LaventeCareDossierDocumentLogPayload = {
  documentKey: string;
  title: string;
  templateLabel: string;
  context: LaventeCarePdfDossierContext;
  pdfUrl: string;
  theme: LaventeCarePdfTheme;
  delivery: "inline" | "download";
};

function buildCompanyContextOption(company: CompanyItem): DossierContextOption {
  const id = company._id ?? company.id;
  const nextActionIsDate = isDateLike(company.volgendeActie);

  return {
    key: `company:${id}`,
    label: company.naam,
    subtext: `Klantdossier - ${label(company.relatie_type)} - ${label(company.status)}`,
    context: {
      kind: "company",
      id,
      title: company.naam,
      company: company.naam,
      status: company.status,
      phase: company.relatie_type,
      source: company.website ?? undefined,
      summary: company.notities ?? undefined,
      nextStep: company.volgendeActie
        ? `Relatie opvolgen: ${nextActionIsDate ? formatDate(company.volgendeActie) : company.volgendeActie}`
        : undefined,
      dueDate: nextActionIsDate ? formatDate(company.volgendeActie) : undefined,
    },
  };
}

function isDateLike(value?: string) {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(new Date(value).getTime());
}

function buildLeadContextOption(lead: LeadItem): DossierContextOption {
  const id = lead._id ?? lead.id;

  return {
    key: `lead:${id}`,
    label: lead.titel,
    subtext: `Lead - ${label(lead.status)} - ${lead.fitScore ?? "?"}/100 fit`,
    context: {
      kind: "lead",
      id,
      title: lead.titel,
      status: lead.status,
      priority: lead.prioriteit ?? undefined,
      score: lead.fitScore,
      source: lead.bron,
      painPoint: lead.pijnpunt ?? undefined,
      nextStep: lead.volgendeStap ?? undefined,
      dueDate: lead.volgendeActieDatum ? formatDate(lead.volgendeActieDatum) : undefined,
    },
  };
}

function buildProjectContextOption(project: ProjectItem): DossierContextOption {
  const id = project._id ?? project.id;

  return {
    key: `project:${id}`,
    label: project.naam,
    subtext: `Project - ${projectFaseLabel(project.fase)} - ${projectStatusLabel(project.status)}`,
    context: {
      kind: "project",
      id,
      title: project.naam,
      status: project.status,
      phase: project.fase,
      valueLabel: formatMoney(project.waardeIndicatie ?? project.waarde_indicatie ?? undefined),
      summary: project.samenvatting ?? undefined,
      nextStep: project.deadline ? `Deadline bewaken: ${formatDate(project.deadline)}` : undefined,
      dueDate: project.deadline ? formatDate(project.deadline) : undefined,
    },
  };
}

function buildWorkstreamContextOption(workstream: WorkstreamItem): DossierContextOption {
  const id = workstream._id ?? workstream.id;

  return {
    key: `workstream:${id}`,
    label: workstream.titel,
    subtext: `Opdracht - ${label(workstream.type)} - ${label(workstream.status)}`,
    context: {
      kind: "workstream",
      id,
      title: workstream.titel,
      company: workstream.klantNaam,
      status: workstream.status,
      priority: workstream.prioriteit,
      phase: workstream.type,
      valueLabel: formatMoney(workstream.waardeIndicatie ?? workstream.waarde_indicatie ?? undefined),
      source: workstream.bron,
      summary: workstream.doel ?? workstream.scope ?? undefined,
      painPoint: workstream.bevindingen ?? undefined,
      nextStep: workstream.volgendeStap ?? undefined,
      dueDate: workstream.deadline ? formatDate(workstream.deadline) : undefined,
    },
  };
}

export function LaventeCareBusinessCommandCenter({
  summary,
  companies,
  activeLeads,
  activeWorkstreams,
  activeProjects,
  dossierDocuments,
  loggingDocumentKey,
  onLogDossierDocument,
}: {
  summary: LCCockpit["summary"];
  companies: CompanyItem[];
  activeLeads: LeadItem[];
  activeWorkstreams: WorkstreamItem[];
  activeProjects: ProjectItem[];
  dossierDocuments: DossierDocumentItem[];
  loggingDocumentKey?: string | null;
  onLogDossierDocument: (payload: LaventeCareDossierDocumentLogPayload) => Promise<void>;
}) {
  const [selectedContextKey, setSelectedContextKey] = useState<string | null>(null);
  const [contextQuery, setContextQuery] = useState("");
  const documents = priorityDocuments
    .map((key) => LAVENTECARE_PDF_REGISTRY.find((document) => document.key === key))
    .filter(Boolean);
  // M21: ALLE klanten/opdrachten/projecten/leads zijn kiesbaar (geen cap op 5)
  // en er is niets voorgeselecteerd — dossier-loggen vereist een expliciete
  // keuze zodat een haastklik geen document onder de verkeerde klant hangt.
  const contextOptions = useMemo(
    () => [
      ...companies.map(buildCompanyContextOption),
      ...activeWorkstreams.map(buildWorkstreamContextOption),
      ...activeProjects.map(buildProjectContextOption),
      ...activeLeads.map(buildLeadContextOption),
    ],
    [activeLeads, activeProjects, activeWorkstreams, companies]
  );
  const filteredContextOptions = useMemo(() => {
    const needle = contextQuery.trim().toLowerCase();
    if (!needle) return contextOptions;
    return contextOptions.filter((option) =>
      `${option.label} ${option.subtext}`.toLowerCase().includes(needle)
    );
  }, [contextOptions, contextQuery]);
  const selectedContextOption =
    selectedContextKey && selectedContextKey !== "none"
      ? contextOptions.find((option) => option.key === selectedContextKey) ?? null
      : null;
  const selectedContext = selectedContextOption?.context ?? null;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-4")}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-[var(--color-info)]">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Klant- en bedrijfsfundament</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--color-text)]">LaventeCare als systeempartner</h2>
              <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">{LAVENTECARE_PROFILE.positie}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <CompactMetric label="Klanten" value={summary.companies ?? companies.length} detail="dossiers" />
            <CompactMetric label="Funnel" value={activeLeads.length} detail="open leads" />
            <CompactMetric label="Werkbank" value={summary.workstreams ?? activeWorkstreams.length} detail={`${activeWorkstreams.length} actief`} />
            <CompactMetric label="Delivery" value={activeProjects.length} detail="projecten" />
            <CompactMetric label="Docs" value={summary.documents} detail="templates" />
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-subtle)] px-3 py-2">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
            <p className="text-xs leading-5 text-[var(--color-text-muted)]">
              {LAVENTECARE_PROFILE.security.philosophy} Context, dossiers en klantwerk blijven gekoppeld.
            </p>
          </div>
        </div>

        <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-4")}>
          <div className="flex items-center gap-2">
            <Workflow size={18} className="text-[var(--color-success)]" />
            <h2 className="text-lg font-bold text-[var(--color-text)]">Operating model</h2>
          </div>
          <div className="mt-3 grid gap-2">
            {LAVENTECARE_PROCESS_STAGES.slice(0, 4).map((stage, index) => (
              <div key={stage.key} className="flex gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--color-surface-muted)] text-micro font-bold text-[var(--color-text-muted)]">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-text)]">{stage.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-[var(--color-text-muted)]">{stage.output}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <details className={cn(surfaceVariants({ padding: "none" }), "min-w-0 overflow-hidden")}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]">
              <FileText size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-[var(--color-text)]">PDF Studio en dossierdocumenten</span>
              <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">
                Context kiezen, PDF openen/downloaden en vastleggen in klantdossier
              </span>
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-micro font-bold text-[var(--color-text-muted)]">
            {documents.length} snel
          </span>
        </summary>

        <div className="grid gap-4 border-t border-[var(--color-border)] p-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-2">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Dossiercontext</p>
                  <p className="mt-1 line-clamp-1 text-sm font-semibold text-[var(--color-text)]">
                    {selectedContextOption?.label ?? "Geen dossier gekoppeld"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-micro font-bold text-[var(--color-text-muted)]">
                  {contextOptions.length} opties
                </span>
              </div>

              {contextOptions.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <SearchField
                    label="Zoek dossiercontext"
                    value={contextQuery}
                    onChange={(event) => setContextQuery(event.target.value)}
                    onClear={() => setContextQuery("")}
                    placeholder={`Zoek in ${contextOptions.length} klanten, opdrachten, projecten en leads...`}
                  />
                  <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      onClick={() => setSelectedContextKey("none")}
                      aria-pressed={!selectedContextOption}
                      className={cn(
                        "h-auto flex-col items-stretch gap-0 p-3 text-left",
                        !selectedContextOption && "border-[var(--color-border-strong)] bg-[var(--color-surface-active)]",
                      )}
                    >
                      <span className="block truncate text-xs font-bold">Geen context</span>
                      <span className="mt-0.5 block truncate text-micro text-[var(--color-text-muted)]">
                        Generieke PDF — niet vast te leggen in een dossier
                      </span>
                    </Button>
                    {filteredContextOptions.map((option) => {
                      const isSelected = selectedContextOption?.key === option.key;

                      return (
                        <Button
                          key={option.key}
                          type="button"
                          variant="secondary"
                          fullWidth
                          onClick={() => setSelectedContextKey(option.key)}
                          aria-pressed={isSelected}
                          className={cn(
                            "h-auto flex-col items-stretch gap-0 p-3 text-left",
                            isSelected && "border-[var(--color-success-border)] bg-[var(--color-success-subtle)] text-[var(--color-success)]",
                          )}
                        >
                          <span className="block truncate text-xs font-bold">{option.label}</span>
                          <span className="mt-0.5 block truncate text-micro text-[var(--color-text-muted)]">{option.subtext}</span>
                        </Button>
                      );
                    })}
                    {filteredContextOptions.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                        Geen context gevonden voor &ldquo;{contextQuery}&rdquo;.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
                  Maak of activeer een klant, lead, opdracht of project om PDF-documenten automatisch als dossierdocument te renderen.
                </p>
              )}
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {documents.map((document) => {
                if (!document) return null;

                const template = getLaventeCarePdfTemplateProfile(document);
                const sectionCount = getLaventeCarePdfStructuredSections(document, selectedContext).length;
                const previewUrl = getLaventeCarePdfUrl({
                  documentKey: document.key,
                  theme: "screen",
                  delivery: "inline",
                  context: selectedContext,
                });
                const previewPageUrl = getLaventeCarePdfViewerUrl({
                  documentKey: document.key,
                  theme: "screen",
                  context: selectedContext,
                });
                const printUrl = getLaventeCarePdfUrl({
                  documentKey: document.key,
                  theme: "print",
                  delivery: "download",
                  context: selectedContext,
                });
                const canLog = Boolean(selectedContext);
                const isLogging = loggingDocumentKey === document.key;

                return (
                  <div key={document.key} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-semibold text-[var(--color-text)]">{document.title}</p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          {template.label} - {sectionCount} secties - {document.badge}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <ButtonLink
                          href={previewPageUrl}
                          aria-label={`${document.title} preview openen`}
                          title="Preview"
                          size="icon"
                          variant="ghost"
                          className="border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-[var(--color-info)] hover:bg-[var(--color-info-border)]"
                        >
                          <ArrowUpRight size={14} />
                        </ButtonLink>
                        <ButtonLink
                          href={printUrl}
                          aria-label={`${document.title} print PDF downloaden`}
                          title="Print PDF"
                          size="icon"
                          variant="ghost"
                          className="border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-border)]"
                        >
                          <Download size={14} />
                        </ButtonLink>
                        <IconButton
                          label={`${document.title} vastleggen in dossier`}
                          title={canLog ? "Vastleggen in dossier" : "Kies eerst dossiercontext"}
                          disabled={!canLog || isLogging}
                          onClick={() => {
                            if (!selectedContext) return;
                            void onLogDossierDocument({
                              documentKey: document.key,
                              title: document.title,
                              templateLabel: template.label,
                              context: selectedContext,
                              pdfUrl: previewUrl,
                              theme: "screen",
                              delivery: "inline",
                            });
                          }}
                          icon={<FileCheck2 size={14} />}
                          variant="ghost"
                          className="border-[var(--color-success-border)] bg-[var(--color-success-subtle)] text-[var(--color-success)] hover:bg-[var(--color-success-border)] disabled:border-[var(--color-border)] disabled:bg-[var(--color-surface-muted)] disabled:text-[var(--color-text-subtle)]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-[var(--color-text)]">Recent vastgelegd</p>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-micro font-bold text-[var(--color-text-muted)]">
                {summary.dossierDocuments ?? dossierDocuments.length}
              </span>
            </div>
            {dossierDocuments.length > 0 ? (
              <div className="mt-3 space-y-2">
                {dossierDocuments.slice(0, 4).map((item) => {
                  const theme = isLaventeCarePdfTheme(item.theme) ? item.theme : "screen";
                  // L2: viewer-URL MET de gelogde contextparams (uit de
                  // opgeslagen pdf_url), zodat het gepersonaliseerde document
                  // opent en niet de generieke template.
                  const href = dossierDocumentViewerHref({
                    document_key: item.document_key,
                    theme,
                    pdf_url: item.pdf_url,
                    context_type: item.context_type,
                    context_id: item.context_id,
                    company_id: item.company_id,
                    lead_id: item.lead_id,
                    project_id: item.project_id,
                    workstream_id: item.workstream_id,
                  });

                  return (
                    <a
                      key={item.id}
                      href={href}
                      className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 transition-colors hover:bg-[var(--color-surface-hover)]"
                    >
                      <span className="block truncate text-xs font-semibold text-[var(--color-text)]">{item.titel}</span>
                      <span className="mt-0.5 block truncate text-micro text-[var(--color-text-muted)]">
                        {item.context_title ?? label(item.context_type)} - {formatDate(item.created_at)}
                      </span>
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
                Nog geen gegenereerde PDF-documenten vastgelegd bij klanten, leads, opdrachten of projecten.
              </p>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}

function CompactMetric({ label: metricLabel, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
      <p className="text-micro font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">{metricLabel}</p>
      <p className="mt-1 text-xl font-bold text-[var(--color-text)]">{value}</p>
      <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{detail}</p>
    </div>
  );
}
