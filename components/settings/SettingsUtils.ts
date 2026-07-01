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
  enabled?: boolean;
  mode?: string;
  reason?: string;
  error?: string;
  bot?: { username: string; first_name: string; id: number };
  tokenConfigured?: boolean;
  ownerConfigured: boolean;
  ownerChatSuffix: string | null;
  webhookSecretConfigured: boolean;
  webAppUrlConfigured?: boolean;
  webAppUrl?: string;
  backgroundEngineEnabled?: boolean;
  telegramPollerConfigured?: boolean;
  grokConfigured?: boolean;
  grokModel?: string;
  grokReasoningEffort?: string;
  webhook?: {
    configured: boolean;
    urlHost: string | null;
    pendingUpdateCount: number;
    lastErrorDate: string | null;
    lastErrorMessage: string | null;
    maxConnections: number | null;
    allowedUpdates?: string[];
    hasCustomCertificate?: boolean;
    lastSyncErrorDate?: string | null;
    longPollingWillBeActive?: boolean;
  };
};

export type AiDiagnosticStatus = "success" | "warning" | "skipped" | "error";

export type AiDiagnosticCheck = {
  ok: boolean;
  status: AiDiagnosticStatus;
  label: string;
  detail?: string;
  latencyMs?: number;
  error?: string | null;
};

export type AiAgentCapability = {
  id: string;
  naam: string;
  emoji: string;
  description: string;
  tools: number;
  mutatingTools: number;
  confirmationTools: number;
  toolNames: string[];
  liveToolNames?: string[];
  pendingTools?: number;
  pendingMutatingTools?: number;
  pendingConfirmationTools?: number;
  pendingToolNames?: string[];
};

export type AiDiagnosticsRecommendation = {
  priority: "hoog" | "middel" | "laag" | string;
  title: string;
  detail: string;
};

export type AiUsageWindow = {
  calls: number;
  errors: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  avgDurationMs: number;
  maxDurationMs: number;
  estCost: number;
};

export type AiUsage = {
  priced: boolean;
  today?: AiUsageWindow;
  last7d?: AiUsageWindow;
  last30d?: AiUsageWindow;
};

export type AiDiagnosticsResult = {
  ok: boolean;
  generatedAt: string;
  config: {
    grokConfigured: boolean;
    grokModel: string;
    grokReasoningEffort: string;
    groqConfigured: boolean;
    telegramConfigured: boolean;
  };
  checks: {
    grokChat?: AiDiagnosticCheck;
    grokWebSearch?: AiDiagnosticCheck;
    groqVoice?: AiDiagnosticCheck;
    googleOAuth?: AiDiagnosticCheck;
    gmailSync?: AiDiagnosticCheck;
    calendarSync?: AiDiagnosticCheck;
  };
  capabilities: {
    agents: number;
    tools: number;
    mutatingTools: number;
    confirmationTools: number;
    policyTools?: number;
    pendingPolicyTools?: number;
    pendingMutatingTools?: number;
    pendingConfirmationTools?: number;
    readOnlyTools?: number;
  };
  governance?: {
    liveToolNames?: string[];
    policyOnlyToolNames?: string[];
    mutatingToolNames?: string[];
    confirmationToolNames?: string[];
    coveragePercent?: number;
    liveTools?: number;
    policyTools?: number;
    policyOnlyTools?: number;
  };
  agents: AiAgentCapability[];
  recommendations?: AiDiagnosticsRecommendation[];
  usage?: AiUsage;
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
    border: "border-[var(--color-border)]",
    surface: "bg-[var(--color-surface)]",
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
