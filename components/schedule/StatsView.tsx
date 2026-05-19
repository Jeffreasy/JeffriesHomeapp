"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Crosshair } from "lucide-react";
import {
  groupByYear,
  groupByWeekNr,
  calcTotalHours,
  type MonthStats,
  type YearStats,
  type DienstRow,
} from "@/lib/schedule";

const SHIFT_COLORS: Record<string, string> = {
  Vroeg:  "#f97316", // Orange
  Laat:   "#ef4444", // Red
  Dienst: "#3b82f6", // Blue
};

function shiftColor(type: string) { return SHIFT_COLORS[type] ?? "#94a3b8"; }

function ShiftSegment({ shifts, total }: { shifts: Record<string, number>; total: number }) {
  if (!total) return <div className="h-1 bg-white/5 w-full" />;
  const types = Object.entries(shifts).filter(([, n]) => n > 0);
  return (
    <div className="flex h-1 w-full gap-px">
      {types.map(([type, n]) => (
        <div
          key={type}
          title={`${type}: ${n}`}
          className="transition-all"
          style={{ width: `${(n / total) * 100}%`, background: shiftColor(type) }}
        />
      ))}
    </div>
  );
}

function MonthStreamItem({
  stats, active, isCurrent, onClick,
}: { stats: MonthStats; active: boolean; isCurrent: boolean; onClick: () => void }) {
  const empty = stats.count === 0;

  return (
    <motion.button
      onClick={onClick}
      whileHover={!empty ? { x: 4 } : {}}
      className={`w-full text-left relative flex items-center justify-between border-b transition-colors group ${
        active 
          ? "border-white bg-white/5" 
          : "border-white/10 hover:bg-white/5"
      }`}
    >
      <div className="py-4 pl-2 pr-4 flex-1">
        <div className="flex items-center gap-4">
          <div className="w-16">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${
              empty ? "text-slate-600" : isCurrent ? "text-green-400" : "text-slate-400"
            }`}>
              {stats.label.split(" ")[0].slice(0,3)}
            </p>
          </div>
          
          <div className="flex-1">
            {empty ? (
              <p className="text-slate-700 text-xs tracking-widest font-mono">NO DATA</p>
            ) : (
              <div className="flex items-center gap-4">
                <p className={`text-xl font-black tabular-nums tracking-tighter ${
                  active ? "text-white" : "text-slate-300 group-hover:text-white"
                }`}>
                  {stats.totalHours}<span className="text-xs text-slate-500 ml-0.5">h</span>
                </p>
                <div className="flex-1 max-w-[100px] opacity-60">
                  <ShiftSegment shifts={stats.shifts} total={stats.count} />
                </div>
              </div>
            )}
          </div>
          
          {!empty && (
            <div className="text-right">
              <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                {stats.count} SHIFTS
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Active Indicator Line */}
      {active && (
        <motion.div layoutId="activeMonth" className="absolute left-0 top-0 bottom-0 w-1 bg-white" />
      )}
    </motion.button>
  );
}

function MonthDetailStream({ stats }: { stats: MonthStats }) {
  const weekGroups = useMemo(() => groupByWeekNr(stats.rows), [stats.rows]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="p-6 bg-black/40 border-l border-white/10 h-full"
    >
      <div className="mb-8 pb-4 border-b border-white/10">
        <h3 className="text-3xl font-black tracking-tighter uppercase text-white mb-2">{stats.label}</h3>
        <div className="flex gap-4 text-[10px] uppercase font-bold tracking-widest text-slate-500">
          <span>Total: {stats.totalHours}H</span>
          <span>Shifts: {stats.count}</span>
          <span>Avg: {stats.avgDuur}H</span>
        </div>
      </div>

      <div className="space-y-6">
        {weekGroups.map(({ weeknr, rows }) => {
          const wkHours = calcTotalHours(rows);
          return (
            <div key={weeknr} className="relative pl-4 border-l border-white/5">
              <div className="absolute -left-[5px] top-1.5 w-2 h-2 bg-slate-800 rounded-none border border-slate-600" />
              
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-white uppercase tracking-widest font-black">
                  WK {weeknr}
                </p>
                <p className="text-[10px] text-slate-400 font-bold">{wkHours}H</p>
              </div>
              
              <div className="space-y-1">
                {rows.map(d => (
                  <DienstregelItem key={d.eventId} dienst={d} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function DienstregelItem({ dienst }: { dienst: DienstRow }) {
  const color = SHIFT_COLORS[dienst.shiftType] ?? "#94a3b8";

  return (
    <div className="group flex items-center justify-between py-2 border-b border-white/5 hover:border-white/20 transition-colors">
      <div className="flex items-center gap-4">
        <p className="text-xs font-bold text-slate-400 w-6">{dienst.startDatum.slice(8)}</p>
        <span 
          className="text-[9px] font-bold px-2 py-0.5"
          style={{ color: color, backgroundColor: color + "10", border: `1px solid ${color}30` }}
        >
          {dienst.shiftType}
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <p className="text-xs font-mono text-slate-300">
          {dienst.startTijd}<span className="text-slate-600 px-1">-</span>{dienst.eindTijd}
        </p>
        <p className="text-[10px] font-bold text-slate-500 w-8 text-right">{dienst.duur}H</p>
      </div>
    </div>
  );
}

function YearSummaryHero({ year }: { year: YearStats }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8 pb-8 border-b border-white/10">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Crosshair size={14} className="text-slate-400" />
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">Annual Volume · {year.year}</p>
        </div>
        <p className="text-7xl md:text-8xl font-black text-white tracking-tighter leading-none tabular-nums">
          {year.totalHours}<span className="text-3xl text-slate-600 font-bold ml-2">H</span>
        </p>
      </div>
      
      <div className="flex gap-8">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Shifts</p>
          <p className="text-3xl font-black text-slate-300 tabular-nums">{year.count}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Avg Duration</p>
          <p className="text-3xl font-black text-slate-300 tabular-nums">
            {year.count ? Math.round((year.totalHours / year.count) * 10) / 10 : 0}
          </p>
        </div>
      </div>
    </div>
  );
}

export function StatsView({ diensten }: { diensten: DienstRow[] }) {
  const years    = useMemo(() => groupByYear(diensten), [diensten]);
  const currentM = new Date().toISOString().slice(0, 7);

  const [activeYear,  setActiveYear]  = useState<string>(() => years.at(-1)?.year ?? "");
  const [activeMonth, setActiveMonth] = useState<string | null>(null);

  const yearData  = years.find(y => y.year === activeYear);
  const monthData = yearData?.months.find(m => m.month === activeMonth);

  const allMonths: MonthStats[] = useMemo(() => {
    if (!yearData) return [];
    const filled: MonthStats[] = [];
    for (let i = 1; i <= 12; i++) {
      const key = `${activeYear}-${String(i).padStart(2, "0")}`;
      filled.push(
        yearData.months.find(m => m.month === key) ?? {
          month: key, label: key, rows: [], totalHours: 0, count: 0,
          shifts: {}, teams: {}, avgDuur: 0, gedraaid: 0,
        }
      );
    }
    return filled;
  }, [yearData, activeYear]);

  if (!years.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center border border-white/5 bg-black/20">
        <TrendingUp size={32} className="text-slate-700 mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No Data Stream</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Year Tabs */}
      <div className="flex items-center gap-2 mb-8">
        {years.map(y => (
          <button
            key={y.year}
            onClick={() => { setActiveYear(y.year); setActiveMonth(null); }}
            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              y.year === activeYear
                ? "bg-white text-black"
                : "bg-transparent text-slate-500 hover:text-white border border-white/10"
            }`}
          >
            {y.year}
          </button>
        ))}
      </div>

      {/* Year Hero */}
      {yearData && <YearSummaryHero year={yearData} />}

      {/* Asymmetric Split Layout */}
      {allMonths.length > 0 && (
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Left: Month Stream */}
          <div className="w-full md:w-1/3">
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-4">Monthly Stream</p>
            <div className="flex flex-col">
              {allMonths.map(m => (
                <MonthStreamItem
                  key={m.month}
                  stats={m}
                  active={activeMonth === m.month}
                  isCurrent={m.month === currentM}
                  onClick={() => {
                    if (!m.count) return;
                    setActiveMonth(prev => prev === m.month ? null : m.month);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right: Month Detail Stream */}
          <div className="w-full md:w-2/3 min-h-[500px]">
            <AnimatePresence mode="wait">
              {monthData && monthData.count > 0 ? (
                <MonthDetailStream key={monthData.month} stats={monthData} />
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center border border-white/5 bg-black/20 p-12"
                >
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-600">
                    Select a month to view stream details
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
        </div>
      )}
    </div>
  );
}
