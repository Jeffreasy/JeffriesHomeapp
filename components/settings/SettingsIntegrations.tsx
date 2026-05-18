"use client";

import { Activity, Bot, Cloud, Loader2, Lock, RadioTower, ShieldCheck, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { Panel, SectionHeader, StatusPill } from "./SettingsCards";
import type { TelegramStatusResult } from "./SettingsUtils";
import { cn } from "@/lib/utils";

function IntegrationRow({ icon: Icon, label, ok }: { icon: LucideIcon; label: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 min-w-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", ok ? "bg-emerald-500/10" : "bg-rose-500/10")}>
          <Icon size={15} className={ok ? "text-emerald-300" : "text-rose-300"} />
        </div>
        <span className="truncate text-sm font-semibold text-slate-300">{label}</span>
      </div>
      <StatusPill ok={Boolean(ok)} label={ok ? "OK" : "Ontbreekt"} />
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
}: {
  overview: any;
  telegramStatus: TelegramStatusResult | null;
  telegramChecking: boolean;
  handleTelegramCheck: () => void;
  grokCapabilities: any;
}) {
  return (
    <Panel>
      <SectionHeader icon={SlidersHorizontal} label="Integraties" title="Security status" sub="booleans, geen secrets" />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <IntegrationRow icon={Bot} label="Telegram bot" ok={overview?.integrations.telegramBot} />
        <IntegrationRow icon={ShieldCheck} label="Telegram owner" ok={overview?.integrations.telegramOwner} />
        <IntegrationRow icon={Lock} label="Webhook secret" ok={overview?.integrations.telegramWebhookSecret} />
        <IntegrationRow icon={Bot} label="Grok" ok={overview?.integrations.grok} />
        <IntegrationRow icon={Cloud} label="Google OAuth" ok={overview?.integrations.googleOAuth} />
        <IntegrationRow icon={Activity} label="Todoist" ok={overview?.integrations.todoist} />
      </div>
      <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Telegram beheer</p>
            <p className="mt-1 text-xs text-slate-500">
              {telegramStatus
                ? `@${telegramStatus.bot.username} - webhook ${telegramStatus.webhook.configured ? "actief" : "uit"}`
                : "Bot en webhook live controleren"}
            </p>
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
            <MiniInfo label="Owner" value={telegramStatus.ownerConfigured ? `*${telegramStatus.ownerChatSuffix}` : "Ontbreekt"} />
            <MiniInfo label="Webhook host" value={telegramStatus.webhook.urlHost ?? "Geen webhook"} />
            <MiniInfo label="Pending updates" value={String(telegramStatus.webhook.pendingUpdateCount)} />
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
