"use client";

import { useState, useCallback, useMemo } from "react";
import { useTransactions }  from "@/hooks/useTransactions";
import { useLoonstroken }   from "@/hooks/useLoonstroken";
import { usePrivacy }       from "@/hooks/usePrivacy";
import { CsvUploader }      from "@/components/finance/CsvUploader";
import { TransactionList }  from "@/components/finance/TransactionList";
import { FilterPanel }      from "@/components/finance/FilterPanel";
import { StatCard }          from "@/components/finance/StatCard";
import { SearchBar }         from "@/components/finance/SearchBar";
import { CategoryCard }      from "@/components/finance/CategoryCard";
import { SectionHeader }     from "@/components/finance/SectionHeader";
import { ChartTooltip, PieTooltip } from "@/components/finance/ChartTooltips";
import { eur, eurExact, ibanLabel, getCatColor } from "@/lib/finance-constants";
import {
  BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Legend, Label,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, Landmark,
  RefreshCw, CreditCard, Download, Filter, RotateCcw,
  PieChart as PieChartIcon, BarChart3, Hash,
  ArrowUpRight, ArrowDownRight, Receipt, ShoppingBag,
  CalendarDays, Wallet, Eye, EyeOff,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Id } from "@/convex/_generated/dataModel";
import type { TransactionRow } from "@/components/finance/TransactionList";

// ─── CSV Export ──────────────────────────────────────────────────────────────

