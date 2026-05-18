import { ArrowDownAZ, ArrowUpDown, CalendarClock, Clock3, type LucideIcon } from "lucide-react";
import type { NoteRecord } from "@/hooks/useNotes";

export type ViewMode = "active" | "archived";
export type SortMode = "recent" | "oldest" | "title" | "deadline";
export type Tone = "amber" | "green" | "rose" | "sky" | "indigo" | "slate";

export const SORT_OPTIONS: Array<{ id: SortMode; label: string; icon: LucideIcon }> = [
  { id: "recent", label: "Nieuwst", icon: ArrowUpDown },
  { id: "oldest", label: "Oudst", icon: Clock3 },
  { id: "title", label: "A-Z", icon: ArrowDownAZ },
  { id: "deadline", label: "Deadline", icon: CalendarClock },
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
    border: "border-[var(--color-border)]",
    surface: "bg-[var(--color-surface)]",
    icon: "text-slate-300",
    text: "text-slate-200",
  },
};

export function formatDate(iso?: string) {
  if (!iso) return "Geen datum";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Onbekend";
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function getChecklistInfo(text: string) {
  const lines = text.split("\n");
  const total = lines.filter((line) => /^- \[[ x]\] /i.test(line)).length;
  const done = lines.filter((line) => /^- \[x\] /i.test(line)).length;
  return { total, done };
}

export function getDisplayTitle(note: NoteRecord) {
  return note.titel || note.inhoud.slice(0, 50) || "Zonder titel";
}

export function tagLabel(tag: string, index: number, masked: boolean) {
  return masked ? `Tag ${index + 1}` : tag;
}
