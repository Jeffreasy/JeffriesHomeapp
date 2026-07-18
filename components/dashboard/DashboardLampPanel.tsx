"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import type { Device } from "@/lib/api";
import { getLightingSummary } from "@/lib/lighting";
import { LampCard } from "@/components/lamp/LampCard";
import {
  EmptyState,
  ErrorState,
  Panel,
  SectionHeader,
} from "@/components/dashboard/DashboardPrimitives";

const LazyLampDetailPanel = dynamic(
  () => import("@/components/lamp/LampDetailPanel").then((module) => module.LampDetailPanel),
  { ssr: false },
);

interface DashboardLampPanelProps {
  devices: Device[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  className?: string;
}

const HOME_LAMP_LIMIT = 4;

/**
 * Dashboard composer around the canonical LampCard. Query, command, room and
 * scene state remain owned by the shared lighting domain.
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
  const visibleDevices = devices.slice(0, HOME_LAMP_LIMIT);
  const remainingDevices = Math.max(0, devices.length - visibleDevices.length);

  return (
    <>
      <section
        aria-label="Individuele lampbediening"
        aria-busy={loading}
        className={className}
        data-testid="dashboard-lamp-panel"
      >
        <Panel className="overflow-hidden">
          <SectionHeader
            icon="lights"
            label="Direct bedienen"
            title="Je lampen"
            href="/lampen"
            actionLabel="Alle lampen"
            compact
          />

          {devices.length > 0 && (
            <p className="-mt-1 mb-3 text-xs text-[var(--color-text-muted)]" aria-live="polite">
              {summary.on} aan / {summary.online} online / {summary.total} gekoppeld
            </p>
          )}

          {loading && devices.length === 0 ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {Array.from({ length: HOME_LAMP_LIMIT }).map((_, index) => (
                <div
                  key={index}
                  className="h-[72px] animate-pulse rounded-2xl border border-[var(--color-border)] bg-white/[0.03]"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : failed && devices.length === 0 ? (
            <ErrorState
              title="Lampen konden niet geladen worden"
              text="De devicelijst is niet opgehaald - bediening is tijdelijk niet mogelijk."
              onRetry={onRetry}
            />
          ) : devices.length === 0 ? (
            <EmptyState
              icon="lights"
              title="Geen lampen gekoppeld"
              text="Koppel je eerste lamp via Instellingen om hem hier direct te bedienen."
            />
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {visibleDevices.map((device) => (
                  <li key={device.id} className="min-w-0">
                    <LampCard
                      device={device}
                      compact
                      onSelect={(selected) => setSelectedDeviceId(selected.id)}
                    />
                  </li>
                ))}
              </ul>

              {remainingDevices > 0 && (
                <Link
                  href="/lampen"
                  className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-white/[0.025] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  Bedien nog {remainingDevices} {remainingDevices === 1 ? "lamp" : "lampen"}
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
            </>
          )}
        </Panel>
      </section>

      {selectedDevice && (
        <LazyLampDetailPanel
          device={selectedDevice}
          onClose={() => setSelectedDeviceId(null)}
        />
      )}
    </>
  );
}
