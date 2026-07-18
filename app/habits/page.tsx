"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { isPeriodSatisfied, useHabits, type HabitCreateData } from "@/hooks/useHabits";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

import { HabitForm } from "@/components/habits/HabitForm";
import { HabitHeatmap } from "@/components/habits/HabitHeatmap";
import { IncidentUndoToast } from "@/components/habits/IncidentUndoToast";
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
import { Tabs, tabPanelAttributes, tabPanelFocusClasses } from "@/components/ui/Tabs";
import { AppPageShell, PageToolbar } from "@/components/layout/AppPageShell";
import { formatLevel, formatXP } from "@/lib/habit-constants";

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
  const { hidden: privacyOn, toggle: togglePrivacy, isServerUnknown: isPrivacyUnknown } = usePrivacy("habits");
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

  // Pause honesty (R3): pausing does NOT protect the streak — paused days still
  // count in the streak calculation — so warn before pausing (never on resume).
  // The backend is improving the semantics; until then this stops the opposite
  // expectation the bare "Pauzeren" action created.
  const handlePause = useCallback(
    async (id: string) => {
      const habit = habits.find((h) => h._id === id);
      if (habit?.isPauze) {
        // Resuming needs no warning.
        pause(id);
        return;
      }
      const confirmed = await openConfirm({
        title: "Habit pauzeren?",
        message:
          "Let op: gepauzeerde dagen tellen mee voor je streak-berekening.",
        confirmLabel: "Pauzeren",
      });
      if (!confirmed) return;
      pause(id);
    },
    [habits, openConfirm, pause],
  );

  const moveDate = (days: number) => {
    setSelectedDate((date) => shiftDate(date || todayStr(), days));
  };

  const resetDate = () => setSelectedDate(todayStr());

  return (
    <AppPageShell width="wide" className="text-[var(--color-text)]">
      {/* Polite live region: optimistische toggle-resultaten voor screenreaders. */}
      <span aria-live="polite" role="status" className="sr-only">
        {announcement}
      </span>
      <HabitsHeader
        privacyOn={privacyOn}
        isPrivacyUnknown={isPrivacyUnknown}
        togglePrivacy={togglePrivacy}
        setShowForm={setShowForm}
      />

      <PageToolbar label="Habit niveau en voortgang" className="mt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 px-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Niveau
            </span>
            <strong className="truncate text-sm font-semibold text-[var(--color-text)]">
              {privacyOn ? "Verborgen" : formatLevel(level.level, level.titel)}
            </strong>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              Ervaring
            </span>
            <strong className="text-sm font-semibold text-[var(--color-warning)]">
              {privacyOn ? "••••" : formatXP(stats?.totaalXP ?? 0)}
            </strong>
          </div>
        </div>
      </PageToolbar>

      <div className="mt-4">
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

        <Tabs
          items={TABS}
          value={activeTab}
          onValueChange={setActiveTab}
          idPrefix="habits"
          ariaLabel="Habit onderdelen"
          appearance="contained"
          className="mt-5"
        />

        <AnimatePresence mode="wait">
          {activeTab === "vandaag" && (
            <motion.section
              key="vandaag"
              {...tabPanelAttributes("habits", "vandaag")}
              className={tabPanelFocusClasses}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HabitsVandaagTab
                todayHabits={todayHabits}
                isLoading={isLoading}
                isToday={isToday}
                activeDate={activeDate}
                setShowForm={setShowForm}
                privacyOn={privacyOn}
                toggle={toggle}
                increment={increment}
                incident={handleIncident}
                removeIncident={handleRemoveIncident}
                incidentAllowed={incidentAllowed}
                pause={handlePause}
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
              {...tabPanelAttributes("habits", "overzicht")}
              className={tabPanelFocusClasses}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HabitsOverzichtTab
                groupedHabits={groupedHabits}
                isLoading={isLoading}
                activeDate={activeDate}
                setShowForm={setShowForm}
                privacyOn={privacyOn}
                toggle={toggle}
                increment={increment}
                incident={handleIncident}
                removeIncident={handleRemoveIncident}
                incidentAllowed={incidentAllowed}
                pause={handlePause}
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
              {...tabPanelAttributes("habits", "stats")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`${tabPanelFocusClasses} mt-5 grid gap-4 xl:grid-cols-[minmax(0,420px)_1fr]`}
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
      </div>

      <IncidentUndoToast
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
    </AppPageShell>
  );
}
