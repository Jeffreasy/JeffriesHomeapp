"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, CalendarCheck, BarChart3, LayoutGrid, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { HabitCard } from "@/components/habits/HabitCard";
import { HabitForm } from "@/components/habits/HabitForm";
import { HabitHeatmap } from "@/components/habits/HabitHeatmap";
import { HabitStats } from "@/components/habits/HabitStats";
import { BadgeShowcase } from "@/components/habits/BadgeShowcase";
import { formatLevel, formatXP } from "@/lib/habit-constants";
import type { HabitCreateData } from "@/hooks/useHabits";
import type { Id } from "@/convex/_generated/dataModel";

type TabId = "vandaag" | "overzicht" | "stats";

const TABS: Array<{ id: TabId; label: string; icon: typeof Target }> = [
  { id: "vandaag",   label: "Vandaag",      icon: CalendarCheck },
  { id: "overzicht", label: "Overzicht",    icon: LayoutGrid },
  { id: "stats",     label: "Statistieken", icon: BarChart3 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string): string {
  const today = todayStr();
  if (dateStr === today) return "Vandaag";
  if (dateStr === shiftDate(today, -1)) return "Gisteren";
  if (dateStr === shiftDate(today, 1)) return "Morgen";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HabitsPage() {
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const {
    todayHabits, todaySummary, todayDienst,
    habits, stats, level,
    create, update, toggle, increment, incident, pause, archive, remove,
    isLoading,
  } = useHabits(selectedDate);

  const [activeTab, setActiveTab] = useState<TabId>("vandaag");
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Id<"habits"> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Id<"habits"> | null>(null);

  const isToday = selectedDate === todayStr();
  const isFuture = selectedDate > todayStr();

  // Groepeer habits voor Overzicht tab
  const groupedHabits = useMemo(() => {
    const actief = habits.filter((h) => h.isActief && !h.isPauze);
    const gepauzeerd = habits.filter((h) => h.isActief && h.isPauze);
    return { actief, gepauzeerd };
  }, [habits]);

  const handleCreate = (data: HabitCreateData) => {
    create(data);
  };

  const handleEdit = (data: HabitCreateData) => {
    if (editingHabit) {
      update(editingHabit, data);
      setEditingHabit(null);
    }
  };

  const handleDelete = () => {
    if (confirmDelete) {
      remove(confirmDelete);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="min-h-dvh pb-32 md:pb-8 px-4 md:px-0">
      {/* Header */}
      <div className="pt-6 pb-4 md:pt-8 md:pb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
              <Target size={20} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">Habits</h1>
              <p className="text-[11px] text-slate-500">
                {formatLevel(level.level, level.titel)} · {formatXP(stats?.totaalXP ?? 0)}
              </p>
            </div>
          </div>

          {todayDienst && (
            <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/15">
              <span className="text-[10px] text-blue-400 font-medium">
                {todayDienst.shiftType} dienst
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-2" style={{ background: "rgba(10,10,15,0.92)", backdropFilter: "blur(16px)" }}>
        <div className="flex gap-1 p-1 bg-white/3 rounded-xl">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 relative py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all min-h-[44px]"
              style={{ color: activeTab === id ? "#f97316" : "#64748b" }}
            >
              {activeTab === id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: "rgba(249,115,22,0.08)",
                    border: "1px solid rgba(249,115,22,0.12)",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={14} />
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          {/* ─── Vandaag Tab ─── */}
          {activeTab === "vandaag" && (
            <motion.div
              key="vandaag"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              {/* Date navigation */}
              <div className="flex items-center justify-between py-2">
                <button
                  onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center hover:bg-white/8 transition-colors active:scale-90 cursor-pointer"
                >
                  <ChevronLeft size={18} className="text-slate-400" />
                </button>

                <button
                  onClick={() => setSelectedDate(todayStr())}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                  style={{
                    background: isToday ? "rgba(249,115,22,0.10)" : "rgba(255,255,255,0.05)",
                    border: isToday ? "1px solid rgba(249,115,22,0.15)" : "1px solid rgba(255,255,255,0.08)",
                    color: isToday ? "#f97316" : "#cbd5e1",
                  }}
                >
                  {formatDateLabel(selectedDate)}
                </button>

                <button
                  onClick={() => !isFuture && setSelectedDate((d) => shiftDate(d, 1))}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center transition-colors active:scale-90"
                  style={{
                    opacity: isFuture ? 0.3 : 1,
                    cursor: isFuture ? "not-allowed" : "pointer",
                  }}
                  disabled={isFuture}
                >
                  <ChevronRight size={18} className="text-slate-400" />
                </button>
              </div>

              {/* Progress bar */}
              {todayHabits.length > 0 && (
                <div className="px-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-500">
                      {todaySummary.completed}/{todaySummary.due} voltooid
                    </span>
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: todaySummary.rate === 1 ? "#22c55e" : "#f97316" }}
                    >
                      {Math.round(todaySummary.rate * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: todaySummary.rate === 1 ? "#22c55e" : "#f97316" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(todaySummary.rate * 100)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}

              {/* Habit cards */}
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : todayHabits.length === 0 ? (
                <div className="text-center py-12">
                  <Target size={40} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-sm text-slate-500">
                    {isToday ? "Geen habits voor vandaag" : `Geen habits voor ${formatDateLabel(selectedDate)}`}
                  </p>
                  {isToday && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="mt-4 px-6 py-3 rounded-xl bg-orange-500/15 text-orange-400 text-sm font-medium border border-orange-500/20 hover:bg-orange-500/20 transition-all"
                    >
                      <Plus size={14} className="inline mr-1.5" />
                      Eerste habit maken
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {todayHabits.map((habit) => (
                    <HabitCard
                      key={habit._id}
                      habit={habit}
                      onToggle={() => toggle(habit._id)}
                      onIncrement={(stap) => increment(habit._id, stap)}
                      onIncident={(trigger, notitie) => incident(habit._id, trigger, notitie)}
                      onPause={() => pause(habit._id)}
                      onArchive={() => archive(habit._id)}
                      onRemove={() => setConfirmDelete(habit._id)}
                      onEdit={() => setEditingHabit(habit._id)}
                    />
                  ))}
                </div>
              )}

              {/* Create CTA */}
              {todayHabits.length > 0 && todayHabits.length < 3 && isToday && (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-white/8 text-slate-500 text-sm font-medium hover:border-orange-500/20 hover:text-orange-400 transition-all min-h-[56px] active:scale-[0.98]"
                >
                  <Plus size={16} className="inline mr-2" />
                  Habit toevoegen
                </button>
              )}
            </motion.div>
          )}

          {/* ─── Overzicht Tab ─── */}
          {activeTab === "overzicht" && (
            <motion.div
              key="overzicht"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : habits.length === 0 ? (
                <div className="text-center py-12">
                  <Target size={40} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-sm text-slate-500">Nog geen habits aangemaakt</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 px-6 py-3 rounded-xl bg-orange-500/15 text-orange-400 text-sm font-medium border border-orange-500/20 hover:bg-orange-500/20 transition-all"
                  >
                    <Plus size={14} className="inline mr-1.5" />
                    Eerste habit maken
                  </button>
                </div>
              ) : (
                <>
                  {/* Actieve habits */}
                  {groupedHabits.actief.length > 0 && (
                    <div>
                      <h3 className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-2 px-1">
                        Actief ({groupedHabits.actief.length})
                      </h3>
                      <div className="space-y-2">
                        {groupedHabits.actief.map((habit) => (
                          <HabitCard
                            key={habit._id}
                            habit={{ ...habit, log: null }}
                            onToggle={() => toggle(habit._id)}
                            onIncrement={(stap) => increment(habit._id, stap)}
                            onIncident={(trigger, notitie) => incident(habit._id, trigger, notitie)}
                            onPause={() => pause(habit._id)}
                            onArchive={() => archive(habit._id)}
                            onRemove={() => setConfirmDelete(habit._id)}
                            onEdit={() => setEditingHabit(habit._id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gepauzeerde habits */}
                  {groupedHabits.gepauzeerd.length > 0 && (
                    <div>
                      <h3 className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-2 px-1">
                        Gepauzeerd ({groupedHabits.gepauzeerd.length})
                      </h3>
                      <div className="space-y-2 opacity-60">
                        {groupedHabits.gepauzeerd.map((habit) => (
                          <HabitCard
                            key={habit._id}
                            habit={{ ...habit, log: null }}
                            onToggle={() => {}}
                            onIncrement={() => {}}
                            onIncident={() => {}}
                            onPause={() => pause(habit._id)}
                            onArchive={() => archive(habit._id)}
                            onRemove={() => setConfirmDelete(habit._id)}
                            onEdit={() => setEditingHabit(habit._id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ─── Stats Tab ─── */}
          {activeTab === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <HabitStats />
              <HabitHeatmap />
              <BadgeShowcase />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FAB */}
      <motion.button
        onClick={() => setShowForm(true)}
        className="fixed right-4 z-40 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 active:scale-90 transition-transform"
        style={{
          bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
          background: "linear-gradient(135deg, #f97316, #f59e0b)",
        }}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
      >
        <Plus size={24} className="text-white" />
      </motion.button>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div
              key="delete-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              key="delete-dialog"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto rounded-2xl p-6"
              style={{
                background: "rgba(20, 20, 28, 0.98)",
                border: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/12 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Habit verwijderen?</h3>
                  <p className="text-[11px] text-slate-500">Alle logs, streaks en badges worden verwijderd.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/8 text-slate-300 hover:bg-white/8 transition-all min-h-[44px] cursor-pointer"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500/15 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all min-h-[44px] cursor-pointer"
                >
                  Verwijderen
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create form */}
      <HabitForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreate}
      />

      {/* Edit form */}
      {editingHabit && (
        <HabitForm
          open={!!editingHabit}
          onClose={() => setEditingHabit(null)}
          onSubmit={handleEdit}
          initial={habits.find((h) => h._id === editingHabit) as Partial<HabitCreateData> | undefined}
        />
      )}
    </div>
  );
}
