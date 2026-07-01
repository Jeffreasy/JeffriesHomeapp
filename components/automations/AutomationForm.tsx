"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Plus, Loader2 } from "lucide-react";
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
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

interface AutomationFormProps {
  initialData?: Automation;
  /** Bestaande automations — voor de niet-blokkerende overlap-waarschuwing (M3). */
  existing?: Automation[];
  onClose: () => void;
  /** Moet een promise teruggeven: de modal sluit pas bij succes (M2). */
  onSave: (a: Omit<Automation, "id" | "createdAt" | "lastFiredAt">) => void | Promise<void>;
}

export function AutomationForm({ initialData, existing = [], onClose, onSave }: AutomationFormProps) {
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

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, dialogRef);
  const { openConfirm } = useConfirm();
  const confirmingRef = useRef(false);

  // Dirty-check: vergelijk de huidige invoer met de beginsituatie.
  const snapshot = useMemo(
    () =>
      JSON.stringify({
        name, time, triggerType, days, shiftType, actionType,
        sceneId, brightness, colorHex, colorTempMireds, excludedShifts,
      }),
    [name, time, triggerType, days, shiftType, actionType, sceneId, brightness, colorHex, colorTempMireds, excludedShifts]
  );
  const initialSnapshot = useRef(snapshot);
  const isDirty = snapshot !== initialSnapshot.current;

  // Sluiten via backdrop/Escape/X: bij ongesavede wijzigingen eerst bevestigen.
  const requestClose = async () => {
    if (saving || confirmingRef.current) return;
    if (isDirty) {
      confirmingRef.current = true;
      const discard = await openConfirm({
        title: "Wijzigingen verwerpen?",
        message: "Je hebt niet-opgeslagen wijzigingen in dit formulier.",
        confirmLabel: "Verwerpen",
        variant: "danger",
      });
      confirmingRef.current = false;
      if (!discard) return;
    }
    onClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || confirmingRef.current) return;
      void requestClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // requestClose verandert elke render; de listener leest altijd de laatste via closure-vernieuwing.
  });

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const toggleExcludedShift = (shift: ShiftType) => {
    setExcludedShifts((prev) =>
      prev.includes(shift) ? prev.filter((s) => s !== shift) : [...prev, shift]
    );
  };

  // M3: niet-blokkerende overlap-check — zelfde tijd + minstens één gedeelde
  // dag met een andere íngeschakelde automation. Rooster-getriggerde regels
  // kunnen op elke dag vuren en tellen dus op alle dagen mee.
  const overlapping = useMemo(() => {
    const myDays = triggerType === "time" ? days : ALL_DAYS;
    return existing.filter((other) => {
      if (!other.enabled || other.id === initialData?.id) return false;
      if (other.trigger.time !== time) return false;
      const otherDays =
        other.trigger.triggerType === "schedule" ? ALL_DAYS : other.trigger.days ?? [];
      return myDays.some((d) => otherDays.includes(d));
    });
  }, [existing, initialData?.id, time, triggerType, days]);

  // Waarom de opslaan-knop disabled is — als inline uitleg getoond.
  const validationHint = !name
    ? "Geef een naam op"
    : triggerType === "time" && days.length === 0
      ? "Kies minstens één dag"
      : null;

  const handleSave = async () => {
    if (validationHint || saving) return;

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

    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        name,
        enabled: initialData?.enabled ?? true,
        trigger,
        action,
        group: initialData?.group
      });
      onClose(); // alléén sluiten bij succes — invoer blijft anders bewaard
    } catch {
      setSaveError("Opslaan is mislukt. Je invoer is bewaard — probeer het opnieuw.");
    } finally {
      setSaving(false);
    }
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
        onClick={() => void requestClose()}
        aria-hidden="true"
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={initialData ? "Automatisering bewerken" : "Nieuwe automatisering"}
        tabIndex={-1}
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
          onClick={() => void requestClose()}
          aria-label="Formulier sluiten"
          className="text-slate-500 hover:text-slate-300"
        >
          <X size={15} />
        </button>
      </div>

      <div>
        <label htmlFor="auto-name" className="mb-1 block text-xs font-semibold text-slate-300">
          Naam <span className="text-amber-400" aria-hidden="true">*</span>
        </label>
        <input
          id="auto-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bijv. Ochtendlicht woonkamer"
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
        />
      </div>

      <div>
        <label htmlFor="auto-time" className="mb-1 block text-xs font-semibold text-slate-300">Tijdstip</label>
        <input
          id="auto-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50 [color-scheme:dark]"
        />
        <p className="mt-1 text-[10px] text-slate-500">Tijden in Nederlandse tijd (Europe/Amsterdam)</p>
      </div>

      <fieldset>
        <legend className="sr-only">Type Trigger</legend>
        <div className="flex bg-[var(--color-surface)] border border-[var(--color-border)] p-1 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => setTriggerType("time")}
            aria-pressed={triggerType === "time"}
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
            aria-pressed={triggerType === "schedule"}
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

      {/* M3: niet-blokkerende waarschuwing bij overlappende automations */}
      {overlapping.length > 0 && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
        >
          Let op: &lsquo;{overlapping[0].name}&rsquo;
          {overlapping.length > 1
            ? ` en ${overlapping.length - 1} andere draaien`
            : " draait"}{" "}
          ook om {time} op deze dagen.
        </p>
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

      {saveError && (
        <p role="alert" className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {saveError}
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!!validationHint || saving}
          className="w-full py-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/25 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}
          {saving ? "Bezig met opslaan…" : "Opslaan"}
        </button>
        {validationHint && (
          <p className="mt-1.5 text-center text-[11px] text-slate-500">{validationHint}</p>
        )}
      </div>
      </motion.div>
    </div>
  );
}
