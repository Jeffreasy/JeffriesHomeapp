"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Activity } from "lucide-react";
import { HEATMAP_COLORS, getHeatmapLevel } from "@/lib/habit-constants";
import { useGetHabitsHeatmap } from "@/lib/api/generated/habits/habits";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/Skeleton";
import { surfaceVariants } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

const MONTHS = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];
// Rij 0 is écht maandag: de reeks wordt terug-gepad tot de eerste maandag (M-D).
const WEEKDAYS = [
  { short: "Ma", label: "Maandag" },
  { short: "", label: "Dinsdag" },
  { short: "Wo", label: "Woensdag" },
  { short: "", label: "Donderdag" },
  { short: "Vr", label: "Vrijdag" },
  { short: "", label: "Zaterdag" },
  { short: "", label: "Zondag" },
] as const;

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

  // R3: open scrolled to "today" (the rightmost, most-recent column) instead of
  // a year ago on the far left.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!days.length) return;
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [days.length]);

  // M-E: één tabstop voor het hele grid — roving tabindex + pijltjes/Home/End
  // (zelfde patroon als de tabbalk op /habits).
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const effectiveFocusIndex = focusIndex ?? Math.max(0, days.length - 1);

  const focusCell = (index: number) => {
    const clamped = Math.max(0, Math.min(days.length - 1, index));
    setFocusIndex(clamped);
    document.getElementById(`habit-heatmap-cell-${clamped}`)?.focus();
  };

  const handleGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!days.length) return;

    let currentColumn = -1;
    let currentRow = -1;
    for (let column = 0; column < weeks.length; column += 1) {
      const row = weeks[column].findIndex((cell) => cell?.index === effectiveFocusIndex);
      if (row >= 0) {
        currentColumn = column;
        currentRow = row;
        break;
      }
    }
    if (currentColumn < 0 || currentRow < 0) return;

    let nextIndex: number | undefined;
    switch (event.key) {
      case "ArrowUp":
        nextIndex = weeks[currentColumn]?.[currentRow - 1]?.index;
        break;
      case "ArrowDown":
        nextIndex = weeks[currentColumn]?.[currentRow + 1]?.index;
        break;
      case "ArrowLeft":
        nextIndex = weeks[currentColumn - 1]?.[currentRow]?.index;
        break;
      case "ArrowRight":
        nextIndex = weeks[currentColumn + 1]?.[currentRow]?.index;
        break;
      case "Home":
        nextIndex = event.ctrlKey
          ? 0
          : weeks.find((week) => week[currentRow] !== null)?.[currentRow]?.index;
        break;
      case "End": {
        if (event.ctrlKey) {
          nextIndex = days.length - 1;
          break;
        }
        for (let column = weeks.length - 1; column >= 0; column -= 1) {
          const cell = weeks[column]?.[currentRow];
          if (cell) {
            nextIndex = cell.index;
            break;
          }
        }
        break;
      }
      default:
        return;
    }

    event.preventDefault();
    if (nextIndex !== undefined) focusCell(nextIndex);
  };

  if (!userId || isLoading) {
    return (
      <div className={`${surfaceVariants({ padding: "sm" })}`}>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[var(--color-text)]">
          <Activity size={14} className="text-[var(--color-primary)]" /> Activiteit (365
          dagen)
        </h3>
        <Skeleton className="h-[120px]" />
      </div>
    );
  }

  if (isError || !heatmapRaw) {
    return (
      <div className={surfaceVariants({ padding: "sm" })}>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[var(--color-text)]">
          <Activity size={14} className="text-[var(--color-primary)]" /> Activiteit (365
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
      <div className={surfaceVariants({ padding: "sm" })}>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[var(--color-text)]">
          <Activity size={14} className="text-[var(--color-primary)]" /> Activiteit (365
          dagen)
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Nog geen habit-activiteit om te tonen.
        </p>
      </div>
    );
  }

  return (
    <div className={surfaceVariants({ padding: "sm" })}>
      <h3 className="text-sm font-bold text-[var(--color-text)] mb-3 flex items-center gap-1.5">
        <Activity size={14} className="text-[var(--color-primary)]" /> Activiteit (365
        dagen)
      </h3>

      {/* Scrollable container for mobile */}
      <div ref={scrollRef} className="overflow-x-auto -mx-1 px-1 pb-2 scrollbar-none">
        <div
          className="inline-flex min-w-max flex-col gap-1"
        >
          {/* Month labels */}
          <div className="mb-1 flex h-4 gap-[3px] pl-7">
            {weeks.map((_, columnIndex) => {
              const monthLabel = monthLabels.find(({ col }) => col === columnIndex)?.label;
              return (
                <div
                  key={columnIndex}
                  className="w-11 shrink-0 text-micro text-[var(--color-text-muted)] pointer-fine:w-6"
                >
                  {monthLabel ?? ""}
                </div>
              );
            })}
          </div>

          {/* De DOM-rijen zijn ook de visuele weekdagen; pijlnavigatie volgt
              daardoor exact hetzelfde rij/kolommodel als het ARIA-grid. */}
          <div
            role="grid"
            aria-label="Habit-activiteit per dag, kolommen zijn weken"
            aria-rowcount={WEEKDAYS.length}
            aria-colcount={weeks.length}
            onKeyDown={handleGridKeyDown}
            className="flex flex-col gap-[3px]"
          >
            {WEEKDAYS.map((weekday, rowIndex) => (
              <div key={weekday.label} role="row" aria-rowindex={rowIndex + 1} className="flex gap-[3px]">
                <span
                  role="rowheader"
                  aria-label={weekday.label}
                  className="mr-1.5 flex h-11 w-5 shrink-0 items-center justify-end text-micro text-[var(--color-text-muted)] pointer-fine:h-6"
                >
                  {weekday.short}
                </span>
                {weeks.map((week, columnIndex) => {
                  const cell = week[rowIndex];
                  if (!cell) {
                    return (
                      <span
                        key={`pad-${columnIndex}`}
                        role="gridcell"
                        aria-colindex={columnIndex + 1}
                        aria-hidden="true"
                        className="h-11 w-11 shrink-0 pointer-fine:h-6 pointer-fine:w-6"
                      />
                    );
                  }

                  const { day, index } = cell;
                  const level = getHeatmapLevel(day.rate);
                  const dueText = typeof day.due === "number" ? `/${day.due}` : "";
                  const spokenDate = new Date(`${day.datum}T12:00:00`).toLocaleDateString("nl-NL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  });
                  const label = `${spokenDate}: ${day.count}${dueText} habits (${Math.round(day.rate * 100)}%)`;
                  const isSelected = selectedDay?.datum === day.datum;

                  return (
                    <button
                      key={day.datum}
                      type="button"
                      role="gridcell"
                      aria-colindex={columnIndex + 1}
                      id={`habit-heatmap-cell-${index}`}
                      tabIndex={index === effectiveFocusIndex ? 0 : -1}
                      onFocus={() => setFocusIndex(index)}
                      onClick={() => {
                        setFocusIndex(index);
                        setSelectedDay((previous) => previous?.datum === day.datum ? null : day);
                      }}
                      onKeyDown={(keyboardEvent) => {
                        if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                          keyboardEvent.preventDefault();
                          setSelectedDay((previous) => previous?.datum === day.datum ? null : day);
                        }
                      }}
                      aria-label={label}
                      aria-selected={isSelected}
                      className={cn(
                        "h-11 min-h-11 w-11 min-w-11 shrink-0 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] pointer-fine:h-6 pointer-fine:min-h-6 pointer-fine:w-6 pointer-fine:min-w-6",
                        isSelected && "ring-2 ring-[var(--color-primary)]",
                      )}
                      style={{ background: HEATMAP_COLORS[level] }}
                      title={label}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          {/* Detail van de aangetikte dag */}
          {selectedDay && (
            <p
              className="mt-2 pl-7 text-micro text-[var(--color-text)]"
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
            <span className="text-micro text-[var(--color-text-muted)]">Minder</span>
            {HEATMAP_COLORS.map((color, i) => (
              <div
                key={i}
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: color }}
              />
            ))}
            <span className="text-micro text-[var(--color-text-muted)]">Meer</span>
          </div>
        </div>
      </div>
    </div>
  );
}
