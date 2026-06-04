"use client";

import {
  Activity,
  Bot,
  Brain,
  CalendarClock,
  Cloud,
  Loader2,
  Mail,
  Mic,
  Network,
  RadioTower,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Panel, SectionHeader, StatusPill, type StatusPillTone } from "./SettingsCards";
import type { AiAgentCapability, AiDiagnosticCheck, AiDiagnosticsResult, SyncStatusView, TelegramStatusResult } from "./SettingsUtils";
import { cn } from "@/lib/utils";

type IntegrationRowProps = {
  icon: LucideIcon;
  label: string;
  ok?: boolean;
  statusLabel?: string;
  tone?: StatusPillTone;
};

type SettingsOverviewLike = {
  integrations?: Record<string, unknown>;
};

function IntegrationRow({ icon: Icon, label, ok, statusLabel, tone }: IntegrationRowProps) {
  const resolvedTone = tone ?? (ok ? "ok" : "bad");
  const iconTone = {
    ok: "bg-emerald-500/10 text-emerald-300",
    warn: "bg-amber-500/10 text-amber-300",
    neutral: "bg-slate-500/10 text-slate-300",
    bad: "bg-rose-500/10 text-rose-300",
  }[resolvedTone];

  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconTone)}>
          <Icon size={15} />
        </div>
        <span className="line-clamp-2 min-w-0 text-sm font-semibold text-slate-300">{label}</span>
      </div>
      <StatusPill ok={Boolean(ok)} tone={resolvedTone} label={statusLabel ?? (ok ? "OK" : "Ontbreekt")} />
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--color-border)] bg-black/10 px-3 py-2">
      <p className="truncate text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function checkTone(check?: AiDiagnosticCheck): StatusPillTone {
  if (!check) return "neutral";
  if (check.status === "success") return "ok";
  if (check.status === "warning" || check.status === "skipped") return "warn";
  return "bad";
}

function checkLabel(check?: AiDiagnosticCheck) {
  if (!check) return "Niet getest";
  if (check.status === "success") return check.latencyMs ? `${check.latencyMs}ms` : "OK";
  if (check.status === "skipped") return "Overgeslagen";
  if (check.status === "warning") return "Let op";
  return "Fout";
}

function DiagnosticTile({ icon: Icon, label, check }: { icon: LucideIcon; label: string; check?: AiDiagnosticCheck }) {
  const tone = checkTone(check);
  const iconTone = {
    ok: "bg-emerald-500/10 text-emerald-300",
    warn: "bg-amber-500/10 text-amber-300",
    neutral: "bg-slate-500/10 text-slate-300",
    bad: "bg-rose-500/10 text-rose-300",
  }[tone];

  return (
    <div className="min-w-0 rounded-lg border border-[var(--color-border)] bg-black/10 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconTone)}>
            <Icon size={15} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-200">{label}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500">
              {check?.error ?? check?.detail ?? "Nog niet gecontroleerd"}
            </p>
          </div>
        </div>
        <StatusPill ok={Boolean(check?.ok)} tone={tone} label={checkLabel(check)} />
      </div>
    </div>
  );
}

