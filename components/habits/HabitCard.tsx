"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  AlertTriangle,
  Pause,
  MoreVertical,
  Trash2,
  Archive,
  Edit3,
  Plus,
  Minus,
  RotateCcw,
  ChevronDown,
  Trophy,
  Calendar,
  Target,
  Zap,
  TrendingUp,
} from "lucide-react";
import {
  formatStreak,
  formatStreakShort,
  formatXP,
  MOEILIJKHEID_LABELS,
  FREQUENTIE_LABELS,
} from "@/lib/habit-constants";
import { getLevel } from "@/lib/habit-constants";
import { DEFAULT_STAP, INCIDENT_TRIGGERS } from "@/lib/habit-constants";
import { isPeriodHabit, isPeriodSatisfied, type HabitWithLog } from "@/hooks/useHabits";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Popover } from "@/components/ui/Popover";
import { Badge } from "@/components/ui/Badge";
import { Surface } from "@/components/ui/Surface";
import { habitColorStyle } from "./HabitsUtils";
import { cn } from "@/lib/utils";
import { uiMotion } from "@/lib/ui/motion";

/**
 * HabitCard — Habit kaart met checkbox/stepper, streak, XP, incident triggers.
 * Mobile-first: touch targets >= 44px, stepper gescheiden van incident button.
 * Tappable content area: expand/collapse detail panel.
 */

const ROOSTER_LABELS: Record<string, string> = {
  alle: "Altijd",
  werkdagen: "Alleen werkdagen",
  vrijeDagen: "Alleen vrije dagen",
  vroegeDienst: "Vroege diensten",
  lateDienst: "Late diensten",
};

interface HabitCardProps {
  habit: HabitWithLog;
  onToggle: () => void;
  onIncrement: (stap: number) => void;
  onIncident: (trigger?: string, notitie?: string) => void;
  /** Removes the incident registration for the shown day (confirm handled by caller). */
  onRemoveIncident?: () => void;
  /** True when incidents can't be logged for the shown date (e.g. >30 dagen terug). */
  incidentDisabled?: boolean;
  onPause: () => void;
  onArchive: () => void;
  onRemove: () => void;
  onEdit: () => void;
  masked?: boolean;
  pending?: boolean;
  paused?: boolean;
  /**
   * True when this habit has no log slot for today (Overzicht-tab, M-C):
   * the toggle is disabled with "Vandaag niet gepland" — behalve voor
   * weekly/monthly habits, die op elke dag afvinkbaar zijn.
   */
  notDueToday?: boolean;
}

