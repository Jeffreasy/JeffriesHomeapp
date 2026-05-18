import { BarChart3, CalendarCheck, LayoutGrid, type LucideIcon } from "lucide-react";

export type TabId = "vandaag" | "overzicht" | "stats";
export type Tone = "amber" | "green" | "rose" | "sky" | "indigo" | "slate";

export const TABS: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "vandaag", label: "Vandaag", icon: CalendarCheck },
  { id: "overzicht", label: "Overzicht", icon: LayoutGrid },
  { id: "stats", label: "Statistieken", icon: BarChart3 },
];

export const toneClasses: Record<Tone, { border: string; surface: string; icon: string; text: string }> = {
  amber: {
    border: "border-amber-500/25",
    surface: "bg-amber-500/10",
    icon: "text-amber-300",
    text: "text-amber-200",
  },
  green: {
    border: "border-emerald-500/20",
    surface: "bg-emerald-500/10",
    icon: "text-emerald-300",
    text: "text-emerald-200",
  },
  rose: {
    border: "border-rose-500/20",
    surface: "bg-rose-500/10",
    icon: "text-rose-300",
    text: "text-rose-200",
  },
  sky: {
    border: "border-sky-500/20",
    surface: "bg-sky-500/10",
    icon: "text-sky-300",
    text: "text-sky-200",
  },
  indigo: {
    border: "border-indigo-500/20",
    surface: "bg-indigo-500/10",
    icon: "text-indigo-300",
    text: "text-indigo-200",
  },
  slate: {
    border: "border-white/10",
    surface: "bg-white/[0.04]",
    icon: "text-slate-300",
    text: "text-slate-200",
  },
};

export function todayStr(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDateLabel(dateStr: string, today: string): string {
  if (!dateStr || !today) return "Vandaag";
  if (dateStr === today) return "Vandaag";
  if (dateStr === shiftDate(today, -1)) return "Gisteren";
  if (dateStr === shiftDate(today, 1)) return "Morgen";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

export function maskHabitName(name: string, index: number, masked: boolean) {
  return masked ? `Habit ${index + 1}` : name;
}
