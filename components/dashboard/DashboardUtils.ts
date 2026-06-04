import { formatDateRange, getTimeLabel, type PersonalEvent } from "@/hooks/usePersonalEvents";

export type DashboardDateInfo = {
  greeting: string;
  todayLabel: string;
  todayIso: string;
  period: string;
};

export type Tone = "amber" | "blue" | "green" | "indigo" | "rose" | "slate";

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

export function getDashboardDateInfo(): DashboardDateInfo {
  const now = new Date();
  const todayIso = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const hour = Number(
    new Intl.DateTimeFormat("nl-NL", {
      timeZone: "Europe/Amsterdam",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now)
  );

  return {
    greeting:
      hour < 6
        ? "Goedenacht"
        : hour < 12
          ? "Goedemorgen"
          : hour < 18
            ? "Goedemiddag"
            : "Goedenavond",
    todayLabel: now.toLocaleDateString("nl-NL", {
      timeZone: "Europe/Amsterdam",
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    todayIso,
    period: todayIso.slice(0, 7),
  };
}

export function formatCurrency(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Geen data";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function parseIsoDate(iso?: string) {
  if (!iso) return null;
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffDays(targetIso: string, todayIso: string) {
  const target = parseIsoDate(targetIso);
  const today = parseIsoDate(todayIso);
  if (!target || !today) return null;
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatShortDate(iso?: string) {
  if (!iso) return "Geen datum";
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function formatLongDate(iso?: string) {
  const date = parseIsoDate(iso);
  if (!date) return iso ?? "Geen datum";
  return date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatRelativeDateLabel(iso?: string, todayIso?: string) {
  if (!iso) return "Geen datum";
  const absolute = formatLongDate(iso);
  if (!todayIso) return absolute;

  const diff = diffDays(iso, todayIso);
  if (diff === null) return absolute;
  if (diff === 0) return `Vandaag (${absolute})`;
  if (diff === 1) return `Morgen (${absolute})`;
  if (diff === 2) return `Overmorgen (${absolute})`;
  if (diff > 2 && diff <= 6) return `Over ${diff} dagen (${absolute})`;
  if (diff === -1) return `Gisteren (${absolute})`;
  if (diff < -1) return `${Math.abs(diff)} dagen geleden (${absolute})`;
  return capitalize(absolute);
}

export function formatEventMeta(event: PersonalEvent | null, todayIso?: string) {
  if (!event) return "Geen aankomende afspraak";
  const dateLabel = event.startDatum === event.eindDatum
    ? formatRelativeDateLabel(event.startDatum, todayIso)
    : formatDateRange(event);
  const timeLabel = getTimeLabel(event);
  return `${dateLabel} · ${timeLabel}`;
}
