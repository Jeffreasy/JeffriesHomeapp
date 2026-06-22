import {
  ArrowDownAZ,
  ArrowUpDown,
  Archive,
  CalendarClock,
  Clock3,
  Hash,
  Link2,
  ListChecks,
  Pin,
  ShieldAlert,
  CheckCircle2,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import type { NoteRecord } from "@/hooks/useNotes";

export type ViewMode = "active" | "completed" | "archived";
export type BoardMode = "board" | "grid";
export type SortMode = "recent" | "oldest" | "title" | "deadline";
export type NoteScope = "all" | "pinned" | "attention" | "deadlines" | "checklists" | "linked" | "untagged";
export type Tone = "amber" | "green" | "rose" | "sky" | "indigo" | "slate";

export const SORT_OPTIONS: Array<{ id: SortMode; label: string; icon: LucideIcon }> = [
  { id: "recent", label: "Nieuwst", icon: ArrowUpDown },
  { id: "oldest", label: "Oudst", icon: Clock3 },
  { id: "title", label: "A-Z", icon: ArrowDownAZ },
  { id: "deadline", label: "Deadline", icon: CalendarClock },
];

export const SCOPE_OPTIONS: Array<{ id: NoteScope; label: string; icon: LucideIcon }> = [
  { id: "all", label: "Alles", icon: StickyNote },
  { id: "attention", label: "Aandacht", icon: ShieldAlert },
  { id: "pinned", label: "Vastgezet", icon: Pin },
  { id: "deadlines", label: "Deadlines", icon: CalendarClock },
  { id: "checklists", label: "Checklists", icon: ListChecks },
  { id: "linked", label: "Agenda", icon: Link2 },
  { id: "untagged", label: "Zonder tag", icon: Hash },
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

// Canonical checklist patterns — the single source of truth shared by the cards,
// the editor and the metrics so progress bars and tiles can't disagree. Tolerant
// of upper-case [X] and an empty task ("- [ ]" with no text).
export const CHECKLIST_ITEM = /^- \[[ xX]\] ?(.*)$/;
export const CHECKLIST_DONE = /^- \[[xX]\] ?(.*)$/;

export function getChecklistInfo(text: string) {
  const lines = text.split("\n");
  const total = lines.filter((line) => CHECKLIST_ITEM.test(line)).length;
  const done = lines.filter((line) => CHECKLIST_DONE.test(line)).length;
  return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

// amsterdamDayDiff returns the whole-day difference (deadline − today) computed
// on the Europe/Amsterdam calendar, so "Vandaag"/"Verlopen" match the timezone
// the backend (Telegram/AI) and the rest of the app use, not the browser's.
export function amsterdamDayDiff(iso: string, now = new Date()): number {
  const toAmsYmd = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Amsterdam",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  const [dy, dm, dd] = toAmsYmd(new Date(iso)).split("-").map(Number);
  const [ny, nm, nd] = toAmsYmd(now).split("-").map(Number);
  const deadlineDay = Date.UTC(dy, dm - 1, dd);
  const today = Date.UTC(ny, nm - 1, nd);
  return Math.round((deadlineDay - today) / 86400000);
}

export function getDisplayTitle(note: NoteRecord) {
  return note.titel || note.inhoud.slice(0, 50) || "Zonder titel";
}

export function tagLabel(tag: string, index: number, masked: boolean) {
  return masked ? `Tag ${index + 1}` : tag;
}

export function getDeadlineState(deadline?: string | null, now = new Date()) {
  if (!deadline) {
    return { hasDeadline: false, overdue: false, today: false, soon: false, timestamp: 0 };
  }

  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) {
    return { hasDeadline: false, overdue: false, today: false, soon: false, timestamp: 0 };
  }

  const timestamp = date.getTime();
  const dayDiff = amsterdamDayDiff(deadline, now);

  return {
    hasDeadline: true,
    overdue: dayDiff < 0,
    today: dayDiff === 0,
    soon: dayDiff >= 0 && dayDiff <= 7,
    timestamp,
  };
}

export function isAttentionNote(note: NoteRecord, now = new Date()) {
  const deadline = getDeadlineState(note.deadline, now);
  return note.prioriteit === "hoog" || deadline.overdue || deadline.today;
}

export function noteMatchesScope(note: NoteRecord, scope: NoteScope, now = new Date()) {
  switch (scope) {
    case "pinned":
      return note.isPinned || note.is_pinned;
    case "attention":
      return isAttentionNote(note, now);
    case "deadlines":
      return getDeadlineState(note.deadline, now).hasDeadline;
    case "checklists":
      return getChecklistInfo(note.inhoud).total > 0;
    case "linked":
      return Boolean(note.linkedEventId || note.linked_event_id);
    case "untagged":
      return (note.tags ?? []).length === 0;
    default:
      return true;
  }
}

export const VIEW_OPTIONS: Array<{ id: ViewMode; label: string; icon: LucideIcon }> = [
  { id: "active", label: "Actief", icon: StickyNote },
  { id: "completed", label: "Afgerond", icon: CheckCircle2 },
  { id: "archived", label: "Archief", icon: Archive },
];

export function getScopeCounts(notes: NoteRecord[], now = new Date()): Record<NoteScope, number> {
  return {
    all: notes.length,
    pinned: notes.filter((note) => noteMatchesScope(note, "pinned", now)).length,
    attention: notes.filter((note) => noteMatchesScope(note, "attention", now)).length,
    deadlines: notes.filter((note) => noteMatchesScope(note, "deadlines", now)).length,
    checklists: notes.filter((note) => noteMatchesScope(note, "checklists", now)).length,
    linked: notes.filter((note) => noteMatchesScope(note, "linked", now)).length,
    untagged: notes.filter((note) => noteMatchesScope(note, "untagged", now)).length,
  };
}

