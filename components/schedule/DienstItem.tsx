"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { type DienstRow, shiftTypeColor } from "@/lib/schedule";
import { type PersonalEvent } from "@/hooks/usePersonalEvents";
import { CalendarDays } from "lucide-react";
import { hoursValue } from "./RoosterUtils";

interface DienstItemProps {
  dienst:     DienstRow;
  isToday?:   boolean;
  afspraken?: PersonalEvent[]; // personal events on same day
  compact?:   boolean;
}

/** Returns a distinct color per team prefix */
function teamColor(team: string): { bg: string; text: string; border: string } {
  const t = team.trim().toUpperCase();
  if (t.startsWith("R"))
    return { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", border: "rgba(59,130,246,0.3)" };
  if (t.startsWith("A"))
    return { bg: "rgba(16,185,129,0.12)", text: "#34d399", border: "rgba(16,185,129,0.3)" };
  return { bg: "rgba(255,255,255,0.06)", text: "#94a3b8", border: "rgba(255,255,255,0.1)" };
}

export function DienstItem({ dienst, isToday, afspraken = [], compact = false }: DienstItemProps) {
  const shift  = shiftTypeColor(dienst.shiftType);
  const team   = dienst.team ? teamColor(dienst.team) : null;
  const isZondag   = dienst.dag === "Zondag";
  const isZaterdag = dienst.dag === "Zaterdag";
  const isWeekend  = isZondag || isZaterdag;

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-white/8 bg-white/[0.025] p-3"
        style={{
          borderLeftColor: isToday ? shift.accent : isZondag ? "#eab308" : isZaterdag ? "#facc15" : shift.accent,
          borderLeftWidth: 2,
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-white/8 bg-black/30 px-2 py-2 text-center">
            <span className={`text-sm font-black leading-none ${isWeekend ? "text-yellow-300" : "text-white"}`}>
              {dienst.startDatum.slice(8)}
            </span>
            <span className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${isWeekend ? "text-amber-500/80" : "text-slate-400"}`}>
              {dienst.dag?.slice(0, 2)}
            </span>
            {isZondag && <span className="mt-1 text-[9px] font-bold text-amber-400">ORT</span>}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
                style={{ background: shift.accent + "12", color: shift.accent, borderColor: shift.accent + "35" }}
              >
                {dienst.shiftType}
              </span>
              {team && dienst.team && (
                <span
                  className="shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: team.bg, color: team.text, borderColor: team.border }}
                >
                  {dienst.team}
                </span>
              )}
              {isToday && (
                <span className="ml-auto rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                  Vandaag
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-sm font-semibold tracking-tight text-slate-200">
                {dienst.startTijd}<span className="mx-1 text-slate-600">–</span>{dienst.eindTijd}
              </span>
              <span className="rounded-md border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-500">
                {hoursValue(dienst.duur)}u
              </span>
            </div>

            {dienst.locatie && (
              <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <MapPin size={10} className="shrink-0" />
                {dienst.locatie}
              </p>
            )}

            {afspraken.length > 0 && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[10px] font-semibold text-indigo-200">
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
      whileHover={{ x: 2, backgroundColor: "rgba(255,255,255,0.05)" }}
      className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] px-4 py-3 border-l-2 transition-all"
      style={{
        borderLeftColor: isToday ? shift.accent : isZondag ? "#eab308" : isZaterdag ? "#facc15" : "#475569",
        background: isToday ? shift.accent + "10" : "rgba(255,255,255,0.015)"
      }}
    >
      {/* Date */}
      <div className="w-12 text-center flex-shrink-0">
        <p className={`text-sm font-bold ${isWeekend ? "text-yellow-300" : "text-white"}`}>{dienst.startDatum.slice(8)}</p>
        <p className={`text-[10px] font-semibold uppercase tracking-wide ${isWeekend ? "text-amber-500/80" : "text-slate-400"}`}>{dienst.dag?.slice(0, 2)}</p>
        {isZondag && (
          <p className="text-[10px] font-bold tracking-wide text-amber-400 mt-1">+ORT</p>
        )}
      </div>

      {/* Shift type badge */}
      <div
        className="w-16 text-center py-1 text-[10px] uppercase tracking-wide font-semibold flex-shrink-0 rounded-md border"
        style={{ background: shift.accent + "12", color: shift.accent, borderColor: shift.accent + "35" }}
      >
        {dienst.shiftType}
      </div>

      {/* Time + locatie */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 font-mono tracking-tight">
          {dienst.startTijd}<span className="text-slate-600 mx-1">–</span>{dienst.eindTijd}
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider ml-2">· {hoursValue(dienst.duur)}u</span>
        </p>
        {dienst.locatie && (
          <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-1 font-semibold uppercase tracking-wider">
            <MapPin size={10} className="flex-shrink-0" />
            {dienst.locatie}
          </p>
        )}
      </div>

      {/* Team badge — color-coded */}
      {team && dienst.team && (
        <span
          className="text-[10px] font-semibold px-2 py-1 flex-shrink-0 tracking-wide uppercase rounded-md border"
          style={{ background: team.bg, color: team.text, borderColor: team.border }}
        >
          {dienst.team}
        </span>
      )}

      {/* Afspraken badge */}
      {afspraken.length > 0 && (
        <span
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 flex-shrink-0 rounded-md border tracking-wide"
          style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", borderColor: "rgba(99,102,241,0.3)" }}
          title={afspraken.map((e) => e.titel).join(" · ")}
        >
          <CalendarDays size={12} />
          {afspraken.length}
        </span>
      )}

      {/* TODAY indicator */}
      {isToday && (
        <span
          className="text-[10px] font-semibold px-2 py-1 flex-shrink-0 uppercase tracking-wide rounded-md border"
          style={{ background: shift.accent + "20", color: shift.accent, borderColor: shift.accent + "40" }}
        >
          Vandaag
        </span>
      )}
    </motion.div>
  );
}

