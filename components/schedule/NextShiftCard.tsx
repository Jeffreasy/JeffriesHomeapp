"use client";

import { Clock, MapPin, Timer, ChevronRight, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { type DienstRow, shiftTypeColor } from "@/lib/schedule";
import { cn } from "@/lib/utils";

interface NextShiftCardProps {
  dienst:    DienstRow | null;
  compact?:  boolean; // true = kleine versie voor dashboard
  onImport?: () => void;
}

export function NextShiftCard({ dienst, compact, onImport }: NextShiftCardProps) {
  if (!dienst) {
    return (
      <div className={cn(
        "glass rounded-xl border border-white/5 flex items-center justify-center",
        compact ? "px-4 py-3" : "px-6 py-8"
      )}>
        <div className="text-center">
          <p className="text-sm text-slate-500">Geen aankomende diensten</p>
          {onImport && (
            <button
              onClick={onImport}
              className="mt-2 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 mx-auto"
            >
              <Upload size={10} /> Rooster importeren
            </button>
          )}
        </div>
      </div>
    );
  }

  const colors  = shiftTypeColor(dienst.shiftType);
  const isBezig = dienst.status === "Bezig";

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("rounded-xl px-4 py-3 border border-white/10", colors.bg)}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-0.5">
              {isBezig ? "🟢 Nu bezig" : "⏰ Volgende dienst"}
            </p>
            <p className={cn("text-sm font-bold", colors.text)}>
              {dienst.dag} · {dienst.startDatum.slice(8)}-{dienst.startDatum.slice(5, 7)}
            </p>
            <p className="text-xs text-slate-400">
              {dienst.startTijd}–{dienst.eindTijd} · {dienst.shiftType} · {dienst.duur}u
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: colors.accent + "22", border: `1px solid ${colors.accent}44` }}
          >
            <Clock size={18} style={{ color: colors.accent }} />
          </div>
        </div>
      </motion.div>
    );
  }

  // Full card
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${colors.accent}18 0%, ${colors.accent}08 100%)`,
               border: `1px solid ${colors.accent}30` }}
    >
      {/* Status banner */}
      <div
        className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
        style={{ background: colors.accent + "20", color: colors.accent }}
      >
        {isBezig ? "🟢 Bezig" : "⏰ Volgende dienst"}
        <span className="ml-auto font-normal normal-case tracking-normal opacity-70">
          {dienst.shiftType}
        </span>
      </div>

      <div className="p-5">
        {/* Date + time */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-2xl font-bold text-white">{dienst.dag}</p>
            <p className="text-sm text-slate-400">
              {dienst.startDatum.slice(8)}-{dienst.startDatum.slice(5, 7)}-{dienst.startDatum.slice(0, 4)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: colors.accent }}>
              {dienst.startTijd}
            </p>
            <p className="text-sm text-slate-400">tot {dienst.eindTijd}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-sm">
          {dienst.locatie && (
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin size={13} className="text-slate-500 flex-shrink-0" />
              <span className="truncate">{dienst.locatie}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-300">
            <Timer size={13} className="text-slate-500 flex-shrink-0" />
            <span>{dienst.duur} uur · Team {dienst.team || "?"}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
