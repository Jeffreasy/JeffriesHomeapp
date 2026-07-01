"use client";

import { ArrowRight, Calendar, Clock3, Lightbulb, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { type Tone, toneClasses, formatEventMeta, formatRelativeDateLabel } from "./DashboardUtils";
import { Panel } from "./DashboardPrimitives";
import type { useSchedule } from "@/hooks/useSchedule";
import type { PersonalEvent } from "@/hooks/usePersonalEvents";

export function OverviewCell({
  icon: Icon,
  tone,
  label,
  value,
  sub,
  href,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  sub: string;
  /** H3: de cellen zijn echte links naar hun module — met hover/focus-affordance. */
  href: string;
}) {
  const classes = toneClasses[tone];

  return (
    <Link
      href={href}
      className="group block min-h-[116px] min-w-0 bg-[#0f0f16]/95 p-3 transition-colors hover:bg-[#16161f] focus-visible:bg-[#16161f] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-400/70 sm:min-h-[132px] sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl border sm:h-9 sm:w-9 ${classes.border} ${classes.surface}`}>
          <Icon size={16} className={classes.icon} />
        </div>
        <ArrowRight
          size={14}
          aria-hidden="true"
          className="mt-1 text-slate-700 transition-colors group-hover:text-slate-300 group-focus-visible:text-slate-300"
        />
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:mt-4">{label}</p>
      <p className={`mt-1 line-clamp-2 break-words text-sm font-bold leading-tight sm:text-base ${classes.text}`}>{value}</p>
      <p className="mt-1 line-clamp-2 break-words text-[11px] leading-4 text-slate-500 sm:text-xs">{sub}</p>
    </Link>
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
  todayIso,
  appointmentsLoading,
  appointmentsFailed,
  scheduleLoading,
  scheduleFailed,
  devicesLoading,
  devicesFailed,
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
  todayIso?: string;
  appointmentsLoading?: boolean;
  appointmentsFailed?: boolean;
  scheduleLoading?: boolean;
  scheduleFailed?: boolean;
  devicesLoading?: boolean;
  devicesFailed?: boolean;
}) {
  const conflictLabel = hardConflicts > 0 ? `${hardConflicts} harde overlap` : `${conflicts} aandachtspunt(en)`;

  // H5/DEEL2#1: laden ≠ leeg ≠ mislukt — elke cel kent zijn drie toestanden.
  const dienstValue = scheduleLoading
    ? "Laden…"
    : scheduleFailed
      ? "Kon niet laden"
      : nextDienst
        ? `${nextDienst.startTijd} - ${nextDienst.eindTijd}`
        : "Geen dienst";
  const dienstSub = scheduleLoading
    ? "Rooster wordt geladen"
    : scheduleFailed
      ? "Rooster niet beschikbaar"
      : nextDienst
        ? formatRelativeDateLabel(nextDienst.startDatum, todayIso)
        : "Rooster rustig";

  const eventValue = appointmentsLoading
    ? "Laden…"
    : appointmentsFailed
      ? "Kon niet laden"
      : nextEvent?.titel ?? "Geen afspraak";
  const eventSub = appointmentsLoading
    ? "Google Calendar laden"
    : appointmentsFailed
      ? "Agenda niet beschikbaar"
      : nextEvent
        ? formatEventMeta(nextEvent, todayIso)
        : conflicts > 0
          ? conflictLabel
          : "Agenda rustig";

  const lampValue = devicesLoading
    ? "Laden…"
    : devicesFailed
      ? "Kon niet laden"
      : lampsTotal === 0
        ? "Geen lampen"
        : `${lampsOn}/${lampsTotal} aan`;
  const lampSub = devicesLoading
    ? "Lampen worden geladen"
    : devicesFailed
      ? "Lampen niet beschikbaar"
      : `${devicesOnline} online`;

  return (
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Control center
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">Vandaag in een oogopslag</h2>
          </div>
          <Link
            href="/agenda"
            className="btn btn--ghost btn--sm w-full justify-center sm:w-auto"
          >
            Agenda
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-[var(--color-border)] xl:grid-cols-4">
        <OverviewCell
          icon={Clock3}
          tone={scheduleFailed ? "rose" : "indigo"}
          label="Volgende dienst"
          value={dienstValue}
          sub={dienstSub}
          href="/rooster"
        />
        <OverviewCell
          icon={Calendar}
          tone={appointmentsFailed ? "rose" : hardConflicts > 0 ? "rose" : conflicts > 0 ? "amber" : "blue"}
          label="Volgende afspraak"
          value={eventValue}
          sub={eventSub}
          href="/agenda"
        />
        <OverviewCell
          icon={Wallet}
          tone="green"
          label={nettoLabel}
          value={nettoValue}
          sub={nettoSub}
          href="/finance"
        />
        <OverviewCell
          icon={Lightbulb}
          tone={devicesFailed ? "rose" : lampsOn > 0 ? "amber" : "slate"}
          label="Woning"
          value={lampValue}
          sub={lampSub}
          href="/lampen"
        />
      </div>
    </Panel>
  );
}
