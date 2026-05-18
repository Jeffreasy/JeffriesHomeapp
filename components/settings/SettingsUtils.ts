import {
  CalendarClock,
  CalendarDays,
  Database,
  Lightbulb,
  StickyNote,
  Target,
  type LucideIcon,
} from "lucide-react";

export type Tone = "amber" | "green" | "rose" | "sky" | "indigo" | "slate";
export type SyncTarget = "calendar" | "gmail" | "all";
export type PrivacyScope = "finance" | "habits" | "notes" | "email" | "account";

export type SyncStatusView = {
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  result: string | null;
};

export type TelegramStatusResult = {
  ok: boolean;
  bot: { username: string; first_name: string; id: number };
  ownerConfigured: boolean;
  ownerChatSuffix: string | null;
  webhookSecretConfigured: boolean;
  webhook: {
    configured: boolean;
    urlHost: string | null;
    pendingUpdateCount: number;
    lastErrorDate: number | null;
    lastErrorMessage: string | null;
    maxConnections: number | null;
  };
};

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

export const routeTiles: Array<{ href: string; label: string; meta: string; icon: LucideIcon; tone: Tone }> = [
  { href: "/lampen", label: "Verlichting", meta: "Lampen bedienen", icon: Lightbulb, tone: "amber" },
  { href: "/rooster", label: "Rooster", meta: "Diensten", icon: CalendarClock, tone: "sky" },
  { href: "/agenda", label: "Agenda", meta: "Afspraken en sync", icon: CalendarDays, tone: "indigo" },
  { href: "/finance", label: "Finance", meta: "Transacties", icon: Database, tone: "green" },
  { href: "/notities", label: "Notities", meta: "Knowledge base", icon: StickyNote, tone: "indigo" },
  { href: "/habits", label: "Habits", meta: "Privacygevoelig", icon: Target, tone: "rose" },
];

export function formatDateTime(iso?: string | null) {
  if (!iso) return "Nog niet gesynct";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Onbekend";
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatHost(value?: string) {
  if (!value) return "Niet ingesteld";
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}

export function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}
