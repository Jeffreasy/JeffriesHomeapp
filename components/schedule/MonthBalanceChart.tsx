"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useSchedule } from "@/hooks/useSchedule";
import { groupByMonth } from "@/lib/schedule";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const CONTRACT_HOURS_PER_WEEK = 16;

/** Number of weeks in a given "YYYY-MM" month, counted as the number of Mondays
 *  that fall in the month. Yields a 4- or 5-week norm instead of a flat
 *  4.33-week average, so the per-month target reflects the real calendar. */
function weeksInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  const days = new Date(y, m, 0).getDate(); // last day of month
  let mondays = 0;
  for (let d = 1; d <= days; d++) {
    if (new Date(y, m - 1, d).getDay() === 1) mondays++;
  }
  // A month has 4 or 5 Mondays; use that directly as the week count.
  return mondays;
}

export function MonthBalanceChart() {
  const { diensten } = useSchedule();

  const data = useMemo(() => {
    const months = groupByMonth(diensten);

    // Only fully completed months are meaningful: the running month is only
    // partially scheduled and future months are nearly empty, so comparing them
    // against a full-month norm would show a fake, massive shortfall.
    // Amsterdam-gepind zoals elders in de app; device-lokale datum kan op reis
    // een maand verschuiven rond de maandwissel.
    const currentYm = new Date()
      .toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" })
      .slice(0, 7);
    const completed = months.filter(m => m.month < currentYm);

    // Last 6-12 completed months.
    return completed.slice(-12).map(m => {
      // Norm scales with the actual number of weeks in that month (4 or 5),
      // not a flat 69.3u average.
      const expected = Math.round(weeksInMonth(m.month) * CONTRACT_HOURS_PER_WEEK * 10) / 10;
      const delta = Math.round((m.totalHours - expected) * 10) / 10;

      return {
        name: m.label.split(" ")[0].substring(0,3) + " " + m.label.split(" ")[1].substring(2),
        hours: m.totalHours,
        expected,
        delta: delta,
        color: delta > 0 ? "#f97316" : delta < 0 ? "#ef4444" : "#10b981"
      };
    });
  }, [diensten]);

  if (data.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass rounded-2xl border border-[var(--color-border)] p-5 shadow-xl mb-6 relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm uppercase tracking-[0.2em] font-bold text-slate-300">Maandbalans</h3>
          <p className="mt-1 text-xs text-slate-500">Afgesloten maanden tegenover 16u/week-norm</p>
        </div>
      </div>
      
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: "#64748b" }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: "#64748b" }} 
            />
            <Tooltip 
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-black/90 border border-slate-800 p-3 shadow-2xl">
                      <p className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">{d.name}</p>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-500 text-xs">Uren</span>
                        <span className="font-bold">{d.hours}u</span>
                      </div>
                      <div className="flex justify-between items-center gap-4 mt-1">
                        <span className="text-slate-500 text-xs">Norm</span>
                        <span className="font-bold">{d.expected}u</span>
                      </div>
                      <div className="flex justify-between items-center gap-4 mt-1">
                        <span className="text-slate-500 text-xs">Delta</span>
                        <span className="font-bold" style={{ color: d.color }}>
                          {d.delta > 0 ? "+" : ""}{d.delta}u
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="hours" 
              radius={[4, 4, 0, 0]}
              shape={(props: any) => {
                const { x, y, width, height, payload } = props;
                return (
                  <rect x={x} y={y} width={width} height={height} fill={payload.color} rx={4} ry={4} opacity={0.8} />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
