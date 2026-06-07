"use client";

import {
  Activity,
  Bot,
  Brain,
  CalendarClock,
  Cloud,
  Gauge,
  ListChecks,
  LockKeyhole,
  Loader2,
  Mail,
  Mic,
  Network,
  RadioTower,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Panel, SectionHeader, StatusPill, type StatusPillTone } from "./SettingsCards";
import type { AiAgentCapability, AiDiagnosticCheck, AiDiagnosticsRecommendation, AiDiagnosticsResult, SyncStatusView, TelegramStatusResult } from "./SettingsUtils";
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

function ToolChip({ label, tone = "live" }: { label: string; tone?: "live" | "pending" }) {
  return (
    <span
      className={cn(
        "max-w-full truncate rounded-md border px-2 py-1 text-[11px] font-semibold",
        tone === "live" && "border-white/10 bg-white/[0.03] text-slate-400",
        tone === "pending" && "border-amber-500/20 bg-amber-500/10 text-amber-200"
      )}
    >
      {label}
    </span>
  );
}

function RecommendationCard({ item }: { item: AiDiagnosticsRecommendation }) {
  const isHigh = item.priority === "hoog";

  return (
    <div className="min-w-0 rounded-lg border border-[var(--color-border)] bg-black/10 px-3 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            isHigh ? "bg-amber-500/10 text-amber-300" : "bg-sky-500/10 text-sky-300"
          )}
        >
          {isHigh ? <ShieldAlert size={15} /> : <ListChecks size={15} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">{item.title}</p>
            <StatusPill ok={!isHigh} tone={isHigh ? "warn" : "neutral"} label={item.priority} />
          </div>
          <p className="mt-1 line-clamp-3 text-xs leading-4 text-slate-500">{item.detail}</p>
        </div>
      </div>
    </div>
  );
}

function ToolGovernancePanel({ diagnostics }: { diagnostics: AiDiagnosticsResult }) {
  const pendingPolicyTools = diagnostics.capabilities.pendingPolicyTools ?? diagnostics.governance?.policyOnlyTools ?? 0;
  const pendingConfirmationTools = diagnostics.capabilities.pendingConfirmationTools ?? 0;
  const policyTools = diagnostics.capabilities.policyTools ?? diagnostics.governance?.policyTools ?? diagnostics.capabilities.tools;
  const liveTools = diagnostics.governance?.liveTools ?? diagnostics.capabilities.tools;
  const coverage = diagnostics.governance?.coveragePercent;

  return (
    <div className="mt-3 rounded-lg border border-[var(--color-border)] bg-black/10 p-3">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
        <Gauge size={13} />
        Tool governance
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MiniInfo label="Live tools" value={`${liveTools} uitvoerbaar`} />
        <MiniInfo label="Policy tools" value={`${policyTools} totaal`} />
        <MiniInfo label="Wachtlaag" value={`${pendingPolicyTools} policy-only`} />
        <MiniInfo label="Confirmatie" value={`${pendingConfirmationTools} beschermd`} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusPill ok={pendingPolicyTools === 0} tone={pendingPolicyTools === 0 ? "ok" : "warn"} label={pendingPolicyTools === 0 ? "Alles live" : `${pendingPolicyTools} wacht`} />
        <StatusPill ok={diagnostics.capabilities.mutatingTools > 0} tone={diagnostics.capabilities.mutatingTools > 0 ? "ok" : "neutral"} label={`${diagnostics.capabilities.mutatingTools} live mutaties`} />
        <StatusPill ok={pendingConfirmationTools > 0} tone={pendingConfirmationTools > 0 ? "warn" : "neutral"} label={coverage == null ? "Coverage onbekend" : `${coverage}% live`} />
        <StatusPill ok={Boolean(diagnostics.capabilities.readOnlyTools)} tone="neutral" label={`${diagnostics.capabilities.readOnlyTools ?? diagnostics.capabilities.tools} read-only`} />
      </div>
    </div>
  );
}

