"use client";

import { useMemo, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { useSchedule } from "@/hooks/useSchedule";
import { groupByMonth } from "@/lib/schedule";
import { DEFAULT_CONTRACT_HOURS_PER_WEEK, contractHoursForCalendarMonth } from "@/lib/contract";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { surfaceVariants } from "@/components/ui/Surface";
import { uiMotion } from "@/lib/ui/motion";
import { tonePresentation } from "./schedulePresentation";

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
      const expected = contractHoursForCalendarMonth(m.month);
      const delta = Math.round((m.totalHours - expected) * 10) / 10;

      return {
        name: m.label.split(" ")[0].substring(0,3) + " " + m.label.split(" ")[1].substring(2),
        hours: m.totalHours,
        expected,
        delta: delta,
        color: tonePresentation(delta > 0 ? "warning" : delta < 0 ? "danger" : "success").color
      };
    });
  }, [diensten]);

  if (data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: uiMotion.durationSeconds.standard }}
      className={cn(surfaceVariants({ padding: "none" }), "relative mb-6 overflow-hidden p-5")}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm uppercase tracking-[0.2em] font-bold text-[var(--color-text)]">Maandbalans</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Afgesloten maanden tegenover {DEFAULT_CONTRACT_HOURS_PER_WEEK}u/week-norm</p>
        </div>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface-hover)" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className={cn(surfaceVariants({ tone: "elevated", radius: "sm", padding: "sm" }))}>
                      <p className="text-xs font-bold text-[var(--color-text)] mb-2 uppercase tracking-wider">{d.name}</p>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[var(--color-text-muted)] text-xs">Uren</span>
                        <span className="font-bold">{d.hours}u</span>
                      </div>
                      <div className="flex justify-between items-center gap-4 mt-1">
                        <span className="text-[var(--color-text-muted)] text-xs">Norm</span>
                        <span className="font-bold">{d.expected}u</span>
                      </div>
                      <div className="flex justify-between items-center gap-4 mt-1">
                        <span className="text-[var(--color-text-muted)] text-xs">Delta</span>
                        <span
                          className="font-bold text-[var(--schedule-accent)]"
                          style={{ "--schedule-accent": d.color } as CSSProperties}
                        >
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
              shape={(props: unknown) => {
                const { x = 0, y = 0, width = 0, height = 0, payload } = props as {
                  x?: number;
                  y?: number;
                  width?: number;
                  height?: number;
                  payload?: { color?: string };
                };
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={payload?.color ?? tonePresentation("neutral").color}
                    rx={4}
                    ry={4}
                    opacity={0.8}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
