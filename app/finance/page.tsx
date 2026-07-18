"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
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
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { TransactionList } from "@/components/finance/TransactionList";
import { FilterPanel } from "@/components/finance/FilterPanel";
import { SearchBar } from "@/components/finance/SearchBar";
import { useTransactions, EXPORT_MAX_ROWS, type TransactionFilter } from "@/hooks/useTransactions";
import { useLoonstroken } from "@/hooks/useLoonstroken";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useToast } from "@/components/ui/Toast";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AppIcon } from "@/components/ui/AppIcon";
import { ResponsiveActions } from "@/components/ui/ResponsiveActions";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Surface, surfaceVariants } from "@/components/ui/Surface";
import { AppPageHeader, AppPageShell, PageToolbar } from "@/components/layout/AppPageShell";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { scrollElementIntoView } from "@/lib/ui/scroll";

type ChartView = "saldo" | "inuit";

const CsvUploader = dynamic(() =>
  import("@/components/finance/CsvUploader").then((module) => module.CsvUploader),
);
const FinanceCharts = dynamic(() =>
  import("@/components/finance/FinanceCharts").then((module) => module.FinanceCharts),
);
const FinanceInsights = dynamic(() =>
  import("@/components/finance/FinanceInsights").then((module) => module.FinanceInsights),
);

