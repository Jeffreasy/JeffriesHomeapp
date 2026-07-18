"use client";

import { useState, useMemo, type CSSProperties } from "react";
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
import { FeedbackState } from "@/components/ui/FeedbackState";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { surfaceVariants } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";
import { shiftPresentation } from "./schedulePresentation";

function ShiftSegment({ shifts, total }: { shifts: Record<string, number>; total: number }) {
  if (!total) return <div className="h-1 bg-[var(--color-surface-muted)] w-full" />;
  const types = Object.entries(shifts).filter(([, n]) => n > 0);
  return (
    <div className="flex h-1 w-full gap-px">
      {types.map(([type, n]) => {
        const shift = shiftPresentation(type);
        return (
          <div
            key={type}
            title={`${type}: ${n}`}
            className={cn(
              "w-[var(--schedule-segment-width)] transition-[width] duration-[var(--motion-slow)] ease-[var(--ease-standard)] motion-reduce:transition-none",
              shift.dot,
            )}
            style={{ "--schedule-segment-width": `${(n / total) * 100}%` } as CSSProperties}
          />
        );
      })}
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
      type="button"
      onClick={onClick}
      disabled={empty}
      whileHover={!empty ? { x: 4 } : {}}
      className={`group relative flex min-h-[var(--touch-target)] w-full min-w-0 items-center justify-between border-b text-left transition-colors ${
        active
          ? "border-[var(--color-border-strong)] bg-[var(--color-surface-muted)]"
          : empty
            ? "border-[var(--color-border)] cursor-default"
            : "border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
      }`}
    >
      <div className="min-w-0 flex-1 py-3 pl-2 pr-3 sm:py-4 sm:pr-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="w-12 shrink-0 sm:w-16">
            <p className={`text-micro font-bold uppercase tracking-widest ${
              empty ? "text-[var(--color-text-subtle)]" : isCurrent ? "text-[var(--color-primary-hover)]" : "text-[var(--color-text-muted)]"
            }`}>
              {stats.label.split(" ")[0].slice(0,3)}
            </p>
          </div>
          
          <div className="min-w-0 flex-1">
            {empty ? (
              <p className="font-mono text-xs tracking-widest text-[var(--color-text-subtle)]">Geen data</p>
            ) : (
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <p className={`text-xl font-black tabular-nums tracking-tighter ${
                  active ? "text-[var(--color-text)]" : "text-[var(--color-text)] group-hover:text-[var(--color-text)]"
                }`}>
                  {hoursValue(stats.totalHours)}<span className="text-xs text-[var(--color-text-muted)] ml-0.5">h</span>
                </p>
                <div className="min-w-12 max-w-[100px] flex-1 opacity-60">
                  <ShiftSegment shifts={stats.shifts} total={stats.count} />
                </div>
              </div>
            )}
          </div>
          
          {!empty && (
            <div className="shrink-0 text-right">
              <p className="text-micro uppercase text-[var(--color-text-muted)] font-bold tracking-widest">
                {stats.count} diensten
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Active Indicator Line */}
      {active && (
        <motion.div layoutId="activeMonth" className="absolute bottom-0 left-0 top-0 w-1 bg-[var(--color-primary)]" />
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
      className={cn(surfaceVariants({ tone: "subtle", radius: "sm", padding: "lg" }), "h-full")}
    >
      <div className="mb-6 border-b border-[var(--color-border)] pb-4 sm:mb-8">
        <h3 className="mb-2 text-xl font-bold tracking-tight text-[var(--color-text)] sm:text-2xl">{stats.label}</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-micro font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
          <span>Totaal: {hoursValue(stats.totalHours)}u</span>
          <span>Diensten: {stats.count}</span>
          <span>Gem: {hoursValue(stats.avgDuur)}u</span>
        </div>
      </div>

      <div className="space-y-6">
        {weekGroups.map(({ weeknr, rows }) => {
          const wkHours = calcTotalHours(rows);
          return (
            <div key={weeknr} className="relative pl-4 border-l border-[var(--color-border)]">
              <div className="absolute -left-[5px] top-1.5 w-2 h-2 bg-[var(--color-surface-muted)] rounded-none border border-[var(--color-border)]" />
              
              <div className="flex items-center justify-between mb-3">
                <p className="text-micro font-black uppercase tracking-widest text-[var(--color-text)]">
                  {formatWeekLabel(weeknr)}
                </p>
                <p className="text-micro font-bold text-[var(--color-text-muted)]">{hoursValue(wkHours)}u</p>
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
  const shift = shiftPresentation(dienst.shiftType);

  return (
    <div className="group flex items-center justify-between py-2 border-b border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-colors">
      <div className="flex items-center gap-4">
        <p className="text-xs font-bold text-[var(--color-text-muted)] w-6">{dienst.startDatum.slice(8)}</p>
        <span className={cn("rounded-md border px-2 py-0.5 text-micro font-bold", shift.surface, shift.border, shift.text)}>
          {dienst.shiftType}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-xs font-mono text-[var(--color-text)]">
          {dienst.startTijd}<span className="text-[var(--color-text-muted)] px-1">–</span>{dienst.eindTijd}
        </p>
        <p className="w-8 text-right text-micro font-bold text-[var(--color-text-muted)]">{hoursValue(dienst.duur)}u</p>
      </div>
    </div>
  );
}

function YearSummaryHero({ year }: { year: YearStats }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8 pb-8 border-b border-[var(--color-border)]">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Crosshair size={14} className="text-[var(--color-text-muted)]" />
        <p className="text-micro font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Jaarvolume · {year.year}</p>
        </div>
        <p className="text-4xl font-black leading-none tracking-tight text-[var(--color-text)] tabular-nums sm:text-5xl">
          {hoursValue(year.totalHours)}<span className="ml-2 text-2xl font-bold text-[var(--color-text-subtle)] sm:text-3xl">u</span>
        </p>
      </div>
      
      <div className="flex gap-6 sm:gap-8">
        <div>
          <p className="mb-1 text-micro font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Diensten</p>
          <p className="text-3xl font-black text-[var(--color-text)] tabular-nums">{year.count}</p>
        </div>
        <div>
          <p className="mb-1 text-micro font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Gemiddeld</p>
          <p className="text-3xl font-black text-[var(--color-text)] tabular-nums">
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
      <FeedbackState
        icon={TrendingUp}
        title="Geen roosterdata"
        description="Importeer of synchroniseer je rooster om statistieken op te bouwen."
      />
    );
  }

  return (
    <div className="space-y-6">

      <Tabs
        items={years.map((year) => ({ id: year.year, label: year.year }))}
        value={selectedYear}
        onValueChange={(year) => {
          setActiveYear(year);
          setActiveMonth(null);
        }}
        idPrefix="schedule-year"
        ariaLabel="Roosterjaar"
        appearance="contained"
        className="mb-6 sm:mb-8"
      />

      <TabPanel idPrefix="schedule-year" value={selectedYear} className="space-y-6">
      {/* Year Hero */}
      {yearData && <YearSummaryHero year={yearData} />}

      {/* Asymmetric Split Layout */}
      {allMonths.length > 0 && (
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Left: Month Stream */}
          <div className="w-full md:w-1/3">
            <p className="mb-4 text-micro font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Maanden</p>
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
                  className={cn(surfaceVariants({ tone: "subtle", radius: "sm", padding: "lg" }), "flex h-full items-center justify-center text-center")}
                >
                  <p className="text-micro uppercase font-bold tracking-widest text-[var(--color-text-subtle)]">
                    Kies een maand voor details
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
        </div>
      )}
      </TabPanel>
    </div>
  );
}
