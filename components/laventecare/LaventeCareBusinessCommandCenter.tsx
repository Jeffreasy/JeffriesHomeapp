"use client";

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
import { formatDate, formatMoney, label } from "./LaventeCareUtils";

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
    subtext: `Project - ${label(project.fase)} - ${label(project.status)}`,
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
  const documents = priorityDocuments
    .map((key) => LAVENTECARE_PDF_REGISTRY.find((document) => document.key === key))
    .filter(Boolean);
  const contextOptions = useMemo(
    () => [
      ...companies.slice(0, 5).map(buildCompanyContextOption),
      ...activeWorkstreams.slice(0, 4).map(buildWorkstreamContextOption),
      ...activeProjects.slice(0, 3).map(buildProjectContextOption),
      ...activeLeads.slice(0, 3).map(buildLeadContextOption),
    ],
    [activeLeads, activeProjects, activeWorkstreams, companies]
  );
  const selectedContextOption =
    selectedContextKey === "none"
      ? null
      : contextOptions.find((option) => option.key === selectedContextKey) ?? contextOptions[0] ?? null;
  const selectedContext = selectedContextOption?.context ?? null;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass min-w-0 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-300">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Klant- en bedrijfsfundament</p>
              <h2 className="mt-1 text-lg font-bold text-white">LaventeCare als systeempartner</h2>
              <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-400">{LAVENTECARE_PROFILE.positie}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <CompactMetric label="Klanten" value={summary.companies ?? companies.length} detail="dossiers" />
            <CompactMetric label="Funnel" value={activeLeads.length} detail="open leads" />
            <CompactMetric label="Werkbank" value={summary.workstreams ?? activeWorkstreams.length} detail={`${activeWorkstreams.length} actief`} />
            <CompactMetric label="Delivery" value={activeProjects.length} detail="projecten" />
            <CompactMetric label="Docs" value={summary.documents} detail="templates" />
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-300" />
            <p className="text-xs leading-5 text-slate-300">
              {LAVENTECARE_PROFILE.security.philosophy} Context, dossiers en klantwerk blijven gekoppeld.
            </p>
          </div>
        </div>

        <div className="glass min-w-0 p-4">
          <div className="flex items-center gap-2">
            <Workflow size={18} className="text-emerald-300" />
            <h2 className="text-lg font-bold text-white">Operating model</h2>
          </div>
          <div className="mt-3 grid gap-2">
            {LAVENTECARE_PROCESS_STAGES.slice(0, 4).map((stage, index) => (
              <div key={stage.key} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-[11px] font-bold text-slate-400">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{stage.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-slate-500">{stage.output}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <details className="glass min-w-0 overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-300">
              <FileText size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white">PDF Studio en dossierdocumenten</span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">
                Context kiezen, PDF openen/downloaden en vastleggen in klantdossier
              </span>
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-bold text-slate-400">
            {documents.length} snel
          </span>
        </summary>

        <div className="grid gap-4 border-t border-white/10 p-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Dossiercontext</p>
                  <p className="mt-1 line-clamp-1 text-sm font-semibold text-white">
                    {selectedContextOption?.label ?? "Geen dossier gekoppeld"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-bold text-slate-400">
                  {contextOptions.length} opties
                </span>
              </div>

              {contextOptions.length > 0 ? (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {contextOptions.map((option) => {
                    const isSelected = selectedContextOption?.key === option.key;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setSelectedContextKey(option.key)}
                        className={`min-w-[190px] rounded-lg border px-3 py-2 text-left transition ${
                          isSelected
                            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="block truncate text-xs font-bold">{option.label}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-500">{option.subtext}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSelectedContextKey("none")}
                    className={`min-w-[150px] rounded-lg border px-3 py-2 text-left transition ${
                      selectedContextKey === "none"
                        ? "border-slate-400/30 bg-white/[0.07] text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="block truncate text-xs font-bold">Geen context</span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">Generieke PDF</span>
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs leading-5 text-slate-500">
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
                  <div key={document.key} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-semibold text-white">{document.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {template.label} - {sectionCount} secties - {document.badge}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <a
                          href={previewPageUrl}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-300 transition hover:bg-sky-500/20"
                          aria-label={`${document.title} preview openen`}
                          title="Preview"
                        >
                          <ArrowUpRight size={14} />
                        </a>
                        <a
                          href={printUrl}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-300 transition hover:bg-amber-500/20"
                          aria-label={`${document.title} print PDF downloaden`}
                          title="Print PDF"
                        >
                          <Download size={14} />
                        </a>
                        <button
                          type="button"
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
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.02] disabled:text-slate-600"
                          aria-label={`${document.title} vastleggen in dossier`}
                          title={canLog ? "Vastleggen in dossier" : "Kies eerst dossiercontext"}
                        >
                          <FileCheck2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-white">Recent vastgelegd</p>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-bold text-slate-400">
                {summary.dossierDocuments ?? dossierDocuments.length}
              </span>
            </div>
            {dossierDocuments.length > 0 ? (
              <div className="mt-3 space-y-2">
                {dossierDocuments.slice(0, 4).map((item) => {
                  const theme = isLaventeCarePdfTheme(item.theme) ? item.theme : "screen";
                  const href = getLaventeCarePdfViewerUrl({
                    documentKey: item.document_key,
                    theme,
                  });

                  return (
                    <a
                      key={item.id}
                      href={href}
                      className="block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.06]"
                    >
                      <span className="block truncate text-xs font-semibold text-slate-200">{item.titel}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                        {item.context_title ?? label(item.context_type)} - {formatDate(item.created_at)}
                      </span>
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-xs leading-5 text-slate-500">
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
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-normal text-slate-500">{metricLabel}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      <p className="mt-0.5 truncate text-xs text-slate-500">{detail}</p>
    </div>
  );
}
