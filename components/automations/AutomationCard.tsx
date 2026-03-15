"use client";

import { motion } from "framer-motion";
import { Clock, Play, PauseCircle, Trash2 } from "lucide-react";
import {
  type Automation,
  type AutomationAction,
  SCENE_DEFINITIONS,
  DAY_LABELS,
} from "@/lib/automations";
import { cn } from "@/lib/utils";

function actionLabel(action: AutomationAction): string {
  switch (action.type) {
    case "scene":      return `Scène: ${SCENE_DEFINITIONS[action.sceneId!]?.label ?? action.sceneId}`;
    case "on":         return "Alle lampen aan";
    case "off":        return "Alle lampen uit";
    case "brightness": return `Helderheid → ${action.brightness}%`;
    case "color_temp": return `Kleurtemp → ${Math.round(1_000_000 / (action.colorTempMireds ?? 370))}K`;
    case "color":      return `Kleur → ${action.colorHex?.toUpperCase()}`;
    default:           return "Onbekende actie";
  }
}

function daysLabel(days?: number[]): string {
  if (!days || days.length === 0) return "";
  if (days.length === 7) return "Elke dag";
  if (JSON.stringify([...days].sort()) === JSON.stringify([0, 1, 2, 3, 4])) return "Doordeweeks";
  if (JSON.stringify([...days].sort()) === JSON.stringify([5, 6])) return "Weekend";
  return days.map((d) => DAY_LABELS[d]).join(", ");
}

interface AutomationCardProps {
  automation: Automation;
  onToggle: () => void;
  onDelete: () => void;
}

export function AutomationCard({ automation, onToggle, onDelete }: AutomationCardProps) {
  const lastFired = automation.lastFiredAt
    ? new Date(automation.lastFiredAt).toLocaleTimeString("nl", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "glass rounded-xl p-4 flex items-start gap-3 transition-opacity",
        !automation.enabled && "opacity-50"
      )}
    >
      <div
        className={cn(
          "w-14 h-14 rounded-xl flex flex-col items-center justify-center border flex-shrink-0",
          automation.enabled
            ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
            : "bg-white/5 border-white/10 text-slate-500"
        )}
      >
        <Clock size={13} className="mb-0.5" />
        <span className="text-xs font-bold leading-tight">{automation.trigger.time}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200">{automation.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {automation.trigger.triggerType === "schedule" ? (
            <span className="text-orange-400/80">
              Alleen op {automation.trigger.shiftType} dienst
            </span>
          ) : (
            <span className="text-amber-400/80">{daysLabel(automation.trigger.days)}</span>
          )}
          {" · "}{actionLabel(automation.action)}
        </p>
        {lastFired && (
          <p className="text-[10px] text-slate-600 mt-1">Laatste uitvoering: {lastFired}</p>
        )}
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onToggle}
          aria-label={automation.enabled ? "Automatisering pauzeren" : "Automatisering starten"}
          className={cn(
            "w-8 h-8 rounded-lg border flex items-center justify-center transition-all",
            automation.enabled
              ? "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
              : "bg-white/5 border-white/10 text-slate-500 hover:bg-white/10"
          )}
        >
          {automation.enabled ? <Play size={12} /> : <PauseCircle size={12} />}
        </button>
        <button
          onClick={onDelete}
          aria-label={`${automation.name} verwijderen`}
          className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 text-slate-500 flex items-center justify-center hover:text-red-400 hover:border-red-500/30 transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
}
