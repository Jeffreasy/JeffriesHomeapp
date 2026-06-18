"use client";

import { useDeferredValue, useMemo, useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  getTransactions,
  getTransactionsStats,
  postTransactionsImport,
  patchTransactionsTxID,
} from "@/lib/api/generated/transactions/transactions";
import type {
  GetTransactionsParams,
  ModelTransaction,
  StoreTransactionStats as TransactionFullStats,
  PostTransactionsImportBody,
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

// monthEnd returns the real last calendar day of a "YYYY-MM" month, e.g.
// "2026-02" -> "2026-02-28". Using a hardcoded "-31" produces invalid dates
// (2026-02-31) that Postgres rejects, which silently emptied the month filter.
function monthEnd(maand: string): string {
  const [y, m] = maand.split("-").map(Number);
  if (!y || !m) return `${maand}-28`;
  const lastDay = new Date(y, m, 0).getDate(); // day 0 of next month = last day of this month
  return `${maand}-${String(lastDay).padStart(2, "0")}`;
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
  const deferredZoek = useDeferredValue(filter.zoekterm ?? "");

  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isDone, setIsDone] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
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
      try {
        const apiFilter: GetTransactionsParams = {
          ...filter,
          userId,
          zoekterm: deferredZoek.trim() || undefined,
          limit: PAGE_SIZE,
          offset: 0,
        };

        // Convert maandFilter to date range
        if (filter.maandFilter) {
          if (!apiFilter.datumVan) apiFilter.datumVan = `${filter.maandFilter}-01`;
          if (!apiFilter.datumTot) apiFilter.datumTot = monthEnd(filter.maandFilter);
        }

        // If jaarFilter is set, compute datumVan/datumTot
        if (filter.jaarFilter) {
          if (!apiFilter.datumVan) apiFilter.datumVan = `${filter.jaarFilter}-01-01`;
          if (!apiFilter.datumTot) apiFilter.datumTot = `${filter.jaarFilter}-12-31`;
        }

        const [listResult, statsResult] = await Promise.all([
          getTransactions(apiFilter),
          getTransactionsStats({ userId, ibanFilter: filter.ibanFilter, jaarFilter: filter.jaarFilter }),
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
    if (filter.maandFilter) {
      if (!apiFilter.datumVan) apiFilter.datumVan = `${filter.maandFilter}-01`;
      if (!apiFilter.datumTot) apiFilter.datumTot = monthEnd(filter.maandFilter);
    }
    if (filter.jaarFilter) {
      if (!apiFilter.datumVan) apiFilter.datumVan = `${filter.jaarFilter}-01-01`;
      if (!apiFilter.datumTot) apiFilter.datumTot = `${filter.jaarFilter}-12-31`;
    }

    const result = await getTransactions(apiFilter);
    if (typeof result.data === "string") return;
    const resultData = result.data;
    const pageItems = (resultData.page ?? []).map(mapTransaction);
    setTransactions(prev => [...prev, ...pageItems]);
    setIsDone(resultData.isDone ?? true);
    setOffset(prev => prev + pageItems.length);
  }, [userId, isDone, offset, filter, deferredZoek]);

  const importBatch = useCallback(
    async (txs: PostTransactionsImportBody["transactions"]) => {
      if (!userId) return { data: { ok: false, inserted: 0, total: 0, skipped: 0 } };
      return postTransactionsImport({ userId, transactions: txs });
    },
    [userId]
  );

  const updateCategorie = useCallback(
    async (id: string, categorie: string) => {
      await patchTransactionsTxID(id, { categorie });
      setTransactions(prev =>
        prev.map(t => (t.id === id ? { ...t, categorie } : t))
      );
    },
    []
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
    isSearching: (filter.zoekterm ?? "") !== deferredZoek,
    stats,
    totalCount: totalCount || stats?.aantalTxs || stats?.aantalAlleTxs || 0,
    importBatch,
    updateCategorie,
    loadMore,
    resetPagination,
    refresh,
  };
}
