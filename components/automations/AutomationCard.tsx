"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlarmClock, Clock, PauseCircle, Pencil, Play, Trash2 } from "lucide-react";
import {
  type Automation,
  type AutomationAction,
  SCENE_DEFINITIONS,
  DAY_LABELS,
  isDienstWekkerAutomation,
  nextRunLabel,
} from "@/lib/automations";
import { cn } from "@/lib/utils";
import { surfaceVariants } from "@/components/ui/Surface";
import { IconButton } from "@/components/ui/IconButton";
import { Badge, badgeVariants } from "@/components/ui/Badge";
import { uiToneClasses } from "@/lib/ui/tones";

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

  // "Volgende run" wordt puur uit de klok afgeleid en veroudert dus zonder
  // refetch. Hertel elke minuut en bij terugkeer naar de tab, zodat het label
  // niet blijft hangen op een tijdstip dat al voorbij is.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!automation.enabled) return;
    const id = window.setInterval(() => forceTick((n) => n + 1), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") forceTick((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [automation.enabled]);

  // M4: client-side "volgende run" voor vaste-dagen-triggers (Amsterdam).
  const nextRun = automation.enabled ? nextRunLabel(automation.trigger) : null;
  const isWekkerStep = isDienstWekkerAutomation(automation);
  const clockTone = uiToneClasses[automation.enabled ? "accent" : "neutral"];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        surfaceVariants({ padding: "sm", radius: "md" }),
        "flex items-start gap-3 transition-opacity",
        !automation.enabled && "opacity-50"
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border",
          clockTone.border,
          clockTone.surface,
          clockTone.text,
        )}
      >
        <Clock size={13} className="mb-0.5" aria-hidden="true" />
        <span className="text-xs font-bold leading-tight">{automation.trigger.time}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[var(--color-text)]">{automation.name}</p>
          {isWekkerStep && (
            <a
              href="#dienst-wekker-cockpit"
              title="Beheer deze stap via de dienstwekker-cockpit bovenaan de pagina"
              className={cn(badgeVariants({ tone: "info", size: "sm" }), "transition-colors hover:bg-[var(--color-info-border)]")}
            >
              <AlarmClock size={10} aria-hidden="true" />
              Onderdeel van dienst-wekker
            </a>
          )}
        </div>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          {automation.trigger.triggerType === "schedule" ? (
            <span className="text-[var(--color-info)]">
              {automation.trigger.shiftType && automation.trigger.shiftType !== "any"
                ? `Alleen op ${automation.trigger.shiftType} dienst`
                : "Op elke dienst"}
            </span>
          ) : (
            <span className="text-[var(--color-primary-hover)]">{daysLabel(automation.trigger.days)}</span>
          )}
          {" · "}{actionLabel(automation.action)}
        </p>
        {automation.trigger.excludedShifts && automation.trigger.excludedShifts.length > 0 && (
          <Badge tone="accent" size="sm" className="mt-1">
            Behalve bij: {automation.trigger.excludedShifts.join(", ")} dienst
          </Badge>
        )}
        {nextRun && (
          <p className="text-micro text-[var(--color-text-muted)] mt-1">Volgende run: {nextRun}</p>
        )}
        {automation.enabled && automation.trigger.triggerType === "schedule" && (
          <p className="text-micro text-[var(--color-text-subtle)] mt-1">
            Vuurt alleen op dagen met een passende dienst in het rooster
          </p>
        )}
        {lastFired && (
          <p className="text-micro text-[var(--color-text-subtle)] mt-1">Laatste uitvoering: {lastFired}</p>
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        <IconButton
          onClick={onToggle}
          disabled={togglePending}
          role="switch"
          aria-checked={automation.enabled}
          label={automation.enabled ? "Automatisering pauzeren" : "Automatisering starten"}
          variant={automation.enabled ? "primary" : "secondary"}
          loading={togglePending}
          icon={automation.enabled ? <PauseCircle size={14} /> : <Play size={14} />}
        />
        <IconButton
          onClick={onEdit}
          label={`${automation.name} bewerken`}
          variant="secondary"
          icon={<Pencil size={14} />}
        />
        <IconButton
          onClick={onDelete}
          label={`${automation.name} verwijderen`}
          variant="danger"
          icon={<Trash2 size={14} />}
        />
      </div>
    </motion.div>
  );
}
