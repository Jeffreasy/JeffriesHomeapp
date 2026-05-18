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
    surface: "bg-white/5",
    border: "border-white/10",
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

export function formatShortDate(iso?: string) {
  if (!iso) return "Geen datum";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function formatEventMeta(event: PersonalEvent | null) {
  if (!event) return "Geen aankomende afspraak";
  const dateLabel = formatDateRange(event);
  const timeLabel = getTimeLabel(event);
  return `${dateLabel} - ${timeLabel}`;
}
