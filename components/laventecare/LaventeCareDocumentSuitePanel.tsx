"use client";

import { FileCheck2, FileText, Layers3, Route } from "lucide-react";
import {
  getLaventeCarePdfTemplateProfile,
  getLaventeCarePdfStructuredSections,
  LAVENTECARE_TRAJECT_DOCUMENT_SETS,
  LAVENTECARE_PDF_REGISTRY,
  getLaventeCareDocumentStats,
} from "@/lib/laventecare";

const stats = getLaventeCareDocumentStats();
const templateStats = Array.from(
  LAVENTECARE_PDF_REGISTRY.reduce((map, document) => {
    const template = getLaventeCarePdfTemplateProfile(document);
    const current = map.get(template.kind) ?? { label: template.label, count: 0 };
    map.set(template.kind, { ...current, count: current.count + 1 });
    return map;
  }, new Map<string, { label: string; count: number }>())
).map(([kind, value]) => ({ kind, ...value }));
const structuredStats = LAVENTECARE_PDF_REGISTRY.reduce(
  (total, document) => {
    const sections = getLaventeCarePdfStructuredSections(document);
    return {
      sections: total.sections + sections.length,
      blocks: total.blocks + sections.reduce((count, section) => count + section.blocks.length, 0),
    };
  },
  { sections: 0, blocks: 0 }
);

export function LaventeCareDocumentSuitePanel() {
  return (
    <div className="glass min-w-0 p-5">
      <div className="flex items-center gap-2">
        <Layers3 size={18} className="text-emerald-300" />
        <h2 className="text-lg font-bold text-white">Document-suite</h2>
      </div>
      <div className="mt-4 grid gap-2">
        {stats.byCategory.map((category) => (
          <div key={category.key} className="glass bg-[var(--color-surface)] px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{category.title}</p>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs font-bold text-slate-300">
                {category.count}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{category.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-white/5 pt-4">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-amber-300" />
          <p className="text-sm font-bold text-white">Templateprofielen</p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {templateStats.map((template) => (
            <div key={template.kind} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-300">{template.label}</p>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-bold text-slate-400">
                  {template.count}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-emerald-100">Structured content</p>
            <span className="text-[11px] font-bold text-emerald-200">
              {structuredStats.sections} secties
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-emerald-100/70">
            {structuredStats.blocks} typed blokken voor detail, lijst, metrics, progress en flow.
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-white/5 pt-4">
        <div className="flex items-center gap-2">
          <Route size={16} className="text-sky-300" />
          <p className="text-sm font-bold text-white">Aanbevolen dossierpaden</p>
        </div>
        <div className="mt-3 space-y-3">
          {LAVENTECARE_TRAJECT_DOCUMENT_SETS.map((set) => (
            <div key={set.key} className="glass bg-[var(--color-surface)] p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                  <FileCheck2 size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{set.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{set.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {set.documents.slice(0, 4).map((document) => (
                      <span
                        key={document.key}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] font-semibold text-slate-300"
                      >
                        {document.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
