"use client";

import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { type DienstRow, shiftTypeColor } from "@/lib/schedule";
import { type PersonalEvent } from "@/hooks/usePersonalEvents";
import { CalendarDays } from "lucide-react";

interface DienstItemProps {
  dienst:     DienstRow;
  isToday?:   boolean;
  afspraken?: PersonalEvent[]; // personal events on same day
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

export function DienstItem({ dienst, isToday, afspraken = [] }: DienstItemProps) {
  const shift  = shiftTypeColor(dienst.shiftType);
  const team   = dienst.team ? teamColor(dienst.team) : null;
  const isZondag   = dienst.dag === "Zondag";
  const isZaterdag = dienst.dag === "Zaterdag";
  const isWeekend  = isZondag || isZaterdag;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 2, backgroundColor: "rgba(255,255,255,0.05)" }}
      className={`flex items-center gap-4 px-4 py-3 border-l-2 transition-all ${
        isToday ? "border-b border-t border-r border-white/10" : "border-b border-white/5"
      }`}
      style={{
        borderLeftColor: isToday ? shift.accent : isZondag ? "#eab308" : isZaterdag ? "#facc15" : "#475569",
        background: isToday ? shift.accent + "10" : "transparent"
      }}
    >
      {/* Date */}
      <div className="w-12 text-center flex-shrink-0">
        <p className={`text-sm font-black ${isWeekend ? "text-yellow-400" : "text-white"}`}>{dienst.startDatum.slice(8)}</p>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${isWeekend ? "text-yellow-600" : "text-slate-500"}`}>{dienst.dag?.slice(0, 2)}</p>
        {isZondag && (
          <p className="text-[9px] font-black tracking-widest text-yellow-500 mt-1">+ORT</p>
        )}
      </div>

      {/* Shift type badge */}
      <div
        className="w-16 text-center py-1 text-[10px] uppercase tracking-widest font-black flex-shrink-0 border"
        style={{ background: shift.accent + "10", color: shift.accent, borderColor: shift.accent + "30" }}
      >
        {dienst.shiftType}
      </div>

      {/* Time + locatie */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300 font-mono tracking-tighter">
          {dienst.startTijd}<span className="text-slate-600 mx-1">–</span>{dienst.eindTijd}
          <span className="text-[10px] text-slate-500 font-bold tracking-widest ml-2 uppercase">· {dienst.duur}H</span>
        </p>
        {dienst.locatie && (
          <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-1 uppercase font-bold tracking-widest">
            <MapPin size={10} className="flex-shrink-0" />
            {dienst.locatie}
          </p>
        )}
      </div>

      {/* Team badge — color-coded */}
      {team && dienst.team && (
        <span
          className="text-[10px] font-black px-2 py-1 flex-shrink-0 tracking-widest uppercase border"
          style={{ background: team.bg, color: team.text, borderColor: team.border }}
        >
          {dienst.team}
        </span>
      )}

      {/* Afspraken badge */}
      {afspraken.length > 0 && (
        <span
          className="flex items-center gap-1 text-[10px] font-black px-2 py-1 flex-shrink-0 border uppercase tracking-widest"
          style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", borderColor: "rgba(99,102,241,0.3)" }}
          title={afspraken.map((e) => e.titel).join(" · ")}
        >
          <CalendarDays size={12} />
          {afspraken.length}
        </span>
      )}

      {/* TODAY indicator */}
      {isToday && (
        <span
          className="text-[10px] font-black px-2 py-1 flex-shrink-0 uppercase tracking-widest border"
          style={{ background: shift.accent + "20", color: shift.accent, borderColor: shift.accent + "40" }}
        >
          VANDAAG
        </span>
      )}
    </motion.div>
  );
}

