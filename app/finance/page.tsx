"use client";

import { useState, useCallback } from "react";
import { api } from "@/convex/_generated/api";
import { useTransactions }  from "@/hooks/useTransactions";
import { CsvUploader }      from "@/components/finance/CsvUploader";
import { TransactionList }  from "@/components/finance/TransactionList";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, Landmark,
  RefreshCw, Search, X, Calendar, CreditCard,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const eur = (n: number) =>
  n.toLocaleString("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// ─── IBAN label helper ────────────────────────────────────────────────────────

const IBAN_LABELS: Record<string, string> = {
  "NL41RABO0348147740": "Hoofdrekening (NL41)",
  "NL20RABO0198574215": "Leefgeld (NL20)",
};

function ibanLabel(iban: string): string {
  return IBAN_LABELS[iban] ?? iban.slice(-8);
}



// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent = false, warning = false }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent?: boolean; warning?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={["finance-stat", accent && "finance-stat--accent", warning && "finance-stat--warning"].filter(Boolean).join(" ")}>
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
        <p key={p.name} className="chart-tooltip__value" style={{ color: p.color }}>{eur(p.value)}</p>
      ))}
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

// ─── Finance Dashboard ────────────────────────────────────────────────────────

export default function FinancePage() {
  const [ibanFilter,       setIbanFilter]       = useState<string | undefined>();
  const [excludeIntern,    setExcludeIntern]    = useState(true);
  const [onlyStorneringen, setOnlyStorneringen] = useState(false);
  const [maandFilter,      setMaandFilter]      = useState<string | undefined>();
  const [zoekterm,         setZoekterm]         = useState("");

  const {
    transactions, stats, totalCount, isLoading, isSearching,
    isDone, loadMore, updateCategorie,
  } = useTransactions({ ibanFilter, excludeIntern, onlyStorneringen, maandFilter, zoekterm });

  const handleCategorie = useCallback(
    (id: Id<"transactions">, cat: string | undefined) => updateCategorie(id, cat),
    [updateCategorie]
  );

  // Bij wisselen van rekening: maandfilter resetten
  const handleIbanTab = (iban: string | undefined) => {
    setIbanFilter(iban);
    setMaandFilter(undefined);
    setOnlyStorneringen(false);
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
                ? `${totalCount.toLocaleString("nl")} transacties · ${stats?.maanden?.length ?? 0} maanden`
                : "Importeer je Rabobank CSV om te beginnen"}
            </p>
          </div>
        </div>
        <div className="finance-import"><CsvUploader /></div>
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
            onClick={() => setOnlyStorneringen((v) => !v)}>
            {onlyStorneringen ? "Toon alles" : "Toon alleen storneringen"}
          </button>
        </motion.div>
      )}

      {/* ─── Stat Cards ──────────────────────────────────────────────────── */}
      {stats && (
        <div className="finance-stats-grid">
          <StatCard label="Totaal inkomsten"  value={eur(stats.totaalIn)}   icon={TrendingUp} accent />
          <StatCard label="Totaal uitgaven"   value={eur(stats.totaalUit)}  icon={TrendingDown} />
          <StatCard
            label="Huidig saldo"
            value={eur(stats.huidigSaldo)}
            sub={`netto stroom: ${eur(stats.nettoStroom)}`}
            icon={Landmark}
            accent={stats.huidigSaldo > 0}
          />
          <StatCard label="Storneringen" value={`${stats.storneringen}`} sub="gefaalde incasso's"
            icon={AlertTriangle} warning={stats.storneringen > 0} />
        </div>
      )}

      {/* ─── Grafieken ───────────────────────────────────────────────────── */}
      {stats && stats.saldoPerMaand.length > 0 && (
        <div className="finance-charts">
          <div className="finance-chart glass">
            <h2 className="finance-chart__title">
              Saldo verloop
              {ibanFilter && <span className="chart-sub"> · {ibanLabel(ibanFilter)}</span>}
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.saldoPerMaand} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="maand" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="saldo" stroke="#f59e0b" strokeWidth={2.5}
                  dot={false} activeDot={{ r: 5, fill: "#f59e0b", strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {stats.uitPerCategorie.length > 0 && (
            <div className="finance-chart glass">
              <h2 className="finance-chart__title">Uitgaven per categorie</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.uitPerCategorie.slice(0, 10)} margin={{ top: 8, right: 16, bottom: 34, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="categorie" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false}
                    axisLine={false} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="bedrag" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ─── Transactielijst ─────────────────────────────────────────────── */}
      <div className="finance-list-section glass">
        <div className="finance-list-header">
          <SearchBar value={zoekterm} onChange={setZoekterm} />
          <div className="finance-filters">
            {/* Maandfilter */}
            {stats && stats.maanden.length > 0 && (
              <div className="maand-select-wrap">
                <Calendar size={14} className="maand-select__icon" />
                <select className="maand-select" value={maandFilter ?? ""}
                  onChange={(e) => setMaandFilter(e.target.value || undefined)}>
                  <option value="">Alle maanden</option>
                  {stats.maanden.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}
            <label className="finance-filter-toggle">
              <input type="checkbox" checked={excludeIntern}
                onChange={(e) => setExcludeIntern(e.target.checked)} />
              Verberg intern
            </label>
            <label className="finance-filter-toggle">
              <input type="checkbox" checked={onlyStorneringen}
                onChange={(e) => setOnlyStorneringen(e.target.checked)} />
              Storneringen
            </label>
          </div>
        </div>

        {/* Resultaatteller */}
        <div className="finance-list-meta">
          {isLoading || isSearching
            ? <span className="finance-list-meta__loading"><RefreshCw size={13} className="spinner" /> Laden…</span>
            : <span>{transactions.length.toLocaleString("nl")} transacties{maandFilter && ` in ${maandFilter}`}{zoekterm && ` voor "${zoekterm}"`}</span>
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
