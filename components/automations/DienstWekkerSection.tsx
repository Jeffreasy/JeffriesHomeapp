"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { AlarmClock, BellRing, Briefcase, Clock3, Moon, RotateCcw, Save, ShieldCheck, Sunrise, Trash2 } from "lucide-react";
import {
  DIENST_WEKKER_PACKS,
  actionLabel,
  getDienstWekkerDefaultTimes,
  type Automation,
  type DienstWekkerTimes,
  type ShiftType,
} from "@/lib/automations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Surface, surfaceVariants } from "@/components/ui/Surface";
import { SurfaceHeader } from "@/components/ui/SurfaceHeader";
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";

type ManagedShiftType = Exclude<ShiftType, "any">;

interface DienstWekkerSectionProps {
  automations: Automation[];
  busyType?: ManagedShiftType | null;
  /**
   * True zodra de automations-lijst betrouwbaar geladen is. Zolang false
   * (nog laden of fout) blokkeren we opslaan/verwijderen: de pack-ids zijn
   * dan onbekend en opslaan zou een dubbel pack achterlaten (fix 8a).
   */
  listReady?: boolean;
  onSave: (type: ManagedShiftType, times: DienstWekkerTimes) => void | Promise<void>;
  onRemove: (type: ManagedShiftType) => void | Promise<void>;
}

const SHIFT_PROFILES: Array<{
  type: ManagedShiftType;
  label: string;
  description: string;
  icon: ReactNode;
  tone: Extract<UiTone, "warning" | "info" | "success">;
}> = [
  {
    type: "Vroeg",
    label: "Vroege dienst",
    description: "Rustig wakker worden, helder klaarstaan, lampen uit bij vertrek.",
    icon: <Sunrise size={16} />,
    tone: "warning",
  },
  {
    type: "Laat",
    label: "Late dienst",
    description: "Middagstart met helder licht en automatische vertrek-actie.",
    icon: <Moon size={16} />,
    tone: "info",
  },
  {
    type: "Dienst",
    label: "Dagdienst",
    description: "Compact profiel voor losse dagdiensten of korte diensten.",
    icon: <Briefcase size={16} />,
    tone: "success",
  },
];

function groupFor(type: ManagedShiftType) {
  return `dienst-wekker-${type.toLowerCase()}`;
}

function getShiftAutomations(automations: Automation[], type: ManagedShiftType) {
  return automations.filter((automation) => automation.group === groupFor(type)).sort((a, b) => a.trigger.time.localeCompare(b.trigger.time));
}

function findTemplateAutomation(items: Automation[], type: ManagedShiftType, templateId: string, index: number) {
  const template = DIENST_WEKKER_PACKS[type].find((item) => item.id === templateId);
  if (!template) return items[index];
  const needle = template.label.toLowerCase();
  return (
    items.find((item) => item.name.toLowerCase().includes(needle)) ??
    items.find((item) => item.name.toLowerCase().includes(templateId.toLowerCase())) ??
    items[index]
  );
}

function readTimesFromAutomations(automations: Automation[], type: ManagedShiftType): DienstWekkerTimes {
  const defaults = getDienstWekkerDefaultTimes(type);
  const items = getShiftAutomations(automations, type);
  if (items.length === 0) return defaults;

  return Object.fromEntries(
    DIENST_WEKKER_PACKS[type].map((template, index) => {
      const automation = findTemplateAutomation(items, type, template.id, index);
      return [template.id, automation?.trigger.time ?? defaults[template.id] ?? template.time];
    }),
  );
}

function buildTimesState(automations: Automation[]): Record<ManagedShiftType, DienstWekkerTimes> {
  return {
    Vroeg: readTimesFromAutomations(automations, "Vroeg"),
    Laat: readTimesFromAutomations(automations, "Laat"),
    Dienst: readTimesFromAutomations(automations, "Dienst"),
  };
}