export default function FinancePage() {
  const [ibanFilter, setIbanFilter] = useState<string | undefined>();
  const [zoekterm, setZoekterm] = useState("");
  const [chartView, setChartView] = useState<ChartView>("saldo");
  const [jaarFilter, setJaarFilter] = useState<string>("2026");
  const [filters, setFilters] = useState<TransactionFilter>(DEFAULT_FILTERS);
  const [controlsOpen, setControlsOpen] = useState(false);
  const hasDesktopControls = useMediaQuery("(min-width: 1024px)");

  const loonstroken = useLoonstroken();
  const { hidden: privacyOn, toggle: togglePrivacy, mask, isServerUnknown: isPrivacyUnknown } = usePrivacy("finance");
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
    scrollElementIntoView(
      document.getElementById("finance-transactions"),
      { block: "start" },
    );
  }, []);

  const toggleCategoryFilter = useCallback((cat: string) => {
    setFilters((current) => ({
      ...current,
      categorieFilter: current.categorieFilter === cat ? undefined : cat,
    }));
  }, []);

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
    [scrollToTransactions, toggleCategoryFilter]
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

  const periodControls = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">Periode</p>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              {jaarFilter ? "Analyse voor " + jaarFilter : "Alle beschikbare jaren"}
            </p>
          </div>
          <Badge tone="info" size="md">
            <ShieldCheck size={14} aria-hidden="true" />
            Veilig opgeslagen
          </Badge>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {yearOptions.map((year) => (
            <SegmentedButton
              key={year || "all"}
              active={jaarFilter === year}
              onClick={() => handleJaarFilter(year)}
            >
              <CalendarDays size={15} aria-hidden="true" />
              {year || "Alles"}
            </SegmentedButton>
          ))}
        </div>
      </div>

      {stats && stats.ibannen.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">Rekeningen</p>
              <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                {ibanFilter ? ibanLabel(ibanFilter) : "Alle rekeningen samengevoegd"}
              </p>
            </div>
            <span className="text-xs font-semibold tabular-nums text-[var(--color-primary)]">
              {formatPrivateEuro(stats.huidigSaldo)}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <SegmentedButton
              active={!ibanFilter}
              onClick={() => handleIbanTab(undefined)}
            >
              <CreditCard size={15} aria-hidden="true" />
              Alle rekeningen
            </SegmentedButton>
            {stats.ibannen.map((iban: string) => (
              <SegmentedButton
                key={iban}
                active={ibanFilter === iban}
                onClick={() => handleIbanTab(iban)}
              >
                <CreditCard size={15} aria-hidden="true" />
                <span className="flex flex-col items-start leading-tight">
                  <span>{ibanLabel(iban)}</span>
                  {stats.huidigSaldoPerIban[iban] !== undefined && (
                    <span className="text-xs opacity-80">
                      {formatPrivateEuro(stats.huidigSaldoPerIban[iban])} ·{" "}
                      {formatShortDate(stats.saldoPeildatumPerIban?.[iban])}
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
              <p className="text-sm font-semibold text-[var(--color-text)]">Snelle maandselectie</p>
              {(stats?.maanden?.length ?? 0) > recentMonths.length && (
                <p className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
                  Laatste {recentMonths.length} maanden; oudere maanden staan in de lijstfilters.
                </p>
              )}
            </div>
            {filters.maandFilter && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => updateFilters({ maandFilter: undefined })}
                className="shrink-0"
              >
                Wissen
              </Button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {recentMonths.map((month) => (
              <Button
                key={month}
                type="button"
                variant={filters.maandFilter === month ? "primary" : "secondary"}
                size="sm"
                onClick={() =>
                  updateFilters({
                    maandFilter: filters.maandFilter === month ? undefined : month,
                  })
                }
                aria-pressed={filters.maandFilter === month}
                className="shrink-0"
              >
                {formatMonth(month)}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AppPageShell width="wide" className="space-y-5 text-[var(--color-text)]">
      <AppPageHeader
        eyebrow="Finance cockpit"
        title="Finance"
        description={
          stats
            ? totalCount.toLocaleString("nl-NL") + " transacties · " + stats.maanden.length + " maanden"
            : "Transacties en cashflow laden"
        }
        leading={<AppIcon name="finance" tone="accent" size="lg" framed active />}
        actions={
          <ResponsiveActions
            menuLabel="Financeacties"
            primary={
              <Button
                type="button"
                variant={privacyOn ? "warning" : "secondary"}
                onClick={togglePrivacy}
                loading={isPrivacyUnknown}
                disabled={isPrivacyUnknown}
                aria-busy={isPrivacyUnknown || undefined}
                loadingLabel="Laden"
                title={isPrivacyUnknown ? "Privacyvoorkeur wordt veilig geladen" : privacyOn ? "Bedragen tonen" : "Bedragen verbergen"}
                aria-label={isPrivacyUnknown ? "Privacyvoorkeur wordt geladen" : privacyOn ? "Bedragen tonen" : "Bedragen verbergen"}
                aria-pressed={privacyOn}
              >
                {privacyOn ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                <span className="hidden sm:inline">{privacyOn ? "Verborgen" : "Zichtbaar"}</span>
              </Button>
            }
            secondary={
              <Button
                type="button"
                variant="secondary"
                onClick={resetFilters}
                aria-label="Filters resetten"
                title="Filters resetten"
                className="w-full justify-start sm:w-auto sm:justify-center"
              >
                <RotateCcw size={16} aria-hidden="true" />
                <span>Reset</span>
              </Button>
            }
          />
        }
      />

      <div className="flex flex-col gap-5">
        <PageToolbar
          label="Finance selectie"
          leading={<CalendarDays size={17} className="text-[var(--color-primary)]" aria-hidden="true" />}
          trailing={
            <>
              <Button
                type="button"
                variant="primary"
                onClick={() => setControlsOpen(true)}
                className="lg:hidden"
              >
                <CreditCard size={16} aria-hidden="true" />
                Periode & rekening
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={scrollToTransactions}
                className="lg:hidden"
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                Filters{selectedFilterCount > 0 ? " (" + selectedFilterCount + ")" : ""}
              </Button>
            </>
          }
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-text)]">
              {jaarFilter || "Alle jaren"} · {ibanFilter ? ibanLabel(ibanFilter) : "Alle rekeningen"}
            </p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">
              {filters.maandFilter ? formatMonth(filters.maandFilter) : "Geen maandfilter"}
            </p>
          </div>
        </PageToolbar>

        {hasDesktopControls ? (
          <Surface tone="subtle" radius="md" padding="md">
            {periodControls}
          </Surface>
        ) : (
          <BottomSheet
            open={controlsOpen}
            onClose={() => setControlsOpen(false)}
            title="Periode en rekening"
            contentClassName="p-4"
          >
            {periodControls}
          </BottomSheet>
        )}

        <CollapsibleSection
          title="Transacties importeren"
          subtitle="Rabobank CSV-export"
          icon={<Upload size={18} />}
          tone="accent"
          defaultOpen={false}
        >
          <div className="min-w-0">
            <CsvUploader onImported={refresh} />
          </div>
        </CollapsibleSection>
        {stats && stats.storneringen > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              surfaceVariants({ tone: "danger", radius: "md", padding: "sm" }),
              "flex flex-col gap-3 text-[var(--color-danger)] sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            <div className="flex items-center gap-3">
               <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
               <span className="text-sm">
                 <strong>{stats.storneringen} stornering(en)</strong> gevonden in de geselecteerde periode
               </span>
            </div>
            <Button
               type="button"
               variant="danger"
               size="sm"
               onClick={() => updateFilters({ onlyStorneringen: !filters.onlyStorneringen })}
               aria-pressed={Boolean(filters.onlyStorneringen)}
            >
               {filters.onlyStorneringen ? "Toon alles" : "Alleen storneringen"}
            </Button>
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
            tone="success"
            defaultOpen={false}
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
            tone="accent"
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

        <section id="finance-transactions" className={cn(surfaceVariants({ tone: "default", radius: "lg", padding: "md" }), "scroll-mt-24")}>
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
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={isExporting ? cancelExport : handleExport}
                  title={isExporting
                    ? "Lopende export annuleren"
                    : "Exporteer alle transacties binnen het huidige filter als CSV"}
                >
                  {isExporting && exportProgress ? (
                    <>
                      <Loader2 size={16} className="animate-spin motion-reduce:animate-none" />
                      Annuleren ({exportProgress.loaded.toLocaleString("nl-NL")}/{exportProgress.total.toLocaleString("nl-NL")})
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Export CSV
                    </>
                  )}
                </Button>
              ) : null
            }
          />

          <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <SearchBar value={zoekterm} onChange={setZoekterm} className="w-full max-w-none" />
            </div>
            <div className="min-w-0 xl:w-1/2">
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
              <FeedbackState
                tone="error"
                title="Transacties laden mislukt"
                description="De transacties konden niet worden geladen. Je bestaande gegevens zijn niet kwijt."
                actionLabel="Opnieuw proberen"
                onAction={refresh}
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
      </div>
    </AppPageShell>
  );
}
