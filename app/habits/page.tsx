"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, CalendarCheck, BarChart3, LayoutGrid } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { HabitCard } from "@/components/habits/HabitCard";
import { HabitForm } from "@/components/habits/HabitForm";
import { HabitHeatmap } from "@/components/habits/HabitHeatmap";
import { HabitStats } from "@/components/habits/HabitStats";
import { BadgeShowcase } from "@/components/habits/BadgeShowcase";
import { DailyChecklist } from "@/components/habits/DailyChecklist";
import { formatLevel, formatXP } from "@/lib/habit-constants";
import type { HabitCreateData } from "@/hooks/useHabits";
import type { Id } from "@/convex/_generated/dataModel";

type TabId = "vandaag" | "overzicht" | "stats";

const TABS: Array<{ id: TabId; label: string; icon: typeof Target }> = [
  { id: "vandaag",   label: "Vandaag",      icon: CalendarCheck },
  { id: "overzicht", label: "Overzicht",    icon: LayoutGrid },
  { id: "stats",     label: "Statistieken", icon: BarChart3 },
];

export default function HabitsPage() {
  const {
    todayHabits, todaySummary, todayDienst,
    habits, stats, level, badges,
    create, update, toggle, incident, pause, archive, remove,
    isLoading,
  } = useHabits();

  const [activeTab, setActiveTab] = useState<TabId>("vandaag");
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Id<"habits"> | null>(null);

  const handleCreate = (data: HabitCreateData) => {
    create(data);
  };

  const handleEdit = (data: HabitCreateData) => {
    if (editingHabit) {
      update(editingHabit, data);
      setEditingHabit(null);
    }
  };

  return (
    <div className="min-h-[100dvh] pb-32 md:pb-8 px-4 md:px-0">
      {/* Header — mobile-first, compact */}
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

          {/* Today's dienst indicator */}
          {todayDienst && (
            <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/15">
              <span className="text-[10px] text-blue-400 font-medium">
                {todayDienst.shiftType} dienst
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar — sticky, touch-friendly */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-2" style={{ background: "rgba(10,10,15,0.92)", backdropFilter: "blur(16px)" }}>
        <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 relative py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all min-h-[44px]"
              style={{
                color: activeTab === id ? "#f97316" : "#64748b",
              }}
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
          {activeTab === "vandaag" && (
            <motion.div
              key="vandaag"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              {/* Large DailyChecklist */}
              <DailyChecklist />

              {/* Create CTA if few habits */}
              {todayHabits.length < 3 && (
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

          {activeTab === "overzicht" && (
            <motion.div
              key="overzicht"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-2"
            >
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : todayHabits.length === 0 ? (
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
                todayHabits.map((habit) => (
                  <HabitCard
                    key={habit._id}
                    habit={habit}
                    onToggle={() => toggle(habit._id)}
                    onIncident={(notitie) => incident(habit._id, notitie)}
                    onPause={() => pause(habit._id)}
                    onArchive={() => archive(habit._id)}
                    onRemove={() => remove(habit._id)}
                    onEdit={() => setEditingHabit(habit._id)}
                  />
                ))
              )}
            </motion.div>
          )}

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

      {/* FAB — floating action button (mobile-first) */}
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
