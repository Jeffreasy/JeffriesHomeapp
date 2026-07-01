"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useSchedule } from "@/hooks/useSchedule";
import { analyzeContract, getCurrentWeekBalance } from "@/lib/schedule";
import { Target, TrendingDown, TrendingUp, CheckCircle2 } from "lucide-react";
import { hoursValue } from "./RoosterUtils";
import { formatWeekLabel } from "./scheduleUtils";

export function ContractWidget({ contractUren = 16 }: { contractUren?: number } = {}) {
  const { diensten } = useSchedule();

  const stats = useMemo(() => {
    return analyzeContract(diensten, contractUren);
  }, [diensten, contractUren]);

  const currentOrNextWeek = useMemo(() => {
    return getCurrentWeekBalance(stats);
  }, [stats]);

  if (!currentOrNextWeek) return null;

  const isOver = currentOrNextWeek.delta > 0;
  const isUnder = currentOrNextWeek.delta < 0;
  const isPerfect = currentOrNextWeek.delta === 0;

  // Segmented progress calculation
  const segments = 10;
  const activeSegments = Math.min(segments, Math.floor((currentOrNextWeek.actualHours / currentOrNextWeek.expectedHours) * segments));
  const overSegments = isOver ? Math.min(3, Math.ceil((currentOrNextWeek.delta / currentOrNextWeek.expectedHours) * segments)) : 0;

  const accentColor = isOver ? "#f97316" : isUnder ? "#ef4444" : "#10b981"; // Orange, Red, Green
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative mb-6 overflow-hidden rounded-xl border-l-4 bg-black/40 p-5 shadow-2xl backdrop-blur-xl sm:p-6"
      style={{ 
        borderLeftColor: accentColor,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        
        {/* Left Side: Massive Typographic Hours */}
        <div>
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <Target size={14} className="text-slate-400" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">
              {/* Gedeelde weeklabel-formatter (audit L8) — geen rauwe "2026-27". */}
              Contracturen · {formatWeekLabel(currentOrNextWeek.weeknr)}
            </span>
          </div>
          
          <div className="flex items-baseline gap-3">
            <motion.h2 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
              className="text-5xl font-black leading-none tracking-tight text-white tabular-nums md:text-6xl"
            >
              {hoursValue(currentOrNextWeek.actualHours)}
              <span className="text-2xl text-slate-600 font-bold ml-1">/{hoursValue(currentOrNextWeek.expectedHours)}</span>
            </motion.h2>

            <motion.div 
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-1.5 px-3 py-1 bg-black/60 border font-bold text-sm"
              style={{ color: accentColor, borderColor: accentColor }}
            >
              {isOver && <TrendingUp size={16} strokeWidth={3} />}
              {isUnder && <TrendingDown size={16} strokeWidth={3} />}
              {isPerfect && <CheckCircle2 size={16} strokeWidth={3} />}
              {currentOrNextWeek.delta > 0 ? "+" : ""}{hoursValue(currentOrNextWeek.delta)}
            </motion.div>
          </div>
        </div>

        {/* Right Side: Total Balance & Technical Segment Bar */}
        <div className="flex-1 max-w-sm w-full space-y-4">
          
          {/* Segmented Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-bold tracking-widest text-slate-500">
              <span>0u</span>
              {/* Doel volgt de contracturen-prop i.p.v. hardcoded "16u" (audit L8). */}
              <span>{hoursValue(stats.contractUrenPerWeek)}u doel</span>
            </div>
            
            <div className="flex h-3 gap-0.5 w-full">
              {Array.from({ length: segments }).map((_, i) => (
                <div 
                  key={i} 
                  className={`flex-1 transition-colors duration-500`}
                  style={{
                    backgroundColor: i < activeSegments 
                      ? (isUnder ? "#ef4444" : "#10b981") 
                      : "rgba(255,255,255,0.05)"
                  }}
                />
              ))}
              {/* Overtime segments */}
              {Array.from({ length: overSegments }).map((_, i) => (
                <div 
                  key={`over-${i}`} 
                  className="flex-1 transition-colors duration-500"
                  style={{ backgroundColor: "#f97316" }} // Orange for overtime
                />
              ))}
            </div>
          </div>

                    {/* Global Balance — toekomstige (geplande) weken tellen
                        hier niet in mee (audit F6). */}
          <div className="flex justify-between items-center rounded-lg bg-black/40 border border-slate-800 p-3">
            <span className="text-xs uppercase tracking-widest font-semibold text-slate-400">Totaalbalans <span className="normal-case tracking-normal text-slate-500">(t/m deze week)</span></span>
            <span 
              className="text-xl font-black tabular-nums"
              style={{ color: stats.totalDelta > 0 ? "#f97316" : stats.totalDelta < 0 ? "#ef4444" : "#10b981" }}
            >
              {stats.totalDelta > 0 ? "+" : ""}{hoursValue(stats.totalDelta)}
              <span className="ml-1 text-xs opacity-60 tracking-widest">u</span>
            </span>
          </div>

          {/* Weekly History Sparkline */}
          <div className="pt-2">
            <div className="flex items-end h-8 gap-1 w-full opacity-80">
              {stats.weeklyBalances.slice(-15).map((w) => {
                const h = Math.max(2, Math.min(32, Math.abs(w.delta) * 2));
                const isOver = w.delta > 0;
                // Toekomstige weken zijn "gepland": gedimd en neutraal gekleurd,
                // zodat lege geplande weken niet als rood tekort ogen (audit F6).
                const color = w.future
                  ? "#64748b"
                  : isOver ? "#f97316" : w.delta < 0 ? "#ef4444" : "#10b981";
                return (
                  <div
                    key={w.weeknr}
                    title={`${formatWeekLabel(w.weeknr)}: ${w.delta > 0 ? "+" : ""}${hoursValue(w.delta)}u${w.future ? " (gepland)" : ""}`}
                    className={`flex-1 rounded-t-sm transition-all duration-300 hover:opacity-100 ${w.future ? "opacity-30" : "opacity-60"}`}
                    style={{
                      height: h + "px",
                      backgroundColor: color,
                    }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-1 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              <span>Trend 15 weken</span>
              <span>{stats.weeklyBalances.length} weken</span>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}

