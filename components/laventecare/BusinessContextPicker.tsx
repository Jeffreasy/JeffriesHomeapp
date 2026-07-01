"use client";

import { BriefcaseBusiness } from "lucide-react";
import { AppIcon } from "@/components/ui/AppIcon";
import { normalizeBusinessContext, type BusinessContextValue } from "@/lib/workspace-context";
import { useLaventeCareBusinessContextOptions } from "@/hooks/useLaventeCareBusinessContexts";
import { fallbackBusinessContextOption, getBusinessContextOptionKey } from "@/lib/laventecare/business-context";

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
  const { options, isError } = useLaventeCareBusinessContextOptions();
  const normalized = normalizeBusinessContext(value);

  const selectedKey = getBusinessContextOptionKey(normalized);
  const selected = options.find((option) => option.key === selectedKey) ?? fallbackBusinessContextOption(normalized) ?? options[0];
  const companies = options.filter((option) => option.key.startsWith("company:"));
  const leads = options.filter((option) => option.key.startsWith("lead:"));
  const projects = options.filter((option) => option.key.startsWith("project:"));
  const workstreams = options.filter((option) => option.key.startsWith("workstream:"));

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
              {selected.meta}
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
          {companies.length > 0 && (
            <optgroup label="Klantdossiers">
              {companies.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </optgroup>
          )}
          {leads.length > 0 && (
            <optgroup label="Leads">
              {leads.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </optgroup>
          )}
          {projects.length > 0 && (
            <optgroup label="Projecten">
              {projects.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </optgroup>
          )}
          {workstreams.length > 0 && (
            <optgroup label="Opdrachten">
              {workstreams.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </optgroup>
          )}
        </select>
        {isError && (
          <p className="mt-1.5 text-[11px] text-amber-500">
            Klantdossiers konden niet geladen worden — lijst kan onvolledig zijn.
          </p>
        )}
      </div>
    </div>
  );
}
