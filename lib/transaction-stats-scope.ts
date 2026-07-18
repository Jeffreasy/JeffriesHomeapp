export type TransactionStatsScope = {
  userId: string;
  ibanFilter?: string;
  jaarFilter?: string;
  maandFilter?: string;
  datumVan?: string;
  datumTot?: string;
};

/** Stable key containing only fields that affect transaction aggregates. */
export function transactionStatsScopeKey(scope: TransactionStatsScope): string {
  return JSON.stringify({
    userId: scope.userId,
    ibanFilter: scope.ibanFilter,
    jaarFilter: scope.jaarFilter,
    maandFilter: scope.maandFilter,
    datumVan: scope.datumVan,
    datumTot: scope.datumTot,
  });
}
