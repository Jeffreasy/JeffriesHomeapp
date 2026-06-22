"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { AlarmClock, BellRing, Briefcase, Clock3, Loader2, Moon, RotateCcw, Save, ShieldCheck, Sunrise, Trash2 } from "lucide-react";
import {
  DIENST_WEKKER_PACKS,
  actionLabel,
  getDienstWekkerDefaultTimes,
  type Automation,
  type DienstWekkerTimes,
  type ShiftType,
} from "@/lib/automations";
import { cn } from "@/lib/utils";

type ManagedShiftType = Exclude<ShiftType, "any">;

interface DienstWekkerSectionProps {
  automations: Automation[];
  busyType?: ManagedShiftType | null;
  onSave: (type: ManagedShiftType, times: DienstWekkerTimes) => void | Promise<void>;
  onRemove: (type: ManagedShiftType) => void | Promise<void>;
}

const SHIFT_PROFILES: Array<{
  type: ManagedShiftType;
  label: string;
  description: string;
  icon: ReactNode;
  accent: string;
}> = [
  {
    type: "Vroeg",
    label: "Vroege dienst",
    description: "Rustig wakker worden, helder klaarstaan, lampen uit bij vertrek.",
    icon: <Sunrise size={16} />,
    accent: "#f59e0b",
  },
  {
    type: "Laat",
    label: "Late dienst",
    description: "Middagstart met helder licht en automatische vertrek-actie.",
    icon: <Moon size={16} />,
    accent: "#60a5fa",
  },
  {
    type: "Dienst",
    label: "Dagdienst",
    description: "Compact profiel voor losse dagdiensten of korte diensten.",
    icon: <Briefcase size={16} />,
    accent: "#34d399",
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

export function DienstWekkerSection({ automations, busyType, onSave, onRemove }: DienstWekkerSectionProps) {
  const [activeType, setActiveType] = useState<ManagedShiftType>("Vroeg");
  const [draftTimes, setDraftTimes] = useState<Record<ManagedShiftType, DienstWekkerTimes>>(() => buildTimesState(automations));

  useEffect(() => {
    setDraftTimes(buildTimesState(automations));
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
    <section className="rounded-xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)] sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
            <AlarmClock size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Wekker instellingen</p>
            <h2 className="mt-1 text-xl font-bold text-white">Dienstwekker cockpit</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Rooster-gestuurde lampwekker die server-side draait via de Go automation engine. De routines gaan alleen af op dagen met een passende dienst.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 xl:min-w-[360px]">
          <WekkerMetric label="Profielen" value={`${SHIFT_PROFILES.filter((profile) => getShiftAutomations(automations, profile.type).length > 0).length}/3`} />
          <WekkerMetric label="Actief" value={`${SHIFT_PROFILES.reduce((sum, profile) => sum + getShiftAutomations(automations, profile.type).filter((item) => item.enabled).length, 0)}`} />
          <WekkerMetric label="Engine" value="Go" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {SHIFT_PROFILES.map((profile) => {
          const items = getShiftAutomations(automations, profile.type);
          const selected = activeType === profile.type;
          const expected = DIENST_WEKKER_PACKS[profile.type].length;
          return (
            <button
              key={profile.type}
              type="button"
              onClick={() => setActiveType(profile.type)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                selected ? "border-amber-400/35 bg-amber-500/10" : "border-white/8 bg-white/[0.025] hover:bg-white/[0.055]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/20" style={{ color: profile.accent }}>
                    {profile.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{profile.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{profileStatus(items, expected)}</p>
                  </div>
                </div>
                {items.length > 0 && (
                  <span className={cn("rounded-md px-2 py-1 text-[11px] font-semibold", items.some((item) => item.enabled) ? "bg-emerald-500/10 text-emerald-200" : "bg-slate-500/10 text-slate-400")}>
                    {items.some((item) => item.enabled) ? "Live" : "Pauze"}
                  </span>
                )}
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{profile.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="rounded-xl border border-white/8 bg-black/15 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]" style={{ color: activeProfile.accent }}>
                  {activeProfile.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-white">{activeProfile.label}</h3>
                  <p className="text-xs text-slate-500">{enabledCount}/{activeTemplates.length} stappen actief · laatste run {formatLastRun(activeItems)}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={resetDefaults}
                title="Zet de tijden terug naar de standaard (nog niet opgeslagen)"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.07]"
              >
                <RotateCcw size={13} />
                Standaardtijden
              </button>
              {installedCount > 0 && (
                <button
                  type="button"
                  onClick={() => onRemove(activeType)}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/15 disabled:opacity-50"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Verwijderen
                </button>
              )}
              <button
                type="button"
                onClick={() => onSave(activeType, activeDraft)}
                disabled={busy || (!dirty && installedCount > 0)}
                title={!dirty && installedCount > 0 ? "Geen wijzigingen om op te slaan. Pas een tijd aan om opnieuw op te slaan." : undefined}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-500/15 px-3 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {installedCount > 0 ? "Opslaan" : "Inschakelen"}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {activeTemplates.map((template, index) => {
              const installed = findTemplateAutomation(activeItems, activeType, template.id, index);
              return (
                <motion.div
                  key={template.id}
                  layout
                  className="grid gap-3 rounded-lg border border-white/8 bg-white/[0.025] p-3 sm:grid-cols-[104px_minmax(0,1fr)_minmax(160px,0.55fr)] sm:items-center"
                >
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase text-slate-500">{template.label}</span>
                    <input
                      type="time"
                      value={activeDraft[template.id] ?? template.time}
                      onChange={(event) => updateTime(template.id, event.target.value)}
                      className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 font-mono text-sm font-bold text-white outline-none [color-scheme:dark] focus:border-amber-400/50"
                    />
                  </label>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-white">{template.description}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{actionLabel(template.action)}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <span className={cn("rounded-md px-2 py-1 text-[11px] font-semibold", installed?.enabled ? "bg-emerald-500/10 text-emerald-200" : installed ? "bg-slate-500/10 text-slate-400" : "bg-amber-500/10 text-amber-200")}>
                      {installed?.enabled ? "Actief" : installed ? "Pauze" : "Nieuw"}
                    </span>
                    <span className="hidden text-xs text-slate-600 sm:inline">{installed?.trigger.time ?? template.time}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-xl border border-white/8 bg-black/15 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-300" />
            <h3 className="text-sm font-bold text-white">Veilige wekkerlogica</h3>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
            <InfoLine icon={<Clock3 size={14} />} title="Rooster gestuurd" text={`Alle stappen controleren eerst of je vandaag een ${activeType}-dienst hebt.`} />
            <InfoLine icon={<BellRing size={14} />} title="Server-side" text="De Go engine voert dit uit, ook wanneer je browser of tablet uit staat." />
            <InfoLine icon={<AlarmClock size={14} />} title="Idempotent" text="Opslaan vervangt het volledige profiel, zodat dubbele wekkers worden voorkomen." />
          </div>
          <div className="mt-4 rounded-lg border border-amber-400/15 bg-amber-500/10 p-3">
            <p className="text-xs font-semibold text-amber-100">Preview</p>
            <div className="mt-2 space-y-2">
              {activeTemplates.map((template) => (
                <div key={template.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-slate-400">{template.label}</span>
                  <span className="font-mono font-bold text-white">{activeDraft[template.id] ?? template.time}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function WekkerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/15 px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function InfoLine({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-amber-200">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  );
}
