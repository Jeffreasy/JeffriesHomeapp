"use client";

import { motion } from "framer-motion";
import { type DienstRow, shiftTypeColor } from "@/lib/schedule";

interface DienstItemProps {
  dienst: DienstRow;
  isToday?: boolean;
}

export function DienstItem({ dienst, isToday }: DienstItemProps) {
  const colors = shiftTypeColor(dienst.shiftType);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
      style={
        isToday
          ? { background: colors.accent + "10", border: `1px solid ${colors.accent}30` }
          : { background: "rgba(255,255,255,0.03)", border: "1px solid transparent" }
      }
    >
      <div className="w-10 text-center flex-shrink-0">
        <p className="text-xs font-bold text-slate-300">{dienst.startDatum.slice(8)}</p>
        <p className="text-[10px] text-slate-600">{dienst.dag?.slice(0, 2)}</p>
      </div>
      <div
        className="w-14 text-center py-0.5 rounded-md text-[10px] font-bold flex-shrink-0"
        style={{ background: colors.accent + "18", color: colors.accent }}
      >
        {dienst.shiftType}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-300 font-medium">
          {dienst.startTijd}–{dienst.eindTijd}
        </p>
        <p className="text-[10px] text-slate-600 truncate">
          {dienst.team && `Team ${dienst.team} · `}{dienst.duur}u
        </p>
      </div>
      {isToday && (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: colors.accent + "20", color: colors.accent }}
        >
          VANDAAG
        </span>
      )}
    </motion.div>
  );
}
