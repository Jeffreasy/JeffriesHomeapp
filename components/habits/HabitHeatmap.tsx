"use client";

import { useMemo } from "react";
import { Activity } from "lucide-react";
import { HEATMAP_COLORS, getHeatmapLevel } from "@/lib/habit-constants";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
const DAYS = ["", "Ma", "", "Wo", "", "Vr", ""];

/**
 * HabitHeatmap — GitHub-style contribution heatmap.
 * Mobile-first: horizontally scrollable, touch-friendly tooltips.
 */
export function HabitHeatmap() {
  const { user } = useUser();
  const userId = user?.id ?? "";

  const data = useQuery(
    api.habits.getHeatmapData,
    userId ? {} : "skip",
  );

  const { weeks, monthLabels } = useMemo(() => {
    if (!data?.days) return { weeks: [], monthLabels: [] };

    // Group into weeks (7 days each)
    const wks: Array<typeof data.days> = [];
    for (let i = 0; i < data.days.length; i += 7) {
      wks.push(data.days.slice(i, i + 7));
    }

    // Month labels with their column position
    const labels: Array<{ label: string; col: number }> = [];
    let lastMonth = -1;
    for (let w = 0; w < wks.length; w++) {
      const firstDay = wks[w][0];
      if (firstDay) {
        const month = new Date(firstDay.datum).getMonth();
        if (month !== lastMonth) {
          labels.push({ label: MONTHS[month], col: w });
          lastMonth = month;
        }
      }
    }

    return { weeks: wks, monthLabels: labels };
  }, [data]);

  if (!data) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-5 w-28 bg-white/5 rounded mb-4" />
        <div className="h-[120px] bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
        <Activity size={14} className="text-orange-400" /> Activiteit (365 dagen)
      </h3>

      {/* Scrollable container for mobile */}
      <div className="overflow-x-auto -mx-1 px-1 pb-2 scrollbar-none">
        <div className="inline-flex flex-col gap-1" style={{ minWidth: "max-content" }}>
          {/* Month labels */}
          <div className="relative flex gap-[3px] pl-7 mb-1 h-4">
            {monthLabels.map(({ label, col }, i) => (
              <div
                key={i}
                className="text-[9px] text-slate-500 absolute"
                style={{ left: `${col * 15 + 28}px` }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Grid: day labels + cells */}
          <div className="flex gap-0">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1.5 pt-0.5">
              {DAYS.map((d, i) => (
                <div key={i} className="h-[12px] flex items-center">
                  <span className="text-[8px] text-slate-600 w-5 text-right">{d}</span>
                </div>
              ))}
            </div>

            {/* Heatmap cells */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day: { datum: string; count: number; rate: number }, di: number) => {
                    const level = getHeatmapLevel(day.rate);
                    return (
                      <div
                        key={di}
                        className="w-[12px] h-[12px] rounded-[2px] transition-colors"
                        style={{ background: HEATMAP_COLORS[level] }}
                        title={`${day.datum}: ${day.count} habits (${Math.round(day.rate * 100)}%)`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-2 pl-7">
            <span className="text-[8px] text-slate-600">Minder</span>
            {HEATMAP_COLORS.map((color, i) => (
              <div
                key={i}
                className="w-[10px] h-[10px] rounded-[2px]"
                style={{ background: color }}
              />
            ))}
            <span className="text-[8px] text-slate-600">Meer</span>
          </div>
        </div>
      </div>
    </div>
  );
}
