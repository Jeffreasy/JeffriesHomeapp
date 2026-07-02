"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter, X, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, ArrowLeftRight,
  Tag, Calendar, Euro, FileText, RotateCcw,
} from "lucide-react";
import { CATEGORIE_OPTIES, CODE_LABELS, eurExact } from "@/lib/finance-constants";
import type { TransactionFilter } from "@/hooks/useTransactions";

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
    <span className="filter-chip">
      {label}
      <button type="button" className="filter-chip__remove" onClick={onRemove} aria-label={`Verwijder filter ${label}`}>
        <X size={12} />
      </button>
    </span>
  );
}

// ─── Filter Group ────────────────────────────────────────────────────────────

function FilterGroup({ icon: Icon, title, children, defaultOpen = false }: {
  icon: React.ElementType; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`filter-group ${open ? "filter-group--open" : ""}`}>
      <button
        type="button"
        className="filter-group__header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <Icon size={14} className="filter-group__icon" aria-hidden="true" />
        <span className="filter-group__title">{title}</span>
        {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </button>
      {open && <div className="filter-group__body">{children}</div>}
    </div>
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
  const [minText, setMinText] = useState(() => amountToInput(filters.minBedrag));
  const [maxText, setMaxText] = useState(() => amountToInput(filters.maxBedrag));
  useEffect(() => {
    setMinText((current) =>
      parseAmountInput(current) === filters.minBedrag ? current : amountToInput(filters.minBedrag)
    );
  }, [filters.minBedrag]);
  useEffect(() => {
    setMaxText((current) =>
      parseAmountInput(current) === filters.maxBedrag ? current : amountToInput(filters.maxBedrag)
    );
  }, [filters.maxBedrag]);

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
    <div className="filter-panel">
      {/* Toggle bar */}
      <div className="filter-panel__bar">
        <button
          type="button"
          className="filter-panel__toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <Filter size={15} aria-hidden="true" />
          <span>Filters</span>
          {activeCount > 0 && <span className="filter-panel__badge">{activeCount}</span>}
          {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        </button>

        {activeCount > 0 && (
          <button type="button" className="filter-panel__reset" onClick={onReset}>
            <RotateCcw size={13} aria-hidden="true" /> Reset
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="filter-chips">
          {chips.map((chip) => (
            <FilterChip key={chip.label} label={chip.label} onRemove={chip.onRemove} />
          ))}
        </div>
      )}

      {/* Expanded filter panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="filter-panel__body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
          {/* Richting */}
          <FilterGroup icon={ArrowLeftRight} title="Richting" defaultOpen>
            <div className="filter-radio-group">
              {([undefined, "in", "uit"] as const).map((val) => (
                <button
                  key={val ?? "all"}
                  type="button"
                  aria-pressed={filters.richting === val}
                  className={`filter-radio ${filters.richting === val ? "filter-radio--active" : ""}`}
                  onClick={() => onChange({ richting: val ?? undefined })}
                >
                  {val === "in" && <ArrowUpRight size={13} />}
                  {val === "uit" && <ArrowDownRight size={13} />}
                  {val === undefined ? "Alle" : val === "in" ? "Inkomsten" : "Uitgaven"}
                </button>
              ))}
            </div>
          </FilterGroup>

          {/* Categorie */}
          <FilterGroup icon={Tag} title="Categorie" defaultOpen>
            <select
              className="filter-select"
              aria-label="Filter op categorie"
              value={filters.categorieFilter ?? ""}
              onChange={(e) => onChange({ categorieFilter: e.target.value || undefined })}
            >
              <option value="">Alle categorieën</option>
              {CATEGORIE_OPTIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </FilterGroup>

          {/* Bedragbereik */}
          <FilterGroup icon={Euro} title="Bedragbereik">
            <div className="filter-range">
              <div className="filter-range__field">
                <label className="filter-range__label" htmlFor="filter-min-bedrag">Min (€)</label>
                <input
                  id="filter-min-bedrag"
                  type="text"
                  inputMode="decimal"
                  className="filter-range__input"
                  placeholder="0,00"
                  value={minText}
                  onChange={(e) => {
                    setMinText(e.target.value);
                    onChange({ minBedrag: parseAmountInput(e.target.value) });
                  }}
                />
              </div>
              <span className="filter-range__sep" aria-hidden="true">–</span>
              <div className="filter-range__field">
                <label className="filter-range__label" htmlFor="filter-max-bedrag">Max (€)</label>
                <input
                  id="filter-max-bedrag"
                  type="text"
                  inputMode="decimal"
                  className="filter-range__input"
                  placeholder="∞"
                  value={maxText}
                  onChange={(e) => {
                    setMaxText(e.target.value);
                    onChange({ maxBedrag: parseAmountInput(e.target.value) });
                  }}
                  aria-invalid={filters.minBedrag != null && filters.maxBedrag != null && filters.minBedrag > filters.maxBedrag}
                />
              </div>
            </div>
            {filters.minBedrag != null && filters.maxBedrag != null && filters.minBedrag > filters.maxBedrag && (
              <p className="mt-1.5 text-[11px] text-amber-300">Min is groter dan max — geen resultaten.</p>
            )}
          </FilterGroup>

          {/* Datumbereik */}
          <FilterGroup icon={Calendar} title="Datumbereik">
            <div className="filter-range">
              <div className="filter-range__field">
                <label className="filter-range__label" htmlFor="filter-datum-van">Van</label>
                <input
                  id="filter-datum-van"
                  type="date"
                  className="filter-range__input"
                  value={filters.datumVan ?? ""}
                  onChange={(e) => onChange({ datumVan: e.target.value || undefined, maandFilter: undefined })}
                />
              </div>
              <span className="filter-range__sep" aria-hidden="true">–</span>
              <div className="filter-range__field">
                <label className="filter-range__label" htmlFor="filter-datum-tot">Tot</label>
                <input
                  id="filter-datum-tot"
                  type="date"
                  className="filter-range__input"
                  value={filters.datumTot ?? ""}
                  onChange={(e) => onChange({ datumTot: e.target.value || undefined, maandFilter: undefined })}
                />
              </div>
            </div>
            {/* Quick month selector */}
            {availableMaanden.length > 0 && (
              <select
                className="filter-select filter-select--sm"
                aria-label="Snelkeuze maand"
                value={filters.maandFilter ?? ""}
                onChange={(e) => onChange({ maandFilter: e.target.value || undefined, datumVan: undefined, datumTot: undefined })}
              >
                <option value="">Snelkeuze maand…</option>
                {availableMaanden.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </FilterGroup>

          {/* Transactie type */}
          <FilterGroup icon={FileText} title="Transactie type">
            <select
              className="filter-select"
              aria-label="Filter op transactietype"
              value={filters.codeFilter ?? ""}
              onChange={(e) => onChange({ codeFilter: e.target.value || undefined })}
            >
              <option value="">Alle types</option>
              {Object.entries(CODE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </FilterGroup>

          {/* Toggles */}
          <div className="filter-toggles">
            <label className="filter-toggle-item">
              <input type="checkbox" checked={filters.excludeIntern ?? true}
                onChange={(e) => onChange({ excludeIntern: e.target.checked })} />
              Verberg interne overboekingen
            </label>
            <label className="filter-toggle-item">
              <input type="checkbox" checked={filters.onlyStorneringen ?? false}
                onChange={(e) => onChange({ onlyStorneringen: e.target.checked })} />
              Alleen storneringen
            </label>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
