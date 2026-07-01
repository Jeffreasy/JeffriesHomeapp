"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";

import { isPeriodSatisfied, useHabits, type HabitCreateData } from "@/hooks/useHabits";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

import { HabitForm } from "@/components/habits/HabitForm";
import { HabitHeatmap } from "@/components/habits/HabitHeatmap";
import { IncidentUndoSnackbar } from "@/components/habits/IncidentUndoSnackbar";
import { HabitStats } from "@/components/habits/HabitStats";
import { BadgeShowcase } from "@/components/habits/BadgeShowcase";

import {
  type TabId,
  TABS,
  todayStr,
  shiftDate,
} from "@/components/habits/HabitsUtils";
import { HabitsHeader } from "@/components/habits/HabitsHeader";
import { HabitsDashboardSummary } from "@/components/habits/HabitsDashboardSummary";
import { HabitsVandaagTab } from "@/components/habits/HabitsVandaagTab";
import { HabitsOverzichtTab } from "@/components/habits/HabitsOverzichtTab";
import { cn } from "@/lib/utils";

export default function HabitsPage() {
  const [selectedDate, setSelectedDate] = useState("");
  const [currentToday, setCurrentToday] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("vandaag");
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [lastIncident, setLastIncident] = useState<{
    habitId: string;
    datum: string;
    naam: string;
  } | null>(null);
  const { hidden: privacyOn, toggle: togglePrivacy } = usePrivacy("habits");
  const { success, error: toastError } = useToast();
  const { openConfirm } = useConfirm();

  // Recompute "today" on a minute interval AND on visibilitychange (M6): a PWA
  // left open past midnight must not keep writing check-offs to yesterday. When
  // the user hasn't navigated away from "today", the selected date follows the
  // rollover too.
  const lastTodayRef = useRef("");
  useEffect(() => {
    const update = () => {
      const next = todayStr();
      setCurrentToday(next);
      setSelectedDate((prev) =>
        prev === "" || prev === lastTodayRef.current ? next : prev,
      );
      lastTodayRef.current = next;
    };
    // setTimeout(0) keeps the first client-only value out of hydration.
    const timeout = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const {
    todayHabits,
    todaySummary,
    habits,
    stats,
    level,
    create,
    update,
    toggle,
    increment,
    incident,
    removeIncident,
    pause,
    archive,
    remove,
    isLoading,
    pendingHabitIds,
    announcement,
  } = useHabits(selectedDate || undefined);

  const activeDate = selectedDate || currentToday;
  const isToday = !!selectedDate && selectedDate === currentToday;
  const disableNext =
    !!selectedDate && !!currentToday && selectedDate >= currentToday;
  // Backend accepts incidents max 30 days back (and never in the future) —
  // disable the button beyond that window instead of letting the call 400.
  const incidentAllowed =
    !!activeDate &&
    !!currentToday &&
    activeDate <= currentToday &&
    activeDate >= shiftDate(currentToday, -30);
  const completionPct = Math.round(todaySummary.rate * 100);

  const groupedHabits = useMemo(() => {
    const actief = habits.filter((h) => h.isActief && !h.isPauze);
    const gepauzeerd = habits.filter((h) => h.isActief && h.isPauze);
    return { actief, gepauzeerd };
  }, [habits]);

  const dayHealth = useMemo(() => {
    const incidents = todayHabits.filter((h) => h.log?.isIncident).length;
    const negativeClear = todayHabits.filter(
      (h) => h.type === "negatief" && !h.log?.isIncident,
    ).length;
    const openPositive = todayHabits.filter(
      // N5: week/maand-habits met een gehaald periodedoel tellen niet als open.
      (h) => h.type === "positief" && !h.log?.voltooid && !isPeriodSatisfied(h),
    ).length;
    return { incidents, negativeClear, openPositive };
  }, [todayHabits]);

  const editingInitial = useMemo(
    () =>
      habits.find((h) => h._id === editingHabit) as
        | Partial<HabitCreateData>
        | undefined,
    [editingHabit, habits],
  );

  const handleCreate = async (data: HabitCreateData) => {
    try {
      await create(data);
      success("Habit toegevoegd");
    } catch (error) {
      toastError("Habit toevoegen is mislukt");
      throw error;
    }
  };

  const handleEdit = async (data: HabitCreateData) => {
    if (!editingHabit) return;
    const habitId = editingHabit;
    try {
      await update(habitId, data);
      success("Habit opgeslagen");
    } catch (error) {
      toastError("Habit opslaan is mislukt");
      throw error;
    }
  };

  const requestDelete = useCallback(
    async (id: string) => {
      const confirmed = await openConfirm({
        title: "Habit verwijderen?",
        message: "Logs, streaks en badges worden verwijderd.",
        confirmLabel: "Verwijderen",
        variant: "danger",
      });
      if (!confirmed) return;
      try {
        await remove(id);
        success("Habit verwijderd");
      } catch {
        toastError("Habit verwijderen is mislukt");
      }
    },
    [openConfirm, remove, success, toastError],
  );

  // Incident logging with undo (H5): remember the last logged incident so the
  // snackbar can DELETE it again (with the exact same datum) in one tap.
  const handleIncident = useCallback(
    async (id: string, trigger?: string, notitie?: string) => {
      const datum = activeDate || todayStr();
      const ok = await incident(id, trigger, notitie);
      if (ok) {
        const habit = habits.find((h) => h._id === id);
        setLastIncident({ habitId: id, datum, naam: habit?.naam ?? "habit" });
      }
    },
    [activeDate, habits, incident],
  );

  const handleUndoIncident = useCallback(async () => {
    if (!lastIncident) return;
    const ok = await removeIncident(lastIncident.habitId, lastIncident.datum);
    if (ok) success("Incident verwijderd");
    setLastIncident(null);
  }, [lastIncident, removeIncident, success]);

  // Explicit removal from a card that already shows an incident (H5) — the
  // indicator is no longer a dead end. Uses the selected date, guarded by the
  // shared ConfirmDialog.
  const handleRemoveIncident = useCallback(
    async (id: string) => {
      const confirmed = await openConfirm({
        title: "Incident verwijderen?",
        message:
          "De incident-registratie voor deze dag wordt verwijderd en je streak wordt opnieuw berekend.",
        confirmLabel: "Verwijderen",
        variant: "danger",
      });
      if (!confirmed) return;
      const ok = await removeIncident(id);
      if (ok) {
        success("Incident verwijderd");
        setLastIncident((prev) => (prev?.habitId === id ? null : prev));
      }
    },
    [openConfirm, removeIncident, success],
  );

  const moveDate = (days: number) => {
    setSelectedDate((date) => shiftDate(date || todayStr(), days));
  };

  const resetDate = () => setSelectedDate(todayStr());

  const handleTabKeyDown = (
    e: ReactKeyboardEvent<HTMLButtonElement>,
    id: TabId,
  ) => {
    const index = TABS.findIndex((t) => t.id === id);
    if (index === -1) return;
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (index + 1) % TABS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = TABS.length - 1;
    }
    if (nextIndex === null) return;
    e.preventDefault();
    const nextTab = TABS[nextIndex];
    setActiveTab(nextTab.id);
    document.getElementById(`habits-tab-${nextTab.id}`)?.focus();
  };

  return (
    <div className="text-slate-100">
      {/* Polite live region: optimistische toggle-resultaten voor screenreaders. */}
      <span aria-live="polite" role="status" className="sr-only">
        {announcement}
      </span>
      <HabitsHeader
        level={level}
        stats={stats}
        privacyOn={privacyOn}
        togglePrivacy={togglePrivacy}
        setShowForm={setShowForm}
      />

      <main className="mx-auto max-w-7xl px-4 py-5 pb-28 sm:px-6">
        <HabitsDashboardSummary
          activeDate={activeDate}
          currentToday={currentToday}
          isToday={isToday}
          disableNext={disableNext}
          moveDate={moveDate}
          resetDate={resetDate}
          todaySummary={todaySummary}
          completionPct={completionPct}
          privacyOn={privacyOn}
          groupedHabits={groupedHabits}
          dayHealth={dayHealth}
          habits={habits}
        />

        <div
          role="tablist"
          aria-label="Habit onderdelen"
          className="mt-5 grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                id={`habits-tab-${id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`habits-tabpanel-${id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(id)}
                onKeyDown={(e) => handleTabKeyDown(e, id)}
                className={cn(
                  "relative flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/40 sm:gap-2 sm:text-sm",
                  isActive
                    ? "text-amber-200"
                    : "text-slate-500 hover:text-slate-300",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="habits-tab"
                    className="absolute inset-0 rounded-md border border-amber-500/20 bg-amber-500/10"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "vandaag" && (
            <motion.section
              key="vandaag"
              id="habits-tabpanel-vandaag"
              role="tabpanel"
              aria-labelledby="habits-tab-vandaag"
              tabIndex={0}
              className="focus:outline-none"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HabitsVandaagTab
                todayHabits={todayHabits}
                isLoading={isLoading}
                isToday={isToday}
                setShowForm={setShowForm}
                privacyOn={privacyOn}
                toggle={toggle}
                increment={increment}
                incident={handleIncident}
                removeIncident={handleRemoveIncident}
                incidentAllowed={incidentAllowed}
                pause={pause}
                archive={archive}
                setConfirmDelete={requestDelete}
                setEditingHabit={setEditingHabit}
                dayHealth={dayHealth}
                stats={stats}
                habits={habits}
                pendingHabitIds={pendingHabitIds}
              />
            </motion.section>
          )}

          {activeTab === "overzicht" && (
            <motion.section
              key="overzicht"
              id="habits-tabpanel-overzicht"
              role="tabpanel"
              aria-labelledby="habits-tab-overzicht"
              tabIndex={0}
              className="focus:outline-none"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HabitsOverzichtTab
                groupedHabits={groupedHabits}
                isLoading={isLoading}
                setShowForm={setShowForm}
                privacyOn={privacyOn}
                toggle={toggle}
                increment={increment}
                incident={handleIncident}
                removeIncident={handleRemoveIncident}
                incidentAllowed={incidentAllowed}
                pause={pause}
                archive={archive}
                setConfirmDelete={requestDelete}
                setEditingHabit={setEditingHabit}
                dayHealth={dayHealth}
                habits={habits}
                todayHabits={todayHabits}
                pendingHabitIds={pendingHabitIds}
              />
            </motion.section>
          )}

          {activeTab === "stats" && (
            <motion.section
              key="stats"
              id="habits-tabpanel-stats"
              role="tabpanel"
              aria-labelledby="habits-tab-stats"
              tabIndex={0}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-5 grid gap-4 focus:outline-none xl:grid-cols-[minmax(0,420px)_1fr]"
            >
              <div className="space-y-4">
                <HabitStats masked={privacyOn} />
                <BadgeShowcase />
              </div>
              <div className="min-w-0">
                <HabitHeatmap />
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <motion.button
        type="button"
        onClick={() => setShowForm(true)}
        aria-label="Habit toevoegen"
        title="Habit toevoegen"
        className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-transform"
        style={{ bottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.04 }}
      >
        <Plus size={24} />
      </motion.button>

      <IncidentUndoSnackbar
        incident={lastIncident}
        masked={privacyOn}
        onUndo={handleUndoIncident}
        onDismiss={() => setLastIncident(null)}
      />

      <HabitForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreate}
      />

      {editingHabit && (
        <HabitForm
          open={!!editingHabit}
          onClose={() => setEditingHabit(null)}
          onSubmit={handleEdit}
          initial={editingInitial}
        />
      )}
    </div>
  );
}