function exportCsv(transactions: TransactionRow[]) {
  const header = "Datum,Tegenpartij,Omschrijving,Bedrag,Code,Categorie";
  const DQ = String.fromCharCode(34);
  const escQ = (s: string) => s.replaceAll(DQ, DQ + DQ);
  const rows = transactions.map((tx) =>
    [
      tx.datum,
      `"${escQ(tx.tegenpartijNaam ?? "Onbekend")}"`,
      `"${escQ(tx.omschrijving)}"`,
      tx.bedrag.toFixed(2).replace(".", ","),
      tx.code,
      tx.categorie ?? "Overig",
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transacties-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Finance Dashboard ────────────────────────────────────────────────────────

export default function FinancePage() {
  const [ibanFilter,  setIbanFilter]  = useState<string | undefined>();
  const [zoekterm,    setZoekterm]    = useState("");
  const [chartView,   setChartView]   = useState<"saldo" | "inuit">("saldo");
  const [jaarFilter,  setJaarFilter]  = useState<string>("2026");
  const loonstroken = useLoonstroken();
  const { hidden: privacyOn, toggle: togglePrivacy, mask } = usePrivacy();
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

  // MoM delta: bereken client-side vanuit stats.inUitPerMaand
  const momDelta = useMemo(() => {
    if (!stats || stats.inUitPerMaand.length < 2) return null;
    const arr = stats.inUitPerMaand;
    const curr = arr[arr.length - 1];
    const prev = arr[arr.length - 2];
    const inDelta = prev.inkomsten > 0
      ? Math.round(((curr.inkomsten - prev.inkomsten) / prev.inkomsten) * 1000) / 10
      : 0;
    const uitDelta = prev.uitgaven > 0
      ? Math.round(((curr.uitgaven - prev.uitgaven) / prev.uitgaven) * 1000) / 10
      : 0;
    return { inkomstenDelta: inDelta, uitgavenDelta: uitDelta };
  }, [stats]);

  // Loonstroken: meest recente + maandelijks gemiddelde
  const salarisStat = useMemo(() => {
    if (loonstroken.count === 0) return null;
    const records = loonstroken.records;
    const latest = records[records.length - 1];
    const prev = records.length >= 2 ? records[records.length - 2] : null;
    const delta = prev ? latest.netto - prev.netto : 0;
    const gemNetto = loonstroken.totaalNetto / records.length;
    return { latest, delta, gemNetto };
  }, [loonstroken]);

  // Merge loonstroken netto into inUitPerMaand for chart overlay
  const inUitMetSalaris = useMemo(() => {
    if (!stats) return [];
    return stats.inUitPerMaand.map((m: { maand: string; inkomsten: number; uitgaven: number }) => {
      const ls = loonstroken.byPeriode.get(m.maand);
      return { ...m, salaris: ls?.netto ?? null };
    });
  }, [stats, loonstroken.byPeriode]);

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
        <div className="finance-import flex items-center gap-2">
          <button
            onClick={togglePrivacy}
            title={privacyOn ? "Bedragen tonen" : "Bedragen verbergen"}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer shrink-0 ${
              privacyOn
                ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                : "bg-white/5 text-slate-500 border-white/10 hover:text-slate-300"
            }`}
          >
            {privacyOn ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <CsvUploader />
        </div>
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
            value={mask(eur(stats.huidigSaldo))}
            sub={ibanFilter ? ibanLabel(ibanFilter) : "Alle rekeningen"}
            icon={Landmark}
            accent={stats.huidigSaldo > 0}
          />
          <StatCard
            label="Totaal inkomsten"
            value={mask(eur(stats.totaalIn))}
            sub={momDelta
              ? `${momDelta.inkomstenDelta >= 0 ? "+" : ""}${momDelta.inkomstenDelta}% vs vorige mnd`
              : `gem. ${mask(eur(stats.gemiddeldIn))} /mnd`}
            icon={TrendingUp}
            accent
          />
          <StatCard
            label="Totaal uitgaven"
            value={mask(eur(stats.totaalUit))}
            sub={momDelta
              ? `${momDelta.uitgavenDelta >= 0 ? "+" : ""}${momDelta.uitgavenDelta}% vs vorige mnd`
              : `gem. ${mask(eur(stats.gemiddeldUit))} /mnd`}
            icon={TrendingDown}
            warning={momDelta ? momDelta.uitgavenDelta > 10 : false}
          />
          <StatCard
            label="Netto stroom"
            value={mask(eur(stats.nettoStroom))}
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
          {salarisStat && (
            <StatCard
              label="Netto Salaris"
              value={mask(eur(salarisStat.latest.netto))}
              sub={salarisStat.delta !== 0
                ? `${salarisStat.delta >= 0 ? "+" : ""}${mask(eur(salarisStat.delta))} vs vorige mnd`
                : `gem. ${mask(eur(salarisStat.gemNetto))} /mnd`}
              icon={Wallet}
              accent
            />
          )}
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
                  <BarChart data={inUitMetSalaris} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="maand" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#64748b" }} />
                    <Bar dataKey="inkomsten" name="Inkomsten" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.85} />
                    <Bar dataKey="uitgaven" name="Uitgaven" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.7} />
                    {loonstroken.count > 0 && (
                      <Bar dataKey="salaris" name="Netto Salaris" fill="#818cf8" radius={[4, 4, 0, 0]} opacity={0.75} />
                    )}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Donut chart */}
            <div className="finance-chart glass" role="img" aria-label={`Uitgaven verdeling donut chart: ${stats.aantalCategorieen} categorieën, totaal ${eur(stats.totaalUit)}`}>
              <h2 className="finance-chart__title">
                <PieChartIcon size={16} /> Uitgaven verdeling
                <span className="finance-chart__subtitle">{stats.aantalCategorieen} categorieën</span>
              </h2>
              <div className="donut-layout">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={stats.uitPerCategorie.slice(0, 12)}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="bedrag"
                      nameKey="categorie"
                      strokeWidth={0}
                    >
                      {stats.uitPerCategorie.slice(0, 12).map((entry) => (
                        <Cell key={entry.categorie} fill={getCatColor(entry.categorie)} opacity={0.85} />
                      ))}
                      <Label
                        position="center"
                        content={() => (
                          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                            <tspan x="50%" dy="-7" fill="#f1f5f9" fontSize="0.95rem" fontWeight="700">
                              {eur(stats.totaalUit)}
                            </tspan>
                            <tspan x="50%" dy="16" fill="#64748b" fontSize="0.6rem">
                              totaal uitgaven
                            </tspan>
                          </text>
                        )}
                      />
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-legend">
                  {stats.uitPerCategorie.slice(0, 12).map((entry) => (
                    <button
                      key={entry.categorie}
                      className={`donut-legend__item ${filters.categorieFilter === entry.categorie ? "donut-legend__item--active" : ""}`}
                      onClick={() => toggleCategoryFilter(entry.categorie)}
                      title={`Filter op ${entry.categorie}`}
                    >
                      <span className="donut-legend__dot" style={{ background: getCatColor(entry.categorie) }} />
                      <span className="donut-legend__name">{entry.categorie}</span>
                      <span className="donut-legend__pct">{((entry.bedrag / stats.totaalUit) * 100).toFixed(0)}%</span>
                    </button>
                  ))}
                </div>
              </div>
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
                <span className="merchant-bedrag">
                  {m.bedrag.toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 })}
                </span>
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
          {transactions.length > 0 && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => exportCsv(transactions)}
              title="Exporteer gefilterde transacties als CSV"
            >
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>

        {totalCount === 0 ? (
          <div className="finance-empty">
            <Landmark size={44} opacity={0.2} />
            <p>Nog geen transacties. Upload je Rabobank CSV hierboven.</p>
          </div>
        ) : transactions.length === 0 && !isLoading ? (
          <div className="finance-empty">
            <Filter size={36} opacity={0.25} />
            <p>Geen transacties gevonden voor de huidige filters.</p>
            <button className="btn btn--ghost btn--sm" onClick={resetFilters}>
              <RotateCcw size={13} /> Filters resetten
            </button>
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
