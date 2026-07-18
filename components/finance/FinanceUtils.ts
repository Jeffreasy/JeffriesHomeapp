import type { TransactionRow } from "@/components/finance/TransactionList";
import type { TransactionFilter } from "@/hooks/useTransactions";
import { eurExact } from "@/lib/finance-constants";

export function exportCsv(transactions: TransactionRow[]) {
  // Semicolon-separated with a leading "sep=;" hint: the Dutch Excel
  // convention (nl-NL uses the decimal comma, so ";" is the list separator).
  // Comma-separated files open as one single column there.
  const SEP = ";";
  // IBAN (rekening) + saldo na transactie erbij, zodat een export met meerdere
  // rekeningen tegen de bankafschriften afgestemd kan worden (L13).
  const header = ["Datum", "Rekening", "Tegenpartij", "Tegenrekening", "Omschrijving", "Bedrag", "Saldo na", "Code", "Categorie"].join(SEP);
  const DQ = String.fromCharCode(34);
  // Escape embedded double-quotes and collapse any CR/LF inside a field to a
  // single space, so the value stays on one CSV line for naive consumers.
  const escQ = (s: string) => s.replaceAll(DQ, DQ + DQ).replace(/[\r\n]+/g, " ");
  const euroCell = (n: number | undefined) =>
    typeof n === "number" ? n.toFixed(2).replace(".", ",") : "";
  const rows = transactions.map((tx) =>
    [
      tx.datum,
      tx.rekening_iban ?? "",
      `"${escQ(tx.tegenpartijNaam ?? "Onbekend")}"`,
      tx.tegenrekening_iban ?? "",
      `"${escQ(tx.omschrijving)}"`,
      `"${tx.bedrag.toFixed(2).replace(".", ",")}"`,
      `"${euroCell(tx.saldo_na_trn)}"`,
      tx.code,
      tx.categorie ?? "Overig",
    ].join(SEP)
  );

  const csv = [`sep=${SEP}`, header, ...rows].join("\n");
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
  // Normaliseer -0 (komt uit sommen/afrondingen) — anders rendert dit als
  // "+€ -0,00".
  const normalized = Object.is(value, -0) ? 0 : value;
  return `${normalized >= 0 ? "+" : ""}${eurExact(normalized)}`;
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
  if (typeof value !== "number") return "neutral" as const;
  return value >= 0 ? "success" as const : "danger" as const;
}

export const DEFAULT_FILTERS: TransactionFilter = {
  excludeIntern: true,
  onlyStorneringen: false,
};
