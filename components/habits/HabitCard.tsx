"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertTriangle, Pause, MoreVertical, Trash2, Archive, Edit3, Plus, Minus, ChevronDown, Trophy, Calendar, Target, Zap, TrendingUp } from "lucide-react";
import { formatStreak, formatXP, MOEILIJKHEID_LABELS, FREQUENTIE_LABELS } from "@/lib/habit-constants";
import { getLevel } from "@/convex/lib/habitConstants";
import { DEFAULT_STAP, INCIDENT_TRIGGERS } from "@/convex/lib/habitConstants";
import type { HabitWithLog } from "@/hooks/useHabits";

/**
 * HabitCard — Habit kaart met checkbox/stepper, streak, XP, incident triggers.
 * Mobile-first: touch targets >= 44px, stepper gescheiden van incident button.
 * Tappable content area: expand/collapse detail panel.
 */

const ROOSTER_LABELS: Record<string, string> = {
  alle:         "Altijd",
  werkdagen:    "Alleen werkdagen",
  vrijeDagen:   "Alleen vrije dagen",
  vroegeDienst: "Vroege diensten",
  lateDienst:   "Late diensten",
};

interface HabitCardProps {
  habit: HabitWithLog;
  onToggle: () => void;
  onIncrement: (stap: number) => void;
  onIncident: (trigger?: string, notitie?: string) => void;
  onPause: () => void;
  onArchive: () => void;
  onRemove: () => void;
  onEdit: () => void;
  masked?: boolean;
}

