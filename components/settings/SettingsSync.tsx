"use client";

import { Activity, CalendarClock, Cloud, Loader2, Mail, RefreshCw } from "lucide-react";
import { Panel, SectionHeader } from "./SettingsCards";
import { formatDateTime, toneClasses, type SyncStatusView, type SyncTarget, type Tone } from "./SettingsUtils";
import { cn } from "@/lib/utils";

function syncTone(status?: SyncStatusView): Tone {
  if (!status) return "slate";
  if (status.status === "failed") return "rose";
  if (status.status === "missing_config") return "rose";
  if (status.status === "running") return "amber";
  if (status.status === "pending") return "amber";
  if (status.status === "disabled") return "slate";
  return "green";
}

function syncTimestamp(status?: SyncStatusView) {
  if (!status) return "Nog geen run";
  return status.status === "failed"
    ? formatDateTime(status.lastErrorAt ?? status.finishedAt)
    : formatDateTime(status.lastSuccessAt ?? status.finishedAt ?? status.startedAt);
}

function SyncStatusRow({ label, status }: { label: string; status?: SyncStatusView }) {
  const tone = syncTone(status);
  const classes = toneClasses[tone];
  const value = status?.status === "running"
    ? "Bezig"
    : status?.status === "failed"
      ? "Mislukt"
      : status?.status === "missing_config"
        ? "Mist config"
        : status?.status === "pending"
          ? "Nog geen sync"
          : status?.status === "disabled"
            ? "Uit"
      : status?.status === "success"
        ? "Succes"
        : "Geen run";

  return (
    <div className="flex min-h-20 items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 min-w-0">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", classes.surface)}>
        {status?.status === "running" ? (
          <Loader2 size={14} className={cn("animate-spin", classes.icon)} />
        ) : (
          <Activity size={14} className={classes.icon} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-200">{label}</p>
          <span className={cn("text-xs font-bold", classes.text)}>{value}</span>
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">{status?.lastError ?? syncTimestamp(status)}</p>
      </div>
    </div>
  );
}

function SyncButton({
  icon: Icon,
  title,
  meta,
  loading,
  disabled,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  meta: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[96px] min-w-0 flex-col items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-55 sm:min-h-24 sm:flex-row sm:gap-3 sm:p-4"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
        {loading ? <Loader2 size={17} className="animate-spin" /> : <Icon size={17} />}
      </div>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-white">{title}</span>
        <span className="mt-1 block line-clamp-2 text-xs leading-4 text-slate-500 sm:leading-5">{meta}</span>
      </span>
    </button>
  );
}

export function SettingsSync({
  syncing,
  overview,
  syncMap,
  handleCalendarSync,
  handleGmailSync,
  handleAllSync,
}: {
  syncing: SyncTarget | null;
  overview: any;
  syncMap: Record<string, SyncStatusView | undefined>;
  handleCalendarSync: () => void;
  handleGmailSync: () => void;
  handleAllSync: () => void;
}) {
  return (
    <Panel>
      <SectionHeader
        icon={RefreshCw}
        label="Sync"
        title="Databronnen"
        sub={syncing ? "bezig" : "gereed"}
      />
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <SyncButton
          icon={CalendarClock}
          title="Agenda"
          meta={`${overview?.schedule.upcoming ?? 0} diensten, ${overview?.personalEvents?.upcoming ?? 0} afspraken`}
          disabled={syncing !== null}
          loading={syncing === "calendar"}
          onClick={handleCalendarSync}
        />
        <SyncButton
          icon={Mail}
          title="Gmail"
          meta={`${overview?.email.total ?? 0} metadata records`}
          disabled={syncing !== null}
          loading={syncing === "gmail"}
          onClick={handleGmailSync}
        />
        <SyncButton
          icon={Cloud}
          title="Alles"
          meta="Agenda, rooster en mail"
          disabled={syncing !== null}
          loading={syncing === "all"}
          onClick={handleAllSync}
        />
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        <SyncStatusRow label="Rooster" status={syncMap.schedule} />
        <SyncStatusRow label="Persoonlijk" status={syncMap.personal} />
        <SyncStatusRow label="Gmail" status={syncMap.gmail} />
      </div>
    </Panel>
  );
}
