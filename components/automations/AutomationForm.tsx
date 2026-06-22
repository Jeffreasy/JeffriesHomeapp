"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Plus } from "lucide-react";
import {
  type Automation,
  type AutomationAction,
  type ActionType,
  DAY_LABELS,
  ALL_DAYS,
  WEEKDAYS,
  WEEKEND,
  SCENE_DEFINITIONS,
  type ShiftType,
} from "@/lib/automations";
import { cn } from "@/lib/utils";

interface AutomationFormProps {
  initialData?: Automation;
  onClose: () => void;
  onSave: (a: Omit<Automation, "id" | "createdAt" | "lastFiredAt">) => void;
}

export function AutomationForm({ initialData, onClose, onSave }: AutomationFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [time, setTime] = useState(initialData?.trigger.time ?? "07:00");
  const [triggerType, setTriggerType] = useState<"time" | "schedule">(
    initialData?.trigger.triggerType ?? "time"
  );
  const [days, setDays] = useState<number[]>(initialData?.trigger.days ?? ALL_DAYS);
  const [shiftType, setShiftType] = useState<ShiftType>(
    initialData?.trigger.shiftType ?? "Vroeg"
  );
  const [actionType, setActionType] = useState<ActionType>(initialData?.action.type ?? "scene");
  
  const [sceneId, setSceneId] = useState(initialData?.action.sceneId ?? "helder");
  const [brightness, setBrightness] = useState(initialData?.action.brightness ?? 80);
  const [colorHex, setColorHex] = useState(initialData?.action.colorHex ?? "#ff8800");
  const [colorTempMireds, setColorTempMireds] = useState(initialData?.action.colorTempMireds ?? 370);

  // Smart Exclusions
  const [excludedShifts, setExcludedShifts] = useState<ShiftType[]>(initialData?.trigger.excludedShifts ?? []);

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const toggleExcludedShift = (shift: ShiftType) => {
    setExcludedShifts((prev) =>
      prev.includes(shift) ? prev.filter((s) => s !== shift) : [...prev, shift]
    );
  };

  const handleSave = () => {
    if (!name) return;
    if (triggerType === "time" && days.length === 0) return;

    const action: AutomationAction = { type: actionType };
    if (actionType === "scene")      action.sceneId = sceneId as keyof typeof SCENE_DEFINITIONS;
    if (actionType === "brightness") action.brightness = brightness;
    if (actionType === "color")      action.colorHex = colorHex;
    if (actionType === "color_temp") action.colorTempMireds = colorTempMireds;

    // Never exclude the trigger shift itself (that would make the rule never fire).
    const cleanExcluded = excludedShifts.filter((s) => s !== shiftType);
    const trigger = {
      time,
      triggerType,
      days: triggerType === "time" ? days : undefined,
      shiftType: triggerType === "schedule" ? shiftType : undefined,
      excludedShifts: cleanExcluded.length > 0 ? cleanExcluded : undefined,
    };

    onSave({ 
      name, 
      enabled: initialData?.enabled ?? true, 
      trigger,
      action,
      group: initialData?.group
    });
    onClose();
  };

  const actionLabels: Record<ActionType, string> = {
    scene: "Scène",
    on: "Aan",
    off: "Uit",
    brightness: "Helderheid",
    color_temp: "Kleurtemp",
    color: "Kleur",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-md glass rounded-2xl p-6 space-y-5 border border-amber-500/20 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {initialData ? null : <Plus size={16} className="text-amber-400" />}
          {initialData ? "Automatisering bewerken" : "Nieuwe automatisering"}
        </h3>
        <button
          onClick={onClose}
          aria-label="Formulier sluiten"
          className="text-slate-500 hover:text-slate-300"
        >
          <X size={15} />
        </button>
      </div>

      <div>
        <label htmlFor="auto-name" className="sr-only">Naam</label>
        <input
          id="auto-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Naam *"
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
        />
      </div>

      <div>
        <label htmlFor="auto-time" className="sr-only">Tijdstip</label>
        <input
          id="auto-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50 [color-scheme:dark]"
        />
      </div>

      <fieldset>
        <legend className="sr-only">Type Trigger</legend>
        <div className="flex bg-[var(--color-surface)] border border-[var(--color-border)] p-1 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setTriggerType("time")}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
              triggerType === "time"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm"
                : "text-slate-500 hover:text-slate-300 border border-transparent"
            )}
          >
            Vaste Dagen
          </button>
          <button
            type="button"
            onClick={() => setTriggerType("schedule")}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
              triggerType === "schedule"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm"
                : "text-slate-500 hover:text-slate-300 border border-transparent"
            )}
          >
            Rooster (Smart)
          </button>
        </div>
      </fieldset>

      {triggerType === "time" ? (
        <fieldset>
          <legend className="sr-only">Dagen</legend>
          <div className="flex gap-2 mb-2 text-[10px]">
            {[["Alle", ALL_DAYS], ["Doordeweeks", WEEKDAYS], ["Weekend", WEEKEND]].map(
              ([label, d]) => (
                <button
                  key={label as string}
                  type="button"
                  onClick={() => setDays(d as number[])}
                  className="text-slate-500 hover:text-amber-400"
                >
                  {label as string}
                </button>
              )
            )}
          </div>
          <div className="flex gap-1">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={days.includes(i)}
                onClick={() => toggleDay(i)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
                  days.includes(i)
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-[var(--color-surface)] text-slate-500 border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <fieldset>
          <legend className="text-xs font-semibold text-slate-300 mb-2">Kies de Dienst</legend>
          <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
            De automatisering gaat alléén af als je op deze dag de geselecteerde dienst hebt.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["Vroeg", "Laat", "Dienst"] as ShiftType[]).map((shift) => (
              <button
                key={shift}
                type="button"
                aria-pressed={shiftType === shift}
                onClick={() => setShiftType(shift)}
                className={cn(
                  "py-2 rounded-lg text-xs font-medium border transition-all",
                  shiftType === shift
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.1)]"
                    : "bg-[var(--color-surface)] text-slate-400 border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
                )}
              >
                {shift}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="sr-only">Actie type</legend>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-[var(--color-surface)] p-1 border border-[var(--color-border)]">
          {(Object.keys(actionLabels) as ActionType[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={actionType === t}
              onClick={() => setActionType(t)}
              className={cn(
                "py-1 rounded-lg text-xs transition-all",
                actionType === t ? "bg-[var(--color-surface-hover)] text-white font-medium" : "text-slate-500 hover:bg-[var(--color-surface-hover)]"
              )}
            >
              {actionLabels[t]}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        {actionType === "scene" && (
          <div className="grid grid-cols-3 gap-1">
            {Object.entries(SCENE_DEFINITIONS).map(([id, { label }]) => (
              <button
                key={id}
                type="button"
                aria-pressed={sceneId === id}
                onClick={() => setSceneId(id)}
                className={cn(
                  "py-1.5 rounded-lg text-xs border transition-all",
                  sceneId === id
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-[var(--color-surface)] text-slate-400 border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {actionType === "brightness" && (
          <>
            <label htmlFor="auto-brightness" className="sr-only">Helderheid</label>
            <input
              id="auto-brightness"
              type="range"
              min={5}
              max={100}
              value={brightness}
              onChange={(e) => setBrightness(+e.target.value)}
              style={{
                background: `linear-gradient(to right, #f59e0b ${brightness}%, rgba(255,255,255,0.1) ${brightness}%)`,
              }}
            />
          </>
        )}
        {actionType === "color_temp" && (
          <>
            <label htmlFor="auto-colortemp" className="sr-only">Kleurtemperatuur</label>
            <input
              id="auto-colortemp"
              type="range"
              min={153}
              max={455}
              value={colorTempMireds}
              onChange={(e) => setColorTempMireds(+e.target.value)}
              // Mireds: laag = koel (6500K), hoog = warm (2200K) → links koel/blauw, rechts warm/oranje
              style={{ background: "linear-gradient(to right, #cce4ff, #fff4e6, #ff9329)" }}
            />
          </>
        )}
        {actionType === "color" && (
          <div className="flex items-center gap-3">
            <label htmlFor="auto-color" className="sr-only">Kleur kiezen</label>
            <input
              id="auto-color"
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="w-12 h-10 rounded-lg border border-[var(--color-border)] bg-transparent cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-400">{colorHex.toUpperCase()}</span>
          </div>
        )}
      </div>

      <fieldset>
        <legend className="text-xs font-semibold text-slate-300 mb-2">Slimme Uitsluitingen</legend>
        <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
          Sla deze automatisering automatisch over als je één van deze diensten hebt op die dag.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["Vroeg", "Laat", "Dienst"] as ShiftType[]).map((shift) => {
            const isTrigger = shift === shiftType;
            return (
              <button
                key={shift}
                type="button"
                aria-pressed={excludedShifts.includes(shift)}
                disabled={isTrigger}
                title={isTrigger ? "Dit is je triggershift — uitsluiten zou de automatisering nooit laten vuren" : undefined}
                onClick={() => toggleExcludedShift(shift)}
                className={cn(
                  "py-1.5 rounded-lg text-xs font-medium border transition-all disabled:cursor-not-allowed disabled:opacity-40",
                  excludedShifts.includes(shift)
                    ? "bg-purple-500/15 text-purple-400 border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.1)]"
                    : "bg-[var(--color-surface)] text-slate-400 border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
                )}
              >
                {shift}
              </button>
            );
          })}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={handleSave}
        disabled={!name || (triggerType === "time" && days.length === 0)}
        className="w-full py-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/25 disabled:opacity-40 flex items-center justify-center gap-2"
      >
        <Check size={13} />
        Opslaan
      </button>
      </motion.div>
    </div>
  );
}
