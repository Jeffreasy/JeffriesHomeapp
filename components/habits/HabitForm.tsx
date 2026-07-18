"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Zap,
  Clock,
  CalendarDays,
  Timer,
  Hash,
  Ruler,
} from "lucide-react";
import { HABIT_EMOJIS, ROOSTER_FILTER_OPTIONS } from "@/lib/habit-constants";
import {
  HABIT_COLORS,
  FREQUENTIE_LABELS,
  MOEILIJKHEID_LABELS,
  DAG_LABELS,
  DAG_INDEXES_MA_EERST,
} from "@/lib/habit-constants";
import type { HabitCreateData } from "@/hooks/useHabits";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { OverlaySurface } from "@/components/ui/OverlaySurface";
import { Surface } from "@/components/ui/Surface";
import { Switch } from "@/components/ui/Switch";
import { habitColorStyle } from "./HabitsUtils";
import { cn } from "@/lib/utils";

/**
 * HabitForm — Create/edit modal.
 * Mobile-first: full-screen on mobile, modal on desktop.
 * BottomSheet pattern for mobile.
 */
interface HabitFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: HabitCreateData) => void | Promise<void>;
  initial?: Partial<HabitCreateData>;
}

// Mirrors the reset-defaults in the open-effect so the dirty check compares
// against exactly the state the form (re)opens with.
function formSnapshot(state: {
  naam: string;
  emoji: string;
  type: string;
  frequentie: string;
  aangepasteDagen: number[];
  moeilijkheid: string;
  roosterFilter?: string | null;
  kleur: string;
  beschrijving: string;
  isKwantitatief: boolean;
  doelWaarde?: number;
  eenheid: string;
  doelAantal?: number;
  doelTijd: string;
}) {
  return JSON.stringify({
    ...state,
    aangepasteDagen: [...state.aangepasteDagen].sort((a, b) => a - b),
    roosterFilter: state.roosterFilter ?? "alle",
    doelWaarde: state.doelWaarde ?? null,
    doelAantal: state.doelAantal ?? null,
  });
}