function formatLastRun(items: Automation[]) {
  const runs = items
    .map((item) => item.lastFiredAt)
    .filter(Boolean)
    .map((value) => new Date(value as string))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  if (runs.length === 0) return "Nog niet uitgevoerd";
  return runs[0].toLocaleString("nl-NL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function profileStatus(items: Automation[], expected: number) {
  if (items.length === 0) return "Niet ingesteld";
  const enabled = items.filter((item) => item.enabled).length;
  if (items.length < expected) return `${items.length}/${expected} stappen`;
  return `${enabled}/${expected} actief`;
}

function hasChanges(type: ManagedShiftType, draft: DienstWekkerTimes, automations: Automation[]) {
  const items = getShiftAutomations(automations, type);
  const reference = readTimesFromAutomations(automations, type);
  const templates = DIENST_WEKKER_PACKS[type];
  if (items.length !== templates.length) return true;
  return templates.some((template) => draft[template.id] !== reference[template.id]);
}

export function DienstWekkerSection({ automations, busyType, listReady = true, onSave, onRemove }: DienstWekkerSectionProps) {
  const [activeType, setActiveType] = useState<ManagedShiftType>("Vroeg");
  const [draftTimes, setDraftTimes] = useState<Record<ManagedShiftType, DienstWekkerTimes>>(() => buildTimesState(automations));
  // Onthoud de laatst-verwerkte servertijden per profiel, zodat we een
  // background-refetch alleen ín de draft mergen als díe profieltijden écht
  // zijn veranderd — en dan nog alleen wanneer de gebruiker die draft niet
  // handmatig heeft aangepast (fix 8b: geen half-getypte tijden wegvagen).
  const serverTimesRef = useRef<Record<ManagedShiftType, DienstWekkerTimes>>(buildTimesState(automations));

  useEffect(() => {
    const nextServer = buildTimesState(automations);
    setDraftTimes((current) => {
      let changed = false;
      const merged = { ...current };
      (Object.keys(nextServer) as ManagedShiftType[]).forEach((type) => {
        const prevServer = serverTimesRef.current[type];
        const nowServer = nextServer[type];
        // Alleen dit profiel aanraken als de servertijden ervan wijzigden.
        const serverChanged = JSON.stringify(prevServer) !== JSON.stringify(nowServer);
        if (!serverChanged) return;
        // Draft dirty t.o.v. de vórige serverstaat? Dan is de gebruiker aan het
        // typen — die tijden niet overschrijven. Anders volgt de draft de server.
        const draftDirty = JSON.stringify(current[type]) !== JSON.stringify(prevServer);
        if (draftDirty) return;
        merged[type] = nowServer;
        changed = true;
      });
      return changed ? merged : current;
    });
    serverTimesRef.current = nextServer;
  }, [automations]);

  const activeProfile = SHIFT_PROFILES.find((profile) => profile.type === activeType) ?? SHIFT_PROFILES[0];
  const activeTemplates = DIENST_WEKKER_PACKS[activeType];
  const activeItems = useMemo(() => getShiftAutomations(automations, activeType), [activeType, automations]);
  const activeDraft = draftTimes[activeType] ?? getDienstWekkerDefaultTimes(activeType);
  const installedCount = activeItems.length;
  const enabledCount = activeItems.filter((item) => item.enabled).length;
  const dirty = hasChanges(activeType, activeDraft, automations);
  const busy = busyType === activeType;

  const updateTime = (stepId: string, time: string) => {
    setDraftTimes((current) => ({
      ...current,
      [activeType]: {
        ...current[activeType],
        [stepId]: time,
      },
    }));
  };

  const resetDefaults = () => {
    setDraftTimes((current) => ({
      ...current,
      [activeType]: getDienstWekkerDefaultTimes(activeType),
    }));
  };

  return (
    <section
      id="dienst-wekker-cockpit"
      className={cn(surfaceVariants({ tone: "elevated", padding: "md" }), "scroll-mt-28")}
    >
      <SurfaceHeader
        icon={<AlarmClock size={20} className="text-[var(--color-warning)]" />}
        eyebrow="Wekker instellingen"
        title="Dienstwekker cockpit"
        meta="Rooster-gestuurde lampwekker die server-side draait via de Go automation engine. De routines gaan alleen af op dagen met een passende dienst."
        action={
          <div className="grid w-full grid-cols-3 gap-2 xl:min-w-[360px]">
            <WekkerMetric label="Profielen" value={`${SHIFT_PROFILES.filter((profile) => getShiftAutomations(automations, profile.type).length > 0).length}/3`} />
            <WekkerMetric label="Actief" value={`${SHIFT_PROFILES.reduce((sum, profile) => sum + getShiftAutomations(automations, profile.type).filter((item) => item.enabled).length, 0)}`} />
            <WekkerMetric label="Draait" value="Server" />
          </div>
        }
        className="flex-col gap-4 xl:flex-row xl:items-start"
      />

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {SHIFT_PROFILES.map((profile) => {
          const items = getShiftAutomations(automations, profile.type);
          const selected = activeType === profile.type;
          const expected = DIENST_WEKKER_PACKS[profile.type].length;
          const profileTone = uiToneClasses[profile.tone];
          return (
            <Button
              key={profile.type}
              aria-pressed={selected}
              onClick={() => setActiveType(profile.type)}
              variant={selected ? "primary" : "secondary"}
              size="sm"
              fullWidth
              className="h-auto min-h-28 flex-col items-stretch justify-start p-3 text-left"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", profileTone.border, profileTone.surface, profileTone.icon)}>
                    {profile.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-[var(--color-text)]">{profile.label}</span>
                    <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">{profileStatus(items, expected)}</span>
                  </span>
                </span>
                {items.length > 0 && (
                  <Badge tone={items.some((item) => item.enabled) ? "success" : "neutral"} size="sm">
                    {items.some((item) => item.enabled) ? "Actief" : "Pauze"}
                  </Badge>
                )}
              </span>
              <span className="mt-3 line-clamp-2 text-xs font-normal leading-5 text-[var(--color-text-muted)]">{profile.description}</span>
            </Button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <Surface tone="subtle" radius="md" padding="sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                  uiToneClasses[activeProfile.tone].border,
                  uiToneClasses[activeProfile.tone].surface,
                  uiToneClasses[activeProfile.tone].icon,
                )}>
                  {activeProfile.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-[var(--color-text)]">{activeProfile.label}</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">{enabledCount}/{activeTemplates.length} stappen actief · laatste run {formatLastRun(activeItems)}</p>
                  {/* M4: eerlijk over wat "Actief" betekent — of er een passende
                      dienst aankomt is hier niet te verifiëren zonder rooster. */}
                  {enabledCount > 0 && (
                    <p className="mt-1 text-micro text-[var(--color-warning)]">
                      Vuurt alleen op dagen met een passende {activeType}-dienst in het rooster.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={resetDefaults}
                title="Zet de tijden terug naar de standaard (nog niet opgeslagen)"
              >
                <RotateCcw size={13} />
                Standaardtijden
              </Button>
              {installedCount > 0 && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onRemove(activeType)}
                  disabled={!listReady}
                  loading={busy}
                  loadingLabel="Verwijderen…"
                  title={!listReady ? "Wekkers worden nog geladen — even wachten" : undefined}
                >
                  <Trash2 size={13} />
                  Verwijderen
                </Button>
              )}
              <Button
                size="sm"
                variant="primary"
                onClick={() => onSave(activeType, activeDraft)}
                disabled={!listReady || (!dirty && installedCount > 0)}
                loading={busy}
                loadingLabel="Opslaan…"
                title={
                  !listReady
                    ? "Wekkers worden nog geladen — even wachten om dubbele wekkers te voorkomen"
                    : !dirty && installedCount > 0
                      ? "Geen wijzigingen om op te slaan. Pas een tijd aan om opnieuw op te slaan."
                      : undefined
                }
              >
                <Save size={13} />
                {installedCount > 0 ? "Opslaan" : "Inschakelen"}
              </Button>
            </div>
          </div>

          <p className="mt-3 text-micro text-[var(--color-text-muted)]">Tijden in Nederlandse tijd (Europe/Amsterdam)</p>

          <div className="mt-2 space-y-2">
            {activeTemplates.map((template, index) => {
              const installed = findTemplateAutomation(activeItems, activeType, template.id, index);
              const shiftId = activeType === "Vroeg" ? "early" : activeType === "Laat" ? "late" : "duty";
              const timeInputId = `duty-alarm-${shiftId}-time-${index + 1}`;
              return (
                <motion.div
                  key={template.id}
                  layout
                  className={cn(
                    surfaceVariants({ tone: "subtle", padding: "sm", radius: "sm" }),
                    "grid gap-3 sm:grid-cols-[104px_minmax(0,1fr)_minmax(160px,0.55fr)] sm:items-center",
                  )}
                >
                  <FormField id={timeInputId} label={template.label}>
                    {(controlProps) => (
                      <Input
                        {...controlProps}
                        type="time"
                        value={activeDraft[template.id] ?? template.time}
                        onChange={(event) => updateTime(template.id, event.target.value)}
                        className="font-mono font-bold [color-scheme:dark]"
                      />
                    )}
                  </FormField>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-[var(--color-text)]">{template.description}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-muted)]">{actionLabel(template.action)}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <Badge tone={installed?.enabled ? "success" : installed ? "neutral" : "warning"} size="sm">
                      {installed?.enabled ? "Actief" : installed ? "Pauze" : "Nieuw"}
                    </Badge>
                    <span className="hidden text-xs text-[var(--color-text-subtle)] sm:inline">{installed?.trigger.time ?? template.time}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Surface>

        <aside className={surfaceVariants({ tone: "subtle", padding: "md", radius: "md" })}>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[var(--color-success)]" aria-hidden="true" />
            <h3 className="text-sm font-bold text-[var(--color-text)]">Veilige wekkerlogica</h3>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--color-text-muted)]">
            <InfoLine icon={<Clock3 size={14} />} title="Rooster gestuurd" text={`Alle stappen controleren eerst of je vandaag een ${activeType}-dienst hebt.`} />
            <InfoLine icon={<BellRing size={14} />} title="Server-side" text="De Go engine voert dit uit, ook wanneer je browser of tablet uit staat." />
            <InfoLine icon={<AlarmClock size={14} />} title="Geen dubbele wekkers" text="Opslaan vervangt het volledige profiel, zodat dubbele wekkers worden voorkomen." />
          </div>
          <Surface tone="info" radius="sm" padding="sm" className="mt-4">
            <p className="text-xs font-semibold text-[var(--color-info)]">Preview</p>
            <div className="mt-2 space-y-2">
              {activeTemplates.map((template) => (
                <div key={template.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-[var(--color-text-muted)]">{template.label}</span>
                  <span className="font-mono font-bold text-[var(--color-text)]">{activeDraft[template.id] ?? template.time}</span>
                </div>
              ))}
            </div>
          </Surface>
        </aside>
      </div>
    </section>
  );
}

function WekkerMetric({ label, value }: { label: string; value: string }) {
  return (
    <Surface tone="subtle" radius="sm" padding="xs">
      <p className="text-micro text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-[var(--color-text)]">{value}</p>
    </Surface>
  );
}

function InfoLine({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] text-[var(--color-warning)]">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-[var(--color-text-muted)]">{text}</p>
      </div>
    </div>
  );
}
