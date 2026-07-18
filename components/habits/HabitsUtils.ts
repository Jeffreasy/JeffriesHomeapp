import type { CSSProperties } from "react";
import { BarChart3, CalendarCheck, LayoutGrid, type LucideIcon } from "lucide-react";
import { HABIT_COLORS } from "@/lib/habit-constants";
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";
import { solidForegroundToken } from "@/lib/ui/colorContrast";

export type TabId = "vandaag" | "overzicht" | "stats";
export type Tone = UiTone;

export const TABS: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "vandaag", label: "Vandaag", icon: CalendarCheck },
  { id: "overzicht", label: "Overzicht", icon: LayoutGrid },
  { id: "stats", label: "Statistieken", icon: BarChart3 },
];

export const toneClasses = uiToneClasses;

export type HabitColor = (typeof HABIT_COLORS)[number];

export interface HabitColorVariables extends CSSProperties {
  "--habit-color": string;
  "--habit-color-soft": string;
  "--habit-color-border": string;
  "--habit-color-contrast": string;
  "--habit-color-foreground": string;
}

export function habitColorForeground(value?: string | null) {
  return solidForegroundToken(normalizeHabitColor(value));
}

export function normalizeHabitColor(value?: string | null): HabitColor {
  const normalized = value?.trim().toLowerCase();
  return (HABIT_COLORS as readonly string[]).includes(normalized ?? "")
    ? (normalized as HabitColor)
    : HABIT_COLORS[0];
}

export function habitColorStyle(value?: string | null): HabitColorVariables {
  const color = normalizeHabitColor(value);
  return {
    "--habit-color": color,
    "--habit-color-soft": `color-mix(in srgb, ${color} 12%, transparent)`,
    "--habit-color-border": `color-mix(in srgb, ${color} 30%, transparent)`,
    "--habit-color-contrast": `color-mix(in srgb, ${color} 44%, white)`,
    "--habit-color-foreground": habitColorForeground(color),
  };
}

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
