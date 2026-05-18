"use client";

import { ArrowRight, Calendar, Clock3, Lightbulb, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { type Tone, toneClasses, formatShortDate, formatEventMeta } from "./DashboardUtils";
import { Panel } from "./DashboardPrimitives";
import type { useSchedule } from "@/hooks/useSchedule";
import type { PersonalEvent } from "@/hooks/usePersonalEvents";

export function OverviewCell({
  icon: Icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  sub: string;
}) {
  const classes = toneClasses[tone];

  return (
    <div className="min-h-[132px] min-w-0 bg-[#0f0f16]/95 p-4 sm:p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${classes.border} ${classes.surface}`}>
        <Icon size={16} className={classes.icon} />
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-base font-bold ${classes.text}`}>{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
    </div>
  );
}

export function OverviewPanel({
  nextDienst,
  nextEvent,
  nettoLabel,
  nettoValue,
  nettoSub,
  lampsOn,
  lampsTotal,
  devicesOnline,
  conflicts,
  hardConflicts,
}: {
  nextDienst: ReturnType<typeof useSchedule>["nextDienst"];
  nextEvent: PersonalEvent | null;
  nettoLabel: string;
  nettoValue: string;
  nettoSub: string;
  lampsOn: number;
  lampsTotal: number;
  devicesOnline: number;
  conflicts: number;
  hardConflicts: number;
}) {
  const conflictLabel = hardConflicts > 0 ? `${hardConflicts} harde overlap` : `${conflicts} aandachtspunt(en)`;

  return (
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-white/6 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Control center
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">Vandaag in een oogopslag</h2>
          </div>
          <Link
            href="/rooster"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white/[0.03] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
          >
            Agenda openen
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCell
          icon={Clock3}
          tone="indigo"
          label="Volgende dienst"
          value={nextDienst ? `${nextDienst.startTijd} - ${nextDienst.eindTijd}` : "Geen dienst"}
          sub={nextDienst ? `${nextDienst.dag}, ${formatShortDate(nextDienst.startDatum)}` : "Rooster rustig"}
        />
        <OverviewCell
          icon={Calendar}
          tone={hardConflicts > 0 ? "rose" : conflicts > 0 ? "amber" : "blue"}
          label="Volgende afspraak"
          value={nextEvent?.titel ?? "Geen afspraak"}
          sub={nextEvent ? formatEventMeta(nextEvent) : conflictLabel}
        />
        <OverviewCell
          icon={Wallet}
          tone="green"
          label={nettoLabel}
          value={nettoValue}
          sub={nettoSub}
        />
        <OverviewCell
          icon={Lightbulb}
          tone={lampsOn > 0 ? "amber" : "slate"}
          label="Woning"
          value={lampsTotal === 0 ? "Geen lampen" : `${lampsOn}/${lampsTotal} aan`}
          sub={`${devicesOnline} online`}
        />
      </div>
    </Panel>
  );
}
