"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, AlertTriangle, Pause, MoreVertical, Trash2, Archive, Edit3 } from "lucide-react";
import { formatStreak, MOEILIJKHEID_LABELS, FREQUENTIE_LABELS } from "@/lib/habit-constants";
import type { HabitWithLog } from "@/hooks/useHabits";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * HabitCard — Habit kaart met checkbox, streak, XP indicator.
 * Mobile-first: swipe-friendly, touch targets >= 44px.
 */
interface HabitCardProps {
  habit: HabitWithLog;
  onToggle: () => void;
  onIncident: (notitie?: string) => void;
  onPause: () => void;
  onArchive: () => void;
  onRemove: () => void;
  onEdit: () => void;
}

export function HabitCard({ habit, onToggle, onIncident, onPause, onArchive, onRemove, onEdit }: HabitCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-outside handler
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);
  const isCompleted = habit.log?.voltooid === true;
  const isNegative = habit.type === "negatief";
  const color = habit.kleur ?? "#f97316";

  return (
    <motion.div
      ref={menuRef}
      layout
      className="relative rounded-2xl overflow-hidden transition-all"
      style={{
        background: isCompleted
          ? `linear-gradient(135deg, ${color}08, ${color}04)`
          : "rgba(255,255,255,0.02)",
        border: isCompleted
          ? `1px solid ${color}20`
          : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-center p-3.5 gap-3">
        {/* Check button — large touch target */}
        <button
          onClick={isNegative && !isCompleted ? () => onToggle() : onToggle}
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 cursor-pointer"
          style={{
            background: isCompleted ? color : "rgba(255,255,255,0.03)",
            border: isCompleted ? "none" : `2px solid ${color}30`,
          }}
        >
          {isCompleted ? (
            <Check size={20} className="text-white" />
          ) : (
            <span className="text-xl">{habit.emoji}</span>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold truncate"
              style={{
                color: isCompleted ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.9)",
                textDecoration: isCompleted ? "line-through" : "none",
              }}
            >
              {habit.naam}
            </span>
            {isNegative && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/15">
                Vermijden
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            {/* Streak */}
            {habit.huidigeStreak > 0 && (
              <span className="text-[10px] text-orange-400/80 font-medium">
                {formatStreak(habit.huidigeStreak)}
              </span>
            )}

            {/* XP earned */}
            {habit.log?.xpVerdiend ? (
              <span className="text-[10px] text-green-400/60">+{habit.log.xpVerdiend} XP</span>
            ) : null}

            {/* Moeilijkheid dot */}
            <span className="text-[10px] text-slate-600">
              {MOEILIJKHEID_LABELS[habit.moeilijkheid]}
            </span>

            {/* Doeltijd */}
            {habit.doelTijd && (
              <span className="text-[10px] text-sky-400/60">⏰ {habit.doelTijd}</span>
            )}
          </div>

          {/* Progress for kwantitatief */}
          {habit.isKwantitatief && habit.doelWaarde && (
            <div className="mt-2">
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, ((habit.log?.waarde ?? 0) / habit.doelWaarde) * 100)}%`,
                    background: color,
                  }}
                />
              </div>
              <span className="text-[9px] text-slate-600 mt-0.5">
                {habit.log?.waarde ?? 0}/{habit.doelWaarde} {habit.eenheid}
              </span>
            </div>
          )}
        </div>

        {/* Incident button (negatieve habits) */}
        {isNegative && !isCompleted && (
          <button
            onClick={() => onIncident()}
            className="w-10 h-10 rounded-xl bg-red-500/8 border border-red-500/12 flex items-center justify-center shrink-0 active:scale-90 transition-transform"
            title="Incident loggen"
          >
            <AlertTriangle size={16} className="text-red-400/70" />
          </button>
        )}

        {/* More menu */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 hover:bg-white/5 transition-colors cursor-pointer"
        >
          <MoreVertical size={16} className="text-slate-500" />
        </button>
      </div>

      {/* Dropdown menu */}
      {showMenu && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t border-white/5 overflow-hidden"
        >
          <div className="p-2 flex gap-1.5">
            <MenuBtn icon={<Edit3 size={13} />} label="Bewerken" onClick={() => { onEdit(); setShowMenu(false); }} />
            <MenuBtn icon={<Pause size={13} />} label={habit.isPauze ? "Hervatten" : "Pauzeren"} onClick={() => { onPause(); setShowMenu(false); }} />
            <MenuBtn icon={<Archive size={13} />} label="Archiveer" onClick={() => { onArchive(); setShowMenu(false); }} />
            <MenuBtn icon={<Trash2 size={13} />} label="Verwijder" onClick={() => { onRemove(); setShowMenu(false); }} danger />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function MenuBtn({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg transition-all active:scale-95 min-h-[44px]"
      style={{
        background: danger ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
        color: danger ? "#f87171" : "#94a3b8",
      }}
    >
      {icon}
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );
}
