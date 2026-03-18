"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useDeferredValue, useEffect } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export type TransactionFilter = {
  excludeIntern?:    boolean;
  onlyStorneringen?: boolean;
  codeFilter?:       string;
  ibanFilter?:       string;
  maandFilter?:      string; // "YYYY-MM"
  zoekterm?:         string;
};

const PAGE_SIZE = 50;

export function useTransactions(filter: TransactionFilter = {}) {
  const [cursor, setCursor] = useState<string | null>(null);
  const deferredZoek = useDeferredValue(filter.zoekterm ?? "");

  // ⚠️ BUGFIX: Cursor MOET gereset worden bij elke filterwijziging.
  // Anders pagineer je door de verkeerde dataset heen.
  useEffect(() => {
    setCursor(null);
  }, [
    filter.excludeIntern,
    filter.onlyStorneringen,
    filter.codeFilter,
    filter.ibanFilter,
    filter.maandFilter,
    deferredZoek,
  ]);

  const result = useQuery(api.transactions.listPaginated, {
    numItems:         PAGE_SIZE,
    cursor,
    excludeIntern:    filter.excludeIntern,
    onlyStorneringen: filter.onlyStorneringen,
    codeFilter:       filter.codeFilter,
    ibanFilter:       filter.ibanFilter,
    maandFilter:      filter.maandFilter,
    zoekterm:         deferredZoek.trim() || undefined,
  });

  // Stats zijn gefilterd op geselecteerde IBAN voor correcte grafieken + totalen
  const stats = useQuery(api.transactions.getStats, {
    ibanFilter: filter.ibanFilter,
  });

  const importBatch     = useMutation(api.transactions.importBatch);
  const updateCatMut    = useMutation(api.transactions.updateCategorie);

  function loadMore() {
    if (result && !result.isDone && result.continueCursor) {
      setCursor(result.continueCursor);
    }
  }

  return {
    transactions:  result?.page ?? [],
    isDone:        result?.isDone ?? true,
    isLoading:     result === undefined,
    isSearching:   (filter.zoekterm ?? "") !== deferredZoek,
    stats,
    totalCount:    stats?.aantalTxs ?? 0,
    importBatch,
    updateCategorie: (id: Id<"transactions">, categorie: string | undefined) =>
      updateCatMut({ id, categorie }),
    loadMore,
    resetPagination: () => setCursor(null),
  };
}
