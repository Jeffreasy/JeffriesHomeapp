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
  categorieFilter?:  string;
  richting?:         string; // "in" | "uit"
  minBedrag?:        number;
  maxBedrag?:        number;
  datumVan?:         string; // "YYYY-MM-DD"
  datumTot?:         string; // "YYYY-MM-DD"
  jaarFilter?:       string; // "2025" | "2026"
};

const PAGE_SIZE = 50;

export function useTransactions(filter: TransactionFilter = {}) {
  const [cursor, setCursor] = useState<string | null>(null);
  const deferredZoek = useDeferredValue(filter.zoekterm ?? "");

  // Cursor reset bij elke filterwijziging
  useEffect(() => {
    setCursor(null);
  }, [
    filter.excludeIntern,
    filter.onlyStorneringen,
    filter.codeFilter,
    filter.ibanFilter,
    filter.maandFilter,
    filter.categorieFilter,
    filter.richting,
    filter.minBedrag,
    filter.maxBedrag,
    filter.datumVan,
    filter.datumTot,
    filter.jaarFilter,
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
    categorieFilter:  filter.categorieFilter,
    richting:         filter.richting,
    minBedrag:        filter.minBedrag,
    maxBedrag:        filter.maxBedrag,
    datumVan:         filter.jaarFilter ? filter.datumVan ?? `${filter.jaarFilter}-01-01` : filter.datumVan,
    datumTot:         filter.jaarFilter ? filter.datumTot ?? `${filter.jaarFilter}-12-31` : filter.datumTot,
  });

  const stats = useQuery(api.transactions.getStats, {
    ibanFilter: filter.ibanFilter,
    jaarFilter: filter.jaarFilter,
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
