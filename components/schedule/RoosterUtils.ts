import { BarChart2, CalendarDays, Euro, List, type LucideIcon } from "lucide-react";
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";

export type Tab = "overzicht" | "statistieken" | "salaris" | "afspraken_beheer";
export type Tone = UiTone;

export const TABS: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: "overzicht", label: "Overzicht", icon: List },
  { id: "statistieken", label: "Statistieken", icon: BarChart2 },
  { id: "salaris", label: "Salaris", icon: Euro },
  { id: "afspraken_beheer", label: "Beheer", icon: CalendarDays },
];

export const toneClasses = uiToneClasses;

export function getAmsterdamTodayIso() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

export function formatShortDate(iso?: string) {
  if (!iso) return "Geen datum";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function formatMetaDate(iso?: string) {
  if (!iso) return "nooit";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "onbekend";
  // Vastgepind op Europe/Amsterdam (net als AgendaUtils.formatDateTime) zodat
  // de sync-timestamp niet meeschuift met de device-timezone (audit N13).
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

/** Format a number of hours in nl-NL notation (comma decimal), e.g. 7.5 → "7,5". */
export function hoursValue(hours: number) {
  return String(Math.round(hours * 10) / 10).replace(".", ",");
}

export function formatHours(hours: number) {
  return `${hoursValue(hours)}u`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
