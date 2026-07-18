import { formatDateRange, getTimeLabel, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";

export type DashboardDateInfo = {
  greeting: string;
  todayLabel: string;
  todayIso: string;
  period: string;
};

export type Tone = UiTone;

export const toneClasses = uiToneClasses;

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
