import type { TransactionRow } from "@/components/finance/TransactionList";
import type { TransactionFilter } from "@/hooks/useTransactions";
import { eurExact } from "@/lib/finance-constants";

export function exportCsv(transactions: TransactionRow[]) {
  const header = "Datum,Tegenpartij,Omschrijving,Bedrag,Code,Categorie";
  const DQ = String.fromCharCode(34);
  // Escape embedded double-quotes and collapse any CR/LF inside a field to a
  // single space, so the value stays on one CSV line for naive consumers.
  const escQ = (s: string) => s.replaceAll(DQ, DQ + DQ).replace(/[\r\n]+/g, " ");
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

export function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("nl-NL", { month: "short", year: "numeric" });
}

export function formatShortDate(dateString?: string | null) {
  if (!dateString) return "geen peildatum";
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${Math.round(value * 10) / 10}%`;
}

export function signedEuro(value: number) {
  return `${value >= 0 ? "+" : ""}${eurExact(value)}`;
}

export function activeFilterCount(filters: TransactionFilter) {
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

export function getDeltaTone(value: number | null | undefined) {
  if (typeof value !== "number") return "slate" as const;
  return value >= 0 ? "green" as const : "rose" as const;
}

export const DEFAULT_FILTERS: TransactionFilter = {
  excludeIntern: true,
  onlyStorneringen: false,
};
