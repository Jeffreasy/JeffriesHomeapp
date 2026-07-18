"use client";

import { Activity, CalendarClock, Cloud, Loader2, Mail, RefreshCw } from "lucide-react";
import { SectionHeader } from "./SettingsCards";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime, toneClasses, type SyncStatusView, type SyncTarget, type Tone } from "./SettingsUtils";
import { cn } from "@/lib/utils";
import type { SettingsOverview } from "@/lib/api";

function syncTone(status?: SyncStatusView): Tone {
  if (!status) return "neutral";
  if (status.status === "failed") return "danger";
  if (status.status === "missing_config") return "danger";
  if (status.status === "running") return "info";
  if (status.status === "pending") return "warning";
  if (status.status === "disabled") return "neutral";
  return "success";
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
    <Surface tone="subtle" radius="sm" padding="sm" className="flex min-h-20 items-center gap-3">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", classes.surface)}>
        {status?.status === "running" ? (
          <Loader2 size={14} className={cn("animate-spin motion-reduce:animate-none", classes.icon)} />
        ) : (
          <Activity size={14} className={classes.icon} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-[var(--color-text)]">{label}</p>
          <Badge tone={tone} size="sm">{value}</Badge>
        </div>
        {/* lastError is sticky on the backend status object — only show it while
            the sync is actually in "failed" state (L10), otherwise a long-fixed
            error keeps scaring the user next to a green "Succes" badge. */}
        <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
          {status?.status === "failed" && status.lastError ? status.lastError : syncTimestamp(status)}
        </p>
      </div>
    </Surface>
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
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="secondary"
      fullWidth
      className="h-auto min-h-24 min-w-0 flex-col items-start justify-start gap-2 p-3 text-left sm:flex-row sm:gap-3 sm:p-4"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-warning-subtle)] text-[var(--color-warning)]">
        {loading ? <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Icon size={17} aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[var(--color-text)]">{title}</span>
        <span className="mt-1 block line-clamp-2 text-xs font-normal leading-4 text-[var(--color-text-muted)] sm:leading-5">{meta}</span>
      </span>
    </Button>
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
  overview: SettingsOverview | null | undefined;
  syncMap: Record<string, SyncStatusView | undefined>;
  handleCalendarSync: () => void;
  handleGmailSync: () => void;
  handleAllSync: () => void;
}) {
  return (
    <Surface radius="sm">
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
    </Surface>
  );
}