function AgentCapabilityCard({ agent }: { agent: AiAgentCapability }) {
  const visibleTools = agent.toolNames.slice(0, 3);
  const remaining = Math.max(0, agent.toolNames.length - visibleTools.length);

  return (
    <div className="min-w-0 rounded-lg border border-[var(--color-border)] bg-black/10 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-200">
            {agent.emoji} {agent.naam}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {agent.tools} tools - {agent.mutatingTools} mutaties - {agent.confirmationTools} bevestiging
          </p>
        </div>
        <StatusPill ok={agent.tools > 0} tone={agent.tools > 0 ? "ok" : "neutral"} label={String(agent.tools)} />
      </div>
      {visibleTools.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleTools.map((tool) => (
            <span key={tool} className="max-w-full truncate rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-semibold text-slate-400">
              {tool}
            </span>
          ))}
          {remaining > 0 && (
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-semibold text-slate-500">
              +{remaining}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function SettingsIntegrations({
  overview,
  telegramStatus,
  telegramChecking,
  handleTelegramCheck,
  aiDiagnostics,
  aiChecking,
  handleAICheck,
  syncMap,
}: {
  overview: SettingsOverviewLike | null | undefined;
  telegramStatus: TelegramStatusResult | null;
  telegramChecking: boolean;
  handleTelegramCheck: () => void;
  aiDiagnostics: AiDiagnosticsResult | null;
  aiChecking: boolean;
  handleAICheck: () => void;
  syncMap: Record<string, SyncStatusView | undefined>;
}) {
  const integrations = overview?.integrations ?? {};
  const hasIntegrationFlag = (key: string) => Object.prototype.hasOwnProperty.call(integrations, key);
  const integrationBool = (key: string) => Boolean(integrations[key]);
  const integrationString = (key: string) => (typeof integrations[key] === "string" ? integrations[key] : undefined);
  const telegramWebhook = telegramStatus?.webhook;
  const telegramRuntimeLabel = telegramWebhook?.configured
    ? "webhook actief"
    : telegramStatus?.mode === "long_polling" || telegramWebhook?.longPollingWillBeActive
      ? "long polling"
      : "niet actief";
  const telegramSummary = telegramStatus
    ? telegramStatus.ok && telegramStatus.bot?.username
      ? `@${telegramStatus.bot.username} - ${telegramRuntimeLabel}`
      : telegramStatus.reason ?? telegramStatus.error ?? "Telegram niet actief"
    : "Bot, owner en polling live controleren";
  const hasEngineFlag = hasIntegrationFlag("startBackgroundEngine");
  const telegramRuntimeOK = Boolean(
    telegramStatus?.ok ||
      (integrationBool("telegramBot") && (!hasEngineFlag || integrationBool("startBackgroundEngine")))
  );
  const telegramRuntimeStatus = telegramStatus?.webhook?.configured
    ? "Webhook"
    : hasEngineFlag
      ? integrationBool("startBackgroundEngine")
        ? "Render"
        : "Uit"
      : "Onbekend";
  const telegramRuntimeTone: StatusPillTone = telegramRuntimeOK
    ? "ok"
    : hasEngineFlag
      ? "bad"
      : "neutral";
  const calendarDerivedOK = syncMap.schedule?.status === "success" || syncMap.personal?.status === "success";
  const calendarKnown = hasIntegrationFlag("googleCalendar");
  const calendarOK = calendarKnown ? integrationBool("googleCalendar") : calendarDerivedOK || integrationBool("googleOAuth");
  const calendarTone: StatusPillTone = calendarOK ? "ok" : calendarKnown ? "bad" : "neutral";
  const calendarLabel = calendarKnown
    ? calendarOK ? "OK" : "Uit"
    : calendarDerivedOK ? "Sync OK" : integrationBool("googleOAuth") ? "OAuth OK" : "Onbekend";
  const gmailKnown = hasIntegrationFlag("gmail");
  const gmailStatus = syncMap.gmail?.status;
  const gmailOK = gmailKnown ? integrationBool("gmail") : gmailStatus === "success";
  const gmailTone: StatusPillTone = gmailOK ? "ok" : gmailStatus === "pending" || integrationBool("googleOAuth") ? "warn" : gmailKnown ? "bad" : "neutral";
  const gmailLabel = gmailOK
    ? "OK"
    : gmailStatus === "pending"
      ? "Nog geen sync"
      : gmailKnown
        ? "Uit"
        : integrationBool("googleOAuth")
          ? "OAuth OK"
          : "Onbekend";
  const groqKnown = hasIntegrationFlag("groq");
  const groqOK = groqKnown ? integrationBool("groq") : false;
  const grokModel = integrationString("grokModel") ?? telegramStatus?.grokModel;
  const grokReasoningEffort = integrationString("grokReasoningEffort") ?? telegramStatus?.grokReasoningEffort;
  const grokChatCheck = aiDiagnostics?.checks.grokChat;
  const grokWebSearchCheck = aiDiagnostics?.checks.grokWebSearch;
  const groqVoiceCheck = aiDiagnostics?.checks.groqVoice;
  const grokLiveOK = grokChatCheck?.status === "success" && grokWebSearchCheck?.status === "success";
  const groqLiveOK = groqVoiceCheck?.status === "success";
  const aiSummary = aiDiagnostics
    ? `${aiDiagnostics.capabilities.agents} agents - ${aiDiagnostics.capabilities.tools} tools`
    : "Chat, web-search, voice en tool registry controleren";

  return (
    <Panel>
      <SectionHeader icon={SlidersHorizontal} label="Integraties" title="Koppelingen" sub="status zonder secrets" />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <IntegrationRow icon={Bot} label="Telegram bot" ok={integrationBool("telegramBot")} />
        <IntegrationRow icon={ShieldCheck} label="Telegram owner" ok={integrationBool("telegramOwner")} />
        <IntegrationRow
          icon={RadioTower}
          label="Telegram runtime"
          ok={telegramRuntimeOK}
          tone={telegramRuntimeTone}
          statusLabel={telegramRuntimeStatus}
        />
        <IntegrationRow
          icon={Bot}
          label="Grok"
          ok={aiDiagnostics ? grokLiveOK : integrationBool("grok")}
          tone={aiDiagnostics ? (grokLiveOK ? "ok" : "bad") : undefined}
          statusLabel={aiDiagnostics ? (grokLiveOK ? "Live" : "Check") : integrationBool("grok") && grokModel ? grokModel : undefined}
        />
        <IntegrationRow
          icon={Activity}
          label="Groq voice"
          ok={aiDiagnostics ? groqLiveOK : groqOK}
          tone={aiDiagnostics ? (groqLiveOK ? "ok" : "bad") : groqOK ? "ok" : groqKnown ? "warn" : "neutral"}
          statusLabel={aiDiagnostics ? (groqLiveOK ? "Live" : "Check") : groqOK ? "OK" : groqKnown ? "Optioneel" : "Onbekend"}
        />
        <IntegrationRow icon={Cloud} label="Google OAuth" ok={integrationBool("googleOAuth")} />
        <IntegrationRow icon={CalendarClock} label="Google Calendar" ok={calendarOK} tone={calendarTone} statusLabel={calendarLabel} />
        <IntegrationRow icon={Mail} label="Gmail" ok={gmailOK} tone={gmailTone} statusLabel={gmailLabel} />
        <IntegrationRow icon={Activity} label="Todoist" ok={integrationBool("todoist")} />
        <IntegrationRow
          icon={Network}
          label="Bridge queue"
          ok={integrationBool("queueLightCommands") ? integrationBool("localBridge") : true}
          statusLabel={integrationBool("queueLightCommands") ? "Queue" : "Direct"}
        />
      </div>
      <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Telegram beheer</p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{telegramSummary}</p>
          </div>
          <button
            type="button"
            onClick={handleTelegramCheck}
            disabled={telegramChecking}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 text-sm font-semibold text-sky-200 transition-colors hover:bg-sky-500/15 disabled:opacity-50 sm:w-auto"
          >
            {telegramChecking ? <Loader2 size={15} className="animate-spin" /> : <RadioTower size={15} />}
            Check
          </button>
        </div>
        {telegramStatus && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <MiniInfo label="Owner" value={telegramStatus.ownerConfigured ? telegramStatus.ownerChatSuffix ?? "Ingesteld" : "Ontbreekt"} />
            <MiniInfo label="Runtime" value={telegramRuntimeLabel} />
            <MiniInfo label="AI model" value={grokModel ? `${grokModel}${grokReasoningEffort ? ` / ${grokReasoningEffort}` : ""}` : "Onbekend"} />
            <MiniInfo label="Pending updates" value={String(telegramWebhook?.pendingUpdateCount ?? 0)} />
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">AI diagnose</p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{aiSummary}</p>
          </div>
          <button
            type="button"
            onClick={handleAICheck}
            disabled={aiChecking}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/15 disabled:opacity-50 sm:w-auto"
          >
            {aiChecking ? <Loader2 size={15} className="animate-spin" /> : <Brain size={15} />}
            Test AI
          </button>
        </div>

        <div className="mt-3 grid gap-2 lg:grid-cols-3">
          <DiagnosticTile icon={Brain} label="Grok chat" check={grokChatCheck} />
          <DiagnosticTile icon={Search} label="Web-search" check={grokWebSearchCheck} />
          <DiagnosticTile icon={Mic} label="Groq voice" check={groqVoiceCheck} />
        </div>

        {aiDiagnostics && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <MiniInfo label="Model" value={aiDiagnostics.config.grokModel} />
            <MiniInfo label="Reasoning" value={aiDiagnostics.config.grokReasoningEffort || "default"} />
            <MiniInfo label="Agents" value={String(aiDiagnostics.capabilities.agents)} />
            <MiniInfo label="Tools" value={`${aiDiagnostics.capabilities.tools} totaal`} />
          </div>
        )}

        {aiDiagnostics?.agents?.length ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <Wrench size={13} />
              Agent tool registry
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {aiDiagnostics.agents.map((agent) => (
                <AgentCapabilityCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
