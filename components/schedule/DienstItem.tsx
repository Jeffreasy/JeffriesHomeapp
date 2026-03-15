"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { type DienstRow, shiftTypeColor } from "@/lib/schedule";

interface DienstItemProps {
  dienst: DienstRow;
  isToday?: boolean;
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

export function DienstItem({ dienst, isToday }: DienstItemProps) {
  const shift  = shiftTypeColor(dienst.shiftType);
  const team   = dienst.team ? teamColor(dienst.team) : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
      style={
        isToday
          ? { background: shift.accent + "10", border: `1px solid ${shift.accent}30` }
          : { background: "rgba(255,255,255,0.03)", border: "1px solid transparent" }
      }
    >
      {/* Date */}
      <div className="w-10 text-center flex-shrink-0">
        <p className="text-xs font-bold text-slate-300">{dienst.startDatum.slice(8)}</p>
        <p className="text-[10px] text-slate-600">{dienst.dag?.slice(0, 2)}</p>
      </div>

      {/* Shift type badge */}
      <div
        className="w-14 text-center py-0.5 rounded-md text-[10px] font-bold flex-shrink-0"
        style={{ background: shift.accent + "18", color: shift.accent }}
      >
        {dienst.shiftType}
      </div>

      {/* Time + locatie */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-300 font-medium">
          {dienst.startTijd}–{dienst.eindTijd}
          <span className="text-slate-600 font-normal ml-1">· {dienst.duur}u</span>
        </p>
        {dienst.locatie && (
          <p className="text-[10px] text-slate-600 truncate flex items-center gap-1 mt-0.5">
            <MapPin size={9} className="flex-shrink-0" />
            {dienst.locatie}
          </p>
        )}
      </div>

      {/* Team badge — color-coded */}
      {team && dienst.team && (
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 tracking-wide"
          style={{ background: team.bg, color: team.text, border: `1px solid ${team.border}` }}
        >
          {dienst.team}
        </span>
      )}

      {/* TODAY indicator */}
      {isToday && (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: shift.accent + "20", color: shift.accent }}
        >
          VANDAAG
        </span>
      )}
    </motion.div>
  );
}

