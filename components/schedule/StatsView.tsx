"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Crosshair } from "lucide-react";
import {
  groupByYear,
  groupByWeekNr,
  calcTotalHours,
  monthLabel,
  type MonthStats,
  type YearStats,
  type DienstRow,
} from "@/lib/schedule";
import { hoursValue, getAmsterdamTodayIso } from "./RoosterUtils";
import { formatWeekLabel } from "./scheduleUtils";

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
    // Lege maanden zijn echt disabled — geen hover-feedback of klikbare no-op (audit N11).
    <motion.button
      onClick={onClick}
      disabled={empty}
      whileHover={!empty ? { x: 4 } : {}}
      className={`group relative flex w-full min-w-0 items-center justify-between border-b text-left transition-colors ${
        active
          ? "border-white bg-white/5"
          : empty
            ? "border-white/10 cursor-default"
            : "border-white/10 hover:bg-white/5"
      }`}
    >
      <div className="min-w-0 flex-1 py-3 pl-2 pr-3 sm:py-4 sm:pr-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="w-12 shrink-0 sm:w-16">
            <p className={`text-[10px] font-bold uppercase tracking-widest ${
              empty ? "text-slate-600" : isCurrent ? "text-green-400" : "text-slate-400"
            }`}>
              {stats.label.split(" ")[0].slice(0,3)}
            </p>
          </div>
          
          <div className="min-w-0 flex-1">
            {empty ? (
              <p className="font-mono text-xs tracking-widest text-slate-700">Geen data</p>
            ) : (
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <p className={`text-xl font-black tabular-nums tracking-tighter ${
                  active ? "text-white" : "text-slate-300 group-hover:text-white"
                }`}>
                  {hoursValue(stats.totalHours)}<span className="text-xs text-slate-500 ml-0.5">h</span>
                </p>
                <div className="min-w-12 max-w-[100px] flex-1 opacity-60">
                  <ShiftSegment shifts={stats.shifts} total={stats.count} />
                </div>
              </div>
            )}
          </div>
          
          {!empty && (
            <div className="shrink-0 text-right">
              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">
                {stats.count} diensten
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
      className="h-full border-l border-white/10 bg-black/40 p-4 sm:p-6"
    >
      <div className="mb-6 border-b border-white/10 pb-4 sm:mb-8">
        <h3 className="mb-2 text-xl font-bold tracking-tight text-white sm:text-2xl">{stats.label}</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span>Totaal: {hoursValue(stats.totalHours)}u</span>
          <span>Diensten: {stats.count}</span>
          <span>Gem: {hoursValue(stats.avgDuur)}u</span>
        </div>
      </div>

      <div className="space-y-6">
        {weekGroups.map(({ weeknr, rows }) => {
          const wkHours = calcTotalHours(rows);
          return (
            <div key={weeknr} className="relative pl-4 border-l border-white/5">
              <div className="absolute -left-[5px] top-1.5 w-2 h-2 bg-slate-800 rounded-none border border-slate-600" />
              
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-white">
                  {formatWeekLabel(weeknr)}
                </p>
                <p className="text-[10px] font-bold text-slate-400">{hoursValue(wkHours)}u</p>
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
          className="text-[10px] font-bold px-2 py-0.5"
          style={{ color: color, backgroundColor: color + "10", border: `1px solid ${color}30` }}
        >
          {dienst.shiftType}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-xs font-mono text-slate-300">
          {dienst.startTijd}<span className="text-slate-500 px-1">–</span>{dienst.eindTijd}
        </p>
        <p className="w-8 text-right text-[10px] font-bold text-slate-400">{hoursValue(dienst.duur)}u</p>
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
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Jaarvolume · {year.year}</p>
        </div>
        <p className="text-4xl font-black leading-none tracking-tight text-white tabular-nums sm:text-5xl">
          {hoursValue(year.totalHours)}<span className="ml-2 text-2xl font-bold text-slate-600 sm:text-3xl">u</span>
        </p>
      </div>
      
      <div className="flex gap-6 sm:gap-8">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Diensten</p>
          <p className="text-3xl font-black text-slate-300 tabular-nums">{year.count}</p>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Gemiddeld</p>
          <p className="text-3xl font-black text-slate-300 tabular-nums">
            {year.count ? hoursValue(year.totalHours / year.count) : 0}
          </p>
        </div>
      </div>
    </div>
  );
}

export function StatsView({ diensten }: { diensten: DienstRow[] }) {
  const years    = useMemo(() => groupByYear(diensten), [diensten]);
  const currentM = getAmsterdamTodayIso().slice(0, 7);

  const [activeYear,  setActiveYear]  = useState<string>(() => years.at(-1)?.year ?? "");
  const [activeMonth, setActiveMonth] = useState<string | null>(null);

  // Houd een nog geldige gebruikersselectie vast; kies anders declaratief het
  // nieuwste jaar. Binnenkomende querydata hoeft zo geen state-effect te starten.
  const selectedYear = years.some((year) => year.year === activeYear)
    ? activeYear
    : years.at(-1)?.year ?? "";
  const yearData  = years.find(y => y.year === selectedYear);
  const monthData = yearData?.months.find(m => m.month === activeMonth);

  const allMonths: MonthStats[] = useMemo(() => {
    if (!yearData) return [];
    const filled: MonthStats[] = [];
    for (let i = 1; i <= 12; i++) {
      const key = `${selectedYear}-${String(i).padStart(2, "0")}`;
      filled.push(
        yearData.months.find(m => m.month === key) ?? {
          // Echt maandlabel via de gedeelde formatter — anders rendert de
          // maand-stream "202" uit de ISO-key (audit H13).
          month: key, label: monthLabel(key), rows: [], totalHours: 0, count: 0,
          shifts: {}, teams: {}, avgDuur: 0, gedraaid: 0,
        }
      );
    }
    return filled;
  }, [yearData, selectedYear]);

  if (!years.length) {
    return (
      <div className="glass flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] py-24 text-center">
        <TrendingUp size={32} className="text-slate-700 mb-4" />
        <p className="text-sm font-semibold text-slate-400">Geen roosterdata</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Year Tabs */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto scrollbar-none sm:mb-8">
        {years.map(y => (
          <button
            key={y.year}
            onClick={() => { setActiveYear(y.year); setActiveMonth(null); }}
            className={`shrink-0 rounded-lg border px-4 py-2 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
              y.year === selectedYear
                ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 hover:text-slate-200"
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
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Maanden</p>
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
          <div className="min-h-[260px] w-full md:min-h-[500px] md:w-2/3">
            <AnimatePresence mode="wait">
              {monthData && monthData.count > 0 ? (
                <MonthDetailStream key={monthData.month} stats={monthData} />
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full items-center justify-center border border-white/5 bg-black/20 p-8 text-center sm:p-12"
                >
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-600">
                    Kies een maand voor details
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
