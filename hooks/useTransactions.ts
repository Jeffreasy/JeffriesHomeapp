"use client";

import { useDeferredValue, useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/components/ui/Toast";
import { appendUniqueBy } from "@/lib/collections";
import { createRequestGenerationGate } from "@/lib/request-generation";
import { transactionStatsScopeKey } from "@/lib/transaction-stats-scope";

import {
  getTransactions,
  getTransactionsStats,
  patchTransactionsTxID,
} from "@/lib/api/generated/transactions/transactions";
import type {
  GetTransactionsParams,
  GetTransactionsStatsParams,
  ModelTransaction,
  StoreTransactionStats as TransactionFullStats,
} from "@/lib/api/model";

export type TransactionFilter = Omit<GetTransactionsParams, "userId"> & { maandFilter?: string };
export type TransactionRow = ModelTransaction & {
  tegenpartijNaam?: string | null;
  redenRetour?: string | null;
  isInterneOverboeking?: boolean;
  _id?: string;
  datum: string;
  bedrag: number;
  code: string;
  omschrijving: string;
};
export type { TransactionFullStats };

const PAGE_SIZE = 50;
// Page size used when exporting the full filtered set (fewer round-trips).
const EXPORT_PAGE_SIZE = 500;
// Safety cap for CSV exports; beyond this the export is truncated and the
// caller is expected to tell the user to narrow the filters.
export const EXPORT_MAX_ROWS = 10_000;
// F3: bovengrens voor de recurring-detectie-steekproef. Ruim genoeg om
// meerdere maanden per tegenpartij te dekken, licht genoeg om niet te
// concurreren met een volledige export.
export const RECURRING_SAMPLE_ROWS = 800;

// monthEnd returns the real last calendar day of a "YYYY-MM" month, e.g.
// "2026-02" -> "2026-02-28". Using a hardcoded "-31" produces invalid dates
// (2026-02-31) that Postgres rejects, which silently emptied the month filter.
function monthEnd(maand: string): string {
  const [y, m] = maand.split("-").map(Number);
  if (!y || !m) return `${maand}-28`;
  const lastDay = new Date(y, m, 0).getDate(); // day 0 of next month = last day of this month
  return `${maand}-${String(lastDay).padStart(2, "0")}`;
}

// Converts the UI-level maandFilter / jaarFilter into the datumVan/datumTot
// range the API understands (explicit date filters win over both).
function applyPeriodRange(apiFilter: GetTransactionsParams, filter: TransactionFilter) {
  if (filter.maandFilter) {
    if (!apiFilter.datumVan) apiFilter.datumVan = `${filter.maandFilter}-01`;
    if (!apiFilter.datumTot) apiFilter.datumTot = monthEnd(filter.maandFilter);
  }
  if (filter.jaarFilter) {
    if (!apiFilter.datumVan) apiFilter.datumVan = `${filter.jaarFilter}-01-01`;
    if (!apiFilter.datumTot) apiFilter.datumTot = `${filter.jaarFilter}-12-31`;
  }
}

// The backend stats endpoint accepts optional datumVan/datumTot that constrain
// all aggregations (F1). The generated params type has not been regenerated yet,
// so widen it locally instead of editing the generated model.
type StatsParams = GetTransactionsStatsParams & { datumVan?: string; datumTot?: string };

// Builds the stats params for the CURRENT period selection: same iban/jaar as
// before, plus the exact datumVan/datumTot range the transaction list uses
// (maand takes precedence over jaar, explicit dates win over both) so the
// metric cards/charts describe the same period as the list (F1).
function buildStatsParams(userId: string, filter: TransactionFilter): StatsParams {
  const statsParams: StatsParams = {
    userId,
    ibanFilter: filter.ibanFilter,
    jaarFilter: filter.jaarFilter,
    datumVan: filter.datumVan,
    datumTot: filter.datumTot,
  };
  applyPeriodRange(statsParams as GetTransactionsParams, filter);
  return statsParams;
}

function mapTransaction(tx: ModelTransaction): TransactionRow {
  return {
    ...tx,
    tegenpartijNaam: tx.tegenpartij_naam,
    redenRetour: tx.reden_retour,
    isInterneOverboeking: tx.is_interne_overboeking,
    _id: tx.id,
    datum: tx.datum ?? "",
    bedrag: tx.bedrag ?? 0,
    code: tx.code ?? "",
    omschrijving: tx.omschrijving ?? "",
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTransactions(filter: TransactionFilter = {} as TransactionFilter) {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const { error: toastError } = useToast();
  const deferredZoek = useDeferredValue(filter.zoekterm ?? "");


  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isDone, setIsDone] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [stats, setStats] = useState<TransactionFullStats | null>(null);
  const [offset, setOffset] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const loadMoreInFlightRef = useRef(false);
  const requestGate = useMemo(createRequestGenerationGate, []);
  const statsRequestGate = useMemo(createRequestGenerationGate, []);

  // Build a stable filter key for resetting pagination
  const filterKey = useMemo(
    () =>
      JSON.stringify({
        excludeIntern: filter.excludeIntern,
        onlyStorneringen: filter.onlyStorneringen,
        codeFilter: filter.codeFilter,
        ibanFilter: filter.ibanFilter,
        maandFilter: filter.maandFilter,
        categorieFilter: filter.categorieFilter,
        richting: filter.richting,
        minBedrag: filter.minBedrag,
        maxBedrag: filter.maxBedrag,
        datumVan: filter.datumVan,
        datumTot: filter.datumTot,
        jaarFilter: filter.jaarFilter,
        zoekterm: deferredZoek,
      }),
    [
      filter.excludeIntern, filter.onlyStorneringen, filter.codeFilter,
      filter.ibanFilter, filter.maandFilter, filter.categorieFilter, filter.richting,
      filter.minBedrag, filter.maxBedrag, filter.datumVan, filter.datumTot,
      filter.jaarFilter, deferredZoek,
    ]
  );

  // Stats only depend on period/account scope. Search and list-only filters
  // deliberately do not invalidate this key or trigger an aggregate scan.
  const statsFilterKey = useMemo(
    () =>
      transactionStatsScopeKey({
        userId,
        ibanFilter: filter.ibanFilter,
        jaarFilter: filter.jaarFilter,
        maandFilter: filter.maandFilter,
        datumVan: filter.datumVan,
        datumTot: filter.datumTot,
      }),
    [
      userId,
      filter.ibanFilter,
      filter.jaarFilter,
      filter.maandFilter,
      filter.datumVan,
      filter.datumTot,
    ],
  );

  // Reset pagination when filters change
  useEffect(() => {
    setOffset(0);
  }, [filterKey]);

  // Fetch the filtered transaction list. Aggregate stats have their own scope
  // below, so typing in search never re-runs the heavier stats query.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const generation = requestGate.begin();

    const fetchData = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        const apiFilter: GetTransactionsParams = {
          ...filter,
          userId,
          zoekterm: deferredZoek.trim() || undefined,
          limit: PAGE_SIZE,
          offset: 0,
        };

        applyPeriodRange(apiFilter, filter);

        const listResult = await getTransactions(apiFilter);

        if (
          cancelled ||
          !requestGate.isCurrent(generation) ||
          typeof listResult.data === "string"
        ) return;
        const listData = listResult.data;
        const pageItems = (listData.page ?? []).map(mapTransaction);
        setTransactions(pageItems);
        setTotalCount(listData.totalCount ?? 0);
        setIsDone(listData.isDone ?? true);
        setOffset(pageItems.length);
      } catch {
        if (!cancelled && requestGate.isCurrent(generation)) {
          // Surface the failure instead of resetting to an empty result, so the
          // UI can distinguish "load failed" from "no transactions".
          setIsError(true);
          setTransactions([]);
          setTotalCount(0);
          setIsDone(true);
        }
      } finally {
        if (!cancelled && requestGate.isCurrent(generation)) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
      if (requestGate.isCurrent(generation)) requestGate.invalidate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, filterKey, refreshTick]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const generation = statsRequestGate.begin();

    const fetchStats = async () => {
      try {
        const statsResult = await getTransactionsStats(buildStatsParams(userId, filter));
        if (
          cancelled ||
          !statsRequestGate.isCurrent(generation) ||
          typeof statsResult.data === "string"
        ) return;
        setStats(statsResult.data);
      } catch {
        if (!cancelled && statsRequestGate.isCurrent(generation)) {
          toastError("Financiële statistieken laden mislukt.");
        }
      }
    };

    void fetchStats();
    return () => {
      cancelled = true;
      if (statsRequestGate.isCurrent(generation)) statsRequestGate.invalidate();
    };
    // The key contains every field used by buildStatsParams; list-only fields
    // are intentionally excluded to avoid aggregate requests while searching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, statsFilterKey, refreshTick, statsRequestGate, toastError]);

  const loadMore = useCallback(async () => {
    if (!userId || isDone || isLoading || loadMoreInFlightRef.current) return;
    loadMoreInFlightRef.current = true;
    const generation = requestGate.current();

    try {
      const apiFilter: GetTransactionsParams = {
        ...filter,
        userId,
        zoekterm: deferredZoek.trim() || undefined,
        limit: PAGE_SIZE,
        offset,
      };
      applyPeriodRange(apiFilter, filter);

      const result = await getTransactions(apiFilter);
      if (!requestGate.isCurrent(generation)) return;
      if (typeof result.data === "string") {
        throw new Error("Onverwacht antwoord van de server.");
      }
      const resultData = result.data;
      const pageItems = (resultData.page ?? []).map(mapTransaction);
      setTransactions((previous) =>
        appendUniqueBy(previous, pageItems, (transaction) => transaction._id ?? transaction.id ?? `${transaction.datum}:${transaction.volgnr}`)
      );
      setIsDone(resultData.isDone ?? true);
      setOffset((previous) => previous + pageItems.length);
    } catch {
      if (requestGate.isCurrent(generation)) {
        toastError("Meer transacties laden mislukt.");
      }
    } finally {
      loadMoreInFlightRef.current = false;
    }
  }, [userId, isDone, isLoading, offset, filter, deferredZoek, requestGate, toastError]);
  // F5: export-annulering. Een simpele vlag (AbortController-patroon) die de
  // fetchAll-lus tussen twee pagina's controleert; ook gezet bij unmount zodat
  // een wegnavigatie geen pagina's blijft ophalen.
  const exportAbortRef = useRef(false);
  const cancelExport = useCallback(() => {
    exportAbortRef.current = true;
  }, []);
  useEffect(() => {
    return () => {
      exportAbortRef.current = true;
    };
  }, []);

  // fetchAll pages through the complete result set for the *current* filter
  // (server-side, EXPORT_PAGE_SIZE per call) so exports cover everything the
  // filter matches, not just the rows loaded in the list. Truncates at
  // EXPORT_MAX_ROWS as a safety cap. Returns `aborted: true` when the user
  // cancelled mid-export (caller decides what to do with the partial rows).
  const fetchAll = useCallback(
    async (onProgress?: (loaded: number, total: number) => void) => {
      if (!userId) return { rows: [] as TransactionRow[], totalCount: 0, truncated: false, aborted: false };

      exportAbortRef.current = false;
      const rows: TransactionRow[] = [];
      let exportOffset = 0;
      let total = 0;

      for (;;) {
        if (exportAbortRef.current) {
          return { rows, totalCount: total, truncated: false, aborted: true };
        }
        const apiFilter: GetTransactionsParams = {
          ...filter,
          userId,
          zoekterm: deferredZoek.trim() || undefined,
          limit: EXPORT_PAGE_SIZE,
          offset: exportOffset,
        };
        applyPeriodRange(apiFilter, filter);

        const result = await getTransactions(apiFilter);
        // F5: re-check ná de await — een cancel tijdens (ook) de láátste pagina
        // moet nog steeds `aborted` opleveren, anders schrijft de laatste
        // request alsnog een CSV weg terwijl de gebruiker net annuleerde.
        if (exportAbortRef.current) {
          return { rows, totalCount: total, truncated: false, aborted: true };
        }
        if (typeof result.data === "string") {
          throw new Error("Onverwacht antwoord van de server.");
        }
        const pageItems = (result.data.page ?? []).map(mapTransaction);
        rows.push(...pageItems);
        total = result.data.totalCount ?? rows.length;
        onProgress?.(Math.min(rows.length, EXPORT_MAX_ROWS), Math.min(total, EXPORT_MAX_ROWS));

        if (rows.length >= EXPORT_MAX_ROWS) {
          return { rows: rows.slice(0, EXPORT_MAX_ROWS), totalCount: total, truncated: total > EXPORT_MAX_ROWS, aborted: false };
        }
        if ((result.data.isDone ?? true) || pageItems.length === 0) {
          return { rows, totalCount: total, truncated: false, aborted: false };
        }
        exportOffset += pageItems.length;
      }
    },
    [userId, filter, deferredZoek]
  );

  // F3: recurring-detectie heeft ≥3 verschillende maanden nodig; de eerste 50
  // geladen rijen dekken hooguit een paar weken. Deze losse fetch haalt een
  // bredere, periode-scoped set op (iban/jaar/maand/datum tellen mee, maar
  // niet zoekterm/categorie/richting — anders krijg je nooit meerdere maanden
  // per tegenpartij te zien). Gecapt op RECURRING_SAMPLE_ROWS zodat het licht
  // blijft. De aanroeper roept dit één keer aan (bij mount van de inzichten).
  const fetchRecurringSample = useCallback(
    async (): Promise<TransactionRow[]> => {
      if (!userId) return [];
      const rows: TransactionRow[] = [];
      let sampleOffset = 0;
      for (;;) {
        const apiFilter: GetTransactionsParams = {
          userId,
          // Alleen periode-scoping — geen zoekterm/categorie/richting/bedrag.
          ibanFilter: filter.ibanFilter,
          jaarFilter: filter.jaarFilter,
          datumVan: filter.datumVan,
          datumTot: filter.datumTot,
          excludeIntern: true,
          limit: EXPORT_PAGE_SIZE,
          offset: sampleOffset,
        };
        applyPeriodRange(apiFilter, {
          ibanFilter: filter.ibanFilter,
          jaarFilter: filter.jaarFilter,
          maandFilter: filter.maandFilter,
          datumVan: filter.datumVan,
          datumTot: filter.datumTot,
        } as TransactionFilter);

        const result = await getTransactions(apiFilter);
        if (typeof result.data === "string") return rows;
        const pageItems = (result.data.page ?? []).map(mapTransaction);
        rows.push(...pageItems);
        if (
          rows.length >= RECURRING_SAMPLE_ROWS ||
          (result.data.isDone ?? true) ||
          pageItems.length === 0
        ) {
          return rows.slice(0, RECURRING_SAMPLE_ROWS);
        }
        sampleOffset += pageItems.length;
      }
    },
    [userId, filter.ibanFilter, filter.jaarFilter, filter.maandFilter, filter.datumVan, filter.datumTot]
  );

  const updateCategorie = useCallback(
    async (id: string, categorie: string) => {
      try {
        await patchTransactionsTxID(id, { categorie });
        setTransactions(prev =>
          prev.map(t => (t.id === id ? { ...t, categorie } : t))
        );
        // F7: met een actieve categorie-filter hoort een rij die niet langer
        // matcht uit de lijst te verdwijnen — herlaad dan lijst + stats samen.
        if (filter.categorieFilter) {
          setRefreshTick((t) => t + 1);
          return;
        }
        // Refresh the aggregates so the pie chart / category cards reflect the
        // edited row instead of showing the old category until a full refresh.
        try {
          const statsResult = await getTransactionsStats(buildStatsParams(userId, filter));
          if (typeof statsResult.data !== "string") setStats(statsResult.data);
        } catch {
          // Best-effort: the row itself was saved; stale aggregates resolve on
          // the next refresh.
        }
      } catch {
        // No caller consumes the rejection (the dropdown fires and forgets),
        // so swallow it here after surfacing the toast — rethrowing would only
        // produce an unhandled-rejection console error.
        toastError("Kon categorie niet bijwerken.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toastError, userId, filterKey]
  );


  const resetPagination = useCallback(() => {
    setOffset(0);
  }, []);

  // refresh re-runs the fetch effect (e.g. after a CSV import in another
  // component) so the list/stats reflect newly inserted rows without a reload.
  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  return {
    transactions,
    isDone,
    isLoading,
    isError,
    isSearching: (filter.zoekterm ?? "") !== deferredZoek,
    stats,
    totalCount: totalCount || stats?.aantalTxs || stats?.aantalAlleTxs || 0,
    fetchAll,
    fetchRecurringSample,
    cancelExport,
    updateCategorie,
    loadMore,
    resetPagination,
    refresh,
  };
}
