"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useSchedule } from "@/hooks/useSchedule";
import { analyzeContract } from "@/lib/schedule";
import { Target, TrendingDown, TrendingUp, CheckCircle2 } from "lucide-react";

export function ContractWidget() {
  const { diensten } = useSchedule();
  
  const stats = useMemo(() => {
    return analyzeContract(diensten, 16);
  }, [diensten]);

  const currentOrNextWeek = useMemo(() => {
    if (stats.weeklyBalances.length === 0) return null;
    return stats.weeklyBalances[stats.weeklyBalances.length - 1];
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
  const bgAccentColor = isOver ? "rgba(249,115,22,0.15)" : isUnder ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative mb-6 overflow-hidden bg-black/40 border-l-4 p-5 sm:p-6 shadow-2xl backdrop-blur-xl"
      style={{ 
        borderLeftColor: accentColor,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Decorative HUD Elements */}
      <div className="absolute top-0 right-0 p-2 opacity-30 flex gap-1 pointer-events-none">
        <div className="w-1 h-1 bg-white" />
        <div className="w-4 h-1 bg-white" />
        <div className="w-1 h-1 bg-white" />
      </div>
      <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none select-none">
        <h1 className="text-9xl font-black italic tracking-tighter">CT-16</h1>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        
        {/* Left Side: Massive Typographic Hours */}
        <div>
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <Target size={14} className="text-slate-400" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">
              Contract Baseline · Wk {currentOrNextWeek.weeknr}
            </span>
          </div>
          
          <div className="flex items-baseline gap-3">
            <motion.h2 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
              className="text-6xl md:text-7xl font-black tracking-tighter text-white tabular-nums leading-none"
            >
              {currentOrNextWeek.actualHours}
              <span className="text-2xl text-slate-600 font-bold ml-1">/{currentOrNextWeek.expectedHours}</span>
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
              {currentOrNextWeek.delta > 0 ? "+" : ""}{currentOrNextWeek.delta}
            </motion.div>
          </div>
        </div>

        {/* Right Side: Total Balance & Technical Segment Bar */}
        <div className="flex-1 max-w-sm w-full space-y-4">
          
          {/* Segmented Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
              <span>0h</span>
              <span>16h Target</span>
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

                    {/* Global Balance */}
          <div className="flex justify-between items-center bg-black/40 border border-slate-800 p-3">
            <span className="text-xs uppercase tracking-widest font-semibold text-slate-400">Global Balance</span>
            <span 
              className="text-xl font-black tabular-nums"
              style={{ color: stats.totalDelta > 0 ? "#f97316" : stats.totalDelta < 0 ? "#ef4444" : "#10b981" }}
            >
              {stats.totalDelta > 0 ? "+" : ""}{stats.totalDelta}
              <span className="text-xs ml-1 opacity-60 uppercase tracking-widest">HRS</span>
            </span>
          </div>

          {/* Weekly History Sparkline */}
          <div className="pt-2">
            <div className="flex items-end h-8 gap-1 w-full opacity-80">
              {stats.weeklyBalances.slice(-15).map((w, i) => {
                const h = Math.max(2, Math.min(32, Math.abs(w.delta) * 2));
                const isOver = w.delta > 0;
                const color = isOver ? "#f97316" : w.delta < 0 ? "#ef4444" : "#10b981";
                return (
                  <div
                    key={w.weeknr}
                    title={"Week " + w.weeknr + ": " + w.delta + "h"}
                    className="flex-1 rounded-t-sm transition-all duration-300 hover:opacity-100 opacity-60"
                    style={{
                      height: h + "px",
                      backgroundColor: color,
                    }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-1 text-[8px] uppercase tracking-widest text-slate-500 font-bold">
              <span>Historical Trend (15w)</span>
              <span>{stats.weeklyBalances.length}w tracked</span>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}

