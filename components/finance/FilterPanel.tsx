"use client";

import { useState, type ElementType, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter, X, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, ArrowLeftRight,
  Tag, Calendar, Euro, FileText, RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Surface, surfaceVariants } from "@/components/ui/Surface";
import { CATEGORIE_OPTIES, CODE_LABELS, eurExact } from "@/lib/finance-constants";
import type { TransactionFilter } from "@/hooks/useTransactions";
import { uiMotion } from "@/lib/ui/motion";
import { cn } from "@/lib/utils";

// Accepteert Nederlandse invoer: "1.234,56" → 1234.56, "12,50" → 12.5. Zonder
// komma wordt een punt als decimaalteken gelezen ("12.50" → 12.5), behalve bij
// het duidenpatroon "1.000"/"12.345" (punt + exact 3 cijfers, geen komma) — dat
// leest de gebruiker als duizendtal, niet als "€1,00" (L13-heuristiek).
function parseAmountInput(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  let normalized: string;
  if (trimmed.includes(",")) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(trimmed)) {
    // "1.000" / "12.345.678" → duizendscheidingstekens verwijderen.
    normalized = trimmed.replace(/\./g, "");
  } else {
    normalized = trimmed;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

function amountToInput(value: number | undefined): string {
  return value === undefined ? "" : String(value).replace(".", ",");
}

// ─── Active Filter Chip ──────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onRemove}
      aria-label={"Verwijder filter " + label}
      className="h-auto min-h-11 shrink-0 rounded-full px-3 text-left"
    >
      {label}
      <X size={14} aria-hidden="true" />
    </Button>
  );
}

// ─── Filter Group ────────────────────────────────────────────────────────────

