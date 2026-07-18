"use client";

import { ArrowRight, Calendar, Clock3, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { PersonalEvent } from "@/hooks/usePersonalEvents";
import type { useSchedule } from "@/hooks/useSchedule";
import { Panel } from "./DashboardPrimitives";
import {
  formatEventMeta,
  formatRelativeDateLabel,
  type Tone,
  toneClasses,
} from "./DashboardUtils";

interface OverviewCellProps {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  sub: string;
  href: string;
}

function OverviewCell({
  icon: Icon,
  tone,
  label,
  value,
  sub,
  href,
}: OverviewCellProps) {
  const classes = toneClasses[tone];

  return (
    <Link
      href={href}
      className="group flex min-h-[76px] min-w-0 items-center gap-3 bg-[var(--color-surface)] p-3 transition-colors hover:bg-[var(--color-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-400/70 sm:min-h-[124px] sm:block sm:p-4"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${classes.border} ${classes.surface}`}>
        <Icon size={16} className={classes.icon} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 sm:mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {label}
        </p>
        <p className={`mt-0.5 truncate text-sm font-bold ${classes.text}`}>{value}</p>
        <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{sub}</p>
      </div>
      <ArrowRight
        size={14}
        aria-hidden="true"
        className="shrink-0 text-slate-700 transition-colors group-hover:text-slate-300 sm:float-right sm:-mt-16"
      />
    </Link>
  );
}

interface OverviewPanelProps {
  nextDienst: ReturnType<typeof useSchedule>["nextDienst"];
  nextEvent: PersonalEvent | null;
  nettoLabel: string;
  nettoValue: string;
  nettoSub: string;
  conflicts: number;
  hardConflicts: number;
  todayIso?: string;
  appointmentsLoading?: boolean;
  appointmentsFailed?: boolean;
  scheduleLoading?: boolean;
  scheduleFailed?: boolean;
  financeLoading?: boolean;
  financeFailed?: boolean;
}

export function OverviewPanel({
  nextDienst,
  nextEvent,
  nettoLabel,
  nettoValue,
  nettoSub,
  conflicts,
  hardConflicts,
  todayIso,
  appointmentsLoading,
  appointmentsFailed,
  scheduleLoading,
  scheduleFailed,
  financeLoading,
  financeFailed,
}: OverviewPanelProps) {
  const conflictLabel =
    hardConflicts > 0
      ? `${hardConflicts} harde overlap`
      : `${conflicts} aandachtspunt(en)`;

  const dienstValue = scheduleLoading
    ? "Laden..."
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
    ? "Laden..."
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

  return (
    <Panel padding="none" className="overflow-hidden">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Vandaag
        </p>
        <h2 className="mt-0.5 text-base font-bold text-white">Werk, agenda en finance</h2>
      </div>

      <div className="grid gap-px bg-[var(--color-border)] sm:grid-cols-3">
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
          tone={financeFailed ? "rose" : financeLoading ? "slate" : "green"}
          label={nettoLabel}
          value={nettoValue}
          sub={nettoSub}
          href="/finance"
        />
      </div>
    </Panel>
  );
}