export function HabitCard({
  habit,
  onToggle,
  onIncrement,
  onIncident,
  onRemoveIncident,
  incidentDisabled = false,
  onPause,
  onArchive,
  onRemove,
  onEdit,
  masked = false,
  pending = false,
  paused = false,
  notDueToday = false,
}: HabitCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<string | undefined>();
  const [triggerNotitie, setTriggerNotitie] = useState("");
  const menuListRef = useRef<HTMLDivElement>(null);

  const isCompleted = habit.log?.voltooid === true;
  const isNegative = habit.type === "negatief";
  const hasIncident = habit.log?.isIncident === true;
  const isQuantitative = habit.isKwantitatief && habit.doelWaarde;
  const habitStyle = habitColorStyle(habit.kleur);
  // N5: weekly/monthly habits count per periode — target gehaald = voldaan,
  // ook als er vandaag geen vinkje staat.
  const periodHabit = isPeriodHabit(habit);
  const periodTarget = habit.doelAantal ?? 0;
  const periodCount = habit.periodVoltooidCount ?? 0;
  const periodSatisfied = isPeriodSatisfied(habit);
  const isSuccess = isNegative ? !hasIncident : isCompleted || periodSatisfied;
  // M-C: niet-due habits (Overzicht) zijn niet toggle-baar — behalve
  // period-habits, die tellen op elke dag mee voor hun week/maand-doel.
  const toggleBlocked = notDueToday && !periodHabit;

  const stap = DEFAULT_STAP[habit.eenheid ?? "x"] ?? 1;
  const currentWaarde = habit.log?.waarde ?? 0;

  // ── M-F: instant stepper ────────────────────────────────────────────────────
  // Taps accumuleren lokaal (draftWaarde) en worden ~400ms na de laatste tap in
  // één request gecommit (LampControl-patroon). De knoppen blijven bruikbaar
  // tijdens debounce én tijdens een lopende request; een commit die binnenkomt
  // terwijl er al een request loopt wordt na afloop alsnog verstuurd.
  const [draftWaarde, setDraftWaarde] = useState<number | null>(null);
  const [waardeInput, setWaardeInput] = useState<string | null>(null);
  const pendingRef = useRef(pending);
  const pendingCommitRef = useRef<number | null>(null);
  const serverWaardeRef = useRef(currentWaarde);
  useEffect(() => {
    serverWaardeRef.current = currentWaarde;
  }, [currentWaarde]);

  const commitWaarde = useCallback(
    (target: number) => {
      if (pendingRef.current) {
        pendingCommitRef.current = target;
        return;
      }
      const delta = target - serverWaardeRef.current;
      setDraftWaarde(null);
      if (delta !== 0) onIncrement(delta);
    },
    [onIncrement],
  );
  const debouncedCommit = useDebouncedCallback(commitWaarde, 400);

  useEffect(() => {
    pendingRef.current = pending;
    if (!pending && pendingCommitRef.current != null) {
      const target = pendingCommitRef.current;
      pendingCommitRef.current = null;
      commitWaarde(target);
    }
  }, [pending, commitWaarde]);

  // Datum staat in de React-key van alle interactieve HabitCard-callers.
  // Een datumwissel remount daardoor de kaart; annuleer bij unmount nog een
  // eventueel geparkeerde commit voor de oude datum.
  useEffect(
    () => () => {
      debouncedCommit.cancel();
      pendingCommitRef.current = null;
    },
    [debouncedCommit],
  );
  const displayedWaarde = draftWaarde ?? currentWaarde;
  const doelWaarde = habit.doelWaarde ?? 0;
  const displayedCompleted = isQuantitative
    ? displayedWaarde >= doelWaarde
    : isCompleted;

  const stepBy = (delta: number) => {
    const next = Math.max(0, displayedWaarde + delta);
    setDraftWaarde(next);
    setWaardeInput(null);
    debouncedCommit(next);
  };

  const commitWaardeInput = () => {
    if (waardeInput == null) return;
    const parsed = Number(waardeInput.replace(",", "."));
    setWaardeInput(null);
    if (!Number.isFinite(parsed)) return;
    const next = Math.max(0, parsed);
    setDraftWaarde(next);
    debouncedCommit(next);
  };

  const progress = isQuantitative
    ? Math.min(1, displayedWaarde / habit.doelWaarde!)
    : 0;
  const displayName = masked ? "Verborgen habit" : habit.naam;
  const displayEmoji = masked ? "•" : habit.emoji;
  const typeLabel = masked ? "Afgeschermd" : "Vermijden";
  const frequencyLabel = masked
    ? "Schema"
    : (FREQUENTIE_LABELS[habit.frequentie] ?? habit.frequentie);

  // Pijltjesnavigatie in het actiemenu (low): één menu, roving focus.
  const handleMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    );
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    let next = 0;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key === "ArrowRight" || e.key === "ArrowDown")
      next = current < 0 ? 0 : (current + 1) % items.length;
    else next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
    e.preventDefault();
    items[next].focus();
  };

  const handleIncidentSubmit = () => {
    onIncident(selectedTrigger, triggerNotitie || undefined);
    setShowTriggerModal(false);
    setSelectedTrigger(undefined);
    setTriggerNotitie("");
  };

  return (
    <motion.div
      layout
      aria-busy={pending}
      style={habitStyle}
      className={cn("relative transition-opacity", pending && "opacity-60")}
    >
      <Surface
        tone={hasIncident ? "danger" : isSuccess ? "subtle" : "default"}
        padding="none"
        className={cn(
          "relative overflow-hidden",
          isSuccess && !hasIncident && "border-[var(--habit-color-border)] bg-[var(--habit-color-soft)]",
        )}
      >
        <div className="flex items-center gap-3 p-3 sm:p-3.5">
          {isNegative ? (
            <AppIcon
              name={hasIncident ? "warning" : "check"}
              tone={hasIncident ? "danger" : "success"}
              size="lg"
              framed
            />
          ) : isQuantitative ? (
            <span
              aria-hidden="true"
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-xl",
                isCompleted
                  ? "border-[var(--habit-color)] bg-[var(--habit-color)] text-[var(--habit-color-foreground)]"
                  : "border-[var(--habit-color-border)] bg-[var(--habit-color-soft)]",
              )}
            >
              {isCompleted ? <Check size={20} /> : displayEmoji}
            </span>
          ) : (
            <IconButton
              onClick={onToggle}
              disabled={pending || paused || toggleBlocked}
              aria-busy={pending}
              label={toggleBlocked ? `${displayName}: vandaag niet gepland` : isCompleted ? `${displayName} heropenen` : `${displayName} voltooien`}
              title={toggleBlocked ? "Vandaag niet gepland" : isCompleted ? "Heropenen" : "Voltooien"}
              variant="secondary"
              className={cn(
                "h-12 w-12 rounded-xl",
                isCompleted
                  ? "border-[var(--habit-color)] bg-[var(--habit-color)] text-[var(--habit-color-foreground)]"
                  : "border-[var(--habit-color-border)] bg-[var(--habit-color-soft)]",
              )}
              icon={isCompleted ? <Check size={20} /> : <span className="text-xl">{displayEmoji}</span>}
            />
          )}

          <Button
            variant="ghost"
            onClick={() => setShowDetail(!showDetail)}
            aria-expanded={showDetail}
            aria-label={`${displayName} details ${showDetail ? "sluiten" : "openen"}`}
            className="h-auto min-w-0 flex-1 justify-start px-1 py-1 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className={cn(
                  "truncate text-sm font-semibold",
                  isSuccess ? "text-[var(--color-text-muted)]" : hasIncident ? "text-[var(--color-danger)]" : "text-[var(--color-text)]",
                  isSuccess && !isNegative && "line-through",
                )}>
                  {displayName}
                </span>
                {isNegative && <Badge tone="danger" size="sm">{typeLabel}</Badge>}
                <ChevronDown
                  size={14}
                  className={cn("shrink-0 text-[var(--color-text-subtle)] transition-transform duration-[var(--motion-fast)]", showDetail && "rotate-180")}
                  aria-hidden="true"
                />
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-2">
                {periodHabit && periodTarget > 0 && !masked && (
                  <Badge tone={periodSatisfied ? "success" : "info"} size="sm">
                    {periodCount}/{periodTarget} {habit.frequentie === "x_per_week" ? "deze week" : "deze maand"}{periodSatisfied ? " ✓" : ""}
                  </Badge>
                )}
                {habit.huidigeStreak > 0 && <span className="text-micro font-medium text-[var(--color-warning)]">{formatStreak(habit.huidigeStreak, habit.frequentie)}</span>}
                {habit.log?.xpVerdiend ? <span className="text-micro text-[var(--color-success)]">+{habit.log.xpVerdiend} XP</span> : null}
                {!masked && <span className="text-micro text-[var(--color-text-muted)]">{MOEILIJKHEID_LABELS[habit.moeilijkheid as string]}</span>}
                {habit.doelTijd && !masked && <span className="inline-flex items-center gap-1 text-micro text-[var(--color-info)]"><AppIcon name="time" tone="info" size="xs" />{habit.doelTijd}</span>}
              </span>
            </span>
          </Button>

          {isNegative && !hasIncident && (
            <IconButton
              onClick={() => setShowTriggerModal(true)}
              disabled={pending || paused || incidentDisabled}
              loading={pending}
              label={incidentDisabled ? "Incident loggen kan alleen tot 30 dagen terug" : `Incident loggen voor ${displayName}`}
              title={incidentDisabled ? "Incident loggen kan alleen tot 30 dagen terug" : "Incident loggen"}
              icon={<AlertTriangle size={16} />}
              variant="danger"
            />
          )}
          {isNegative && hasIncident && onRemoveIncident && (
            <Button onClick={onRemoveIncident} disabled={paused} loading={pending} aria-label={`Incident verwijderen voor ${displayName}`} title="Incident verwijderen" variant="danger" size="sm">
              <RotateCcw size={14} aria-hidden="true" /><span className="hidden sm:inline">Incident verwijderen</span>
            </Button>
          )}
          <Popover
            open={showMenu}
            onOpenChange={setShowMenu}
            title={`Acties voor ${displayName}`}
            ariaLabel={`Acties voor ${displayName}`}
            role="menu"
            align="end"
            showDesktopHeader={false}
            className="w-72"
            onContentKeyDown={handleMenuKeyDown}
            trigger={(triggerProps) => (
              <IconButton
                {...triggerProps}
                label={`Acties voor ${displayName}`}
                title="Acties"
                icon={<MoreVertical size={16} />}
              />
            )}
          >
            <div ref={menuListRef} className="grid grid-cols-2 gap-2">
              <MenuBtn first icon={<Edit3 size={15} />} label="Bewerken" onClick={() => { onEdit(); setShowMenu(false); }} />
              <MenuBtn icon={<Pause size={15} />} label={habit.isPauze ? "Hervatten" : "Pauzeren"} onClick={() => { onPause(); setShowMenu(false); }} />
              <MenuBtn icon={<Archive size={15} />} label="Archiveer" onClick={() => { onArchive(); setShowMenu(false); }} />
              <MenuBtn icon={<Trash2 size={15} />} label="Verwijder" onClick={() => { onRemove(); setShowMenu(false); }} danger />
            </div>
          </Popover>
        </div>

        {isQuantitative && toggleBlocked && (
          <div className="px-3.5 pb-3"><Badge size="sm">Vandaag niet gepland</Badge></div>
        )}
        {isQuantitative && !toggleBlocked && (
          <div className="px-3.5 pb-3">
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-active)]">
              <motion.div
                className="h-full rounded-full bg-[var(--habit-color)]"
                animate={{ width: `${progress * 100}%` }}
                transition={uiMotion.spring.progress}
              />
            </div>
            <div className="flex items-center gap-2">
              <IconButton
                onClick={() => stepBy(-stap)}
                disabled={displayedWaarde <= 0 || paused}
                label={`${displayName} ${stap} ${habit.eenheid ?? ""} verminderen`}
                variant="secondary"
                icon={<Minus size={16} />}
              />
              <div className="flex flex-1 items-center justify-center gap-1">
                {masked ? (
                  <span className="text-sm font-bold text-[var(--color-text)]">•• <span className="text-micro text-[var(--color-text-muted)]">/ ••</span></span>
                ) : (
                  <>
                    <Input
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={waardeInput ?? String(displayedWaarde)}
                      onChange={(event) => setWaardeInput(event.target.value)}
                      onBlur={commitWaardeInput}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                      disabled={paused}
                      aria-label={`${displayName} waarde (${habit.eenheid ?? "aantal"})`}
                      className={cn("w-20 text-center text-sm font-bold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none", displayedCompleted && "text-[var(--habit-color-contrast)]")}
                    />
                    <span className="text-micro text-[var(--color-text-muted)]">/ {habit.doelWaarde} {habit.eenheid ?? ""}</span>
                  </>
                )}
              </div>
              <IconButton
                onClick={() => stepBy(stap)}
                disabled={displayedCompleted || paused}
                label={`${displayName} ${stap} ${habit.eenheid ?? ""} verhogen`}
                variant="secondary"
                className="border-[var(--habit-color-border)] bg-[var(--habit-color-soft)] text-[var(--habit-color-contrast)]"
                icon={<Plus size={16} />}
              />
            </div>
          </div>
        )}

        <AnimatePresence>
          {showDetail && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: uiMotion.durationSeconds.standard, ease: "easeInOut" }} className="overflow-hidden">
              <div className="border-t border-[var(--color-border)] px-3.5 pb-3 pt-3">
                {habit.beschrijving && !masked && <p className="mb-3 text-micro leading-relaxed text-[var(--color-text-muted)]">{habit.beschrijving}</p>}
                {isNegative && !masked && (
                  <Surface tone="danger" radius="sm" padding="xs" className="mb-3 text-micro leading-relaxed text-[var(--color-text-muted)]">
                    Elke dag zonder incident bouwt je streak op; een gelogd incident zet de streak terug op nul.
                  </Surface>
                )}
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <DetailStat icon={<Calendar size={12} className="text-[var(--color-info)]" />} label="Frequentie" value={frequencyLabel} tone="info" />
                  <DetailStat icon={<Trophy size={12} className="text-[var(--color-primary-hover)]" />} label="Langste streak" value={formatStreakShort(habit.langsteStreak, habit.frequentie)} tone="accent" />
                  <DetailStat icon={<Target size={12} className="text-[var(--color-success)]" />} label="Totaal voltooid" value={`${habit.totaalVoltooid}x`} tone="success" />
                </div>
                {(() => {
                  const levelInfo = getLevel(habit.totaalXP);
                  return (
                    <Surface tone="subtle" radius="sm" padding="xs" className="border-[var(--habit-color-border)] bg-[var(--habit-color-soft)]">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-micro font-bold text-[var(--habit-color-contrast)]"><Zap size={12} aria-hidden="true" />Lv.{levelInfo.level} {levelInfo.titel}</span>
                        <span className="shrink-0 text-micro text-[var(--color-text-muted)]">{formatXP(habit.totaalXP)}{levelInfo.nextXP > 0 && <span className="text-[var(--color-text-subtle)]"> · nog {levelInfo.nextXP}</span>}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-[var(--color-surface-active)]">
                        <motion.div className="h-full rounded-full bg-[var(--habit-color)]" animate={{ width: `${levelInfo.progress * 100}%` }} transition={uiMotion.spring.progress} />
                      </div>
                    </Surface>
                  );
                })()}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {habit.roosterFilter && habit.roosterFilter !== "alle" && <Badge tone="info" size="sm"><TrendingUp size={11} aria-hidden="true" />Rooster: {ROOSTER_LABELS[habit.roosterFilter] ?? habit.roosterFilter}</Badge>}
                  <Badge size="sm">Aangemaakt {new Date(habit.aangemaakt).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}</Badge>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showTriggerModal && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-[var(--color-danger-border)]">
              <div className="p-3.5">
                <p className="mb-2.5 text-micro font-medium text-[var(--color-text-muted)]">Wat was de trigger?</p>
                <div className="mb-3 grid grid-cols-2 gap-1.5">
                  {INCIDENT_TRIGGERS.map((trigger, index) => (
                    <Button
                      key={trigger.value}
                      onClick={() => setSelectedTrigger(selectedTrigger === trigger.value ? undefined : trigger.value)}
                      aria-pressed={selectedTrigger === trigger.value}
                      aria-label={masked ? `Trigger ${index + 1}` : `Trigger ${trigger.label}`}
                      variant={selectedTrigger === trigger.value ? "danger" : "secondary"}
                      size="sm"
                      className="h-auto min-h-11 justify-start text-left text-micro"
                    >
                      {masked ? `Trigger ${index + 1}` : `${trigger.emoji} ${trigger.label}`}
                    </Button>
                  ))}
                </div>
                {(selectedTrigger === "anders" || selectedTrigger) && (
                  <Input
                    type="text"
                    value={triggerNotitie}
                    onChange={(event) => setTriggerNotitie(event.target.value)}
                    placeholder={selectedTrigger === "anders" ? "Beschrijf de trigger…" : "Optionele notitie…"}
                    aria-required={selectedTrigger === "anders"}
                    aria-label="Notitie bij incident"
                    className="mb-3 w-full text-xs"
                  />
                )}
                {selectedTrigger === "anders" && !triggerNotitie.trim() && <p className="-mt-2 mb-3 text-micro text-[var(--color-danger)]">Een korte beschrijving is verplicht bij &ldquo;anders&rdquo;.</p>}
                <div className="flex gap-2">
                  <Button onClick={() => { setShowTriggerModal(false); setSelectedTrigger(undefined); setTriggerNotitie(""); }} variant="secondary" size="sm" fullWidth>Annuleren</Button>
                  <Button onClick={handleIncidentSubmit} disabled={selectedTrigger === "anders" && !triggerNotitie.trim()} variant="danger" size="sm" fullWidth>Incident loggen</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


      </Surface>
    </motion.div>
  );
}
function MenuBtn({
  icon,
  label,
  onClick,
  danger,
  first,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  /** Roving tabindex: only the first menuitem is tab-reachable (a11y R3). */
  first?: boolean;
}) {
  return (
    <Button
      role="menuitem"
      tabIndex={first ? 0 : -1}
      onClick={onClick}
      aria-label={label}
      variant={danger ? "danger" : "ghost"}
      className="min-h-[52px] flex-1 flex-col gap-1 py-3"
    >
      {icon}
      <span className="text-micro font-medium">{label}</span>
    </Button>
  );
}

function DetailStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "accent" | "info" | "success";
}) {
  return (
    <Surface tone={tone} radius="sm" padding="xs" className="text-center">
      <div className="mb-1 flex justify-center" aria-hidden="true">{icon}</div>
      <div className="text-micro font-bold text-[var(--color-text)]">{value}</div>
      <div className="mt-0.5 text-micro text-[var(--color-text-muted)]">{label}</div>
    </Surface>
  );
}