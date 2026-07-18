import {
  Briefcase,
  CalendarClock,
  CalendarDays,
  Database,
  Lightbulb,
  StickyNote,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";

export type Tone = UiTone;
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

export const toneClasses = uiToneClasses;

export const routeTiles: Array<{ href: string; label: string; meta: string; icon: LucideIcon; tone: Tone }> = [
  { href: "/lampen", label: "Verlichting", meta: "Lampen bedienen", icon: Lightbulb, tone: "accent" },
  { href: "/automations", label: "Automations", meta: "Wekkers en schema's", icon: Zap, tone: "accent" },
  { href: "/rooster", label: "Rooster", meta: "Diensten", icon: CalendarClock, tone: "info" },
  { href: "/agenda", label: "Agenda", meta: "Afspraken en sync", icon: CalendarDays, tone: "info" },
  { href: "/finance", label: "Finance", meta: "Transacties", icon: Database, tone: "success" },
  { href: "/laventecare", label: "LaventeCare", meta: "Klanten en facturatie", icon: Briefcase, tone: "success" },
  { href: "/notities", label: "Notities", meta: "Knowledge base", icon: StickyNote, tone: "info" },
  { href: "/habits", label: "Habits", meta: "Privacygevoelig", icon: Target, tone: "danger" },
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
