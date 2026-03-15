"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Users, Calendar, ChevronDown, ChevronRight, Clock } from "lucide-react";
import {
  groupByYear,
  groupByWeekNr,
  calcTotalHours,
  type MonthStats,
  type YearStats,
  type DienstRow,
} from "@/lib/schedule";

// ─── Colour helpers ───────────────────────────────────────────────────────────

const SHIFT_COLORS: Record<string, string> = {
  Vroeg:  "#f97316",
  Laat:   "#ef4444",
  Dienst: "#3b82f6",
};

function shiftColor(type: string) { return SHIFT_COLORS[type] ?? "#94a3b8"; }

// ─── Mini components ──────────────────────────────────────────────────────────

/** Horizontal stacked shift bar */
function ShiftBar({ shifts, total }: { shifts: Record<string, number>; total: number }) {
  if (!total) return <div className="h-1.5 rounded-full bg-white/5 w-full" />;
  const types = Object.entries(shifts).filter(([, n]) => n > 0);
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden w-full gap-px">
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

/** Team split badges */
function TeamSplit({ teams }: { teams: Record<string, number> }) {
  const r = teams["R."] ?? 0;
  const a = teams["A."] ?? 0;
  if (!r && !a) return null;
  return (
    <div className="flex gap-1.5">
      {r > 0 && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }}>
          R. ×{r}
        </span>
      )}
      {a > 0 && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }}>
          A. ×{a}
        </span>
      )}
    </div>
  );
}

// ─── Month card ───────────────────────────────────────────────────────────────