function FilterGroup({ icon: Icon, title, children, defaultOpen = false }: {
  icon: ElementType; title: string; children: ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Surface tone="subtle" radius="md" padding="none" className="overflow-hidden">
      <Button
        variant="ghost"
        fullWidth
        className="justify-start rounded-none border-0 px-3"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <Icon size={15} className="text-[var(--color-primary)]" aria-hidden="true" />
        <span className="flex-1 text-left">{title}</span>
        {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      </Button>
      {open && <div className="space-y-3 border-t border-[var(--color-border)] p-3">{children}</div>}
    </Surface>
  );
}

// ─── FilterPanel ─────────────────────────────────────────────────────────────

interface FilterPanelProps {
  filters: TransactionFilter;
  onChange: (partial: Partial<TransactionFilter>) => void;
  onReset: () => void;
  availableMaanden?: string[];
}

export function FilterPanel({ filters, onChange, onReset, availableMaanden = [] }: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  // Lokale tekst-state voor de bedragvelden: zo kan de gebruiker vrij typen
  // ("1.234,56") terwijl het geparste getal naar de filters gaat. Extern
  // resetten (chips/Reset-knop) synct de tekst terug.
  type AmountDraft = { text: string; parsed: number | undefined };
  const [minDraft, setMinDraft] = useState<AmountDraft | null>(null);
  const [maxDraft, setMaxDraft] = useState<AmountDraft | null>(null);
  // Een eigen draft blijft zichtbaar zolang de ouder exact dezelfde geparste
  // waarde teruggeeft. Een externe reset/filterchip wint direct, zonder een
  // prop-naar-state synchronisatie-effect of verlies van Nederlandse invoer.
  const minText =
    minDraft && minDraft.parsed === filters.minBedrag ? minDraft.text : amountToInput(filters.minBedrag);
  const maxText =
    maxDraft && maxDraft.parsed === filters.maxBedrag ? maxDraft.text : amountToInput(filters.maxBedrag);
  const amountRangeInvalid =
    filters.minBedrag != null && filters.maxBedrag != null && filters.minBedrag > filters.maxBedrag;
  const amountRangeErrorId = "filter-amount-range-error";
  const activeCount = [
    filters.categorieFilter,
    filters.richting,
    filters.minBedrag !== undefined,
    filters.maxBedrag !== undefined,
    filters.datumVan,
    filters.datumTot,
    filters.maandFilter,
    filters.codeFilter,
    filters.onlyStorneringen,
    filters.excludeIntern === false,
  ].filter(Boolean).length;

  const chips: Array<{ label: string; onRemove: () => void }> = [];
  if (filters.categorieFilter) chips.push({ label: `Categorie: ${filters.categorieFilter}`, onRemove: () => onChange({ categorieFilter: undefined }) });
  if (filters.richting) chips.push({ label: filters.richting === "in" ? "Alleen inkomsten" : "Alleen uitgaven", onRemove: () => onChange({ richting: undefined }) });
  if (filters.minBedrag !== undefined) chips.push({ label: `Min: ${eurExact(filters.minBedrag)}`, onRemove: () => onChange({ minBedrag: undefined }) });
  if (filters.maxBedrag !== undefined) chips.push({ label: `Max: ${eurExact(filters.maxBedrag)}`, onRemove: () => onChange({ maxBedrag: undefined }) });
  if (filters.datumVan) chips.push({ label: `Vanaf: ${filters.datumVan}`, onRemove: () => onChange({ datumVan: undefined }) });
  if (filters.datumTot) chips.push({ label: `Tot: ${filters.datumTot}`, onRemove: () => onChange({ datumTot: undefined }) });
  if (filters.maandFilter) chips.push({ label: `Maand: ${filters.maandFilter}`, onRemove: () => onChange({ maandFilter: undefined }) });
  if (filters.codeFilter) chips.push({ label: `Type: ${CODE_LABELS[filters.codeFilter] ?? filters.codeFilter}`, onRemove: () => onChange({ codeFilter: undefined }) });
  if (filters.onlyStorneringen) chips.push({ label: "Storneringen", onRemove: () => onChange({ onlyStorneringen: false }) });
  // excludeIntern === false telt mee in de badge, dus moet ook als chip
  // zichtbaar (en verwijderbaar) zijn — anders klopt de teller niet.
  if (filters.excludeIntern === false) chips.push({ label: "Interne overboekingen zichtbaar", onRemove: () => onChange({ excludeIntern: true }) });

  return (
    <div className="space-y-3">
      {/* Toggle bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="secondary"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <Filter size={16} aria-hidden="true" />
          <span>Filters</span>
          {activeCount > 0 && <Badge tone="accent">{activeCount}</Badge>}
          {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </Button>

        {activeCount > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw size={15} aria-hidden="true" /> Reset
          </Button>
        )}
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          {chips.map((chip) => (
            <FilterChip key={chip.label} label={chip.label} onRemove={chip.onRemove} />
          ))}
        </div>
      )}

      {/* Expanded filter panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: uiMotion.durationSeconds.standard, ease: "easeInOut" }}
          >
          <div className={cn(surfaceVariants({ tone: "subtle", radius: "md", padding: "sm" }), "space-y-3")}>
          {/* Richting */}
          <FilterGroup icon={ArrowLeftRight} title="Richting" defaultOpen>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {([undefined, "in", "uit"] as const).map((val) => (
                <Button
                  key={val ?? "all"}
                  type="button"
                  aria-pressed={filters.richting === val}
                  variant={filters.richting === val ? "primary" : "secondary"}
                  size="sm"
                  fullWidth
                  onClick={() => onChange({ richting: val ?? undefined })}
                >
                  {val === "in" && <ArrowUpRight size={15} aria-hidden="true" />}
                  {val === "uit" && <ArrowDownRight size={15} aria-hidden="true" />}
                  {val === undefined ? "Alle" : val === "in" ? "Inkomsten" : "Uitgaven"}
                </Button>
              ))}
            </div>
          </FilterGroup>

          {/* Categorie */}
          <FilterGroup icon={Tag} title="Categorie" defaultOpen>
            <Select
              aria-label="Filter op categorie"
              value={filters.categorieFilter ?? ""}
              onChange={(e) => onChange({ categorieFilter: e.target.value || undefined })}
            >
              <option value="">Alle categorieën</option>
              {CATEGORIE_OPTIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </FilterGroup>

          {/* Bedragbereik */}
          <FilterGroup icon={Euro} title="Bedragbereik">
            <fieldset className="space-y-3">
              <legend className="sr-only">Bedragbereik in euro</legend>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
                <FormField id="finance-filter-min-amount" label="Min (€)" className="min-w-0">
                  {(controlProps) => (
                    <Input
                      {...controlProps}
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={minText}
                      aria-invalid={amountRangeInvalid || undefined}
                      aria-describedby={amountRangeInvalid ? amountRangeErrorId : controlProps["aria-describedby"]}
                      onChange={(e) => {
                        setMinDraft({ text: e.target.value, parsed: parseAmountInput(e.target.value) });
                        onChange({ minBedrag: parseAmountInput(e.target.value) });
                      }}
                    />
                  )}
                </FormField>
                <span className="flex min-h-11 items-center text-[var(--color-text-subtle)]" aria-hidden="true">–</span>
                <FormField id="finance-filter-max-amount" label="Max (€)" className="min-w-0">
                  {(controlProps) => (
                    <Input
                      {...controlProps}
                      type="text"
                      inputMode="decimal"
                      placeholder="∞"
                      value={maxText}
                      aria-invalid={amountRangeInvalid || undefined}
                      aria-describedby={amountRangeInvalid ? amountRangeErrorId : controlProps["aria-describedby"]}
                      onChange={(e) => {
                        setMaxDraft({ text: e.target.value, parsed: parseAmountInput(e.target.value) });
                        onChange({ maxBedrag: parseAmountInput(e.target.value) });
                      }}
                    />
                  )}
                </FormField>
              </div>
              {amountRangeInvalid ? (
                <p id={amountRangeErrorId} role="alert" className="text-xs text-[var(--color-danger)]">
                  Minimum is groter dan maximum — er zijn geen resultaten.
                </p>
              ) : null}
            </fieldset>
          </FilterGroup>

          {/* Datumbereik */}
          <FilterGroup icon={Calendar} title="Datumbereik">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
              <FormField id="finance-filter-date-from" label="Van" className="min-w-0">
                {(controlProps) => (
                  <Input
                    {...controlProps}
                    type="date"
                    value={filters.datumVan ?? ""}
                    onChange={(e) => onChange({ datumVan: e.target.value || undefined, maandFilter: undefined })}
                  />
                )}
              </FormField>
              <span className="flex min-h-11 items-center text-[var(--color-text-subtle)]" aria-hidden="true">–</span>
              <FormField id="finance-filter-date-to" label="Tot" className="min-w-0">
                {(controlProps) => (
                  <Input
                    {...controlProps}
                    type="date"
                    value={filters.datumTot ?? ""}
                    onChange={(e) => onChange({ datumTot: e.target.value || undefined, maandFilter: undefined })}
                  />
                )}
              </FormField>
            </div>
            {/* Quick month selector */}
            {availableMaanden.length > 0 && (
              <Select
                aria-label="Snelkeuze maand"
                value={filters.maandFilter ?? ""}
                onChange={(e) => onChange({ maandFilter: e.target.value || undefined, datumVan: undefined, datumTot: undefined })}
              >
                <option value="">Snelkeuze maand…</option>
                {availableMaanden.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            )}
          </FilterGroup>

          {/* Transactie type */}
          <FilterGroup icon={FileText} title="Transactie type">
            <Select
              aria-label="Filter op transactietype"
              value={filters.codeFilter ?? ""}
              onChange={(e) => onChange({ codeFilter: e.target.value || undefined })}
            >
              <option value="">Alle types</option>
              {Object.entries(CODE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </Select>
          </FilterGroup>

          {/* Toggles */}
          <div className="grid gap-2 sm:grid-cols-2">
            <Checkbox
              label="Verberg interne overboekingen"
              checked={filters.excludeIntern ?? true}
              onChange={(e) => onChange({ excludeIntern: e.target.checked })}
            />
            <Checkbox
              label="Alleen storneringen"
              checked={filters.onlyStorneringen ?? false}
              onChange={(e) => onChange({ onlyStorneringen: e.target.checked })}
            />
          </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
