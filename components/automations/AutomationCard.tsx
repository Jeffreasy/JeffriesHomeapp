"use client";

import { motion } from "framer-motion";
import { AlarmClock, Clock, Loader2, Play, PauseCircle, Trash2 } from "lucide-react";
import {
  type Automation,
  type AutomationAction,
  SCENE_DEFINITIONS,
  DAY_LABELS,
  isDienstWekkerAutomation,
  nextRunLabel,
} from "@/lib/automations";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";

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
  /** True zolang de enable/disable-call in flight is — knop is dan geblokkeerd. */
  togglePending?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function AutomationCard({ automation, togglePending = false, onToggle, onEdit, onDelete }: AutomationCardProps) {
  // L3: dag+maand+tijd — een kale tijd zegt niet of dat vandaag of vorige week was.
  const lastFired = automation.lastFiredAt
    ? new Date(automation.lastFiredAt).toLocaleString("nl-NL", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // M4: client-side "volgende run" voor vaste-dagen-triggers (Amsterdam).
  const nextRun = automation.enabled ? nextRunLabel(automation.trigger) : null;
  const isWekkerStep = isDienstWekkerAutomation(automation);

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
            : "bg-[var(--color-surface)] border-[var(--color-border)] text-slate-500"
        )}
      >
        <Clock size={13} className="mb-0.5" />
        <span className="text-xs font-bold leading-tight">{automation.trigger.time}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-200">{automation.name}</p>
          {isWekkerStep && (
            <a
              href="#dienst-wekker-cockpit"
              title="Beheer deze stap via de dienstwekker-cockpit bovenaan de pagina"
              className="inline-flex items-center gap-1 rounded-md border border-sky-500/25 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300 transition-colors hover:bg-sky-500/20"
            >
              <AlarmClock size={10} aria-hidden="true" />
              Onderdeel van dienst-wekker
            </a>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {automation.trigger.triggerType === "schedule" ? (
            <span className="text-orange-400/80">
              {automation.trigger.shiftType && automation.trigger.shiftType !== "any"
                ? `Alleen op ${automation.trigger.shiftType} dienst`
                : "Op elke dienst"}
            </span>
          ) : (
            <span className="text-amber-400/80">{daysLabel(automation.trigger.days)}</span>
          )}
          {" · "}{actionLabel(automation.action)}
        </p>
        {automation.trigger.excludedShifts && automation.trigger.excludedShifts.length > 0 && (
          <p className="text-[10px] text-purple-400/90 font-medium mt-1">
            Behalve bij: {automation.trigger.excludedShifts.join(", ")} dienst
          </p>
        )}
        {nextRun && (
          <p className="text-[10px] text-slate-500 mt-1">Volgende run: {nextRun}</p>
        )}
        {automation.enabled && automation.trigger.triggerType === "schedule" && (
          <p className="text-[10px] text-slate-600 mt-1">
            Vuurt alleen op dagen met een passende dienst in het rooster
          </p>
        )}
        {lastFired && (
          <p className="text-[10px] text-slate-600 mt-1">Laatste uitvoering: {lastFired}</p>
        )}
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onToggle}
          disabled={togglePending}
          role="switch"
          aria-checked={automation.enabled}
          aria-label={automation.enabled ? "Automatisering pauzeren" : "Automatisering starten"}
          className={cn(
            "h-10 w-10 sm:h-8 sm:w-8 rounded-lg border flex items-center justify-center transition-all",
            automation.enabled
              ? "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
              : "bg-[var(--color-surface)] border-[var(--color-border)] text-slate-500 hover:bg-[var(--color-surface-hover)]",
            togglePending && "opacity-60 cursor-wait"
          )}
        >
          {/* Icoon toont de ACTIE: pauzeren als hij aan staat, starten als hij uit staat */}
          {togglePending ? (
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          ) : automation.enabled ? (
            <PauseCircle size={12} aria-hidden="true" />
          ) : (
            <Play size={12} aria-hidden="true" />
          )}
        </button>
        <button
          onClick={onEdit}
          aria-label={`${automation.name} bewerken`}
          className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-slate-500 flex items-center justify-center hover:text-amber-400 hover:border-amber-500/30 hover:bg-[var(--color-surface-hover)] transition-all"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={onDelete}
          aria-label={`${automation.name} verwijderen`}
          className="h-10 w-10 sm:h-8 sm:w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-slate-500 flex items-center justify-center hover:text-red-400 hover:border-red-500/30 hover:bg-[var(--color-surface-hover)] transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
}
