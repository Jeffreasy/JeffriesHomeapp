"use client";

import { Activity, Bot, CalendarClock, Cloud, Loader2, Mail, Network, RadioTower, ShieldCheck, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { Panel, SectionHeader, StatusPill, type StatusPillTone } from "./SettingsCards";
import type { SyncStatusView, TelegramStatusResult } from "./SettingsUtils";
import { cn } from "@/lib/utils";

type IntegrationRowProps = {
  icon: LucideIcon;
  label: string;
  ok?: boolean;
  statusLabel?: string;
  tone?: StatusPillTone;
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
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 min-w-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconTone)}>
          <Icon size={15} />
        </div>
        <span className="truncate text-sm font-semibold text-slate-300">{label}</span>
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

export function SettingsIntegrations({
  overview,
  telegramStatus,
  telegramChecking,
  handleTelegramCheck,
  grokCapabilities,
  syncMap,
}: {
  overview: any;
  telegramStatus: TelegramStatusResult | null;
  telegramChecking: boolean;
  handleTelegramCheck: () => void;
  grokCapabilities: any;
  syncMap: Record<string, SyncStatusView | undefined>;
}) {
  const integrations = overview?.integrations ?? {};
  const hasIntegrationFlag = (key: string) => Object.prototype.hasOwnProperty.call(integrations, key);
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
      (integrations.telegramBot && (!hasEngineFlag || integrations.startBackgroundEngine))
  );
  const telegramRuntimeStatus = telegramStatus?.webhook?.configured
    ? "Webhook"
    : hasEngineFlag
      ? integrations.startBackgroundEngine
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
  const calendarOK = calendarKnown ? Boolean(integrations.googleCalendar) : calendarDerivedOK || Boolean(integrations.googleOAuth);
  const calendarTone: StatusPillTone = calendarOK ? "ok" : calendarKnown ? "bad" : "neutral";
  const calendarLabel = calendarKnown
    ? calendarOK ? "OK" : "Uit"
    : calendarDerivedOK ? "Sync OK" : integrations.googleOAuth ? "OAuth OK" : "Onbekend";
  const gmailKnown = hasIntegrationFlag("gmail");
  const gmailStatus = syncMap.gmail?.status;
  const gmailOK = gmailKnown ? Boolean(integrations.gmail) : gmailStatus === "success";
  const gmailTone: StatusPillTone = gmailOK ? "ok" : gmailStatus === "pending" || integrations.googleOAuth ? "warn" : gmailKnown ? "bad" : "neutral";
  const gmailLabel = gmailOK
    ? "OK"
    : gmailStatus === "pending"
      ? "Nog geen sync"
      : gmailKnown
        ? "Uit"
        : integrations.googleOAuth
          ? "OAuth OK"
          : "Onbekend";
  const groqKnown = hasIntegrationFlag("groq");
  const groqOK = groqKnown ? Boolean(integrations.groq) : false;

  return (
    <Panel>
      <SectionHeader icon={SlidersHorizontal} label="Integraties" title="Security status" sub="booleans, geen secrets" />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <IntegrationRow icon={Bot} label="Telegram bot" ok={integrations.telegramBot} />
        <IntegrationRow icon={ShieldCheck} label="Telegram owner" ok={integrations.telegramOwner} />
        <IntegrationRow
          icon={RadioTower}
          label="Telegram runtime"
          ok={telegramRuntimeOK}
          tone={telegramRuntimeTone}
          statusLabel={telegramRuntimeStatus}
        />
        <IntegrationRow icon={Bot} label="Grok" ok={integrations.grok} />
        <IntegrationRow
          icon={Activity}
          label="Groq voice"
          ok={groqOK}
          tone={groqOK ? "ok" : groqKnown ? "warn" : "neutral"}
          statusLabel={groqOK ? "OK" : groqKnown ? "Optioneel" : "Onbekend"}
        />
        <IntegrationRow icon={Cloud} label="Google OAuth" ok={integrations.googleOAuth} />
        <IntegrationRow icon={CalendarClock} label="Google Calendar" ok={calendarOK} tone={calendarTone} statusLabel={calendarLabel} />
        <IntegrationRow icon={Mail} label="Gmail" ok={gmailOK} tone={gmailTone} statusLabel={gmailLabel} />
        <IntegrationRow icon={Activity} label="Todoist" ok={integrations.todoist} />
        <IntegrationRow
          icon={Network}
          label="Bridge queue"
          ok={integrations.queueLightCommands ? integrations.localBridge : true}
          statusLabel={integrations.queueLightCommands ? "Queue" : "Direct"}
        />
      </div>
      <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Telegram beheer</p>
            <p className="mt-1 truncate text-xs text-slate-500">{telegramSummary}</p>
          </div>
          <button
            type="button"
            onClick={handleTelegramCheck}
            disabled={telegramChecking}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 text-sm font-semibold text-sky-200 transition-colors hover:bg-sky-500/15 disabled:opacity-50"
          >
            {telegramChecking ? <Loader2 size={15} className="animate-spin" /> : <RadioTower size={15} />}
            Check
          </button>
        </div>
        {telegramStatus && (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <MiniInfo label="Owner" value={telegramStatus.ownerConfigured ? telegramStatus.ownerChatSuffix ?? "Ingesteld" : "Ontbreekt"} />
            <MiniInfo label="Runtime" value={telegramRuntimeLabel} />
            <MiniInfo label="Pending updates" value={String(telegramWebhook?.pendingUpdateCount ?? 0)} />
          </div>
        )}
      </div>
      {grokCapabilities && (
        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 min-w-0">
          <p className="text-sm font-bold text-white">Grok capabilities</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {grokCapabilities.agents.map((agent: any) => (
              <div key={agent.id} className="rounded-lg border border-[var(--color-border)] bg-black/10 px-3 py-3">
                <p className="truncate text-sm font-semibold text-slate-200">
                  {agent.emoji} {agent.naam}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {agent.tools} tools - {agent.mutatingTools} mutaties - {agent.confirmationTools} met bevestiging
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
