"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BriefcaseBusiness, ChevronDown } from "lucide-react";
import { AppIcon } from "@/components/ui/AppIcon";
import { normalizeBusinessContext, type BusinessContextValue } from "@/lib/workspace-context";
import { useLaventeCareBusinessContextOptions } from "@/hooks/useLaventeCareBusinessContexts";
import {
  fallbackBusinessContextOption,
  getBusinessContextOptionKey,
  type LaventeCareContextOption,
} from "@/lib/laventecare/business-context";

type BusinessContextPickerProps = {
  value?: BusinessContextValue | null;
  onChange: (value: BusinessContextValue | null) => void;
  label?: string;
  compact?: boolean;
};

// L9: zelfde doorzoekbare filter-lijst als het PDF Studio-contextpaneel in
// LaventeCareBusinessCommandCenter, in plaats van een native <select> die bij
// tientallen klanten/leads/projecten onhanteerbaar wordt. Het onChange-contract
// (BusinessContextValue | null) is ongewijzigd.
export function BusinessContextPicker({
  value,
  onChange,
  label = "Zakelijke context",
  compact = false,
}: BusinessContextPickerProps) {
  const { options, isError } = useLaventeCareBusinessContextOptions();
  const normalized = normalizeBusinessContext(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // L12-a11y: sluit de dropdown op Escape en bij een klik buiten de picker.
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        setQuery("");
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  const selectedKey = getBusinessContextOptionKey(normalized);
  const selected =
    options.find((option) => option.key === selectedKey) ??
    fallbackBusinessContextOption(normalized) ??
    options[0];

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) =>
      `${option.label} ${option.meta} ${option.aliases.join(" ")}`.toLowerCase().includes(needle),
    );
  }, [options, query]);

  const groups = useMemo(
    () =>
      [
        { label: null, items: filteredOptions.filter((option) => option.key === "none" || option.key === "laventecare") },
        { label: "Klantdossiers", items: filteredOptions.filter((option) => option.key.startsWith("company:")) },
        { label: "Leads", items: filteredOptions.filter((option) => option.key.startsWith("lead:")) },
        { label: "Projecten", items: filteredOptions.filter((option) => option.key.startsWith("project:")) },
        { label: "Opdrachten", items: filteredOptions.filter((option) => option.key.startsWith("workstream:")) },
      ].filter((group) => group.items.length > 0),
    [filteredOptions],
  );

  const pick = (option: LaventeCareContextOption) => {
    onChange(option.value ?? null);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <BriefcaseBusiness size={12} />
        {label}
      </label>
      <div ref={containerRef} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls="business-context-listbox"
          role="combobox"
          className="flex w-full min-w-0 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition hover:bg-white/[0.04]"
        >
          <AppIcon name="business" tone={normalized ? "cyan" : "slate"} size="xs" framed className="h-7 w-7 rounded-lg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-slate-200">{selected.label}</span>
            <span className="block truncate text-[11px] text-slate-500">{selected.meta}</span>
          </span>
          <ChevronDown
            size={14}
            className={`shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open ? (
          <div className="mt-2 space-y-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Zoek in ${options.length} contexten...`}
              aria-label="Zoek zakelijke context"
              autoFocus
              className="min-h-[38px] w-full rounded-lg border border-[var(--color-border)] bg-[#0d0d15] px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
            />
            <div
              id="business-context-listbox"
              role="listbox"
              aria-label="Zakelijke context"
              className="max-h-56 space-y-2 overflow-y-auto pr-1"
            >
              {selectedKey === "custom" ? (
                <button
                  type="button"
                  role="option"
                  onClick={() => setOpen(false)}
                  aria-selected
                  className="w-full rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-left text-cyan-100"
                >
                  <span className="block truncate text-xs font-bold">{selected.label}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-500">{selected.meta}</span>
                </button>
              ) : null}
              {groups.map((group) => (
                <div key={group.label ?? "algemeen"}>
                  {group.label ? (
                    <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      {group.label}
                    </p>
                  ) : null}
                  <div className="space-y-1.5">
                    {group.items.map((option) => {
                      const isSelected = option.key === selectedKey;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          role="option"
                          onClick={() => pick(option)}
                          aria-selected={isSelected}
                          className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                            isSelected
                              ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-100"
                              : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                          }`}
                        >
                          <span className="block truncate text-xs font-bold">{option.label}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-slate-500">{option.meta}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {filteredOptions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-500">
                  Geen context gevonden voor &ldquo;{query}&rdquo;.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        {isError && (
          <p className="mt-1.5 text-[11px] text-amber-500">
            Klantdossiers konden niet geladen worden — lijst kan onvolledig zijn.
          </p>
        )}
      </div>
    </div>
  );
}
