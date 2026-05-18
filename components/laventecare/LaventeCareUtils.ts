import { type Tone } from "./LaventeCareTypes";

export const toneClasses: Record<Tone, { border: string; surface: string; text: string; icon: string }> = {
  amber: {
    border: "border-amber-500/25",
    surface: "bg-amber-500/10",
    text: "text-amber-200",
    icon: "text-amber-300",
  },
  emerald: {
    border: "border-emerald-500/25",
    surface: "bg-emerald-500/10",
    text: "text-emerald-200",
    icon: "text-emerald-300",
  },
  sky: {
    border: "border-sky-500/25",
    surface: "bg-sky-500/10",
    text: "text-sky-200",
    icon: "text-sky-300",
  },
  rose: {
    border: "border-rose-500/25",
    surface: "bg-rose-500/10",
    text: "text-rose-200",
    icon: "text-rose-300",
  },
  violet: {
    border: "border-violet-500/25",
    surface: "bg-violet-500/10",
    text: "text-violet-200",
    icon: "text-violet-300",
  },
  slate: {
    border: "border-[var(--color-border)]",
    surface: "bg-white/[0.04]",
    text: "text-slate-200",
    icon: "text-slate-300",
  },
};

export const optional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export function formatDate(value?: string) {
  if (!value) return "Geen datum";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export function formatMoney(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Nog geen waarde";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function label(value?: string) {
  if (!value) return "Onbekend";
  return value.replace(/_/g, " ");
}

export function fitTone(score?: number): Tone {
  if (typeof score !== "number") return "slate";
  if (score >= 75) return "emerald";
  if (score >= 55) return "amber";
  return "rose";
}
