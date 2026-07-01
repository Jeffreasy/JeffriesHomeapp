"use client";

import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
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
// Rij 0 is écht maandag: de reeks wordt terug-gepad tot de eerste maandag (M-D).
const DAYS = ["Ma", "", "Wo", "", "Vr", "", ""];

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
  // Tap/klik-detail (H8): title-tooltips bestaan niet op touch, dus een
  // geselecteerde cel toont zijn gegevens in een regel onder het grid.
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

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

  type HeatmapCell = { day: HeatmapDay; index: number } | null;

  const { weeks, monthLabels } = useMemo(() => {
    if (!days.length) {
      return { weeks: [] as HeatmapCell[][], monthLabels: [] as Array<{ label: string; col: number }> };
    }

    // M-D: pad de reeks terug tot de eerste maandag, zodat rij 0 van elke
    // kolom écht "Ma" is (voorheen kloppen de weekdagrijen 6/7 van de tijd niet).
    const firstDate = new Date(`${days[0].datum}T12:00:00`);
    const mondayOffset = Number.isNaN(firstDate.getTime())
      ? 0
      : (firstDate.getDay() + 6) % 7; // 0 = maandag
    const cells: HeatmapCell[] = [
      ...Array.from({ length: mondayOffset }, () => null),
      ...days.map((day, index) => ({ day, index })),
    ];

    // Group into weeks (7 rows each; column = week, row = weekday)
    const wks: HeatmapCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      wks.push(cells.slice(i, i + 7));
    }

    // Month labels with their column position
    const labels: Array<{ label: string; col: number }> = [];
    let lastMonth = -1;
    for (let w = 0; w < wks.length; w++) {
      const firstDay = wks[w].find((cell) => cell !== null);
      if (firstDay) {
        const month = new Date(firstDay.day.datum).getMonth();
        if (month !== lastMonth) {
          labels.push({ label: MONTHS[month], col: w });
          lastMonth = month;
        }
      }
    }

    return { weeks: wks, monthLabels: labels };
  }, [days]);

  // M-E: één tabstop voor het hele grid — roving tabindex + pijltjes/Home/End
  // (zelfde patroon als de tabbalk op /habits).
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const effectiveFocusIndex = focusIndex ?? Math.max(0, days.length - 1);

  const focusCell = (index: number) => {
    const clamped = Math.max(0, Math.min(days.length - 1, index));
    setFocusIndex(clamped);
    document.getElementById(`habit-heatmap-cell-${clamped}`)?.focus();
  };

  const handleGridKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!days.length) return;
    let next: number | null = null;
    switch (e.key) {
      case "ArrowUp": next = effectiveFocusIndex - 1; break;
      case "ArrowDown": next = effectiveFocusIndex + 1; break;
      case "ArrowLeft": next = effectiveFocusIndex - 7; break;
      case "ArrowRight": next = effectiveFocusIndex + 7; break;
      case "Home": next = 0; break;
      case "End": next = days.length - 1; break;
      default: return;
    }
    e.preventDefault();
    focusCell(next);
  };

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

            {/* Heatmap cells — role=grid met roving tabindex (M-E) */}
            <div
              role="grid"
              aria-label="Habit-activiteit per dag, kolommen zijn weken"
              onKeyDown={handleGridKeyDown}
              className="flex gap-[3px]"
            >
              {weeks.map((week, wi) => (
                <div key={wi} role="row" className="flex flex-col gap-[3px]">
                  {week.map((cell, di) => {
                    if (!cell) {
                      // Pad-cel vóór de eerste datum (uitlijning op maandag).
                      return (
                        <div
                          key={`pad-${di}`}
                          role="gridcell"
                          aria-hidden="true"
                          className="w-[12px] h-[12px]"
                        />
                      );
                    }
                    const { day, index } = cell;
                    const level = getHeatmapLevel(day.rate);
                    const dueText =
                      typeof day.due === "number" ? `/${day.due}` : "";
                    const label = `${day.datum}: ${day.count}${dueText} habits (${Math.round(day.rate * 100)}%)`;
                    const isSelected = selectedDay?.datum === day.datum;
                    return (
                      <button
                        key={di}
                        type="button"
                        role="gridcell"
                        id={`habit-heatmap-cell-${index}`}
                        tabIndex={index === effectiveFocusIndex ? 0 : -1}
                        onFocus={() => setFocusIndex(index)}
                        onClick={() => {
                          setFocusIndex(index);
                          setSelectedDay((prev) =>
                            prev?.datum === day.datum ? null : day,
                          );
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedDay((prev) =>
                              prev?.datum === day.datum ? null : day,
                            );
                          }
                        }}
                        aria-label={label}
                        aria-selected={isSelected}
                        className="w-[12px] h-[12px] rounded-[2px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
                        style={{
                          background: HEATMAP_COLORS[level],
                          boxShadow: isSelected
                            ? "0 0 0 1.5px rgba(251,191,36,0.9)"
                            : undefined,
                        }}
                        title={label}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Detail van de aangetikte dag */}
          {selectedDay && (
            <p
              className="mt-2 pl-7 text-[11px] text-slate-300"
              role="status"
              aria-live="polite"
            >
              <span className="font-semibold">
                {new Date(`${selectedDay.datum}T12:00:00`).toLocaleDateString("nl-NL", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              {" · "}
              {selectedDay.count}
              {typeof selectedDay.due === "number" ? `/${selectedDay.due}` : ""} habits
              {" · "}
              {Math.round(selectedDay.rate * 100)}% voltooid
            </p>
          )}

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
