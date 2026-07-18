"use client";

import { cn } from "@/lib/utils";
import { surfaceVariants } from "@/components/ui/Surface";
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
    <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-5")}>
      <div className="flex items-center gap-2">
        <Layers3 size={18} className="text-[var(--color-success)]" />
        <h2 className="text-lg font-bold text-[var(--color-text)]">Document-suite</h2>
      </div>
      <div className="mt-4 grid gap-2">
        {stats.byCategory.map((category) => (
          <div key={category.key} className={cn(surfaceVariants({ padding: "none" }), "bg-[var(--color-surface)] px-3 py-2")}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--color-text)]">{category.title}</p>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs font-bold text-[var(--color-text-muted)]">
                {category.count}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{category.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[var(--color-primary-hover)]" />
          <p className="text-sm font-bold text-[var(--color-text)]">Templateprofielen</p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {templateStats.map((template) => (
            <div key={template.kind} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-[var(--color-text-muted)]">{template.label}</p>
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-micro font-bold text-[var(--color-text-muted)]">
                  {template.count}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-subtle)] px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-[var(--color-success)]">Structured content</p>
            <span className="text-micro font-bold text-[var(--color-success)]">
              {structuredStats.sections} secties
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--color-success)]">
            {structuredStats.blocks} typed blokken voor detail, lijst, metrics, progress en flow.
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <div className="flex items-center gap-2">
          <Route size={16} className="text-[var(--color-info)]" />
          <p className="text-sm font-bold text-[var(--color-text)]">Aanbevolen dossierpaden</p>
        </div>
        <div className="mt-3 space-y-3">
          {LAVENTECARE_TRAJECT_DOCUMENT_SETS.map((set) => (
            <div key={set.key} className={cn(surfaceVariants({ padding: "none" }), "bg-[var(--color-surface)] p-3")}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-subtle)] text-[var(--color-success)]">
                  <FileCheck2 size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)]">{set.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{set.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {set.documents.slice(0, 4).map((document) => (
                      <span
                        key={document.key}
                        className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-micro font-semibold text-[var(--color-text-muted)]"
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
