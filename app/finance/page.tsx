"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Filter,
  Hash,
  Landmark,
  PieChart as PieChartIcon,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CsvUploader } from "@/components/finance/CsvUploader";
import { TransactionList, type TransactionRow } from "@/components/finance/TransactionList";
import { FilterPanel } from "@/components/finance/FilterPanel";
import { SearchBar } from "@/components/finance/SearchBar";
import { CategoryCard } from "@/components/finance/CategoryCard";
import { ChartTooltip, PieTooltip } from "@/components/finance/ChartTooltips";
import { useTransactions, type TransactionFilter } from "@/hooks/useTransactions";
import { useLoonstroken } from "@/hooks/useLoonstroken";
import { usePrivacy } from "@/hooks/usePrivacy";
import { cn } from "@/lib/utils";
import { eur, eurExact, getCatColor, ibanLabel } from "@/lib/finance-constants";
import type { Id } from "@/convex/_generated/dataModel";

type ChartView = "saldo" | "inuit";
type Tone = "amber" | "green" | "rose" | "sky" | "indigo" | "slate";

const DEFAULT_FILTERS: TransactionFilter = {
  excludeIntern: true,
  onlyStorneringen: false,
};

const toneClasses: Record<Tone, { border: string; surface: string; icon: string; text: string; glow: string }> = {
  amber: {
    border: "border-amber-500/25",
    surface: "bg-amber-500/10",
    icon: "text-amber-300",
    text: "text-amber-200",
    glow: "shadow-[0_0_0_1px_rgba(245,158,11,0.05)]",
  },
  green: {
    border: "border-emerald-500/20",
    surface: "bg-emerald-500/10",
    icon: "text-emerald-300",
    text: "text-emerald-200",
    glow: "shadow-[0_0_0_1px_rgba(16,185,129,0.04)]",
  },
  rose: {
    border: "border-rose-500/20",
    surface: "bg-rose-500/10",
    icon: "text-rose-300",
    text: "text-rose-200",
    glow: "shadow-[0_0_0_1px_rgba(244,63,94,0.04)]",
  },
  sky: {
    border: "border-sky-500/20",
    surface: "bg-sky-500/10",
    icon: "text-sky-300",
    text: "text-sky-200",
    glow: "shadow-[0_0_0_1px_rgba(14,165,233,0.04)]",
  },
  indigo: {
    border: "border-indigo-500/20",
    surface: "bg-indigo-500/10",
    icon: "text-indigo-300",
    text: "text-indigo-200",
    glow: "shadow-[0_0_0_1px_rgba(99,102,241,0.04)]",
  },
  slate: {
    border: "border-white/10",
    surface: "bg-white/[0.04]",
    icon: "text-slate-300",
    text: "text-slate-200",
    glow: "shadow-none",
  },
};

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

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("nl-NL", { month: "short", year: "numeric" });
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${Math.round(value * 10) / 10}%`;
}

function signedEuro(value: number) {
  return `${value >= 0 ? "+" : ""}${eurExact(value)}`;
}

function activeFilterCount(filters: TransactionFilter) {
  return [
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
}

function getDeltaTone(value: number | null | undefined) {
  if (typeof value !== "number") return "slate" as const;
  return value >= 0 ? "green" as const : "rose" as const;
}

function MetricCard({
  label,
  value,
  meta,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  meta: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  const toneClass = toneClasses[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "min-h-[116px] rounded-lg border bg-white/[0.035] p-4 transition-colors hover:bg-white/[0.055]",
        toneClass.border,
        toneClass.glow
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneClass.surface)}>
          <Icon size={19} className={toneClass.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className={cn("mt-2 truncate text-2xl font-bold leading-tight text-white", toneClass.text)}>
            {value}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{meta}</p>
        </div>
      </div>
    </motion.div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
          <Icon size={17} className="text-amber-300" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function SegmentedButton({
  active,
  icon: Icon,
  children,
  onClick,
}: {
  active: boolean;
  icon?: LucideIcon;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
        active
          ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
          : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
      )}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

function InsightRow({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: Tone;
}) {
  const toneClass = toneClasses[tone];

  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", toneClass.surface)}>
          <Icon size={15} className={toneClass.icon} />
        </div>
        <span className="truncate text-sm text-slate-400">{label}</span>
      </div>
      <span className={cn("shrink-0 text-sm font-semibold", toneClass.text)}>{value}</span>
    </div>
  );
}

export default function FinancePage() {
  const [ibanFilter, setIbanFilter] = useState<string | undefined>();
  const [zoekterm, setZoekterm] = useState("");
  const [chartView, setChartView] = useState<ChartView>("saldo");
  const [jaarFilter, setJaarFilter] = useState<string>("2026");
  const [filters, setFilters] = useState<TransactionFilter>(DEFAULT_FILTERS);

  const loonstroken = useLoonstroken();
  const { hidden: privacyOn, toggle: togglePrivacy, mask } = usePrivacy();
  const {
    transactions,
    stats,
    totalCount,
    isLoading,
    isSearching,
    isDone,
    loadMore,
    updateCategorie,
  } = useTransactions({ ibanFilter, zoekterm, jaarFilter: jaarFilter || undefined, ...filters });

  const handleCategorie = useCallback(
    (id: Id<"transactions">, cat: string | undefined) => updateCategorie(id, cat),
    [updateCategorie]
  );

  const updateFilters = (partial: Partial<TransactionFilter>) => {
    setFilters((current) => ({ ...current, ...partial }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setZoekterm("");
  };

  const handleIbanTab = (iban: string | undefined) => {
    setIbanFilter(iban);
    setFilters((current) => ({
      ...current,
      maandFilter: undefined,
      onlyStorneringen: false,
      categorieFilter: undefined,
    }));
  };

  const toggleCategoryFilter = (cat: string) => {
    setFilters((current) => ({
      ...current,
      categorieFilter: current.categorieFilter === cat ? undefined : cat,
    }));
  };

  const formatPrivateEuro = useCallback((value: number) => mask(eur(value)), [mask]);
  const formatPrivateEuroExact = useCallback((value: number) => mask(eurExact(value)), [mask]);
  const formatPrivateSignedEuro = useCallback((value: number) => mask(signedEuro(value)), [mask]);

  const yearOptions = useMemo(() => {
    const years = stats?.jaren?.length ? stats.jaren : ["2026", "2025"];
    return Array.from(new Set([...years, ""]));
  }, [stats]);

  const recentMonths = useMemo(() => {
    if (!stats?.maanden?.length) return [];
    return [...stats.maanden].reverse().slice(0, 6);
  }, [stats]);

  const momDelta = useMemo(() => {
    if (!stats || stats.inUitPerMaand.length < 2) return null;
    const arr = stats.inUitPerMaand;
    const curr = arr[arr.length - 1];
    const prev = arr[arr.length - 2];
    const inkomstenDelta = prev.inkomsten > 0
      ? Math.round(((curr.inkomsten - prev.inkomsten) / prev.inkomsten) * 1000) / 10
      : 0;
    const uitgavenDelta = prev.uitgaven > 0
      ? Math.round(((curr.uitgaven - prev.uitgaven) / prev.uitgaven) * 1000) / 10
      : 0;

    return { inkomstenDelta, uitgavenDelta };
  }, [stats]);

  const salarisStat = useMemo(() => {
    if (loonstroken.count === 0) return null;
    const records = loonstroken.records;
    const latest = records[records.length - 1];
    const prev = records.length >= 2 ? records[records.length - 2] : null;
    const delta = prev ? latest.netto - prev.netto : 0;
    const gemNetto = loonstroken.totaalNetto / records.length;
    return { latest, delta, gemNetto };
  }, [loonstroken]);

  const inUitMetSalaris = useMemo(() => {
    if (!stats) return [];
    return stats.inUitPerMaand.map((month: { maand: string; inkomsten: number; uitgaven: number; netto: number }) => {
      const loonstrook = loonstroken.byPeriode.get(month.maand);
      return { ...month, salaris: loonstrook?.netto ?? null };
    });
  }, [loonstroken.byPeriode, stats]);

  const saldoTrend = useMemo(() => {
    if (!stats || stats.saldoPerMaand.length < 2) return null;
    const first = stats.saldoPerMaand[0];
    const last = stats.saldoPerMaand[stats.saldoPerMaand.length - 1];
    return last.saldo - first.saldo;
  }, [stats]);

  const latestCashflow = stats?.inUitPerMaand.length
    ? stats.inUitPerMaand[stats.inUitPerMaand.length - 1]
    : null;
  const topCategory = stats?.uitPerCategorie[0] ?? null;
  const topMerchant = stats?.topMerchants?.[0] ?? null;
  const savingsRate = stats && stats.totaalIn > 0 ? Math.round((stats.nettoStroom / stats.totaalIn) * 1000) / 10 : null;
  const selectedFilterCount = activeFilterCount(filters);
  const hasData = Boolean(stats && totalCount > 0);

  return (
    <div className="finance-dashboard-shell min-h-screen bg-[#0a0a0f] pb-28 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
              <Landmark size={20} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-slate-500">Finance cockpit</p>
              <h1 className="mt-1 truncate text-2xl font-bold text-white">Finance</h1>
              <p className="mt-1 text-sm text-slate-500">
                {stats
                  ? `${totalCount.toLocaleString("nl-NL")} transacties - ${stats.maanden.length} maanden - ${stats.aantalCategorieen} categorieen`
                  : "Transacties en cashflow laden"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={togglePrivacy}
              title={privacyOn ? "Bedragen tonen" : "Bedragen verbergen"}
              aria-label={privacyOn ? "Bedragen tonen" : "Bedragen verbergen"}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                privacyOn
                  ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
              )}
            >
              {privacyOn ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="hidden sm:inline">{privacyOn ? "Verborgen" : "Zichtbaar"}</span>
            </button>
            <button
              type="button"
              onClick={resetFilters}
              aria-label="Filters resetten"
              title="Filters resetten"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
            >
              <RotateCcw size={16} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Periode</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {jaarFilter ? `Analyse voor ${jaarFilter}` : "Alle beschikbare jaren"}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400">
                    <ShieldCheck size={14} />
                    Convex live
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {yearOptions.map((year) => (
                    <SegmentedButton
                      key={year || "all"}
                      active={jaarFilter === year}
                      icon={CalendarDays}
                      onClick={() => setJaarFilter(year)}
                    >
                      {year || "Alles"}
                    </SegmentedButton>
                  ))}
                </div>
              </div>

              {stats && stats.ibannen.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Rekeningen</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {ibanFilter ? ibanLabel(ibanFilter) : "Alle rekeningen samengevoegd"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-amber-200">{formatPrivateEuro(stats.huidigSaldo)}</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <SegmentedButton
                      active={!ibanFilter}
                      icon={CreditCard}
                      onClick={() => handleIbanTab(undefined)}
                    >
                      Alle rekeningen
                    </SegmentedButton>
                    {stats.ibannen.map((iban) => (
                      <SegmentedButton
                        key={iban}
                        active={ibanFilter === iban}
                        icon={CreditCard}
                        onClick={() => handleIbanTab(iban)}
                      >
                        <span>{ibanLabel(iban)}</span>
                        {stats.huidigSaldoPerIban[iban] !== undefined && (
                          <span className="text-xs opacity-80">{formatPrivateEuro(stats.huidigSaldoPerIban[iban])}</span>
                        )}
                      </SegmentedButton>
                    ))}
                  </div>
                </div>
              )}

              {recentMonths.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">Snelle maandselectie</p>
                    {filters.maandFilter && (
                      <button
                        type="button"
                        onClick={() => updateFilters({ maandFilter: undefined })}
                        className="text-xs font-semibold text-amber-200 hover:text-amber-100"
                      >
                        Maand wissen
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {recentMonths.map((month) => (
                      <button
                        key={month}
                        type="button"
                        onClick={() => updateFilters({ maandFilter: filters.maandFilter === month ? undefined : month })}
                        className={cn(
                          "h-9 shrink-0 rounded-lg border px-3 text-sm font-semibold transition-colors",
                          filters.maandFilter === month
                            ? "border-sky-500/35 bg-sky-500/15 text-sky-200"
                            : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                        )}
                      >
                        {formatMonth(month)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="flex h-full flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Import</p>
                  <p className="mt-1 text-xs text-slate-500">Rabobank CSV naar Convex</p>
                </div>
                <Upload size={18} className="text-amber-300" />
              </div>
              <div className="finance-import min-w-0">
                <CsvUploader />
              </div>
            </div>
          </div>
        </section>

        {stats && stats.storneringen > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 rounded-lg border border-rose-500/25 bg-rose-500/10 p-4 text-rose-100 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="shrink-0 text-rose-300" />
              <span className="text-sm">
                <strong>{stats.storneringen} stornering(en)</strong> gevonden in de geselecteerde periode
              </span>
            </div>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 text-sm font-semibold text-rose-100 transition-colors hover:bg-rose-500/15"
              onClick={() => updateFilters({ onlyStorneringen: !filters.onlyStorneringen })}
            >
              {filters.onlyStorneringen ? "Toon alles" : "Alleen storneringen"}
            </button>
          </motion.div>
        )}

        {stats && (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Saldo"
              value={formatPrivateEuro(stats.huidigSaldo)}
              meta={saldoTrend === null ? "Huidige bankbalans" : `${formatPrivateSignedEuro(saldoTrend)} sinds eerste maand`}
              icon={Landmark}
              tone={stats.huidigSaldo >= 0 ? "amber" : "rose"}
            />
            <MetricCard
              label="Inkomsten"
              value={formatPrivateEuro(stats.totaalIn)}
              meta={momDelta ? `${formatPercent(momDelta.inkomstenDelta)} versus vorige maand` : `${formatPrivateEuro(stats.gemiddeldIn)} gemiddeld per maand`}
              icon={TrendingUp}
              tone="green"
            />
            <MetricCard
              label="Uitgaven"
              value={formatPrivateEuro(stats.totaalUit)}
              meta={momDelta ? `${formatPercent(momDelta.uitgavenDelta)} versus vorige maand` : `${formatPrivateEuro(stats.gemiddeldUit)} gemiddeld per maand`}
              icon={TrendingDown}
              tone={momDelta && momDelta.uitgavenDelta > 10 ? "rose" : "sky"}
            />
            <MetricCard
              label="Netto stroom"
              value={formatPrivateSignedEuro(stats.nettoStroom)}
              meta={savingsRate === null ? "Kasstroom minus uitgaven" : `${formatPercent(savingsRate)} van inkomsten`}
              icon={stats.nettoStroom >= 0 ? ArrowUpRight : ArrowDownRight}
              tone={stats.nettoStroom >= 0 ? "green" : "rose"}
            />
            <MetricCard
              label="Categorieen"
              value={`${stats.aantalCategorieen}`}
              meta={topCategory ? `${topCategory.categorie} is grootste uitgavenpost` : "Nog geen categorieen"}
              icon={Hash}
              tone="indigo"
            />
            <MetricCard
              label="Storneringen"
              value={`${stats.storneringen}`}
              meta={stats.storneringen > 0 ? "Controleer mislukte incasso's" : "Geen storneringen actief"}
              icon={AlertTriangle}
              tone={stats.storneringen > 0 ? "rose" : "green"}
            />
            {salarisStat && (
              <MetricCard
                label="Netto salaris"
                value={formatPrivateEuro(salarisStat.latest.netto)}
                meta={salarisStat.delta !== 0 ? `${formatPrivateSignedEuro(salarisStat.delta)} versus vorige loonstrook` : `${formatPrivateEuro(salarisStat.gemNetto)} gemiddeld`}
                icon={Wallet}
                tone="amber"
              />
            )}
            <MetricCard
              label="Filters"
              value={`${selectedFilterCount}`}
              meta={filters.maandFilter ? `Maand ${formatMonth(filters.maandFilter)} actief` : zoekterm ? `Zoeken op "${zoekterm}"` : "Standaard transactieweergave"}
              icon={Filter}
              tone={selectedFilterCount > 0 || zoekterm ? "sky" : "slate"}
            />
          </section>
        )}

        {stats && hasData && (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <SectionTitle
                icon={BarChart3}
                title={chartView === "saldo" ? "Saldo verloop" : "Inkomsten versus uitgaven"}
                subtitle={ibanFilter ? ibanLabel(ibanFilter) : "Alle rekeningen"}
                action={
                  <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
                    <button
                      type="button"
                      onClick={() => setChartView("saldo")}
                      className={cn(
                        "h-9 rounded-md px-3 text-sm font-semibold transition-colors",
                        chartView === "saldo" ? "bg-amber-500/15 text-amber-200" : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      Saldo
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartView("inuit")}
                      className={cn(
                        "h-9 rounded-md px-3 text-sm font-semibold transition-colors",
                        chartView === "inuit" ? "bg-amber-500/15 text-amber-200" : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      In/uit
                    </button>
                  </div>
                }
              />

              <div className="mt-5 h-[320px] min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === "saldo" ? (
                    <AreaChart data={stats.saldoPerMaand} margin={{ top: 10, right: 14, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="financeSaldoGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="maand" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => privacyOn ? "••••" : `€${(Number(value) / 1000).toFixed(0)}k`}
                      />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.14)" />
                      <Tooltip content={<ChartTooltip valueFormatter={formatPrivateEuro} />} />
                      <Area
                        type="monotone"
                        dataKey="saldo"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        fill="url(#financeSaldoGradient)"
                        dot={false}
                        activeDot={{ r: 5, fill: "#f59e0b", strokeWidth: 0 }}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={inUitMetSalaris} margin={{ top: 10, right: 14, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="maand" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => privacyOn ? "••••" : `€${(Number(value) / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<ChartTooltip valueFormatter={formatPrivateEuro} />} />
                      <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#64748b" }} />
                      <Bar dataKey="inkomsten" name="Inkomsten" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.86} />
                      <Bar dataKey="uitgaven" name="Uitgaven" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.72} />
                      {loonstroken.count > 0 && (
                        <Bar dataKey="salaris" name="Netto salaris" fill="#818cf8" radius={[4, 4, 0, 0]} opacity={0.76} />
                      )}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <SectionTitle
                icon={PieChartIcon}
                title="Verdeling"
                subtitle={`${stats.aantalCategorieen} categorieen`}
              />
              <div className="mt-4 h-[238px] min-h-[238px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.uitPerCategorie.slice(0, 12)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={94}
                      paddingAngle={2}
                      dataKey="bedrag"
                      nameKey="categorie"
                      strokeWidth={0}
                    >
                      {stats.uitPerCategorie.slice(0, 12).map((entry) => (
                        <Cell key={entry.categorie} fill={getCatColor(entry.categorie)} opacity={0.86} />
                      ))}
                      <Label
                        position="center"
                        content={() => (
                          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                            <tspan x="50%" dy="-7" fill="#f8fafc" fontSize="0.92rem" fontWeight="700">
                              {formatPrivateEuro(stats.totaalUit)}
                            </tspan>
                            <tspan x="50%" dy="16" fill="#64748b" fontSize="0.62rem">
                              totaal uit
                            </tspan>
                          </text>
                        )}
                      />
                    </Pie>
                    <Tooltip content={<PieTooltip valueFormatter={formatPrivateEuroExact} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-1">
                {stats.uitPerCategorie.slice(0, 7).map((entry) => (
                  <button
                    key={entry.categorie}
                    type="button"
                    onClick={() => toggleCategoryFilter(entry.categorie)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                      filters.categorieFilter === entry.categorie ? "bg-amber-500/10" : "hover:bg-white/[0.04]"
                    )}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: getCatColor(entry.categorie) }} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{entry.categorie}</span>
                    <span className="text-xs font-semibold text-slate-500">{entry.percentage}%</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {stats && hasData && (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <SectionTitle
                icon={ShoppingBag}
                title="Uitgaven per categorie"
                subtitle={`${stats.aantalCategorieen} categorieen - ${formatPrivateEuro(stats.totaalUit)} totaal`}
              />
              <div className="category-grid mt-5">
                {stats.uitPerCategorie.map((cat) => (
                  <CategoryCard
                    key={cat.categorie}
                    categorie={cat.categorie}
                    bedrag={cat.bedrag}
                    amountLabel={formatPrivateEuro(cat.bedrag)}
                    count={cat.count}
                    percentage={cat.percentage}
                    onClick={() => toggleCategoryFilter(cat.categorie)}
                    isActive={filters.categorieFilter === cat.categorie}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <SectionTitle icon={Receipt} title="Top uitgaven" subtitle="Per tegenpartij" />
              <div className="mt-4">
                {stats.topMerchants?.length ? (
                  <div className="space-y-1">
                    {stats.topMerchants.map((merchant, index) => (
                      <button
                        key={merchant.naam}
                        type="button"
                        onClick={() => setZoekterm(merchant.naam)}
                        className="grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.04]"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-xs font-bold text-amber-200">
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-200">{merchant.naam}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{merchant.count} transacties</span>
                        </span>
                        <span className="text-sm font-bold text-slate-100">{formatPrivateEuroExact(merchant.bedrag)}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-500">
                    Geen topuitgaven in deze selectie.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {stats && hasData && (
          <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <SectionTitle icon={Wallet} title="Financiele signalen" subtitle="Korte checks op je huidige selectie" />
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InsightRow
                icon={ArrowLeftRight}
                label="Laatste maand"
                value={latestCashflow ? `${formatPrivateSignedEuro(latestCashflow.netto)}` : "Geen data"}
                tone={latestCashflow ? getDeltaTone(latestCashflow.netto) : "slate"}
              />
              <InsightRow
                icon={ShoppingBag}
                label="Grootste categorie"
                value={topCategory ? `${topCategory.categorie} (${topCategory.percentage}%)` : "Geen data"}
                tone="indigo"
              />
              <InsightRow
                icon={Receipt}
                label="Grootste tegenpartij"
                value={topMerchant ? formatPrivateEuroExact(topMerchant.bedrag) : "Geen data"}
                tone="amber"
              />
              <InsightRow
                icon={ShieldCheck}
                label="Interne boekingen"
                value={filters.excludeIntern === false ? "Zichtbaar" : "Verborgen"}
                tone={filters.excludeIntern === false ? "sky" : "green"}
              />
            </div>
          </section>
        )}

        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <SectionTitle
            icon={Search}
            title="Transacties"
            subtitle={
              isLoading || isSearching
                ? "Laden..."
                : `${transactions.length.toLocaleString("nl-NL")} zichtbaar van ${totalCount.toLocaleString("nl-NL")}`
            }
            action={
              transactions.length > 0 ? (
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
                  onClick={() => exportCsv(transactions)}
                  title="Exporteer gefilterde transacties als CSV"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              ) : null
            }
          />

          <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1 [&_.search-bar]:max-w-none">
              <SearchBar value={zoekterm} onChange={setZoekterm} />
            </div>
            <div className="min-w-0 xl:w-[520px]">
              <FilterPanel
                filters={filters}
                onChange={updateFilters}
                onReset={resetFilters}
                availableMaanden={stats?.maanden}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            {isLoading || isSearching ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCw size={14} className="spinner" />
                Transacties laden
              </span>
            ) : (
              <span>
                {filters.maandFilter ? `${formatMonth(filters.maandFilter)} - ` : ""}
                {zoekterm ? `zoekterm "${zoekterm}" - ` : ""}
                {selectedFilterCount > 0 ? `${selectedFilterCount} filter(s) actief` : "Geen extra filters"}
              </span>
            )}
          </div>

          {totalCount === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center">
              <Landmark size={40} className="text-slate-700" />
              <div>
                <p className="font-semibold text-slate-200">Nog geen transacties</p>
                <p className="mt-1 text-sm text-slate-500">Importeer een Rabobank CSV om je finance cockpit te vullen.</p>
              </div>
            </div>
          ) : transactions.length === 0 && !isLoading ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-12 text-center">
              <Filter size={34} className="text-slate-700" />
              <div>
                <p className="font-semibold text-slate-200">Geen transacties gevonden</p>
                <p className="mt-1 text-sm text-slate-500">De huidige zoekopdracht of filters leveren niets op.</p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
                onClick={resetFilters}
              >
                <RotateCcw size={14} />
                Filters resetten
              </button>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-white/5 bg-black/10">
              <TransactionList
                transactions={transactions}
                onCategorie={handleCategorie}
                formatAmount={formatPrivateSignedEuro}
                isDone={isDone}
                onLoadMore={loadMore}
                isLoading={isLoading}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
