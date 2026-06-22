"use client";

import { useMemo } from "react";
import { Activity } from "lucide-react";
import { HEATMAP_COLORS, getHeatmapLevel } from "@/lib/habit-constants";
import { useGetHabitsHeatmap } from "@/lib/api/generated/habits/habits";
import { useUser } from "@clerk/nextjs";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
];
const DAYS = ["", "Ma", "", "Wo", "", "Vr", ""];

type HeatmapDay = {
  datum: string;
  count: number;
  due?: number;
  rate: number;
};

type HeatmapResponse = HeatmapDay[] | { days?: HeatmapDay[] };

/**
 * HabitHeatmap — GitHub-style contribution heatmap.
 * Mobile-first: horizontally scrollable, touch-friendly tooltips.
 */
export function HabitHeatmap() {
  const { user } = useUser();
  const userId = user?.id ?? "";

  const {
    data: heatmapRaw,
    isLoading,
    isError,
  } = useGetHabitsHeatmap(
    { userId, days: 365 },
    { query: { enabled: !!userId } },
  );

  const days = useMemo<HeatmapDay[]>(() => {
    const raw = heatmapRaw?.data as HeatmapResponse | undefined;
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.days)) return raw.days;
    return [];
  }, [heatmapRaw]);

  const { weeks, monthLabels } = useMemo(() => {
    if (!days.length) return { weeks: [], monthLabels: [] };

    // Group into weeks (7 days each)
    const wks: HeatmapDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      wks.push(days.slice(i, i + 7));
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
  }, [days]);

  if (!userId || isLoading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-200">
          <Activity size={14} className="text-orange-400" /> Activiteit (365
          dagen)
        </h3>
        <div className="h-[120px] bg-[rgba(255,255,255,0.05)] rounded-xl" />
      </div>
    );
  }

  if (isError || !heatmapRaw) {
    return (
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-200">
          <Activity size={14} className="text-orange-400" /> Activiteit (365
          dagen)
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Heatmap kon niet worden geladen.
        </p>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-200">
          <Activity size={14} className="text-orange-400" /> Activiteit (365
          dagen)
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Nog geen habit-activiteit om te tonen.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4">
      <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
        <Activity size={14} className="text-orange-400" /> Activiteit (365
        dagen)
      </h3>

      {/* Scrollable container for mobile */}
      <div className="overflow-x-auto -mx-1 px-1 pb-2 scrollbar-none">
        <div
          className="inline-flex flex-col gap-1"
          style={{ minWidth: "max-content" }}
        >
          {/* Month labels */}
          <div className="relative flex gap-[3px] pl-7 mb-1 h-4">
            {monthLabels.map(({ label, col }, i) => (
              <div
                key={i}
                className="text-[9px] text-[var(--color-text-muted)] absolute"
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
                  <span className="text-[8px] text-[var(--color-text-muted)] w-5 text-right">
                    {d}
                  </span>
                </div>
              ))}
            </div>

            {/* Heatmap cells */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => {
                    const level = getHeatmapLevel(day.rate);
                    const dueText =
                      typeof day.due === "number" ? `/${day.due}` : "";
                    return (
                      <div
                        key={di}
                        className="w-[12px] h-[12px] rounded-[2px] transition-colors"
                        style={{ background: HEATMAP_COLORS[level] }}
                        title={`${day.datum}: ${day.count}${dueText} habits (${Math.round(day.rate * 100)}%)`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-2 pl-7">
            <span className="text-[8px] text-[var(--color-text-muted)]">Minder</span>
            {HEATMAP_COLORS.map((color, i) => (
              <div
                key={i}
                className="w-[10px] h-[10px] rounded-[2px]"
                style={{ background: color }}
              />
            ))}
            <span className="text-[8px] text-[var(--color-text-muted)]">Meer</span>
          </div>
        </div>
      </div>
    </div>
  );
}