export function HabitCard({ habit, onToggle, onIncrement, onIncident, onPause, onArchive, onRemove, onEdit, masked = false }: HabitCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<string | undefined>();
  const [triggerNotitie, setTriggerNotitie] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

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
  const hasIncident = habit.log?.isIncident === true;
  const isQuantitative = habit.isKwantitatief && habit.doelWaarde;
  const color = habit.kleur ?? "#f97316";
  const isSuccess = isNegative ? !hasIncident : isCompleted;

  const stap = DEFAULT_STAP[habit.eenheid ?? "x"] ?? 1;
  const currentWaarde = habit.log?.waarde ?? 0;
  const progress = isQuantitative ? Math.min(1, currentWaarde / habit.doelWaarde!) : 0;
  const displayName = masked ? "Verborgen habit" : habit.naam;
  const displayEmoji = masked ? "•" : habit.emoji;
  const typeLabel = masked ? "Afgeschermd" : "Vermijden";
  const frequencyLabel = masked ? "Schema" : FREQUENTIE_LABELS[habit.frequentie] ?? habit.frequentie;

  const handleIncidentSubmit = () => {
    onIncident(selectedTrigger, triggerNotitie || undefined);
    setShowTriggerModal(false);
    setSelectedTrigger(undefined);
    setTriggerNotitie("");
  };

  return (
    <motion.div
      ref={menuRef}
      layout
      className="relative rounded-2xl overflow-hidden transition-all"
      style={{
        background: isSuccess
          ? `linear-gradient(135deg, ${color}08, ${color}04)`
          : hasIncident
            ? "rgba(239,68,68,0.04)"
            : "rgba(255,255,255,0.02)",
        border: isSuccess
          ? `1px solid ${color}20`
          : hasIncident
            ? "1px solid rgba(239,68,68,0.12)"
            : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-center p-3.5 gap-3">
        {/* Check button (positief, niet-kwantitatief) / Status indicator (negatief) */}
        {isNegative ? (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: hasIncident ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.10)",
              border: hasIncident ? "1px solid rgba(239,68,68,0.20)" : `1px solid rgba(34,197,94,0.20)`,
            }}
          >
            {hasIncident ? (
              <AlertTriangle size={18} className="text-red-400" />
            ) : (
              <Check size={18} className="text-green-400" />
            )}
          </div>
        ) : isQuantitative ? (
          /* Kwantitatief: emoji indicator (stepper komt eronder) */
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: isCompleted ? color : `${color}10`,
              border: isCompleted ? "none" : `2px solid ${color}30`,
            }}
          >
            {isCompleted ? (
              <Check size={20} className="text-white" />
            ) : (
              <span className="text-xl">{displayEmoji}</span>
            )}
          </div>
        ) : (
          <button
            onClick={onToggle}
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 cursor-pointer"
            style={{
              background: isCompleted ? color : "rgba(255,255,255,0.03)",
              border: isCompleted ? "none" : `2px solid ${color}30`,
            }}
          >
            {isCompleted ? (
              <Check size={20} className="text-white" />
            ) : (
              <span className="text-xl">{displayEmoji}</span>
            )}
          </button>
        )}

        {/* Content — tap to expand details */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setShowDetail(!showDetail)}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold truncate"
              style={{
                color: isSuccess ? "rgba(255,255,255,0.4)" : hasIncident ? "#f87171" : "rgba(255,255,255,0.9)",
                textDecoration: isSuccess && !isNegative ? "line-through" : "none",
              }}
            >
              {displayName}
            </span>
            {isNegative && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/15">
                {typeLabel}
              </span>
            )}
            <ChevronDown
              size={14}
              className="text-slate-600 shrink-0 transition-transform duration-200"
              style={{ transform: showDetail ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </div>

          <div className="flex items-center gap-2 mt-1">
            {habit.huidigeStreak > 0 && (
              <span className="text-[10px] text-orange-400/80 font-medium">
                {formatStreak(habit.huidigeStreak)}
              </span>
            )}
            {habit.log?.xpVerdiend ? (
              <span className="text-[10px] text-green-400/60">+{habit.log.xpVerdiend} XP</span>
            ) : null}
            <span className="text-[10px] text-slate-600">
              {MOEILIJKHEID_LABELS[habit.moeilijkheid]}
            </span>
            {habit.doelTijd && !masked && (
              <span className="text-[10px] text-sky-400/60">⏰ {habit.doelTijd}</span>
            )}
          </div>
        </div>

        {/* Incident button (negatieve habits) — apart van stepper */}
        {isNegative && !hasIncident && (
          <button
            onClick={() => setShowTriggerModal(true)}
            className="w-10 h-10 rounded-xl bg-red-500/8 border border-red-500/12 flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer"
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

      {/* ─── Kwantitatief Stepper (eigen rij onder de habit info) ──────────── */}
      {isQuantitative && (
        <div className="px-3.5 pb-3">
          {/* Progress bar */}
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Minus button */}
            <button
              onClick={() => onIncrement(-stap)}
              disabled={currentWaarde <= 0}
              className="w-11 h-11 rounded-xl flex items-center justify-center active:scale-90 transition-all cursor-pointer disabled:opacity-20"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Minus size={16} className="text-slate-400" />
            </button>

            {/* Current value display */}
            <div className="flex-1 text-center">
              <span className="text-sm font-bold" style={{ color: isCompleted ? color : "rgba(255,255,255,0.8)" }}>
                {masked ? "••" : currentWaarde}
              </span>
              <span className="text-[10px] text-slate-500">
                {" "}/ {masked ? "••" : `${habit.doelWaarde} ${habit.eenheid ?? ""}`}
              </span>
            </div>

            {/* Plus button */}
            <button
              onClick={() => onIncrement(stap)}
              disabled={isCompleted}
              className="w-11 h-11 rounded-xl flex items-center justify-center active:scale-90 transition-all cursor-pointer disabled:opacity-30"
              style={{
                background: `${color}15`,
                border: `1px solid ${color}30`,
              }}
            >
              <Plus size={16} style={{ color }} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Expandable Detail Panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {showDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3 border-t border-white/5 pt-3">
              {/* Beschrijving */}
              {habit.beschrijving && !masked && (
                <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                  {habit.beschrijving}
                </p>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <DetailStat
                  icon={<Calendar size={12} />}
                  label="Frequentie"
                  value={frequencyLabel}
                  color="#3b82f6"
                />
                <DetailStat
                  icon={<Trophy size={12} />}
                  label="Langste streak"
                  value={`${habit.langsteStreak}d`}
                  color="#f59e0b"
                />
                <DetailStat
                  icon={<Target size={12} />}
                  label="Totaal voltooid"
                  value={`${habit.totaalVoltooid}x`}
                  color="#22c55e"
                />
              </div>

              {/* XP + Level progress */}
              {(() => {
                const levelInfo = getLevel(habit.totaalXP);
                return (
                  <div className="rounded-xl p-2.5" style={{ background: `${color}06`, border: `1px solid ${color}10` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Zap size={12} style={{ color }} />
                        <span className="text-[11px] font-bold" style={{ color }}>
                          Lv.{levelInfo.level} {levelInfo.titel}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {formatXP(habit.totaalXP)}
                        {levelInfo.nextXP > 0 && (
                          <span className="text-slate-600"> · nog {levelInfo.nextXP}</span>
                        )}
                      </span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: color }}
                        animate={{ width: `${levelInfo.progress * 100}%` }}
                        transition={{ type: "spring", damping: 20, stiffness: 200 }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Rooster koppeling badge */}
              {habit.roosterFilter && habit.roosterFilter !== "alle" && (
                <div className="flex items-center gap-1.5 mt-2.5">
                  <TrendingUp size={11} className="text-cyan-400/60" />
                  <span className="text-[10px] text-cyan-400/70">
                    Rooster: {ROOSTER_LABELS[habit.roosterFilter] ?? habit.roosterFilter}
                  </span>
                </div>
              )}

              {/* Aangemaakt datum */}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-600">
                  Aangemaakt {new Date(habit.aangemaakt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Incident Trigger Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showTriggerModal && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-red-500/10 overflow-hidden"
          >
            <div className="p-3.5">
              <p className="text-[11px] text-slate-400 font-medium mb-2.5">Wat was de trigger?</p>

              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {INCIDENT_TRIGGERS.map((t, index) => (
                  <button
                    key={t.value}
                    onClick={() => setSelectedTrigger(selectedTrigger === t.value ? undefined : t.value)}
                    className="py-2.5 px-3 rounded-xl text-[11px] text-left font-medium transition-all min-h-[44px] cursor-pointer active:scale-95"
                    style={{
                      background: selectedTrigger === t.value ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.03)",
                      border: selectedTrigger === t.value ? "1px solid rgba(239,68,68,0.20)" : "1px solid rgba(255,255,255,0.05)",
                      color: selectedTrigger === t.value ? "#f87171" : "#94a3b8",
                    }}
                  >
                    {masked ? `Trigger ${index + 1}` : `${t.emoji} ${t.label}`}
                  </button>
                ))}
              </div>

              {/* Notitie (verplicht bij "anders") */}
              {(selectedTrigger === "anders" || selectedTrigger) && (
                <input
                  type="text"
                  value={triggerNotitie}
                  onChange={(e) => setTriggerNotitie(e.target.value)}
                  placeholder={selectedTrigger === "anders" ? "Beschrijf de trigger..." : "Optionele notitie..."}
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/30 min-h-[44px] mb-3"
                />
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowTriggerModal(false); setSelectedTrigger(undefined); setTriggerNotitie(""); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium text-slate-400 bg-white/3 border border-white/5 min-h-[44px] cursor-pointer active:scale-95 transition-transform"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleIncidentSubmit}
                  disabled={selectedTrigger === "anders" && !triggerNotitie.trim()}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white min-h-[44px] cursor-pointer active:scale-95 transition-transform disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
                >
                  Incident loggen
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Dropdown menu ────────────────────────────────────────────────── */}
      {showMenu && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t border-white/5 overflow-hidden"
        >
          <div className="p-2.5 flex gap-2">
            <MenuBtn icon={<Edit3 size={15} />} label="Bewerken" onClick={() => { onEdit(); setShowMenu(false); }} />
            <MenuBtn icon={<Pause size={15} />} label={habit.isPauze ? "Hervatten" : "Pauzeren"} onClick={() => { onPause(); setShowMenu(false); }} />
            <MenuBtn icon={<Archive size={15} />} label="Archiveer" onClick={() => { onArchive(); setShowMenu(false); }} />
            <MenuBtn icon={<Trash2 size={15} />} label="Verwijder" onClick={() => { onRemove(); setShowMenu(false); }} danger />
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
      className="flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all active:scale-95 min-h-[52px] cursor-pointer"
      style={{
        background: danger ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
        color: danger ? "#f87171" : "#94a3b8",
      }}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function DetailStat({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className="rounded-lg p-2 text-center" style={{ background: `${color}08`, border: `1px solid ${color}12` }}>
      <div className="flex justify-center mb-1" style={{ color }}>{icon}</div>
      <div className="text-[11px] font-bold text-slate-200">{value}</div>
      <div className="text-[9px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
