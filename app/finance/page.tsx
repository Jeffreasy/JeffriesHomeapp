"use client";

import { useState, useCallback } from "react";
import { useTransactions }  from "@/hooks/useTransactions";
import { CsvUploader }      from "@/components/finance/CsvUploader";
import { TransactionList }  from "@/components/finance/TransactionList";
import { FilterPanel }      from "@/components/finance/FilterPanel";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, Landmark,
  RefreshCw, Search, X, Calendar, CreditCard,
  PieChart as PieChartIcon, BarChart3, Wallet, Hash,
  ArrowUpRight, ArrowDownRight, Receipt, ShoppingBag,
  CalendarDays,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const eur = (n: number) =>
  n.toLocaleString("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const eurExact = (n: number) =>
  n.toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

// ─── IBAN label helpers ───────────────────────────────────────────────────────

const IBAN_LABELS: Record<string, string> = {
  "NL41RABO0348147740": "Spaarrekening",
  "NL20RABO0198574215": "Betaalrekening",
};

function ibanLabel(iban: string): string {
  return IBAN_LABELS[iban] ?? iban.slice(-8);
}

// ─── Category color palette ──────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Boodschappen:       "#22c55e",
  Brandstof:          "#f97316",
  Coffeeshop:         "#8b5cf6",
  Crypto:             "#06b6d4",
  Familie:            "#ec4899",
  Fastfood:           "#ef4444",
  Gaming:             "#3b82f6",
  Geldopname:         "#a855f7",
  "Interne Overboeking": "#475569",
  "Online Winkelen":  "#f59e0b",
  Persoonlijk:        "#14b8a6",
  SaaS:               "#6366f1",
  "SaaS Abonnementen":"#818cf8",
  Salaris:            "#22c55e",
  Sport:              "#10b981",
  Streaming:          "#e879f9",
  Telecom:            "#0ea5e9",
  Toeslagen:          "#84cc16",
  Vakantie:           "#fbbf24",
  "Vaste Lasten":     "#64748b",
  Vervoer:            "#0891b2",
  Verzekeringen:      "#f43f5e",
  Vrienden:           "#d946ef",
  "Vrije Tijd":       "#2dd4bf",
  Zakelijk:           "#78716c",
  Zorgverzekering:    "#fb7185",
  Overig:             "#94a3b8",
};

function getCatColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? "#64748b";
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent = false, warning = false, className = "" }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent?: boolean; warning?: boolean; className?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={["finance-stat", accent && "finance-stat--accent", warning && "finance-stat--warning", className].filter(Boolean).join(" ")}>
      <div className="finance-stat__icon"><Icon size={20} /></div>
      <div className="finance-stat__body">
        <span className="finance-stat__value">{value}</span>
        <span className="finance-stat__label">{label}</span>
        {sub && <span className="finance-stat__sub">{sub}</span>}
      </div>
    </motion.div>
  );
}

// ─── Recharts custom tooltip ──────────────────────────────────────────────────

interface TooltipItem { name: string; value: number; color: string; }
interface TooltipProps { active?: boolean; payload?: TooltipItem[]; label?: string; }

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="chart-tooltip__value" style={{ color: p.color }}>
          {p.name}: {eur(p.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Pie tooltip ──────────────────────────────────────────────────────────────

function PieTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{item.name}</p>
      <p className="chart-tooltip__value" style={{ color: item.color }}>{eurExact(item.value)}</p>
    </div>
  );
}

// ─── Zoekbalk ────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="search-bar">
      <Search size={15} className="search-bar__icon" />
      <input className="search-bar__input" type="search"
        placeholder="Zoek op naam of omschrijving…"
        value={value} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button className="search-bar__clear" onClick={() => onChange("")} aria-label="Wis zoekopdracht">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ─── Category Card ───────────────────────────────────────────────────────────

