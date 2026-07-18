"use client";

import { motion } from "framer-motion";
import { type DienstRow, getEndKey, getStartKey } from "@/lib/schedule";
import { getDisplayEndDate, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { type ConflictInfo } from "@/lib/conflictDetection";
import { cn } from "@/lib/utils";
import { surfaceVariants } from "@/components/ui/Surface";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { AppIconName } from "@/lib/symbols";
import { hoursValue, formatShortDate } from "./RoosterUtils";
import { conflictPresentation, shiftPresentation } from "./schedulePresentation";

/** Datumnotatie in nl-NL ("12 mrt") — gelijk aan de rest van de app i.p.v. de
 *  eigen numerieke DD-MM(-YYYY)-variant die hier afweek (audit L datumdrift). */
function formatDate(iso: string): string {
  return formatShortDate(iso);
}

/** Bereken menselijke relatieve datum op basis van een stabiele Amsterdam-datum. */
function getRelativeDay(iso: string, todayIso?: string | null): string | null {
  if (!todayIso) return null;
  const today = new Date(`${todayIso}T12:00:00`);
  const target = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(today.getTime()) || Number.isNaN(target.getTime())) return null;
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "vandaag";
  if (diff === 1) return "morgen";
  if (diff === 2) return "overmorgen";
  if (diff < 0)  return `${Math.abs(diff)}d geleden`;
  return `over ${diff} dagen`;
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

interface NextShiftCardProps {
  dienst:     DienstRow | null;
  compact?:   boolean;
  /** Cold-load flag — toont een skeleton i.p.v. "Geen aankomende diensten" (audit K3). */
  loading?:   boolean;
  onImport?:  () => void;
  afspraken?: PersonalEvent[];
  conflictMap?: Map<string, ConflictInfo>;
  todayIso?: string | null;
}

export function NextShiftCard({ dienst, compact, loading = false, onImport, afspraken = [], conflictMap, todayIso }: NextShiftCardProps) {
  if (!dienst && loading) {
    return (
      <Skeleton
        className={cn(
          surfaceVariants({ padding: "none", radius: "md" }),
          compact ? "h-[76px]" : "h-[120px]",
        )}
      />
    );
  }

  if (!dienst) {
    return (
      <div className={cn(
        surfaceVariants({ padding: "none", radius: "md" }),
        "flex items-center justify-center",
        compact ? "px-4 py-3" : "px-6 py-8"
      )}>
        <div className="text-center">
          <p className="text-sm text-[var(--color-text-muted)]">Geen aankomende diensten</p>
          {onImport && (
            <Button size="sm" variant="primary" onClick={onImport} className="mt-2">
              <AppIcon name="calendar" tone="accent" size="xs" />
              Agenda synchroniseren
            </Button>
          )}
        </div>
      </div>
    );
  }

  const colors      = shiftPresentation(dienst.shiftType);
  const isBezig      = dienst.status === "Bezig";
  const relativeDay  = getRelativeDay(dienst.startDatum, todayIso);
  const relativeDate = relativeDay
    ? `${capitalize(relativeDay)} (${formatDate(dienst.startDatum)})`
    : formatDate(dienst.startDatum);
  const isToday      = relativeDay === "vandaag";
  const isTomorrow   = relativeDay === "morgen";
  const isZondag     = dienst.dag === "Zondag";
  const isZaterdag   = dienst.dag === "Zaterdag";

  /** Resolve conflict display — uses conflictMap (accurate) when available; inline fallback otherwise. */
  const resolveConflict = (evt: PersonalEvent) => {
    const ci = conflictMap?.get(evt.eventId);
    const isHeledag = evt.heledag || !evt.startTijd;
    // Fallback vergelijkt volledige datum+tijd-sleutels (zoals lib/conflictDetection),
    // zodat nachtdiensten over de dagnachtgrens correct matchen (audit K9) —
    // kale HH:MM-strings faalden daar.
    const overlapsShift = () => {
      if (isHeledag || !evt.eindTijd) return false;
      const evStart = `${evt.startDatum} ${evt.startTijd}`;
      const evEnd = `${getDisplayEndDate(evt)} ${evt.eindTijd}`;
      return evStart < getEndKey(dienst) && getStartKey(dienst) < evEnd;
    };
    const level = ci?.level
      ?? (isHeledag ? "soft"
        : overlapsShift() ? "hard"
        : "info");
    const presentation = conflictPresentation(level);
    return {
      presentation,
      textClass: presentation.text,
      iconTone: presentation.tone,
      icon:      (level === "hard" ? "warning" : isHeledag ? "calendar" : "info") as AppIconName,
      timeLabel: isHeledag ? "hele dag" : `${evt.startTijd}–${evt.eindTijd}`,
      suffix:    level === "hard" ? " — overlapt!" : "",
    };
  };

  // ── Compact card (dashboard) ──────────────────────────────────────────────────
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("rounded-xl border px-4 py-3", colors.surface, colors.border)}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-0.5 inline-flex items-center gap-1.5 text-micro font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              <AppIcon
                name={isBezig ? "statusActive" : "time"}
                tone={isBezig ? "success" : "accent"}
                size="xs"
                iconClassName={isBezig ? "fill-current" : undefined}
              />
              {isBezig ? "Nu bezig" : "Volgende dienst"}
            </p>
            <p className={cn("text-sm font-bold", colors.text)}>
              {dienst.dag} · {formatDate(dienst.startDatum)}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {dienst.startTijd}–{dienst.eindTijd} · {dienst.shiftType} · {hoursValue(dienst.duur)}u
            </p>
            {!isBezig && (
              <p className={cn(
                "mt-0.5 inline-flex items-center gap-1 text-micro font-semibold",
                isToday || isTomorrow ? "text-[var(--color-primary-hover)]" : "text-[var(--color-text-muted)]"
              )}>
                <AppIcon
                  name={isToday ? "statusActive" : "calendar"}
                  tone={isToday || isTomorrow ? "accent" : "neutral"}
                  size="xs"
                  iconClassName={isToday ? "fill-current" : undefined}
                />
              {isToday ? "Vandaag" : relativeDay ? capitalize(relativeDay) : formatDate(dienst.startDatum)}
              </p>
            )}
            {isZondag && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-micro font-bold text-[var(--color-primary-hover)]">
                <AppIcon name="money" tone="accent" size="xs" /> +ORT toeslag
              </p>
            )}
            {isZaterdag && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-micro font-medium text-[var(--color-primary-hover)]">
                <AppIcon name="calendar" tone="accent" size="xs" /> Weekend
              </p>
            )}
            {afspraken.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {afspraken.map(evt => {
                  const c = resolveConflict(evt);
                  return (
                    <p key={evt.eventId} className={`inline-flex items-center gap-1 text-micro font-medium ${c.textClass}`}>
                      <AppIcon name={c.icon} tone={c.iconTone} size="xs" />
                      {evt.titel} · {c.timeLabel}{c.suffix}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", colors.surface, colors.border, colors.text)}>
            <AppIcon name="time" size="md" iconClassName="text-current" />
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Full card ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("overflow-hidden rounded-2xl border", colors.surface, colors.border)}
    >
      {/* Status banner */}
      <div className={cn("flex items-center gap-2 border-b px-4 py-1.5 text-xs font-bold uppercase tracking-widest", colors.surface, colors.border, colors.text)}>
        <span className="inline-flex items-center gap-1.5">
          <AppIcon
            name={isBezig ? "statusActive" : "time"}
            tone={isBezig ? "success" : "accent"}
            size="xs"
            iconClassName={isBezig ? "fill-current" : "text-current"}
          />
          {isBezig ? "Bezig" : "Volgende dienst"}
        </span>
        {isZondag && (
          <span className="ml-2 inline-flex items-center gap-1 text-[var(--color-primary-hover)]">
            <AppIcon name="money" tone="accent" size="xs" /> +ORT
          </span>
        )}
        {isZaterdag && <span className="ml-2 text-[var(--color-primary-hover)]">weekend</span>}
        <span className="ml-auto font-normal normal-case tracking-normal opacity-70">
          {dienst.shiftType}
          {!isBezig && relativeDay && (
            <span className="ml-2 font-semibold">
              {" "}· {relativeDay}
            </span>
          )}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        {/* Date + time */}
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[var(--color-text)] sm:text-2xl">{dienst.dag}</p>
            <p className="text-sm text-[var(--color-text-muted)]">{relativeDate}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className={cn("text-xl font-bold sm:text-2xl", colors.text)}>
              {dienst.startTijd}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">tot {dienst.eindTijd}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-sm">
          {dienst.locatie && (
            <div className="flex items-center gap-2 text-[var(--color-text)]">
              <AppIcon name="location" tone="neutral" size="xs" />
              <span className="truncate">{dienst.locatie}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[var(--color-text)]">
            <AppIcon name="timer" tone="neutral" size="xs" />
            <span>{hoursValue(dienst.duur)} uur · Team {dienst.team || "?"}</span>
          </div>
        </div>

        {/* Afspraken overlap waarschuwing */}
        {afspraken.length > 0 && (
          <div className="mt-3 space-y-1">
            {afspraken.map(evt => {
              const c = resolveConflict(evt);
              return (
                <div
                  key={evt.eventId}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
                    c.presentation.surface,
                    c.presentation.border,
                    c.presentation.text,
                  )}
                >
                  <AppIcon name={c.icon} tone={c.iconTone} size="xs" iconClassName="text-current" />
                  <span className="min-w-0 truncate">{evt.titel} · {c.timeLabel}{c.suffix}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
