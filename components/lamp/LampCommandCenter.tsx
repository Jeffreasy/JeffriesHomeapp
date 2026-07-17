"use client";

import { Lightbulb, Power, Sun, Wifi } from "lucide-react";
import { Panel, StatusMetric } from "./LampCards";

interface LampCommandCenterProps {
  devices: number;
  online: number;
  offline: number;
  on: number;
  avgBrightness: number;
  loading: boolean;
}

export function LampCommandCenter({
  devices,
  online,
  offline,
  on,
  avgBrightness,
  loading,
}: LampCommandCenterProps) {
  const onlinePercent = devices > 0 ? Math.round((online / devices) * 100) : 0;

  return (
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Overzicht
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Woningverlichting</h2>
          <p className="mt-1 text-sm text-slate-500">
            {loading && devices === 0
              ? "Lampen worden geladen…"
              : devices === 0
                ? "Nog geen lampen gekoppeld"
                : `${on} aan, ${offline} offline`}
          </p>
        </div>
      </div>

      <div className="grid gap-px bg-[var(--color-border)] sm:grid-cols-2 xl:grid-cols-4">
        <StatusMetric
          icon={Lightbulb}
          label="Totaal"
          value={loading && devices === 0 ? "…" : devices === 0 ? "Geen" : String(devices)}
          sub="gekoppelde lampen"
          tone="slate"
        />
        <StatusMetric
          icon={Wifi}
          label="Online"
          value={loading && devices === 0 ? "…" : `${onlinePercent}%`}
          sub={loading && devices === 0 ? "status ophalen" : `${online}/${devices} bereikbaar`}
          tone={offline > 0 ? "amber" : "green"}
        />
        <StatusMetric
          icon={Power}
          label="Actief"
          value={loading && devices === 0 ? "…" : devices === 0 ? "Geen" : `${on} aan`}
          sub={on > 0 ? "lampen geven licht" : "alles staat uit"}
          tone={on > 0 ? "amber" : "blue"}
        />
        <StatusMetric
          icon={Sun}
          label="Helderheid"
          value={on > 0 ? `${avgBrightness}%` : "-"}
          sub={on > 0 ? "gemiddeld actief" : "geen actieve lamp"}
          tone={on > 0 ? "green" : "slate"}
        />
      </div>
    </Panel>
  );
}
