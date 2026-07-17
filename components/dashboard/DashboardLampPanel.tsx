"use client";

import { useState } from "react";
import type { Device } from "@/lib/api";
import { getLightingSummary } from "@/lib/lighting";
import { LampCard } from "@/components/lamp/LampCard";
import { LampDetailPanel } from "@/components/lamp/LampDetailPanel";
import {
  EmptyState,
  ErrorState,
  Panel,
  SectionHeader,
} from "@/components/dashboard/DashboardPrimitives";

interface DashboardLampPanelProps {
  devices: Device[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  className?: string;
}

/**
 * Thin dashboard composer around the canonical lamp components.
 * It deliberately owns no query, command, scene or room logic.
 */
export function DashboardLampPanel({
  devices,
  loading,
  failed,
  onRetry,
  className,
}: DashboardLampPanelProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const selectedDevice =
    devices.find((device) => device.id === selectedDeviceId) ?? null;
  const summary = getLightingSummary(devices);

  return (
    <>
      <section
        aria-label="Individuele lampbediening"
        aria-busy={loading}
        className={className}
        data-testid="dashboard-lamp-panel"
      >
        <Panel>
          <SectionHeader
            icon="lights"
            label="Direct bedienen"
            title="Je lampen"
            href="/lampen"
            actionLabel="Kamers & scènes"
            compact
          />

          {devices.length > 0 && (
            <p className="-mt-1 mb-3 text-xs text-slate-500">
              {summary.online}/{summary.total} online · {summary.on} aan
            </p>
          )}

          {loading && devices.length === 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[76px] animate-pulse rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)]"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : failed && devices.length === 0 ? (
            <ErrorState
              title="Lampen konden niet geladen worden"
              text="De devicelijst is niet opgehaald — bediening is tijdelijk niet mogelijk."
              onRetry={onRetry}
            />
          ) : devices.length === 0 ? (
            <EmptyState
              icon="lights"
              title="Geen lampen gekoppeld"
              text="Koppel je eerste lamp via Instellingen om hem hier direct te bedienen."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {devices.map((device) => (
                <li key={device.id} className="min-w-0">
                  <LampCard
                    device={device}
                    onSelect={(selected) => setSelectedDeviceId(selected.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <LampDetailPanel
        device={selectedDevice}
        onClose={() => setSelectedDeviceId(null)}
      />
    </>
  );
}
