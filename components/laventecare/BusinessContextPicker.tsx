"use client";

import { BriefcaseBusiness } from "lucide-react";
import { AppIcon } from "@/components/ui/AppIcon";
import { useLaventeCare } from "@/hooks/useLaventeCare";
import { businessContextLabel, normalizeBusinessContext, type BusinessContextValue } from "@/lib/workspace-context";

type BusinessContextOption = {
  key: string;
  label: string;
  meta: string;
  value: BusinessContextValue | null;
};

type BusinessContextPickerProps = {
  value?: BusinessContextValue | null;
  onChange: (value: BusinessContextValue | null) => void;
  label?: string;
  compact?: boolean;
};

export function BusinessContextPicker({
  value,
  onChange,
  label = "Business context",
  compact = false,
}: BusinessContextPickerProps) {
  const { activeLeads, activeProjects, cockpitLoading } = useLaventeCare();
  const normalized = normalizeBusinessContext(value);
  const options: BusinessContextOption[] = [
    { key: "none", label: "Geen zakelijke context", meta: "Persoonlijk of algemeen", value: null },
    { key: "laventecare", label: "LaventeCare algemeen", meta: "Bedrijf, strategie of interne opvolging", value: { type: "laventecare", title: "LaventeCare" } },
    ...activeLeads
      .filter((lead) => lead._id || lead.id)
      .slice(0, 12)
      .map((lead) => {
        const id = lead._id ?? lead.id;
        return {
          key: `lead:${id}`,
          label: lead.titel,
          meta: `Lead - ${lead.prioriteit ?? "normaal"} - ${lead.status}`,
          value: { type: "laventecare_lead", id, title: lead.titel },
        } satisfies BusinessContextOption;
      }),
    ...activeProjects
      .filter((project) => project._id || project.id)
      .slice(0, 12)
      .map((project) => {
        const id = project._id ?? project.id;
        return {
          key: `project:${id}`,
          label: project.naam,
          meta: `Project - ${project.fase} - ${project.status}`,
          value: { type: "laventecare_project", id, title: project.naam },
        } satisfies BusinessContextOption;
      }),
  ];

  const selectedKey = optionKey(normalized);
  const selected = options.find((option) => option.key === selectedKey) ?? (normalized
    ? { key: "custom", label: businessContextLabel(normalized), meta: normalized.type ?? "", value: normalized }
    : options[0]);

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <BriefcaseBusiness size={12} />
        {label}
      </label>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        <div className="mb-2 flex min-w-0 items-center gap-2">
          <AppIcon name="business" tone={normalized ? "cyan" : "slate"} size="xs" framed className="h-7 w-7 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-200">{selected.label}</p>
            <p className="truncate text-[11px] text-slate-500">
              {cockpitLoading ? "LaventeCare laden..." : selected.meta}
            </p>
          </div>
        </div>
        <select
          value={selectedKey}
          onChange={(event) => {
            const option = options.find((item) => item.key === event.target.value);
            onChange(option?.value ?? null);
          }}
          className="min-h-[42px] w-full rounded-lg border border-[var(--color-border)] bg-[#0d0d15] px-3 text-sm text-slate-100 outline-none [color-scheme:dark] focus:border-cyan-500/50"
        >
          <option value="none">Geen zakelijke context</option>
          <option value="laventecare">LaventeCare algemeen</option>
          {selectedKey === "custom" && <option value="custom">{selected.label}</option>}
          {activeLeads.length > 0 && (
            <optgroup label="Leads">
              {activeLeads
                .filter((lead) => lead._id || lead.id)
                .slice(0, 12)
                .map((lead) => {
                  const id = lead._id ?? lead.id;
                  return <option key={id} value={`lead:${id}`}>{lead.titel}</option>;
                })}
            </optgroup>
          )}
          {activeProjects.length > 0 && (
            <optgroup label="Projecten">
              {activeProjects
                .filter((project) => project._id || project.id)
                .slice(0, 12)
                .map((project) => {
                  const id = project._id ?? project.id;
                  return <option key={id} value={`project:${id}`}>{project.naam}</option>;
                })}
            </optgroup>
          )}
        </select>
      </div>
    </div>
  );
}

function optionKey(value?: BusinessContextValue | null) {
  const context = normalizeBusinessContext(value);
  if (!context?.type) return "none";
  if (context.type === "laventecare_lead" && context.id) return `lead:${context.id}`;
  if (context.type === "laventecare_project" && context.id) return `project:${context.id}`;
  if (context.type === "laventecare") return "laventecare";
  return "custom";
}
