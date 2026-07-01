"use client";

import { useDeferredValue, useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/components/ui/Toast";

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

  // Reset pagination when filters change
  useEffect(() => {
    setOffset(0);
  }, [filterKey]);

  // Fetch transactions + stats
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

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

        const [listResult, statsResult] = await Promise.all([
          getTransactions(apiFilter),
          getTransactionsStats(buildStatsParams(userId, filter)),
        ]);

        if (cancelled || typeof listResult.data === "string" || typeof statsResult.data === "string") return;
        const listData = listResult.data;
        const pageItems = (listData.page ?? []).map(mapTransaction);
        setTransactions(pageItems);
        setTotalCount(listData.totalCount ?? 0);
        setIsDone(listData.isDone ?? true);
        setStats(statsResult.data);
        setOffset(pageItems.length);
      } catch {
        if (!cancelled) {
          // Surface the failure instead of resetting to an empty result, so the
          // UI can distinguish "load failed" from "no transactions".
          setIsError(true);
          setTransactions([]);
          setTotalCount(0);
          setIsDone(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, filterKey, refreshTick]);

  const loadMore = useCallback(async () => {
    if (!userId || isDone) return;

    const apiFilter: GetTransactionsParams = {
      ...filter,
      userId,
      zoekterm: deferredZoek.trim() || undefined,
      limit: PAGE_SIZE,
      offset,
    };
    applyPeriodRange(apiFilter, filter);

    const result = await getTransactions(apiFilter);
    if (typeof result.data === "string") return;
    const resultData = result.data;
    const pageItems = (resultData.page ?? []).map(mapTransaction);
    setTransactions(prev => [...prev, ...pageItems]);
    setIsDone(resultData.isDone ?? true);
    setOffset(prev => prev + pageItems.length);
  }, [userId, isDone, offset, filter, deferredZoek]);

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
    cancelExport,
    updateCategorie,
    loadMore,
    resetPagination,
    refresh,
  };
}
