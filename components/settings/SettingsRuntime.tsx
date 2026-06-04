"use client";

import { Activity, AlertTriangle, CheckCircle2, Gauge, Hourglass, Lightbulb, Loader2, Network, PlugZap, RadioTower, Smartphone } from "lucide-react";
import { EmptyState, Panel, SectionHeader, StatusMetric, StatusPill, StatusRow } from "./SettingsCards";
import { formatDateTime } from "./SettingsUtils";

export function SettingsRuntime({
  overview,
  overviewDevices,
  deviceHealth,
  localApiHost,
}: {
  overview: any;
  overviewDevices: any;
  deviceHealth: number;
  localApiHost: string;
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="min-w-0 border-b border-[var(--color-border)] px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-slate-500">Overzicht</p>
            <h2 className="mt-0.5 text-lg font-bold text-white sm:mt-1 sm:text-xl">Homeapp runtime</h2>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{localApiHost}</p>
          </div>
          <StatusPill ok={Boolean(overview?.integrations.backend ?? overview?.integrations.convex)} label="Backend" />
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-px bg-[var(--color-border)] xl:grid-cols-4">
        <StatusMetric
          icon={Lightbulb}
          label="Lampen"
          value={overviewDevices.total === 0 ? "Geen" : String(overviewDevices.total)}
          sub={`${overviewDevices.online}/${overviewDevices.total} online`}
          tone={overviewDevices.offline > 0 ? "amber" : overviewDevices.total > 0 ? "green" : "slate"}
        />
        <StatusMetric
          icon={Gauge}
          label="Gezondheid"
          value={overviewDevices.total === 0 ? "-" : `${deviceHealth}%`}
          sub={`${overviewDevices.on} actief, ${overviewDevices.offline} offline`}
          tone={deviceHealth === 100 ? "green" : overviewDevices.total > 0 ? "amber" : "slate"}
        />
        <StatusMetric
          icon={PlugZap}
          label="Automations"
          value={`${overview?.automations.active ?? 0}/${overview?.automations.total ?? 0}`}
          sub="actief versus totaal"
          tone={(overview?.automations.active ?? 0) > 0 ? "sky" : "slate"}
        />
        <StatusMetric
          icon={Network}
          label="Command queue"
          value={String(overview?.commands.pending ?? 0)}
          sub={`${overview?.commands.processing ?? 0} bezig, ${overview?.commands.failed ?? 0} mislukt`}
          tone={(overview?.commands.failed ?? 0) > 0 ? "rose" : (overview?.commands.pending ?? 0) > 0 ? "amber" : "green"}
        />
      </div>
    </Panel>
  );
}

export function SettingsPendingActions({
  pendingActions,
  pendingBusyId,
  handleCancelPending,
  handleConfirmPending,
}: {
  pendingActions: any[];
  pendingBusyId: string | null;
  handleCancelPending: (id: string) => void;
  handleConfirmPending: (id: string) => void;
}) {
  return (
    <Panel>
      <SectionHeader
        icon={Hourglass}
        label="AI safety"
        title="Openstaande bevestigingen"
        sub={`${pendingActions.length} actie(s)`}
      />
      <div className="mt-4 space-y-2">
        {pendingActions.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Geen openstaande Grok-acties" />
        ) : (
          pendingActions.map((action) => (
            <div key={action._id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 min-w-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-amber-200">{action.code}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{action.summary}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {action.agentId} - {action.toolName} - verloopt {formatDateTime(action.expiresAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCancelPending(action._id)}
                    disabled={pendingBusyId === action._id}
                    className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-bold text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
                  >
                    Annuleer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmPending(action._id)}
                    disabled={pendingBusyId === action._id}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-500/15 disabled:opacity-50"
                  >
                    {pendingBusyId === action._id && <Loader2 size={13} className="animate-spin" />}
                    Uitvoeren
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

export function SettingsBridge({ overview }: { overview: any }) {
  return (
    <Panel>
      <SectionHeader
        icon={RadioTower}
        label="Bridge"
        title="Lokale bridge"
        sub={overview?.bridge?.lastSeenAt ? formatDateTime(overview.bridge.lastSeenAt) : "geen heartbeat"}
      />
      <div className="mt-4 space-y-3">
        <StatusRow
          icon={Smartphone}
          label="Status"
          value={overview?.bridge ? (overview.bridge.online ? overview.bridge.status : "offline") : "Geen heartbeat"}
          tone={overview?.bridge?.online ? "green" : "rose"}
        />
        <StatusRow
          icon={Activity}
          label="Commands"
          value={`${overview?.bridge?.commandsPending ?? 0} wachtend / ${overview?.bridge?.commandsProcessing ?? 0} bezig / ${overview?.bridge?.commandsFailed ?? 0} mislukt`}
          tone={(overview?.bridge?.commandsFailed ?? 0) > 0 ? "amber" : "slate"}
        />
        <StatusRow
          icon={AlertTriangle}
          label="Laatste fout"
          value={overview?.bridge?.lastError ?? "Geen fout gemeld"}
          tone={overview?.bridge?.lastError ? "rose" : "green"}
        />
      </div>
    </Panel>
  );
}
