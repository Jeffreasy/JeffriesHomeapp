import { BarChart2, CalendarDays, Euro, List, type LucideIcon } from "lucide-react";

export type Tab = "overzicht" | "statistieken" | "salaris" | "afspraken_beheer";
export type Tone = "amber" | "blue" | "green" | "indigo" | "rose" | "slate";

export const TABS: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: "overzicht", label: "Overzicht", icon: List },
  { id: "statistieken", label: "Statistieken", icon: BarChart2 },
  { id: "salaris", label: "Salaris", icon: Euro },
  { id: "afspraken_beheer", label: "Beheer", icon: CalendarDays },
];

export const toneClasses: Record<Tone, { icon: string; surface: string; border: string; text: string }> = {
  amber: {
    icon: "text-amber-300",
    surface: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-200",
  },
  blue: {
    icon: "text-sky-300",
    surface: "bg-sky-500/10",
    border: "border-sky-500/20",
    text: "text-sky-200",
  },
  green: {
    icon: "text-emerald-300",
    surface: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-200",
  },
  indigo: {
    icon: "text-indigo-300",
    surface: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    text: "text-indigo-200",
  },
  rose: {
    icon: "text-rose-300",
    surface: "bg-rose-500/10",
    border: "border-rose-500/20",
    text: "text-rose-200",
  },
  slate: {
    icon: "text-slate-300",
    surface: "bg-[var(--color-surface)]",
    border: "border-[var(--color-border)]",
    text: "text-slate-200",
  },
};

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
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
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