function AgentCapabilityCard({ agent }: { agent: AiAgentCapability }) {
  const liveToolNames = agent.liveToolNames ?? agent.toolNames;
  const pendingToolNames = agent.pendingToolNames ?? [];
  const visibleTools = liveToolNames.slice(0, 3);
  const visiblePendingTools = pendingToolNames.slice(0, 2);
  const remaining = Math.max(0, liveToolNames.length - visibleTools.length);
  const pendingRemaining = Math.max(0, pendingToolNames.length - visiblePendingTools.length);
  const pendingTools = agent.pendingTools ?? pendingToolNames.length;

  return (
    <div className="min-w-0 rounded-lg border border-[var(--color-border)] bg-black/10 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-200">
            {agent.emoji} {agent.naam}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {agent.tools} live - {agent.mutatingTools} mutaties
            {pendingTools > 0 ? ` - ${pendingTools} wacht` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusPill ok={agent.tools > 0} tone={agent.tools > 0 ? "ok" : "neutral"} label={`${agent.tools} live`} />
          {pendingTools > 0 && <StatusPill ok={false} tone="warn" label={`${pendingTools} wacht`} />}
        </div>
      </div>
      {visibleTools.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleTools.map((tool) => (
            <ToolChip key={tool} label={tool} />
          ))}
          {remaining > 0 && (
            <ToolChip label={`+${remaining}`} />
          )}
        </div>
      )}
      {visiblePendingTools.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="flex h-6 items-center gap-1 text-[11px] font-semibold text-slate-500">
            <LockKeyhole size={12} />
            beschermd
          </span>
          {visiblePendingTools.map((tool) => (
            <ToolChip key={tool} label={tool} tone="pending" />
          ))}
          {pendingRemaining > 0 && <ToolChip label={`+${pendingRemaining}`} tone="pending" />}
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
  const googleOAuthCheck = aiDiagnostics?.checks.googleOAuth;
  const gmailSyncCheck = aiDiagnostics?.checks.gmailSync;
  const calendarSyncCheck = aiDiagnostics?.checks.calendarSync;
  const grokLiveOK = grokChatCheck?.status === "success" && grokWebSearchCheck?.status === "success";
  const groqLiveOK = groqVoiceCheck?.status === "success";
  const googleOAuthOK = aiDiagnostics ? googleOAuthCheck?.status === "success" : integrationBool("googleOAuth");
  const calendarLiveOK = aiDiagnostics ? calendarSyncCheck?.status === "success" : calendarOK;
  const gmailLiveOK = aiDiagnostics ? gmailSyncCheck?.status === "success" : gmailOK;
  const aiSummary = aiDiagnostics
    ? `${aiDiagnostics.capabilities.agents} agents - ${aiDiagnostics.capabilities.tools} tools - Google sync live`
    : "Chat, web-search, voice, Google sync en tool registry controleren";

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
          tone={aiDiagnostics ? checkTone(groqVoiceCheck) : groqOK ? "ok" : groqKnown ? "warn" : "neutral"}
          statusLabel={aiDiagnostics ? checkLabel(groqVoiceCheck) : groqOK ? "OK" : groqKnown ? "Optioneel" : "Onbekend"}
        />
        <IntegrationRow
          icon={Cloud}
          label="Google OAuth"
          ok={googleOAuthOK}
          tone={aiDiagnostics ? checkTone(googleOAuthCheck) : undefined}
          statusLabel={aiDiagnostics ? checkLabel(googleOAuthCheck) : undefined}
        />
        <IntegrationRow
          icon={CalendarClock}
          label="Google Calendar"
          ok={calendarLiveOK}
          tone={aiDiagnostics ? checkTone(calendarSyncCheck) : calendarTone}
          statusLabel={aiDiagnostics ? checkLabel(calendarSyncCheck) : calendarLabel}
        />
        <IntegrationRow
          icon={Mail}
          label="Gmail"
          ok={gmailLiveOK}
          tone={aiDiagnostics ? checkTone(gmailSyncCheck) : gmailTone}
          statusLabel={aiDiagnostics ? checkLabel(gmailSyncCheck) : gmailLabel}
        />
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

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <DiagnosticTile icon={Brain} label="Grok chat" check={grokChatCheck} />
          <DiagnosticTile icon={Search} label="Web-search" check={grokWebSearchCheck} />
          <DiagnosticTile icon={Mic} label="Groq voice" check={groqVoiceCheck} />
          <DiagnosticTile icon={Cloud} label="Google OAuth" check={googleOAuthCheck} />
          <DiagnosticTile icon={Mail} label="Gmail sync" check={gmailSyncCheck} />
          <DiagnosticTile icon={CalendarClock} label="Calendar sync" check={calendarSyncCheck} />
        </div>

        {aiDiagnostics && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <MiniInfo label="Model" value={aiDiagnostics.config.grokModel} />
            <MiniInfo label="Reasoning" value={aiDiagnostics.config.grokReasoningEffort || "default"} />
            <MiniInfo label="Agents" value={String(aiDiagnostics.capabilities.agents)} />
            <MiniInfo label="Tools" value={`${aiDiagnostics.capabilities.tools} totaal`} />
          </div>
        )}

        {aiDiagnostics && <ToolGovernancePanel diagnostics={aiDiagnostics} />}

        {aiDiagnostics?.recommendations?.length ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
              <ShieldCheck size={13} />
              Volgende optimalisaties
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              {aiDiagnostics.recommendations.map((item) => (
                <RecommendationCard key={`${item.priority}-${item.title}`} item={item} />
              ))}
            </div>
          </div>
        ) : null}

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