export function HabitForm({
  open,
  onClose,
  onSubmit,
  initial,
}: HabitFormProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { openConfirm } = useConfirm();
  const [naam, setNaam] = useState(initial?.naam ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "🎯");
  const [type, setType] = useState<"positief" | "negatief">(
    initial?.type ?? "positief",
  );
  const [frequentie, setFrequentie] = useState<HabitCreateData["frequentie"]>(
    initial?.frequentie ?? "dagelijks",
  );
  const [aangepasteDagen, setAangepasteDagen] = useState<number[]>(
    initial?.aangepasteDagen ?? [],
  );
  const [moeilijkheid, setMoeilijkheid] = useState<
    "makkelijk" | "normaal" | "moeilijk"
  >(initial?.moeilijkheid ?? "normaal");
  const [roosterFilter, setRoosterFilter] = useState<
    HabitCreateData["roosterFilter"]
  >(initial?.roosterFilter ?? "alle");
  const [kleur, setKleur] = useState(initial?.kleur ?? HABIT_COLORS[0]);
  const [beschrijving, setBeschrijving] = useState(initial?.beschrijving ?? "");
  const [isKwantitatief, setIsKwantitatief] = useState(
    initial?.isKwantitatief ?? false,
  );
  const [doelWaarde, setDoelWaarde] = useState<number | undefined>(
    initial?.doelWaarde,
  );
  const [eenheid, setEenheid] = useState(initial?.eenheid ?? "");
  const [doelAantal, setDoelAantal] = useState<number | undefined>(
    initial?.doelAantal,
  );
  const [doelTijd, setDoelTijd] = useState(initial?.doelTijd ?? "");
  const [showEmojis, setShowEmojis] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // R3: freeze `initial` at open-time. The habits query can return a new object
  // identity while the editor is open (e.g. a Telegram check-off + refocus);
  // that used to recompute the dirty baseline AND re-run the reset effect,
  // wiping the user's typed edits. Capturing once on open decouples the form
  // from live server churn.
  const frozenInitialRef = useRef<Partial<HabitCreateData> | undefined>(initial);
  const wasOpenRef = useRef(false);
  if (open && !wasOpenRef.current) {
    frozenInitialRef.current = initial;
    wasOpenRef.current = true;
  } else if (!open && wasOpenRef.current) {
    wasOpenRef.current = false;
  }
  const frozenInitial = frozenInitialRef.current;

  // Dirty check (H6): compare against the same defaults the open-effect resets to.
  const initialSnapshot = useMemo(
    () =>
      formSnapshot({
        naam: frozenInitial?.naam ?? "",
        emoji: frozenInitial?.emoji ?? "🎯",
        type: frozenInitial?.type ?? "positief",
        frequentie: frozenInitial?.frequentie ?? "dagelijks",
        aangepasteDagen: frozenInitial?.aangepasteDagen ?? [],
        moeilijkheid: frozenInitial?.moeilijkheid ?? "normaal",
        roosterFilter: frozenInitial?.roosterFilter ?? "alle",
        kleur: frozenInitial?.kleur ?? HABIT_COLORS[0],
        beschrijving: frozenInitial?.beschrijving ?? "",
        isKwantitatief: frozenInitial?.isKwantitatief ?? false,
        doelWaarde: frozenInitial?.doelWaarde,
        eenheid: frozenInitial?.eenheid ?? "",
        doelAantal: frozenInitial?.doelAantal,
        doelTijd: frozenInitial?.doelTijd ?? "",
      }),
    [frozenInitial],
  );
  const isDirty =
    formSnapshot({
      naam,
      emoji,
      type,
      frequentie,
      aangepasteDagen,
      moeilijkheid,
      roosterFilter,
      kleur,
      beschrijving,
      isKwantitatief,
      doelWaarde,
      eenheid,
      doelAantal,
      doelTijd,
    }) !== initialSnapshot;

  // One close path for backdrop, X and Escape: typed input never silently
  // disappears without an explicit confirm (H6, same gedrag als NoteEditor).
  const confirmingCloseRef = useRef(false);
  const handleCloseAttempt = useCallback(async () => {
    if (confirmingCloseRef.current || isSubmitting) return;
    if (isDirty) {
      confirmingCloseRef.current = true;
      try {
        const confirmed = await openConfirm({
          title: "Wijzigingen sluiten?",
          message: "Je hebt nog niet-opgeslagen invoer in dit formulier.",
          confirmLabel: "Sluiten",
          variant: "danger",
        });
        if (!confirmed) return;
      } finally {
        confirmingCloseRef.current = false;
      }
    }
    onClose();
  }, [isDirty, isSubmitting, onClose, openConfirm]);

  // Reset state ONLY when the form opens (R3): keyed on `[open]`, not `initial`,
  // so a concurrent server refresh of the habits list can't wipe typed edits.
  // Reads the frozen snapshot captured at open-time above.
  useEffect(() => {
    if (!open) return;
    const snap = frozenInitialRef.current;

    const timeout = window.setTimeout(() => {
      setNaam(snap?.naam ?? "");
      setEmoji(snap?.emoji ?? "🎯");
      setType(snap?.type ?? "positief");
      setFrequentie(snap?.frequentie ?? "dagelijks");
      setAangepasteDagen(snap?.aangepasteDagen ?? []);
      setMoeilijkheid(snap?.moeilijkheid ?? "normaal");
      setRoosterFilter(snap?.roosterFilter ?? "alle");
      setKleur(snap?.kleur ?? HABIT_COLORS[0]);
      setBeschrijving(snap?.beschrijving ?? "");
      setIsKwantitatief(snap?.isKwantitatief ?? false);
      setDoelWaarde(snap?.doelWaarde);
      setEenheid(snap?.eenheid ?? "");
      setDoelAantal(snap?.doelAantal);
      setDoelTijd(snap?.doelTijd ?? "");
      setShowEmojis(false);
      setIsSubmitting(false);
      setSubmitError(null);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const canAutofocus = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    if (!canAutofocus) return;

    const timeout = window.setTimeout(() => nameInputRef.current?.focus(), 180);
    return () => window.clearTimeout(timeout);
  }, [open]);

  // Inline validatie (lows): aangepast schema vereist ≥1 dag, week/maand-doel
  // vereist ≥1, en een meetbaar doel mag niet negatief zijn.
  const validationError =
    frequentie === "aangepast" && aangepasteDagen.length === 0
      ? "Kies minimaal één dag voor een aangepast schema."
      : (frequentie === "x_per_week" || frequentie === "x_per_maand") &&
          (!doelAantal || doelAantal < 1)
        ? `Stel in hoe vaak per ${frequentie === "x_per_week" ? "week" : "maand"} (minimaal 1).`
        : isKwantitatief && doelWaarde != null && doelWaarde < 0
          ? "Het meetbare doel moet 0 of hoger zijn."
          : null;

  const handleSubmit = async () => {
    if (!naam.trim() || isSubmitting || validationError) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        naam: naam.trim(),
        emoji,
        type,
        frequentie,
        aangepasteDagen:
          frequentie === "aangepast" ? aangepasteDagen : undefined,
        moeilijkheid,
        roosterFilter: roosterFilter === "alle" ? undefined : roosterFilter,
        isKwantitatief,
        doelWaarde: isKwantitatief ? doelWaarde : undefined,
        eenheid: isKwantitatief ? eenheid || undefined : undefined,
        doelAantal:
          frequentie === "x_per_week" || frequentie === "x_per_maand"
            ? doelAantal
            : undefined,
        doelTijd: doelTijd || undefined,
        kleur,
        beschrijving: beschrijving.trim() || undefined,
      });
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Habit opslaan is mislukt.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <OverlaySurface
      open={open}
      onClose={() => void handleCloseAttempt()}
      ariaLabel={initial ? "Habit bewerken" : "Nieuwe habit"}
      presentation="responsive"
      maxWidth="lg"
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
      ariaBusy={isSubmitting}
      dataAppModal="habit-form"
      className="max-h-[calc(100dvh-10px)] rounded-t-3xl border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-overlay)] sm:max-h-[min(760px,88dvh)] sm:rounded-2xl"
    >
            {/* Drag handle (mobile) */}
            <div className="flex shrink-0 justify-center pb-1 pt-3 md:hidden">
              <div className="w-10 h-1 rounded-full bg-[var(--color-surface-active)]" />
            </div>

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 pb-4 pt-2 md:pt-4">
              <h2 className="text-lg font-bold text-[var(--color-text)]">
                {initial ? "Habit bewerken" : "Nieuwe Habit"}
              </h2>
              <IconButton
                onClick={() => void handleCloseAttempt()}
                label="Habitformulier sluiten"
                icon={<X size={18} />}
                disabled={isSubmitting}
              />
            </div>

            {/* Scrollable content */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4 [-webkit-overflow-scrolling:touch]"
            >
              {/* Emoji + Naam */}
              <div className="mb-4 flex gap-3" style={habitColorStyle(kleur)}>
                <Button
                  onClick={() => setShowEmojis(!showEmojis)}
                  aria-label="Emoji kiezen"
                  title="Emoji kiezen"
                  variant="secondary"
                  className="h-14 w-14 shrink-0 rounded-2xl border-[var(--habit-color-border)] bg-[var(--habit-color-soft)] p-0 text-2xl"
                >
                  {emoji}
                </Button>
                <Input
                  ref={nameInputRef}
                  type="text"
                  value={naam}
                  onChange={(event) => setNaam(event.target.value)}
                  placeholder="Naam van habit…"
                  aria-label="Naam van habit"
                  className="min-h-14 flex-1"
                />
              </div>

              <AnimatePresence>
                {showEmojis && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mb-4 overflow-hidden"
                  >
                    <Surface tone="subtle" radius="sm" padding="sm" className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                      {HABIT_EMOJIS.map((candidate) => (
                        <Button
                          key={candidate}
                          onClick={() => {
                            setEmoji(candidate);
                            setShowEmojis(false);
                          }}
                          aria-label={`Emoji ${candidate} kiezen`}
                          title={`Emoji ${candidate}`}
                          aria-pressed={emoji === candidate}
                          variant={emoji === candidate ? "primary" : "ghost"}
                          size="icon"
                          className="text-xl"
                        >
                          {candidate}
                        </Button>
                      ))}
                    </Surface>
                  </motion.div>
                )}
              </AnimatePresence>

              <Input
                type="text"
                value={beschrijving}
                onChange={(event) => setBeschrijving(event.target.value)}
                placeholder="Optionele beschrijving…"
                aria-label="Beschrijving"
                className="mb-4 w-full"
              />

              <div className="mb-4">
                <p className="mb-2 text-micro font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["positief", "negatief"] as const).map((candidate) => (
                    <Button
                      key={candidate}
                      onClick={() => setType(candidate)}
                      aria-pressed={type === candidate}
                      variant={type === candidate ? (candidate === "positief" ? "success" : "danger") : "secondary"}
                      fullWidth
                      className="h-auto min-h-12"
                    >
                      <AppIcon name={candidate === "positief" ? "check" : "warning"} tone={candidate === "positief" ? "success" : "danger"} size="sm" />
                      {candidate === "positief" ? "Doen" : "Vermijden"}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="mb-2 flex items-center gap-1 text-micro font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                  <Clock size={10} aria-hidden="true" /> Frequentie
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(FREQUENTIE_LABELS).map(([key, label]) => (
                    <Button
                      key={key}
                      onClick={() => setFrequentie(key as HabitCreateData["frequentie"])}
                      aria-pressed={frequentie === key}
                      variant={frequentie === key ? "primary" : "secondary"}
                      size="sm"
                      fullWidth
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {frequentie === "aangepast" && (
                <div className="mb-4 flex gap-1.5">
                  {DAG_INDEXES_MA_EERST.map((index) => {
                    const label = DAG_LABELS[index];
                    const selected = aangepasteDagen.includes(index);
                    return (
                      <Button
                        key={index}
                        onClick={() => setAangepasteDagen((previous) => previous.includes(index) ? previous.filter((day) => day !== index) : [...previous, index])}
                        aria-pressed={selected}
                        aria-label={`${label} ${selected ? "uitschakelen" : "inschakelen"}`}
                        variant={selected ? "primary" : "secondary"}
                        size="sm"
                        className="min-w-0 flex-1 px-1.5"
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              )}

              <div className="mb-4">
                <p className="mb-2 flex items-center gap-1 text-micro font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                  <CalendarDays size={10} aria-hidden="true" /> Rooster koppeling
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ROOSTER_FILTER_OPTIONS.map(({ value, label }) => (
                    <Button
                      key={value}
                      onClick={() => setRoosterFilter(value)}
                      aria-pressed={roosterFilter === value}
                      variant={roosterFilter === value ? "primary" : "secondary"}
                      size="sm"
                      fullWidth
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {(frequentie === "x_per_week" || frequentie === "x_per_maand") && (
                <div className="mb-4">
                  <p className="mb-2 flex items-center gap-1 text-micro font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                    <Hash size={10} aria-hidden="true" /> Hoe vaak per {frequentie === "x_per_week" ? "week" : "maand"}?
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={doelAantal ?? ""}
                      onChange={(event) => setDoelAantal(event.target.value ? Math.floor(Number(event.target.value)) : undefined)}
                      placeholder="Aantal"
                      aria-label={`Hoe vaak per ${frequentie === "x_per_week" ? "week" : "maand"}`}
                      className="w-20"
                    />
                    {(frequentie === "x_per_week" ? [2, 3, 4, 5] : [5, 10, 15, 20]).map((amount) => (
                      <Button
                        key={amount}
                        onClick={() => setDoelAantal(amount)}
                        aria-pressed={doelAantal === amount}
                        variant={doelAantal === amount ? "primary" : "secondary"}
                        size="sm"
                        className="min-w-0 flex-1 px-1.5"
                      >
                        {amount}×
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Surface tone={isKwantitatief ? "info" : "subtle"} radius="sm" padding="xs" className="mb-4">
                <Switch
                  checked={isKwantitatief}
                  onCheckedChange={setIsKwantitatief}
                  label={<span className="flex items-center gap-1.5"><Ruler size={14} aria-hidden="true" />Meetbaar doel</span>}
                  description="Hoeveelheid of duur bijhouden"
                  className="px-1"
                />
                {isKwantitatief && (
                  <div className="mt-2 flex gap-2 border-t border-[var(--color-info-border)] pt-3">
                    <Input
                      type="number"
                      value={doelWaarde ?? ""}
                      onChange={(event) => setDoelWaarde(event.target.value ? Number(event.target.value) : undefined)}
                      placeholder="Doel"
                      aria-label="Doelwaarde"
                      className="flex-1"
                      inputMode="numeric"
                    />
                    <div className="grid grid-cols-5 gap-1 sm:flex">
                      {["min", "ml", "km", "pg", "x"].map((unit) => (
                        <Button
                          key={unit}
                          onClick={() => setEenheid(unit)}
                          aria-pressed={eenheid === unit}
                          aria-label={`Eenheid ${unit}`}
                          variant={eenheid === unit ? "primary" : "secondary"}
                          size="sm"
                          className="px-2.5 text-micro"
                        >
                          {unit}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </Surface>

              <div className="mb-4">
                <p className="mb-2 flex items-center gap-1 text-micro font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                  <Timer size={10} aria-hidden="true" /> Doeltijdstip (optioneel)
                </p>
                <Input type="time" value={doelTijd} aria-label="Doeltijdstip" onChange={(event) => setDoelTijd(event.target.value)} className="w-full scheme-dark" />
                {doelTijd && <Button onClick={() => setDoelTijd("")} variant="danger" size="sm" className="mt-2">Tijdstip wissen</Button>}
              </div>

              <div className="mb-4">
                <p className="mb-2 flex items-center gap-1 text-micro font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                  <Zap size={10} aria-hidden="true" /> Moeilijkheid (XP)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["makkelijk", "normaal", "moeilijk"] as const).map((candidate) => {
                    const xpValues = { makkelijk: 5, normaal: 10, moeilijk: 20 };
                    return (
                      <Button
                        key={candidate}
                        onClick={() => setMoeilijkheid(candidate)}
                        aria-pressed={moeilijkheid === candidate}
                        variant={moeilijkheid === candidate ? "primary" : "secondary"}
                        fullWidth
                        className="h-auto min-h-12 flex-col gap-0.5 py-2"
                      >
                        <span>{MOEILIJKHEID_LABELS[candidate]}</span>
                        <span className="text-micro opacity-60">{xpValues[candidate]} XP</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <p className="mb-2 text-micro font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">Kleur</p>
                <div className="flex flex-wrap gap-2.5">
                  {HABIT_COLORS.map((candidate) => (
                    <Button
                      key={candidate}
                      onClick={() => setKleur(candidate)}
                      aria-label={`Kleur ${candidate}`}
                      aria-pressed={kleur === candidate}
                      title={`Kleur ${candidate}`}
                      variant="ghost"
                      size="icon"
                      style={habitColorStyle(candidate)}
                      className={cn(
                        "rounded-full border-[var(--habit-color-border)] bg-[var(--habit-color)] hover:bg-[var(--habit-color)]",
                        kleur === candidate && "scale-110 ring-2 ring-[var(--color-text)] ring-offset-2 ring-offset-[var(--color-surface-elevated)]",
                      )}
                    >
                      <span className="sr-only">{candidate}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            {/* Submit button — above mobile nav, outside the scroll area */}
            <div
              className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            >
              {submitError && (
                <Surface tone="danger" radius="sm" padding="xs" className="mb-2 text-xs font-medium text-[var(--color-danger)]">
                  {submitError}
                </Surface>
              )}
              {validationError && naam.trim() && (
                <Surface tone="warning" radius="sm" padding="xs" className="mb-2 text-xs font-medium text-[var(--color-warning)]">
                  {validationError}
                </Surface>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!naam.trim() || Boolean(validationError)}
                loading={isSubmitting}
                loadingLabel="Opslaan…"
                variant="primary"
                fullWidth
                className="min-h-14"
              >
                <Plus size={16} aria-hidden="true" />
                {initial ? "Opslaan" : "Habit toevoegen"}
              </Button>
            </div>
    </OverlaySurface>
  );
}
