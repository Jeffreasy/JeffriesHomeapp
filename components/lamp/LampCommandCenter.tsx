"use client";

import { Lightbulb, Power, Sun, Wifi } from "lucide-react";
import { Panel, StatusMetric } from "./LampCards";

export function LampCommandCenter({
  devices,
  online,
  offline,
  on,
  avgBrightness,
  allOn,
  onToggleAll,
}: {
  devices: number;
  online: number;
  offline: number;
  on: number;
  avgBrightness: number;
  allOn: boolean;
  onToggleAll: () => void;
}) {
  const onlinePercent = devices > 0 ? Math.round((online / devices) * 100) : 0;

  return (
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-white/6 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Command center
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">Woningverlichting</h2>
            <p className="mt-1 text-sm text-slate-500">
              {devices === 0 ? "Nog geen lampen gekoppeld" : `${on} aan, ${offline} offline`}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleAll}
            disabled={online === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:border-[var(--color-border)] disabled:bg-white/[0.03] disabled:text-slate-600"
          >
            <Power size={16} />
            {allOn ? "Alles uit" : "Alles aan"}
          </button>
        </div>
      </div>

      <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 xl:grid-cols-4">
        <StatusMetric
          icon={Lightbulb}
          label="Totaal"
          value={devices === 0 ? "Geen" : String(devices)}
          sub="gekoppelde lampen"
          tone="slate"
        />
        <StatusMetric
          icon={Wifi}
          label="Online"
          value={`${onlinePercent}%`}
          sub={`${online}/${devices} bereikbaar`}
          tone={offline > 0 ? "amber" : "green"}
        />
        <StatusMetric
          icon={Power}
          label="Actief"
          value={devices === 0 ? "Geen" : `${on} aan`}
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
