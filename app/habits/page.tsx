"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";

import { useHabits, type HabitCreateData } from "@/hooks/useHabits";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

import { HabitForm } from "@/components/habits/HabitForm";
import { HabitHeatmap } from "@/components/habits/HabitHeatmap";
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
  const [activeTab, setActiveTab] = useState<TabId>("vandaag");
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const { hidden: privacyOn, toggle: togglePrivacy } = usePrivacy("habits");
  const { success, error: toastError } = useToast();
  const { openConfirm } = useConfirm();

  useEffect(() => {
    const timeout = window.setTimeout(() => setSelectedDate(todayStr()), 0);
    return () => window.clearTimeout(timeout);
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
    pause,
    archive,
    remove,
    isLoading,
    pendingHabitId,
  } = useHabits(selectedDate || undefined);

  const currentToday = useMemo(
    () => (selectedDate ? todayStr() : ""),
    [selectedDate],
  );
  const activeDate = selectedDate || currentToday;
  const isToday = !!selectedDate && selectedDate === currentToday;
  const disableNext =
    !!selectedDate && !!currentToday && selectedDate >= currentToday;
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
      (h) => h.type === "positief" && !h.log?.voltooid,
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
                incident={incident}
                pause={pause}
                archive={archive}
                setConfirmDelete={requestDelete}
                setEditingHabit={setEditingHabit}
                dayHealth={dayHealth}
                stats={stats}
                habits={habits}
                pendingHabitId={pendingHabitId}
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
                incident={incident}
                pause={pause}
                archive={archive}
                setConfirmDelete={requestDelete}
                setEditingHabit={setEditingHabit}
                dayHealth={dayHealth}
                habits={habits}
                todayHabits={todayHabits}
                pendingHabitId={pendingHabitId}
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
