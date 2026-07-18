"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { type DienstRow } from "@/lib/schedule";
import { type PersonalEvent } from "@/hooks/usePersonalEvents";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { hoursValue } from "./RoosterUtils";
import {
  scheduleToneVars,
  shiftPresentation,
  teamPresentation
} from "./schedulePresentation";

interface DienstItemProps {
  dienst:     DienstRow;
  isToday?:   boolean;
  afspraken?: PersonalEvent[]; // personal events on same day
  compact?:   boolean;
}

export function DienstItem({ dienst, isToday, afspraken = [], compact = false }: DienstItemProps) {
  const shift  = shiftPresentation(dienst.shiftType);
  const team   = dienst.team ? teamPresentation(dienst.team) : null;
  const isZondag   = dienst.dag === "Zondag";
  const isZaterdag = dienst.dag === "Zaterdag";
  const isWeekend  = isZondag || isZaterdag;
  const accent = shift;
  const accentVars = scheduleToneVars(accent.tone);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-l-2 border-[var(--color-border)] border-l-[var(--schedule-accent)] bg-[var(--color-surface-muted)] p-3"
        style={accentVars}
      >
        <div className="flex items-start gap-3">
          <div className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-active)] px-2 py-2 text-center">
            <span className={`text-sm font-black leading-none ${isWeekend ? "text-[var(--color-primary-hover)]" : "text-[var(--color-text)]"}`}>
              {dienst.startDatum.slice(8)}
            </span>
            <span className={`mt-1 text-micro font-semibold uppercase tracking-wide ${isWeekend ? "text-[var(--color-primary-hover)]" : "text-[var(--color-text-muted)]"}`}>
              {dienst.dag?.slice(0, 2)}
            </span>
            {isZondag && <span className="mt-1 text-micro font-bold text-[var(--color-primary-hover)]">ORT</span>}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "shrink-0 rounded-md border px-2 py-1 text-micro font-semibold uppercase tracking-wide",
                  shift.surface,
                  shift.border,
                  shift.text,
                )}
              >
                {dienst.shiftType}
              </span>
              {team && dienst.team && (
                <span
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-1 text-micro font-semibold uppercase tracking-wide",
                    team.surface,
                    team.border,
                    team.text,
                  )}
                >
                  {dienst.team}
                </span>
              )}
              {isToday && (
                <span className="ml-auto rounded-md border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] px-2 py-1 text-micro font-black uppercase tracking-widest text-[var(--color-primary-hover)]">
                  Vandaag
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-sm font-semibold tracking-tight text-[var(--color-text)]">
                {dienst.startTijd}<span className="mx-1 text-[var(--color-text-subtle)]">–</span>{dienst.eindTijd}
              </span>
              <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-micro font-bold tracking-wider text-[var(--color-text-muted)]">
                {hoursValue(dienst.duur)}u
              </span>
            </div>

            {dienst.locatie && (
              <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-micro font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                <MapPin size={10} className="shrink-0" />
                {dienst.locatie}
              </p>
            )}

            {afspraken.length > 0 && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-md border border-[var(--color-info-border)] bg-[var(--color-info-subtle)] px-2 py-1 text-micro font-semibold text-[var(--color-info)]">
                <CalendarDays size={11} />
                {afspraken.length} {afspraken.length === 1 ? "afspraak" : "afspraken"} op deze dag
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Volle variant in dezelfde zachte huid als de compacte kaart (audit F14):
  // rounded-xl, var(--color-border), font-semibold i.p.v. font-black caps en
  // AA-leesbare labelkleuren. Layout (kolommen/badges) ongewijzigd.
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 2 }}
      className={cn(
        "flex items-center gap-4 rounded-xl border border-l-2 border-[var(--color-border)] border-l-[var(--schedule-accent)] px-4 py-3 transition-[background-color,border-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-standard)]",
        isToday ? shift.surface : "bg-[var(--color-surface-muted)]",
      )}
      style={accentVars}
    >
      {/* Date */}
      <div className="w-12 text-center flex-shrink-0">
        <p className={`text-sm font-bold ${isWeekend ? "text-[var(--color-primary-hover)]" : "text-[var(--color-text)]"}`}>{dienst.startDatum.slice(8)}</p>
        <p className={`text-micro font-semibold uppercase tracking-wide ${isWeekend ? "text-[var(--color-primary-hover)]" : "text-[var(--color-text-muted)]"}`}>{dienst.dag?.slice(0, 2)}</p>
        {isZondag && (
          <p className="text-micro font-bold tracking-wide text-[var(--color-primary-hover)] mt-1">+ORT</p>
        )}
      </div>

      {/* Shift type badge */}
      <div
        className={cn(
          "w-16 flex-shrink-0 rounded-md border py-1 text-center text-micro font-semibold uppercase tracking-wide",
          shift.surface,
          shift.border,
          shift.text,
        )}
      >
        {dienst.shiftType}
      </div>

      {/* Time + locatie */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--color-text)] font-mono tracking-tight">
          {dienst.startTijd}<span className="text-[var(--color-text-subtle)] mx-1">–</span>{dienst.eindTijd}
          <span className="text-micro text-[var(--color-text-muted)] font-semibold tracking-wider ml-2">· {hoursValue(dienst.duur)}u</span>
        </p>
        {dienst.locatie && (
          <p className="text-micro text-[var(--color-text-muted)] truncate flex items-center gap-1 mt-1 font-semibold uppercase tracking-wider">
            <MapPin size={10} className="flex-shrink-0" />
            {dienst.locatie}
          </p>
        )}
      </div>

      {/* Team badge — color-coded */}
      {team && dienst.team && (
        <span
          className={cn(
            "flex-shrink-0 rounded-md border px-2 py-1 text-micro font-semibold uppercase tracking-wide",
            team.surface,
            team.border,
            team.text,
          )}
        >
          {dienst.team}
        </span>
      )}

      {/* Afspraken badge */}
      {afspraken.length > 0 && (
        <span
          className="flex flex-shrink-0 items-center gap-1 rounded-md border border-[var(--color-info-border)] bg-[var(--color-info-subtle)] px-2 py-1 text-micro font-semibold tracking-wide text-[var(--color-info)]"
          title={afspraken.map((e) => e.titel).join(" · ")}
        >
          <CalendarDays size={12} />
          {afspraken.length}
        </span>
      )}

      {/* TODAY indicator */}
      {isToday && (
        <span
          className={cn(
            "flex-shrink-0 rounded-md border px-2 py-1 text-micro font-semibold uppercase tracking-wide",
            shift.surface,
            shift.border,
            shift.text,
          )}
        >
          Vandaag
        </span>
      )}
    </motion.div>
  );
}

