"use client";

import { Activity, AlertTriangle, CheckCircle2, Gauge, Hourglass, Lightbulb, Network, PlugZap, RadioTower, Smartphone } from "lucide-react";
import { EmptyState, SectionHeader, StatusMetric, StatusPill, StatusRow } from "./SettingsCards";
import { Surface } from "@/components/ui/Surface";
import { SurfaceHeader } from "@/components/ui/SurfaceHeader";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "./SettingsUtils";
import type { PendingAIAction, SettingsOverview, SettingsOverviewDevices } from "@/lib/api";

const SENSITIVE_ARG_KEY_PATTERN = /token|secret|password|apikey|authorization/i;

// action.args is an arbitrary Record<string, unknown> populated from AI
// tool-call arguments — rendering it verbatim in the UI could leak a secret
// embedded in some future tool's parameters. Redact any key (at any depth)
// that looks sensitive before display.
function redactArgs(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactArgs);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, v]) => [
        key,
        SENSITIVE_ARG_KEY_PATTERN.test(key) ? "***" : redactArgs(v),
      ])
    );
  }
  return value;
}

export function SettingsRuntime({
  overview,
  overviewDevices,
  deviceHealth,
  localApiHost,
}: {
  overview: SettingsOverview | null | undefined;
  overviewDevices: SettingsOverviewDevices;
  deviceHealth: number;
  localApiHost: string;
}) {
  return (
    <Surface radius="sm" className="overflow-hidden p-0">
      <div className="min-w-0 border-b border-[var(--color-border)] px-4 py-3 sm:px-6 sm:py-4">
        <SurfaceHeader
          eyebrow="Overzicht"
          title="Homeapp runtime"
          meta={localApiHost}
          action={<StatusPill ok={Boolean(overview?.integrations.backend ?? overview?.integrations.convex)} label="Backend" />}
          compact
          className="mb-0"
        />
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-px bg-[var(--color-border)] xl:grid-cols-4">
        <StatusMetric
          icon={Lightbulb}
          label="Lampen"
          value={overviewDevices.total === 0 ? "Geen" : String(overviewDevices.total)}
          sub={`${overviewDevices.online}/${overviewDevices.total} online`}
          tone={overviewDevices.offline > 0 ? "warning" : overviewDevices.total > 0 ? "success" : "neutral"}
        />
        <StatusMetric
          icon={Gauge}
          label="Gezondheid"
          value={overviewDevices.total === 0 ? "-" : `${deviceHealth}%`}
          sub={`${overviewDevices.on} actief, ${overviewDevices.offline} offline`}
          tone={deviceHealth === 100 ? "success" : overviewDevices.total > 0 ? "warning" : "neutral"}
        />
        <StatusMetric
          icon={PlugZap}
          label="Automations"
          value={`${overview?.automations.active ?? 0}/${overview?.automations.total ?? 0}`}
          sub="actief versus totaal"
          tone={(overview?.automations.active ?? 0) > 0 ? "info" : "neutral"}
        />
        <StatusMetric
          icon={Network}
          label="Command queue"
          value={String(overview?.commands.pending ?? 0)}
          sub={`${overview?.commands.processing ?? 0} bezig, ${overview?.commands.failed ?? 0} mislukt`}
          tone={(overview?.commands.failed ?? 0) > 0 ? "danger" : (overview?.commands.pending ?? 0) > 0 ? "warning" : "success"}
        />
      </div>
    </Surface>
  );
}

export function SettingsPendingActions({
  pendingActions,
  pendingBusyId,
  handleCancelPending,
  handleConfirmPending,
}: {
  pendingActions: PendingAIAction[];
  pendingBusyId: string | null;
  handleCancelPending: (id: string) => void;
  handleConfirmPending: (id: string) => void;
}) {
  return (
    <Surface radius="sm">
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
            <Surface key={action.id} tone="warning" radius="sm" padding="sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-[var(--color-warning)]">{action.code}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{action.summary}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {action.agentId} - {action.toolName} - verloopt {formatDateTime(action.expiresAt)}
                  </p>
                  {action.args && Object.keys(action.args).length > 0 && (
                    <details className="mt-2 min-w-0">
                      <summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                        Toon exacte parameters
                      </summary>
                      <pre className="mt-1 max-h-48 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2 text-micro text-[var(--color-text-muted)]">
                        {JSON.stringify(redactArgs(action.args), null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCancelPending(action.id)}
                    disabled={pendingBusyId === action.id}
                  >
                    Annuleer
                  </Button>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleConfirmPending(action.id)}
                    loading={pendingBusyId === action.id}
                    loadingLabel="Uitvoeren…"
                  >
                    Uitvoeren
                  </Button>
                </div>
              </div>
            </Surface>
          ))
        )}
      </div>
    </Surface>
  );
}

export function SettingsBridge({ overview }: { overview: SettingsOverview | null | undefined }) {
  return (
    <Surface radius="sm">
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
          tone={overview?.bridge?.online ? "success" : "danger"}
        />
        <StatusRow
          icon={Activity}
          label="Commands"
          value={`${overview?.bridge?.commandsPending ?? 0} wachtend / ${overview?.bridge?.commandsProcessing ?? 0} bezig / ${overview?.bridge?.commandsFailed ?? 0} mislukt`}
          tone={(overview?.bridge?.commandsFailed ?? 0) > 0 ? "danger" : (overview?.bridge?.commandsPending ?? 0) > 0 || (overview?.bridge?.commandsProcessing ?? 0) > 0 ? "warning" : "neutral"}
        />
        <StatusRow
          icon={AlertTriangle}
          label="Laatste fout"
          value={overview?.bridge?.lastError ?? "Geen fout gemeld"}
          tone={overview?.bridge?.lastError ? "danger" : "success"}
        />
      </div>
    </Surface>
  );
}
