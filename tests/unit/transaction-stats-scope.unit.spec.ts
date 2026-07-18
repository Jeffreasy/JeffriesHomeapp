import { expect, test } from "@playwright/test";
import { transactionStatsScopeKey } from "../../lib/transaction-stats-scope";

test("transaction stats scope ignores search and other list-only filters", () => {
  const firstListState = {
    userId: "owner",
    ibanFilter: "NL01TEST",
    jaarFilter: "2026",
    maandFilter: "2026-07",
    zoekterm: "koffie",
    categorieFilter: "Boodschappen",
  };
  const secondListState = {
    ...firstListState,
    zoekterm: "huur",
    categorieFilter: "Wonen",
  };

  expect(transactionStatsScopeKey(firstListState)).toBe(
    transactionStatsScopeKey(secondListState),
  );
  expect(
    transactionStatsScopeKey({ ...secondListState, maandFilter: "2026-06" }),
  ).not.toBe(transactionStatsScopeKey(secondListState));
});
