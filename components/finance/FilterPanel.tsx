"use client";

import { useState } from "react";
import {
  Filter, X, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, ArrowLeftRight,
  Tag, Calendar, DollarSign, FileText, RotateCcw,
} from "lucide-react";
import type { TransactionFilter } from "@/hooks/useTransactions";

// ─── Types ──────────────────────────────────────────────────────────────────

const CATEGORIE_OPTIES = [
  "Boodschappen", "Brandstof", "Coffeeshop", "Crypto", "Familie",
  "Fastfood", "Gaming", "Geldopname", "Online Winkelen", "Persoonlijk",
  "SaaS", "SaaS Abonnementen", "Salaris", "Sport", "Streaming",
  "Telecom", "Toeslagen", "Vakantie", "Vaste Lasten", "Vervoer",
  "Verzekeringen", "Vrienden", "Vrije Tijd", "Zakelijk",
  "Zorgverzekering", "Overig",
];

const CODE_LABELS: Record<string, string> = {
  tb: "Overboeking", bc: "Betaalopdracht", id: "Incasso",
  ei: "Europese Incasso", ba: "Bankopdracht", bg: "Bankgiro",
  cb: "Creditcard", db: "Debetkaart", st: "Stornering",
  sb: "SEPA", ga: "Geldautomaat", gb: "Geldautomaat", kh: "Kascheque",
};

// ─── Active Filter Chip ──────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="filter-chip">
      {label}
      <button className="filter-chip__remove" onClick={onRemove} aria-label={`Verwijder filter ${label}`}>
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
      <button className="filter-group__header" onClick={() => setOpen(!open)}>
        <Icon size={14} className="filter-group__icon" />
        <span className="filter-group__title">{title}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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

  // Count active filters
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
    filters.excludeIntern === false, // default is true, so only count when explicitly false
  ].filter(Boolean).length;

  // Active filter chips
  const chips: Array<{ label: string; onRemove: () => void }> = [];
  if (filters.categorieFilter) chips.push({ label: `Categorie: ${filters.categorieFilter}`, onRemove: () => onChange({ categorieFilter: undefined }) });
  if (filters.richting) chips.push({ label: filters.richting === "in" ? "Alleen inkomsten" : "Alleen uitgaven", onRemove: () => onChange({ richting: undefined }) });
  if (filters.minBedrag !== undefined) chips.push({ label: `Min: €${filters.minBedrag}`, onRemove: () => onChange({ minBedrag: undefined }) });
  if (filters.maxBedrag !== undefined) chips.push({ label: `Max: €${filters.maxBedrag}`, onRemove: () => onChange({ maxBedrag: undefined }) });
  if (filters.datumVan) chips.push({ label: `Vanaf: ${filters.datumVan}`, onRemove: () => onChange({ datumVan: undefined }) });
  if (filters.datumTot) chips.push({ label: `Tot: ${filters.datumTot}`, onRemove: () => onChange({ datumTot: undefined }) });
  if (filters.maandFilter) chips.push({ label: `Maand: ${filters.maandFilter}`, onRemove: () => onChange({ maandFilter: undefined }) });
  if (filters.codeFilter) chips.push({ label: `Type: ${CODE_LABELS[filters.codeFilter] ?? filters.codeFilter}`, onRemove: () => onChange({ codeFilter: undefined }) });
  if (filters.onlyStorneringen) chips.push({ label: "Storneringen", onRemove: () => onChange({ onlyStorneringen: false }) });

  return (
    <div className="filter-panel">
      {/* Toggle bar */}
      <div className="filter-panel__bar">
        <button className="filter-panel__toggle" onClick={() => setExpanded(!expanded)}>
          <Filter size={15} />
          <span>Filters</span>
          {activeCount > 0 && <span className="filter-panel__badge">{activeCount}</span>}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {activeCount > 0 && (
          <button className="filter-panel__reset" onClick={onReset}>
            <RotateCcw size={13} /> Reset
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
      {expanded && (
        <div className="filter-panel__body">
          {/* Richting */}
          <FilterGroup icon={ArrowLeftRight} title="Richting" defaultOpen>
            <div className="filter-radio-group">
              {([undefined, "in", "uit"] as const).map((val) => (
                <button
                  key={val ?? "all"}
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
          <FilterGroup icon={DollarSign} title="Bedragbereik">
            <div className="filter-range">
              <div className="filter-range__field">
                <label className="filter-range__label">Min (€)</label>
                <input
                  type="number"
                  className="filter-range__input"
                  placeholder="0"
                  value={filters.minBedrag ?? ""}
                  onChange={(e) => onChange({ minBedrag: e.target.value ? Number(e.target.value) : undefined })}
                  min={0}
                  step={10}
                />
              </div>
              <span className="filter-range__sep">–</span>
              <div className="filter-range__field">
                <label className="filter-range__label">Max (€)</label>
                <input
                  type="number"
                  className="filter-range__input"
                  placeholder="∞"
                  value={filters.maxBedrag ?? ""}
                  onChange={(e) => onChange({ maxBedrag: e.target.value ? Number(e.target.value) : undefined })}
                  min={0}
                  step={10}
                />
              </div>
            </div>
          </FilterGroup>

          {/* Datumbereik */}
          <FilterGroup icon={Calendar} title="Datumbereik">
            <div className="filter-range">
              <div className="filter-range__field">
                <label className="filter-range__label">Van</label>
                <input
                  type="date"
                  className="filter-range__input"
                  value={filters.datumVan ?? ""}
                  onChange={(e) => onChange({ datumVan: e.target.value || undefined, maandFilter: undefined })}
                />
              </div>
              <span className="filter-range__sep">–</span>
              <div className="filter-range__field">
                <label className="filter-range__label">Tot</label>
                <input
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
        </div>
      )}
    </div>
  );
}
