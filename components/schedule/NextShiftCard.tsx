"use client";

import { motion } from "framer-motion";
import { type DienstRow, getEndKey, getStartKey, shiftTypeColor } from "@/lib/schedule";
import { getDisplayEndDate, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { type ConflictInfo } from "@/lib/conflictDetection";
import { cn } from "@/lib/utils";
import { AppIcon, type SymbolTone } from "@/components/ui/AppIcon";
import type { AppIconName } from "@/lib/symbols";
import { hoursValue } from "./RoosterUtils";

/** Format ISO date string (YYYY-MM-DD) → DD-MM-YYYY veilig. */
function formatDate(iso: string, style: "compact" | "full" = "full"): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return style === "compact" ? `${day}-${month}` : `${day}-${month}-${year}`;
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
      <div
        aria-hidden="true"
        className={cn(
          "glass min-w-0 animate-pulse rounded-xl border border-[var(--color-border)]",
          compact ? "h-[76px]" : "h-[120px]",
        )}
      />
    );
  }

  if (!dienst) {
    return (
      <div className={cn(
        "glass rounded-xl border border-[var(--color-border)] flex items-center justify-center min-w-0",
        compact ? "px-4 py-3" : "px-6 py-8"
      )}>
        <div className="text-center">
          <p className="text-sm text-slate-500">Geen aankomende diensten</p>
          {onImport && (
            <button
              onClick={onImport}
              className="mt-2 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 mx-auto"
            >
              <AppIcon name="upload" tone="amber" size="xs" /> Rooster importeren
            </button>
          )}
        </div>
      </div>
    );
  }

  const colors      = shiftTypeColor(dienst.shiftType);
  const isBezig      = dienst.status === "Bezig";
  const relativeDay  = getRelativeDay(dienst.startDatum, todayIso);
  const relativeDate = relativeDay
    ? `${capitalize(relativeDay)} (${formatDate(dienst.startDatum, "full")})`
    : formatDate(dienst.startDatum, "full");
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
    return {
      textClass: level === "hard" ? "text-red-400" : level === "soft" ? "text-amber-400" : "text-blue-400",
      iconTone: (level === "hard" ? "red" : level === "soft" ? "amber" : "blue") as SymbolTone,
      textColor: level === "hard" ? "#ef4444" : level === "soft" ? "#f59e0b" : "#60a5fa",
      bg:     level === "hard" ? "rgba(239,68,68,0.10)" : level === "soft" ? "rgba(245,158,11,0.10)" : "rgba(96,165,250,0.08)",
      border: level === "hard" ? "rgba(239,68,68,0.25)" : level === "soft" ? "rgba(245,158,11,0.25)" : "rgba(96,165,250,0.20)",
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
        className={cn("rounded-xl px-4 py-3 border border-[var(--color-border)]", colors.bg)}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-0.5 inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
              <AppIcon
                name={isBezig ? "statusActive" : "time"}
                tone={isBezig ? "green" : "amber"}
                size="xs"
                iconClassName={isBezig ? "fill-current" : undefined}
              />
              {isBezig ? "Nu bezig" : "Volgende dienst"}
            </p>
            <p className={cn("text-sm font-bold", colors.text)}>
              {dienst.dag} · {formatDate(dienst.startDatum, "compact")}
            </p>
            <p className="text-xs text-slate-400">
              {dienst.startTijd}–{dienst.eindTijd} · {dienst.shiftType} · {hoursValue(dienst.duur)}u
            </p>
            {!isBezig && (
              <p className={cn(
                "mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold",
                isToday ? "text-green-400" : isTomorrow ? "text-amber-400" : "text-slate-500"
              )}>
                <AppIcon
                  name={isToday ? "statusActive" : "calendar"}
                  tone={isToday ? "green" : isTomorrow ? "amber" : "slate"}
                  size="xs"
                  iconClassName={isToday ? "fill-current" : undefined}
                />
              {isToday ? "Vandaag" : relativeDay ? capitalize(relativeDay) : formatDate(dienst.startDatum, "compact")}
              </p>
            )}
            {isZondag && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-yellow-400">
                <AppIcon name="money" tone="yellow" size="xs" /> +ORT toeslag
              </p>
            )}
            {isZaterdag && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-yellow-600">
                <AppIcon name="calendar" tone="yellow" size="xs" /> Weekend
              </p>
            )}
            {afspraken.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {afspraken.map(evt => {
                  const c = resolveConflict(evt);
                  return (
                    <p key={evt.eventId} className={`inline-flex items-center gap-1 text-[10px] font-medium ${c.textClass}`}>
                      <AppIcon name={c.icon} tone={c.iconTone} size="xs" />
                      {evt.titel} · {c.timeLabel}{c.suffix}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: colors.accent + "22", border: `1px solid ${colors.accent}44` }}
          >
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
      className="rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${colors.accent}18 0%, ${colors.accent}08 100%)`,
        border: `1px solid ${colors.accent}30`,
      }}
    >
      {/* Status banner */}
      <div
        className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
        style={{ background: colors.accent + "20", color: colors.accent }}
      >
        <span className="inline-flex items-center gap-1.5">
          <AppIcon
            name={isBezig ? "statusActive" : "time"}
            tone={isBezig ? "green" : "amber"}
            size="xs"
            iconClassName={isBezig ? "fill-current" : "text-current"}
          />
          {isBezig ? "Bezig" : "Volgende dienst"}
        </span>
        {isZondag && (
          <span className="ml-2 inline-flex items-center gap-1 text-yellow-400">
            <AppIcon name="money" tone="yellow" size="xs" /> +ORT
          </span>
        )}
        {isZaterdag && <span className="ml-2 text-yellow-600">weekend</span>}
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
            <p className="truncate text-xl font-bold text-white sm:text-2xl">{dienst.dag}</p>
            <p className="text-sm text-slate-400">{relativeDate}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-bold sm:text-2xl" style={{ color: colors.accent }}>
              {dienst.startTijd}
            </p>
            <p className="text-sm text-slate-400">tot {dienst.eindTijd}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-sm">
          {dienst.locatie && (
            <div className="flex items-center gap-2 text-slate-300">
              <AppIcon name="location" tone="slate" size="xs" />
              <span className="truncate">{dienst.locatie}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-300">
            <AppIcon name="timer" tone="slate" size="xs" />
            <span>{hoursValue(dienst.duur)} uur · Team {dienst.team || "?"}</span>
          </div>
        </div>

        {/* Afspraken overlap waarschuwing */}
        {afspraken.length > 0 && (
          <div className="mt-3 space-y-1">
            {afspraken.map(evt => {
              const c = resolveConflict(evt);
              return (
                <div key={evt.eventId}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl"
                  style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.textColor }}
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
