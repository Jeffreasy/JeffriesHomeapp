"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Landmark,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { CsvUploader } from "@/components/finance/CsvUploader";
import { TransactionList } from "@/components/finance/TransactionList";
import { FilterPanel } from "@/components/finance/FilterPanel";
import { SearchBar } from "@/components/finance/SearchBar";
import { useTransactions, EXPORT_MAX_ROWS, type TransactionFilter } from "@/hooks/useTransactions";
import { useLoonstroken } from "@/hooks/useLoonstroken";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { eur, eurExact, ibanLabel } from "@/lib/finance-constants";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  exportCsv,
  formatMonth,
  formatShortDate,
  signedEuro,
} from "@/components/finance/FinanceUtils";
import { SegmentedButton, SectionTitle } from "@/components/finance/FinanceCards";
import { FinanceMetricsGrid } from "@/components/finance/FinanceMetricsGrid";
import { FinanceCharts } from "@/components/finance/FinanceCharts";
import { FinanceInsights } from "@/components/finance/FinanceInsights";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { ErrorState } from "@/components/dashboard/DashboardPrimitives";

type ChartView = "saldo" | "inuit";

export default function FinancePage() {
  const [ibanFilter, setIbanFilter] = useState<string | undefined>();
  const [zoekterm, setZoekterm] = useState("");
  const [chartView, setChartView] = useState<ChartView>("saldo");
  const [jaarFilter, setJaarFilter] = useState<string>("2026");
  const [filters, setFilters] = useState<TransactionFilter>(DEFAULT_FILTERS);

  const loonstroken = useLoonstroken();
  const { hidden: privacyOn, toggle: togglePrivacy, mask } = usePrivacy("finance");
  const { error: toastError } = useToast();
  const { openConfirm } = useConfirm();
  const {
    transactions,
    stats,
    totalCount,
    isLoading,
    isError,
    isSearching,
    isDone,
    loadMore,
    updateCategorie,
    fetchAll,
    fetchRecurringSample,
    cancelExport,
    refresh,
  } = useTransactions({ ibanFilter, zoekterm, jaarFilter: jaarFilter || undefined, ...filters });

  const handleCategorie = useCallback(
    (id: string, cat: string | undefined) => updateCategorie(id, cat ?? ""),
    [updateCategorie]
  );

  const updateFilters = (partial: Partial<TransactionFilter>) => {
    setFilters((current) => ({ ...current, ...partial }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setZoekterm("");
  };

  // Wisselen van jaar cleart de periode-filters (maand + expliciete datums),
  // net als handleIbanTab: anders tonen header/grafieken het nieuwe jaar
  // terwijl de transactielijst op een maand uit het oude jaar blijft staan.
  const handleJaarFilter = (year: string) => {
    setJaarFilter(year);
    setFilters((current) => ({
      ...current,
      maandFilter: undefined,
      datumVan: undefined,
      datumTot: undefined,
    }));
  };

  // FH8: exporteer de vólledige gefilterde set (server-side gepagineerd), niet
  // alleen de rijen die toevallig in de lijst geladen zijn.
  const [exportProgress, setExportProgress] = useState<{ loaded: number; total: number } | null>(null);
  const isExporting = exportProgress !== null;

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    // Privacy-mask + export van echte bedragen bijt elkaar: de CSV bevat
    // ongemaskeerde bedragen. Expliciet laten bevestigen als privacy aanstaat.
    if (privacyOn) {
      const confirmed = await openConfirm({
        title: "Exporteren met echte bedragen?",
        message: "Privacymodus staat aan — toch exporteren met echte bedragen?",
        confirmLabel: "Toch exporteren",
      });
      if (!confirmed) return;
    }
    // Cap de beginteller op EXPORT_MAX_ROWS zodat de "0/N"-weergave niet hoger
    // start dan waar de export ooit kan uitkomen (fetchAll capt daar ook op).
    setExportProgress({ loaded: 0, total: Math.min(totalCount, EXPORT_MAX_ROWS) });
    try {
      const { rows, truncated, aborted } = await fetchAll((loaded, total) =>
        setExportProgress({ loaded, total })
      );
      // F5: geannuleerd = geen CSV, geen foutmelding — de gebruiker vroeg erom.
      if (aborted) return;
      exportCsv(rows);
      if (truncated) {
        toastError(
          `Export afgekapt op ${EXPORT_MAX_ROWS.toLocaleString("nl-NL")} rijen — verfijn je filters voor een volledige export.`
        );
      }
    } catch {
      toastError("Export mislukt. Probeer het opnieuw.");
    } finally {
      setExportProgress(null);
    }
  }, [isExporting, privacyOn, openConfirm, totalCount, fetchAll, toastError]);

  const handleIbanTab = (iban: string | undefined) => {
    setIbanFilter(iban);
    // Wissel van rekening cleart álle periode/detail-filters (L13): anders blijft
    // een maand/datumrange/zoekterm/categorie uit de vorige rekening hangen en
    // toont de lijst een lege of misleidende selectie voor de nieuwe rekening.
    setFilters((current) => ({
      ...current,
      maandFilter: undefined,
      datumVan: undefined,
      datumTot: undefined,
      onlyStorneringen: false,
      categorieFilter: undefined,
    }));
    setZoekterm("");
  };

  const scrollToTransactions = useCallback(() => {
    if (typeof document === "undefined") return;
    document
      .getElementById("finance-transactions")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const toggleCategoryFilter = (cat: string) => {
    setFilters((current) => ({
      ...current,
      categorieFilter: current.categorieFilter === cat ? undefined : cat,
    }));
  };

  // Used by the insights merchant/category controls, which live far above the
  // transaction list they filter. Without bringing the list (and search box)
  // into view, the click appears to do nothing on smaller viewports.
  const jumpSearchToTransactions = useCallback(
    (term: string) => {
      setZoekterm(term);
      scrollToTransactions();
    },
    [scrollToTransactions]
  );

  const jumpCategoryToTransactions = useCallback(
    (cat: string) => {
      toggleCategoryFilter(cat);
      scrollToTransactions();
    },
    [scrollToTransactions]
  );

  const formatPrivateEuro = useCallback((value: number) => mask(eur(value)), [mask]);
  const formatPrivateEuroExact = useCallback((value: number) => mask(eurExact(value)), [mask]);
  const formatPrivateSignedEuro = useCallback((value: number) => mask(signedEuro(value)), [mask]);

  const yearOptions = useMemo(() => {
    const years = stats?.jaren?.length ? stats.jaren : ["2026", "2025"];
    return Array.from(new Set([...years, ""]));
  }, [stats]);

  // The default jaarFilter ("2026") is a guess made before any data has loaded.
  // If the user has no data for that year, the page would open on an empty
  // metrics/charts view until they manually pick a year. Once the real list of
  // years arrives, snap to the most recent year that actually has data — but
  // only once, and never override a year the user has already chosen.
  const yearDefaulted = useRef(false);
  useEffect(() => {
    if (yearDefaulted.current) return;
    const years = stats?.jaren;
    if (!years?.length) return;
    yearDefaulted.current = true;
    if (jaarFilter !== "" && !years.includes(jaarFilter)) {
      // stats.jaren is sorted ascending, so the last entry is the latest year.
      setJaarFilter(years[years.length - 1]);
    }
  }, [stats, jaarFilter]);

  const recentMonths = useMemo(() => {
    if (!stats?.maanden?.length) return [];
    return [...stats.maanden].reverse().slice(0, 6);
  }, [stats]);

  // F8: de lopende maand is per definitie onvolledig (op de 5e = 5 dagen vs 30),
  // dus die uitsluiten van de "versus vorige maand"-delta — anders lijkt elke
  // maandstart een enorme daling. Amsterdam-gepind zodat een device op UTC rond
  // middernacht niet de verkeerde maand als "lopend" ziet.
  const runningMonthKey = useMemo(
    () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }).slice(0, 7),
    []
  );

  const momDelta = useMemo(() => {
    if (!stats) return null;
    // Sluit de lopende maand uit; vergelijk de twee meest recente vólledige maanden.
    const complete = stats.inUitPerMaand.filter(
      (m: { maand: string }) => m.maand !== runningMonthKey
    );
    if (complete.length < 2) return null;
    const curr = complete[complete.length - 1];
    const prev = complete[complete.length - 2];
    const inkomstenDelta = prev.inkomsten > 0
      ? Math.round(((curr.inkomsten - prev.inkomsten) / prev.inkomsten) * 1000) / 10
      : 0;
    const uitgavenDelta = prev.uitgaven > 0
      ? Math.round(((curr.uitgaven - prev.uitgaven) / prev.uitgaven) * 1000) / 10
      : 0;

    return { inkomstenDelta, uitgavenDelta };
  }, [stats, runningMonthKey]);

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
    <div className="finance-dashboard-shell text-slate-100">
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
                  ? `${totalCount.toLocaleString("nl-NL")} transacties · ${stats.maanden.length} maanden · ${stats.aantalCategorieen} categorieën`
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
                    Veilig opgeslagen
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {yearOptions.map((year) => (
                    <SegmentedButton
                      key={year || "all"}
                      active={jaarFilter === year}
                      icon={CalendarDays}
                      onClick={() => handleJaarFilter(year)}
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
                    {stats.ibannen.map((iban: string) => (
                      <SegmentedButton
                        key={iban}
                        active={ibanFilter === iban}
                        icon={CreditCard}
                        onClick={() => handleIbanTab(iban)}
                      >
                        <span className="flex flex-col items-start leading-tight">
                          <span>{ibanLabel(iban)}</span>
                          {stats.huidigSaldoPerIban[iban] !== undefined && (
                            <span className="text-xs opacity-80">
                              {formatPrivateEuro(stats.huidigSaldoPerIban[iban])} · {formatShortDate(stats.saldoPeildatumPerIban?.[iban])}
                            </span>
                          )}
                        </span>
                      </SegmentedButton>
                    ))}
                  </div>
                </div>
              )}

              {recentMonths.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Snelle maandselectie</p>
                      {(stats?.maanden?.length ?? 0) > recentMonths.length && (
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Laatste {recentMonths.length} maanden — oudere maanden via het maandfilter in de lijst.
                        </p>
                      )}
                    </div>
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
                  <p className="mt-1 text-xs text-slate-500">Rabobank CSV-export importeren</p>
                </div>
                <Upload size={18} className="text-amber-300" />
              </div>
              <div className="finance-import min-w-0">
                <CsvUploader onImported={refresh} />
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
          <FinanceMetricsGrid 
            stats={stats}
            saldoTrend={saldoTrend}
            momDelta={momDelta}
            savingsRate={savingsRate}
            salarisStat={salarisStat}
            topCategory={topCategory}
            selectedFilterCount={selectedFilterCount}
            filters={filters}
            zoekterm={zoekterm}
            formatPrivateEuro={formatPrivateEuro}
            formatPrivateSignedEuro={formatPrivateSignedEuro}
          />
        )}

        {stats && hasData && (
          <CollapsibleSection
            title="Maandelijks Verloop & Cashflow"
            subtitle={`${stats.maanden.length} maanden geanalyseerd`}
            icon={<Landmark size={18} />}
            theme="emerald"
            defaultOpen={true}
          >
            <FinanceCharts
              stats={stats}
              chartView={chartView}
              setChartView={setChartView}
              ibanFilter={ibanFilter}
              privacyOn={privacyOn}
              inUitMetSalaris={inUitMetSalaris}
              loonstrokenCount={loonstroken.count}
              filters={filters}
              toggleCategoryFilter={toggleCategoryFilter}
              formatPrivateEuro={formatPrivateEuro}
              formatPrivateEuroExact={formatPrivateEuroExact}
            />
          </CollapsibleSection>
        )}

        {stats && hasData && (
          <CollapsibleSection
            title="Inzichten"
            subtitle="Grootste uitgavenposten en terugkerende betalingen"
            icon={<Eye size={18} />}
            theme="amber"
            defaultOpen={false}
          >
            <FinanceInsights
              stats={stats}
              latestCashflow={latestCashflow}
              runningMonthKey={runningMonthKey}
              topCategory={topCategory}
              topMerchant={topMerchant}
              transactions={transactions}
              fetchRecurringSample={fetchRecurringSample}
              periodKey={`${ibanFilter ?? ""}|${jaarFilter}|${filters.maandFilter ?? ""}|${filters.datumVan ?? ""}|${filters.datumTot ?? ""}`}
              filters={filters}
              zoekterm={zoekterm}
              setZoekterm={jumpSearchToTransactions}
              toggleCategoryFilter={jumpCategoryToTransactions}
              formatPrivateEuro={formatPrivateEuro}
              formatPrivateEuroExact={formatPrivateEuroExact}
              formatPrivateSignedEuro={formatPrivateSignedEuro}
            />
          </CollapsibleSection>
        )}

        <section id="finance-transactions" className="scroll-mt-24 rounded-lg border border-white/10 bg-white/[0.035] p-4">
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
                  onClick={isExporting ? cancelExport : handleExport}
                  title={isExporting
                    ? "Lopende export annuleren"
                    : "Exporteer alle transacties binnen het huidige filter als CSV"}
                >
                  {isExporting && exportProgress ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Annuleren ({exportProgress.loaded.toLocaleString("nl-NL")}/{exportProgress.total.toLocaleString("nl-NL")})
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Export CSV
                    </>
                  )}
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

          <div className="mt-5">
            {isError ? (
              <ErrorState
                onRetry={refresh}
                text="De transacties konden niet worden geladen. Je bestaande gegevens zijn niet kwijt."
              />
            ) : (
              <TransactionList
                transactions={transactions}
                onCategorie={handleCategorie}
                isDone={isDone}
                onLoadMore={loadMore}
                isLoading={isLoading || isSearching}
                formatAmount={privacyOn ? formatPrivateSignedEuro : signedEuro}
                formatBalance={privacyOn ? formatPrivateEuroExact : eurExact}
                maskValue={mask}
                isFirstRun={totalCount === 0 && selectedFilterCount === 0 && !zoekterm && !ibanFilter}
                onSearchTegenpartij={jumpSearchToTransactions}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