function CategoryCard({ categorie, bedrag, count, percentage, onClick, isActive }: {
  categorie: string; bedrag: number; count: number; percentage: number;
  onClick: () => void; isActive: boolean;
}) {
  const color = getCatColor(categorie);
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`category-card ${isActive ? "category-card--active" : ""}`}
      onClick={onClick}
      style={{ "--cat-color": color } as React.CSSProperties}
    >
      <div className="category-card__bar" style={{ width: `${Math.min(percentage, 100)}%`, background: color }} />
      <div className="category-card__content">
        <span className="category-card__name">{categorie}</span>
        <span className="category-card__amount">{eur(bedrag)}</span>
      </div>
      <div className="category-card__meta">
        <span>{count}x</span>
        <span>{percentage}%</span>
      </div>
    </motion.button>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle?: string;
}) {
  return (
    <div className="section-header">
      <Icon size={18} className="section-header__icon" />
      <h2 className="section-header__title">{title}</h2>
      {subtitle && <span className="section-header__sub">{subtitle}</span>}
    </div>
  );
}

// ─── Finance Dashboard ────────────────────────────────────────────────────────

export default function FinancePage() {
  const [ibanFilter,  setIbanFilter]  = useState<string | undefined>();
  const [zoekterm,    setZoekterm]    = useState("");
  const [chartView,   setChartView]   = useState<"saldo" | "inuit">("saldo");
  const [jaarFilter,  setJaarFilter]  = useState<string>("2026");
  const [filters, setFilters] = useState({
    excludeIntern: true,
    onlyStorneringen: false,
    maandFilter: undefined as string | undefined,
    categorieFilter: undefined as string | undefined,
    richting: undefined as string | undefined,
    codeFilter: undefined as string | undefined,
    minBedrag: undefined as number | undefined,
    maxBedrag: undefined as number | undefined,
    datumVan: undefined as string | undefined,
    datumTot: undefined as string | undefined,
  });

  const {
    transactions, stats, totalCount, isLoading, isSearching,
    isDone, loadMore, updateCategorie,
  } = useTransactions({ ibanFilter, zoekterm, jaarFilter: jaarFilter || undefined, ...filters });

  const handleCategorie = useCallback(
    (id: Id<"transactions">, cat: string | undefined) => updateCategorie(id, cat),
    [updateCategorie]
  );

  const handleIbanTab = (iban: string | undefined) => {
    setIbanFilter(iban);
    setFilters((f) => ({ ...f, maandFilter: undefined, onlyStorneringen: false, categorieFilter: undefined }));
  };

  const updateFilters = (partial: Partial<typeof filters>) => {
    setFilters((f) => ({ ...f, ...partial }));
  };

  const resetFilters = () => {
    setFilters({
      excludeIntern: true, onlyStorneringen: false,
      maandFilter: undefined, categorieFilter: undefined,
      richting: undefined, codeFilter: undefined,
      minBedrag: undefined, maxBedrag: undefined,
      datumVan: undefined, datumTot: undefined,
    });
    setZoekterm("");
  };

  const toggleCategoryFilter = (cat: string) => {
    setFilters((f) => ({ ...f, categorieFilter: f.categorieFilter === cat ? undefined : cat }));
  };

  return (
    <div className="finance-page">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="finance-header">
        <div className="finance-header__title">
          <Landmark size={26} className="finance-header__icon" />
          <div>
            <h1 className="finance-header__h1">Finance</h1>
            <p className="finance-header__sub">
              {totalCount > 0
                ? `${totalCount.toLocaleString("nl")} transacties · ${stats?.maanden?.length ?? 0} maanden · ${stats?.aantalCategorieen ?? 0} categorieën`
                : "Importeer je Rabobank CSV om te beginnen"}
            </p>
          </div>
        </div>
        <div className="finance-import"><CsvUploader /></div>
      </div>

      {/* ─── Jaar Tabs ────────────────────────────────────────────────── */}
      <div className="jaar-tabs">
        {["2026", "2025", ""].map((jaar) => (
          <button
            key={jaar || "all"}
            className={`jaar-tab ${jaarFilter === jaar ? "jaar-tab--active" : ""}`}
            onClick={() => setJaarFilter(jaar)}
          >
            <CalendarDays size={14} />
            {jaar || "Alles"}
          </button>
        ))}
      </div>

      {/* ─── IBAN Tabs ───────────────────────────────────────────────────── */}
      {stats && stats.ibannen.length > 1 && (
        <div className="iban-tabs">
          <button
            className={`iban-tab ${!ibanFilter ? "iban-tab--active" : ""}`}
            onClick={() => handleIbanTab(undefined)}
          >
            <CreditCard size={14} /> Alle rekeningen
          </button>
          {stats.ibannen.map((iban) => (
            <button
              key={iban}
              className={`iban-tab ${ibanFilter === iban ? "iban-tab--active" : ""}`}
              onClick={() => handleIbanTab(iban)}
            >
              <CreditCard size={14} /> {ibanLabel(iban)}
              {stats.huidigSaldoPerIban[iban] !== undefined && (
                <span className="iban-tab__saldo">{eur(stats.huidigSaldoPerIban[iban])}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ─── Stornering Banner ───────────────────────────────────────────── */}
      {stats && stats.storneringen > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="stornering-banner">
          <AlertTriangle size={16} />
          <span><strong>{stats.storneringen} stornering(en)</strong> gevonden</span>
          <button className="stornering-banner__link"
            onClick={() => updateFilters({ onlyStorneringen: !filters.onlyStorneringen })}>
            {filters.onlyStorneringen ? "Toon alles" : "Toon alleen storneringen"}
          </button>
        </motion.div>
      )}

      {/* ─── Stat Cards (6-grid) ─────────────────────────────────────────── */}
      {stats && (
        <div className="finance-stats-grid">
          <StatCard
            label="Saldo"
            value={eur(stats.huidigSaldo)}
            sub={ibanFilter ? ibanLabel(ibanFilter) : "Alle rekeningen"}
            icon={Landmark}
            accent={stats.huidigSaldo > 0}
          />
          <StatCard
            label="Totaal inkomsten"
            value={eur(stats.totaalIn)}
            sub={`gem. ${eur(stats.gemiddeldIn)} /mnd`}
            icon={TrendingUp}
            accent
          />
          <StatCard
            label="Totaal uitgaven"
            value={eur(stats.totaalUit)}
            sub={`gem. ${eur(stats.gemiddeldUit)} /mnd`}
            icon={TrendingDown}
          />
          <StatCard
            label="Netto stroom"
            value={eur(stats.nettoStroom)}
            sub={stats.nettoStroom >= 0 ? "In de plus" : "In de min"}
            icon={stats.nettoStroom >= 0 ? ArrowUpRight : ArrowDownRight}
            accent={stats.nettoStroom >= 0}
            warning={stats.nettoStroom < 0}
          />
          <StatCard
            label="Categorieën"
            value={`${stats.aantalCategorieen}`}
            sub="actieve categorieën"
            icon={Hash}
          />
          <StatCard
            label="Storneringen"
            value={`${stats.storneringen}`}
            sub="gefaalde incasso's"
            icon={AlertTriangle}
            warning={stats.storneringen > 0}
          />
        </div>
      )}

      {/* ─── Grafieken sectie ─────────────────────────────────────────────── */}
      {stats && stats.saldoPerMaand.length > 0 && (
        <>
          {/* Chart type toggle */}
          <div className="chart-toggle-row">
            <SectionHeader icon={BarChart3} title="Grafieken" />
            <div className="chart-toggles">
              <button className={`chart-toggle ${chartView === "saldo" ? "chart-toggle--active" : ""}`}
                onClick={() => setChartView("saldo")}>Saldo verloop</button>
              <button className={`chart-toggle ${chartView === "inuit" ? "chart-toggle--active" : ""}`}
                onClick={() => setChartView("inuit")}>In vs Uit</button>
            </div>
          </div>

          <div className="finance-charts">
            {/* Main chart */}
            <div className="finance-chart glass finance-chart--main">
              <h2 className="finance-chart__title">
                {chartView === "saldo" ? "Saldo verloop" : "Inkomsten vs Uitgaven"}
                {ibanFilter && <span className="chart-sub"> · {ibanLabel(ibanFilter)}</span>}
              </h2>
              <ResponsiveContainer width="100%" height={260}>
                {chartView === "saldo" ? (
                  <AreaChart data={stats.saldoPerMaand} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="maand" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="saldo" stroke="#f59e0b" strokeWidth={2.5}
                      fill="url(#saldoGradient)" dot={false} activeDot={{ r: 5, fill: "#f59e0b", strokeWidth: 0 }} />
                  </AreaChart>
                ) : (
                  <BarChart data={stats.inUitPerMaand} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="maand" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#64748b" }} />
                    <Bar dataKey="inkomsten" name="Inkomsten" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.85} />
                    <Bar dataKey="uitgaven" name="Uitgaven" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.7} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Donut chart */}
            <div className="finance-chart glass">
              <h2 className="finance-chart__title">
                <PieChartIcon size={16} /> Uitgaven verdeling
              </h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={stats.uitPerCategorie.slice(0, 12)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="bedrag"
                    nameKey="categorie"
                    strokeWidth={0}
                  >
                    {stats.uitPerCategorie.slice(0, 12).map((entry) => (
                      <Cell key={entry.categorie} fill={getCatColor(entry.categorie)} opacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ─── Categorie overzicht ──────────────────────────────────────────── */}
      {stats && stats.uitPerCategorie.length > 0 && (
        <div className="category-section">
          <SectionHeader
            icon={ShoppingBag}
            title="Uitgaven per categorie"
            subtitle={`${stats.aantalCategorieen} categorieën · ${eur(stats.totaalUit)} totaal`}
          />
          <div className="category-grid">
            {stats.uitPerCategorie.map((cat) => (
              <CategoryCard
                key={cat.categorie}
                categorie={cat.categorie}
                bedrag={cat.bedrag}
                count={cat.count}
                percentage={cat.percentage}
                onClick={() => toggleCategoryFilter(cat.categorie)}
                isActive={filters.categorieFilter === cat.categorie}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── Top Merchants ────────────────────────────────────────────────── */}
      {stats && stats.topMerchants && stats.topMerchants.length > 0 && (
        <div className="merchants-section glass">
          <SectionHeader icon={Receipt} title="Top uitgaven" subtitle="Per tegenpartij" />
          <div className="merchant-list">
            {stats.topMerchants.map((m, i) => (
              <div key={m.naam} className="merchant-row">
                <span className="merchant-rank">{i + 1}</span>
                <div className="merchant-info">
                  <span className="merchant-naam">{m.naam}</span>
                  <span className="merchant-count">{m.count}x</span>
                </div>
                <span className="merchant-bedrag">{eurExact(m.bedrag)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Transactielijst ─────────────────────────────────────────────── */}
      <div className="finance-list-section glass">
        <div className="finance-list-header">
          <SearchBar value={zoekterm} onChange={setZoekterm} />
          <FilterPanel
            filters={filters}
            onChange={updateFilters}
            onReset={resetFilters}
            availableMaanden={stats?.maanden}
          />
        </div>

        <div className="finance-list-meta">
          {isLoading || isSearching
            ? <span className="finance-list-meta__loading"><RefreshCw size={13} className="spinner" /> Laden…</span>
            : <span>{transactions.length.toLocaleString("nl")} transacties{filters.maandFilter && ` in ${filters.maandFilter}`}{zoekterm && ` voor "${zoekterm}"`}</span>
          }
        </div>

        {totalCount === 0 ? (
          <div className="finance-empty">
            <Landmark size={44} opacity={0.2} />
            <p>Nog geen transacties. Upload je Rabobank CSV hierboven.</p>
          </div>
        ) : (
          <TransactionList
            transactions={transactions}
            onCategorie={handleCategorie}
            isDone={isDone}
            onLoadMore={loadMore}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