function MonthCard({
  stats, active, isCurrent, onClick,
}: { stats: MonthStats; active: boolean; isCurrent: boolean; onClick: () => void }) {
  const empty = stats.count === 0;
  const doneRatio = stats.count ? stats.gedraaid / stats.count : 0;

  return (
    <motion.button
      onClick={onClick}
      whileHover={!empty ? { scale: 1.02 } : {}}
      whileTap={!empty ? { scale: 0.97 } : {}}
      className="w-full text-left rounded-xl border transition-all p-4"
      style={
        active
          ? { background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.35)" }
          : isCurrent
          ? { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.12)" }
          : { background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }
      }
    >
      {/* Month name */}
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${
        empty ? "text-slate-700" : isCurrent ? "text-amber-400" : "text-slate-400"
      }`}>
        {stats.label.split(" ")[0]}
        {isCurrent && <span className="ml-1 normal-case font-normal tracking-normal">· huidig</span>}
      </p>

      {empty ? (
        <p className="text-slate-700 text-xs">—</p>
      ) : (
        <>
          {/* Hours */}
          <p className={`text-2xl font-bold leading-none mb-1 ${
            active ? "text-amber-400" : "text-slate-100"
          }`}>
            {stats.totalHours}u
          </p>
          <p className="text-[10px] text-slate-600 mb-3">
            {stats.count} diensten · ∅ {stats.avgDuur}u
          </p>

          {/* Shift bar */}
          <ShiftBar shifts={stats.shifts} total={stats.count} />

          {/* Team + done */}
          <div className="flex items-center justify-between mt-2">
            <TeamSplit teams={stats.teams} />
            {stats.gedraaid > 0 && (
              <span className="text-[9px] text-slate-600">
                {stats.gedraaid}/{stats.count} ✓
              </span>
            )}
          </div>
        </>
      )}

      {/* Active indicator */}
      {active && <div className="mt-2 h-0.5 rounded-full bg-amber-400 w-full" />}
    </motion.button>
  );
}

// ─── Month detail (week breakdown) ───────────────────────────────────────────

function MonthDetail({ stats }: { stats: MonthStats }) {
  const weekGroups = useMemo(() => groupByWeekNr(stats.rows), [stats.rows]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-200">{stats.label}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {stats.totalHours}u · {stats.count} diensten · ∅ {stats.avgDuur}u/dienst
          </p>
        </div>
        <div className="flex gap-2">
          {Object.entries(stats.shifts).map(([t, n]) => (
            <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: shiftColor(t) + "20", color: shiftColor(t), border: `1px solid ${shiftColor(t)}40` }}>
              {t} ×{n}
            </span>
          ))}
        </div>
      </div>

      {/* Week breakdown */}
      <div className="space-y-3">
        {weekGroups.map(({ weeknr, rows }) => {
          const wkHours = calcTotalHours(rows);
          return (
            <div key={weeknr}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  Week {weeknr}
                </p>
                <p className="text-[10px] text-slate-500">{rows.length} diensten · {wkHours}u</p>
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

/** Compact dienstregelItem for detail view */
function DienstregelItem({ dienst }: { dienst: DienstRow }) {
  const color = SHIFT_COLORS[dienst.shiftType] ?? "#94a3b8";
  const teamStr = dienst.team?.trim();
  const teamColor = teamStr?.startsWith("R") ? "#60a5fa" : teamStr?.startsWith("A") ? "#34d399" : "#94a3b8";

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
      {/* Date */}
      <div className="w-8 text-center flex-shrink-0">
        <p className="text-xs font-bold text-slate-300">{dienst.startDatum.slice(8)}</p>
        <p className="text-[9px] text-slate-600">{dienst.dag?.slice(0, 2)}</p>
      </div>

      {/* Shift badge */}
      <span className="text-[9px] font-bold w-12 text-center py-0.5 rounded-md flex-shrink-0"
        style={{ background: color + "18", color }}>
        {dienst.shiftType}
      </span>

      {/* Time */}
      <p className="text-xs text-slate-300 flex-1">
        {dienst.startTijd}–{dienst.eindTijd}
        <span className="text-slate-600 ml-1 font-normal">· {dienst.duur}u</span>
      </p>

      {/* Status */}
      {dienst.status === "Gedraaid" && (
        <span className="text-[9px] text-slate-600">✓</span>
      )}

      {/* Team */}
      {teamStr && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: teamColor + "20", color: teamColor, border: `1px solid ${teamColor}40` }}>
          {teamStr}
        </span>
      )}
    </div>
  );
}

// ─── Year summary bar ─────────────────────────────────────────────────────────

function YearSummary({ year }: { year: YearStats }) {
  const r = year.teams["R."] ?? 0;
  const a = year.teams["A."] ?? 0;
  const rPct = year.count ? Math.round((r / year.count) * 100) : 0;

  return (
    <div className="flex flex-wrap gap-6 items-end">
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Totale uren</p>
        <p className="text-4xl font-black text-white">{year.totalHours}<span className="text-2xl text-slate-500 ml-1 font-semibold">u</span></p>
      </div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Diensten</p>
        <p className="text-3xl font-bold text-slate-200">{year.count}</p>
      </div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Team verdeling</p>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full overflow-hidden bg-white/5 flex">
            <div style={{ width: `${rPct}%`, background: "#60a5fa" }} />
            <div style={{ width: `${100 - rPct}%`, background: "#34d399" }} />
          </div>
          <span className="text-xs text-slate-400">R. {rPct}% · A. {100 - rPct}%</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Gemiddeld</p>
        <p className="text-2xl font-bold text-slate-300">
          {year.count ? Math.round((year.totalHours / year.count) * 10) / 10 : 0}
          <span className="text-base text-slate-600 ml-1">u/dienst</span>
        </p>
      </div>
    </div>
  );
}

// ─── Main StatsView ───────────────────────────────────────────────────────────

export function StatsView({ diensten }: { diensten: DienstRow[] }) {
  const years    = useMemo(() => groupByYear(diensten), [diensten]);
  const currentM = new Date().toISOString().slice(0, 7);

  const [activeYear,  setActiveYear]  = useState<string>(() => years.at(-1)?.year ?? "");
  const [activeMonth, setActiveMonth] = useState<string | null>(null);

  const yearData  = years.find(y => y.year === activeYear);
  const monthData = yearData?.months.find(m => m.month === activeMonth);

  // Fill to 12 months
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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <TrendingUp size={32} className="text-slate-700 mb-3" />
        <p className="text-slate-500 text-sm">Geen data beschikbaar</p>
        <p className="text-slate-700 text-xs mt-1">Sync je rooster om statistieken te zien</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Year selector ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {years.map(y => (
          <button
            key={y.year}
            onClick={() => { setActiveYear(y.year); setActiveMonth(null); }}
            className="relative px-5 py-2 rounded-xl text-sm font-bold transition-all border"
            style={
              y.year === activeYear
                ? { background: "rgba(245,158,11,0.12)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.35)" }
                : { background: "rgba(255,255,255,0.03)", color: "#64748b", borderColor: "rgba(255,255,255,0.08)" }
            }
          >
            {y.year}
            {y.year === activeYear && (
              <span className="ml-2 text-[10px] font-normal opacity-60">{y.totalHours}u</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Year summary ───────────────────────────────────────────────────── */}
      {yearData && (
        <div className="glass rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-4">{activeYear} — Jaaroverzicht</p>
          <YearSummary year={yearData} />
        </div>
      )}

      {/* ── Month grid ─────────────────────────────────────────────────────── */}
      {allMonths.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Maandoverzicht</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {allMonths.map(m => (
              <MonthCard
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
      )}

      {/* ── Month detail ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {monthData && monthData.count > 0 && (
          <MonthDetail key={monthData.month} stats={monthData} />
        )}
      </AnimatePresence>
    </div>
  );
}
