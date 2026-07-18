"use client";

import { ArrowRight, Calendar, Clock3, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { PersonalEvent } from "@/hooks/usePersonalEvents";
import type { useSchedule } from "@/hooks/useSchedule";
import { Surface } from "@/components/ui/Surface";
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
      className="group flex min-h-[76px] min-w-0 items-center gap-3 bg-[var(--color-surface)] p-3 transition-colors hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] sm:min-h-[124px] sm:block sm:p-4"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${classes.border} ${classes.surface}`}>
        <Icon size={16} className={classes.icon} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 sm:mt-3">
        <p className="text-micro font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {label}
        </p>
        <p className={`mt-0.5 truncate text-sm font-bold ${classes.text}`}>{value}</p>
        <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{sub}</p>
      </div>
      <ArrowRight
        size={14}
        aria-hidden="true"
        className="shrink-0 text-[var(--color-text-subtle)] transition-colors group-hover:text-[var(--color-text)] sm:float-right sm:-mt-16"
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
    <Surface padding="none" className="overflow-hidden">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <p className="text-micro font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Vandaag
        </p>
        <h2 className="mt-0.5 text-base font-bold text-[var(--color-text)]">Werk, agenda en finance</h2>
      </div>

      <div className="grid gap-px bg-[var(--color-border)] sm:grid-cols-3">
        <OverviewCell
          icon={Clock3}
          tone={scheduleFailed ? "danger" : "info"}
          label="Volgende dienst"
          value={dienstValue}
          sub={dienstSub}
          href="/rooster"
        />
        <OverviewCell
          icon={Calendar}
          tone={appointmentsFailed ? "danger" : hardConflicts > 0 ? "danger" : conflicts > 0 ? "warning" : "info"}
          label="Volgende afspraak"
          value={eventValue}
          sub={eventSub}
          href="/agenda"
        />
        <OverviewCell
          icon={Wallet}
          tone={financeFailed ? "danger" : financeLoading ? "neutral" : "success"}
          label={nettoLabel}
          value={nettoValue}
          sub={nettoSub}
          href="/finance"
        />
      </div>
    </Surface>
  );
}
