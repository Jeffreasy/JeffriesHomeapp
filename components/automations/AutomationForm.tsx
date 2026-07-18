"use client";

import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
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
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { ModalCancelButton } from "@/components/ui/ModalCancelButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Range } from "@/components/ui/Range";
import { FormField } from "@/components/ui/FormField";
import { Surface } from "@/components/ui/Surface";
import { AppIcon } from "@/components/ui/AppIcon";

interface AutomationFormProps {
  initialData?: Automation;
  /** Bestaande automations — voor de niet-blokkerende overlap-waarschuwing (M3). */
  existing?: Automation[];
  onClose: () => void;
  /** Moet een promise teruggeven: de modal sluit pas bij succes (M2). */
  onSave: (a: Omit<Automation, "id" | "createdAt" | "lastFiredAt">) => void | Promise<void>;
}

/**
 * Imperatieve handle: laat de bovenliggende pagina (bv. de header-"Annuleren")
 * het formulier sluiten via dezelfde dirty-guard als Escape/backdrop/X, i.p.v.
 * de state direct te resetten en het formulier onbewaakt te unmounten.
 */
export interface AutomationFormHandle {
  requestClose: () => void;
}

export const AutomationForm = forwardRef<AutomationFormHandle, AutomationFormProps>(function AutomationForm(
  { initialData, existing = [], onClose, onSave },
  ref
) {
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
  const requestClose = useCallback(async () => {
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
  }, [isDirty, onClose, openConfirm, saving]);

  // Stel dezelfde dirty-guarded sluiting beschikbaar aan de parent (fix 7).
  useImperativeHandle(ref, () => ({ requestClose: () => void requestClose() }), [requestClose]);

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
    : !time
      // Een leeg tijdveld passeert de HTML-validatie wél, maar de engine
      // (ShouldFire) breekt af op een lege tijd → een automatisering die stil
      // nooit vuurt. Blokkeer opslaan tot er een tijdstip is gekozen.
      ? "Kies een tijdstip"
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

  const modalTitle = initialData ? "Automatisering bewerken" : "Nieuwe automatisering";

  return (
    <Modal
      isOpen
      onClose={() => void requestClose()}
      title={modalTitle}
      icon={initialData ? undefined : <AppIcon name="add" tone="accent" size="sm" />}
      maxWidth="md"
      tone="accent"
      presentation="dialog"
      closeDisabled={saving}
      ariaBusy={saving}
      dataAppModal="automation-form"
      footer={
        <div className="grid gap-2 sm:flex sm:items-center sm:justify-end">
          <ModalCancelButton
            onFallback={() => void requestClose()}
            disabled={saving}
            className="w-full sm:w-auto"
          />
          <Button
            type="submit"
            form="automation-editor-form"
            disabled={Boolean(validationHint)}
            loading={saving}
            loadingLabel="Bezig met opslaan…"
            variant="primary"
            className="w-full sm:w-auto"
          >
            Opslaan
          </Button>
          {validationHint ? (
            <p className="text-center text-micro text-[var(--color-text-muted)] sm:order-first sm:mr-auto sm:text-left">
              {validationHint}
            </p>
          ) : null}
        </div>
      }

    >
      <form
        id="automation-editor-form"
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <FormField id="auto-name" label="Naam">
        {(controlProps) => (
          <Input
            {...controlProps}
            aria-required="true"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bijv. Ochtendlicht woonkamer"
          />
        )}
      </FormField>

      <FormField
        id="auto-time"
        label="Tijdstip"
        description="Tijden in Nederlandse tijd (Europe/Amsterdam)"
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="[color-scheme:dark]"
          />
        )}
      </FormField>

      <fieldset>
        <legend className="sr-only">Type Trigger</legend>
        <Surface tone="subtle" padding="none" radius="md" className="mb-4 flex gap-1 p-1">
          <Button
            onClick={() => setTriggerType("time")}
            aria-pressed={triggerType === "time"}
            variant={triggerType === "time" ? "primary" : "ghost"}
            size="sm"
            fullWidth
          >
            Vaste dagen
          </Button>
          <Button
            onClick={() => setTriggerType("schedule")}
            aria-pressed={triggerType === "schedule"}
            variant={triggerType === "schedule" ? "primary" : "ghost"}
            size="sm"
            fullWidth
          >
            Rooster (smart)
          </Button>
        </Surface>
      </fieldset>

      {triggerType === "time" ? (
        <fieldset>
          <legend className="sr-only">Dagen</legend>
          <div className="mb-2 flex flex-wrap gap-1">
            {[["Alle", ALL_DAYS], ["Doordeweeks", WEEKDAYS], ["Weekend", WEEKEND]].map(
              ([label, presetDays]) => (
                <Button
                  key={label as string}
                  onClick={() => setDays(presetDays as number[])}
                  variant="ghost"
                  size="sm"
                >
                  {label as string}
                </Button>
              )
            )}
          </div>
          <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
            {DAY_LABELS.map((label, dayIndex) => (
              <Button
                key={label}
                aria-pressed={days.includes(dayIndex)}
                onClick={() => toggleDay(dayIndex)}
                variant={days.includes(dayIndex) ? "primary" : "secondary"}
                size="sm"
                fullWidth
                className="px-0"
              >
                {label}
              </Button>
            ))}
          </div>
        </fieldset>
      ) : (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-[var(--color-text)]">Kies de dienst</legend>
          <p className="text-micro text-[var(--color-text-muted)] mb-3 leading-relaxed">
            De automatisering gaat alléén af als je op deze dag de geselecteerde dienst hebt.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["Vroeg", "Laat", "Dienst"] as ShiftType[]).map((shift) => (
              <Button
                key={shift}
                aria-pressed={shiftType === shift}
                onClick={() => setShiftType(shift)}
                variant={shiftType === shift ? "primary" : "secondary"}
                size="sm"
                fullWidth
              >
                {shift}
              </Button>
            ))}
          </div>
        </fieldset>
      )}

      {/* M3: niet-blokkerende waarschuwing bij overlappende automations */}
      {overlapping.length > 0 && (
        <Surface tone="warning" radius="sm" padding="sm" role="status" className="text-xs text-[var(--color-warning)]">
          Let op: &lsquo;{overlapping[0].name}&rsquo;
          {overlapping.length > 1
            ? ` en ${overlapping.length - 1} andere draaien`
            : " draait"}{" "}
          ook om {time} op deze dagen.
        </Surface>
      )}

      <fieldset>
        <legend className="sr-only">Actie type</legend>
        <Surface tone="subtle" padding="none" radius="md" className="grid grid-cols-3 gap-1 p-1">
          {(Object.keys(actionLabels) as ActionType[]).map((type) => (
            <Button
              key={type}
              aria-pressed={actionType === type}
              onClick={() => setActionType(type)}
              variant={actionType === type ? "primary" : "ghost"}
              size="sm"
              fullWidth
              className="px-2"
            >
              {actionLabels[type]}
            </Button>
          ))}
        </Surface>
      </fieldset>

      <div>
        {actionType === "scene" && (
          <div className="grid grid-cols-3 gap-1">
            {Object.entries(SCENE_DEFINITIONS).map(([id, { label }]) => (
              <Button
                key={id}
                aria-pressed={sceneId === id}
                onClick={() => setSceneId(id)}
                variant={sceneId === id ? "primary" : "secondary"}
                size="sm"
                fullWidth
              >
                {label}
              </Button>
            ))}
          </div>
        )}
        {actionType === "brightness" && (
          <FormField id="automation-action-brightness" label="Helderheid" visuallyHiddenLabel>
            {(controlProps) => (
              <Range
                {...controlProps}
                min={5}
                max={100}
                value={brightness}
                fillValue={brightness}
                track="accent"
                onChange={(e) => setBrightness(+e.target.value)}
              />
            )}
          </FormField>
        )}
        {actionType === "color_temp" && (
          <FormField id="automation-action-color-temperature" label="Kleurtemperatuur" visuallyHiddenLabel>
            {(controlProps) => (
              <Range
                {...controlProps}
                min={154}
                max={455}
                value={colorTempMireds}
                track="temperature"
                onChange={(e) => setColorTempMireds(+e.target.value)}
                // Mireds: laag = koel (6500K), hoog = warm (2200K) → links koel/blauw, rechts warm/oranje
              />
            )}
          </FormField>
        )}
        {actionType === "color" && (
          <FormField id="automation-action-color" label="Kleur kiezen" visuallyHiddenLabel>
            {(controlProps) => (
              <div className="flex items-center gap-3">
                <input
                  {...controlProps}
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="h-11 w-12 cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent"
                />
                <span className="font-mono text-xs text-[var(--color-text-muted)]">{colorHex.toUpperCase()}</span>
              </div>
            )}
          </FormField>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-[var(--color-text)]">Slimme uitsluitingen</legend>
        <p className="text-micro text-[var(--color-text-muted)] mb-3 leading-relaxed">
          Sla deze automatisering automatisch over als je één van deze diensten hebt op die dag.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["Vroeg", "Laat", "Dienst"] as ShiftType[]).map((shift) => {
            const isTrigger = shift === shiftType;
            return (
              <Button
                key={shift}
                aria-pressed={excludedShifts.includes(shift)}
                disabled={isTrigger}
                title={isTrigger ? "Dit is je triggershift — uitsluiten zou de automatisering nooit laten vuren" : undefined}
                onClick={() => toggleExcludedShift(shift)}
                variant={excludedShifts.includes(shift) ? "primary" : "secondary"}
                size="sm"
                fullWidth
              >
                {shift}
              </Button>
            );
          })}
        </div>
      </fieldset>

      {saveError && (
        <Surface tone="danger" radius="sm" padding="sm" role="alert" className="text-xs text-[var(--color-danger)]">
          {saveError}
        </Surface>
      )}

      </form>
    </Modal>
  );
});
