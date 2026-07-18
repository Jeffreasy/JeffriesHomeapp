"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppIcon } from "@/components/ui/AppIcon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { DailyChecklist } from "@/components/habits/DailyChecklist";
import { useDevices, useLampCommand } from "@/hooks/useDevices";
import { getTimeLabel, type PersonalEvent } from "@/hooks/usePersonalEvents";
import {
  formatNextAppointmentMeta,
  formatTimelineMeta,
  type FocusAttentionNote,
  type FocusHabitItem,
  type FocusTimelineItem,
  useFocusData,
} from "@/hooks/useFocusData";
import {
  laventecareApi,
  notesApi,
  type DeviceCommand,
  type FocusAttention,
  type FocusBusinessStatus,
  type FocusSyncSummary,
  type LCActionItem,
} from "@/lib/api";
import type { DienstRow } from "@/lib/schedule";
import { CUSTOM_SCENES, OFF_SCENE, detectActiveScene, type ScenePreset } from "@/lib/scenes";
import { cn } from "@/lib/utils";
const LazyCreateEventModal = dynamic(
  () => import("@/components/schedule/CreateEventModal").then((module) => module.CreateEventModal),
  { ssr: false },
);


/*
 * Kiosk-designtaal (R4-redesign):
 *  - Kleur = betekenis. Kaarten zijn neutraal; een dunne accent-rail codeert de
 *    sóórt (dienst = amber, afspraak = sky), emerald = nu bezig, en alleen échte
 *    urgentie (aandachtspunten) krijgt een gevulde rose/amber-kaart. Voorheen
 *    kleurde het shift-type hele kaarten donkerrood en oogde het hele board als
 *    één storing.
 *  - Alles past ALTIJD in de viewport op xl: kolommen zijn flex-cols met
 *    min-h-0 + interne overflow, geen vaste grid-rows die content afkappen.
 *  - De hero toont het eerstvolgende item groot mét countdown — niet het woord
 *    "Focus". De tijdlijn begint ná het hero-item (geen duplicaat).
 */

const PANEL =
  "rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.015] shadow-[0_18px_50px_rgba(0,0,0,0.35)]";

type Accent = {
  rail: string;
  text: string;
  chip: string;
  glow: string;
};

const ACCENTS: Record<"dienst" | "afspraak" | "now", Accent> = {
  dienst: {
    rail: "bg-amber-400",
    text: "text-amber-200",
    chip: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    glow: "rgba(245,158,11,0.14)",
  },
  afspraak: {
    rail: "bg-sky-400",
    text: "text-sky-200",
    chip: "border-sky-400/25 bg-sky-400/10 text-sky-200",
    glow: "rgba(56,189,248,0.13)",
  },
  now: {
    rail: "bg-emerald-400",
    text: "text-emerald-200",
    chip: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    glow: "rgba(52,211,153,0.16)",
  },
};

function accentFor(item: FocusTimelineItem): Accent {
  if (item.status === "now") return ACCENTS.now;
  return item.kind === "dienst" ? ACCENTS.dienst : ACCENTS.afspraak;
}

function severityClasses(severity: string) {
  switch (severity) {
    case "high":
      return "border-rose-400/30 bg-rose-500/[0.12]";
    case "medium":
      return "border-amber-400/25 bg-amber-500/10";
    default:
      return "border-sky-400/20 bg-sky-500/[0.08]";
  }
}

function severityIconTone(severity: string) {
  switch (severity) {
    case "high":
      return "text-rose-300";
    case "medium":
      return "text-amber-300";
    default:
      return "text-sky-300";
  }
}

function formatGeneratedAt(value?: string) {
  if (!value) return "Nog niet geladen";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Bijgewerkt";
  return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function formatEuroCents(value?: number) {
  // Unknown (nog niet geladen / fout) is niet hetzelfde als nul (F3).
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

/* ─── Header ─────────────────────────────────────────────────────────────── */

function Header({
  time,
  today,
  generatedAt,
  attentionCount,
  bridgeOnline,
  summaryError,
  stale,
  jitter,
}: {
  time?: string;
  today?: string;
  generatedAt?: string;
  attentionCount: number;
  bridgeOnline: boolean;
  summaryError?: boolean;
  stale?: boolean;
  /** M-G: subtiele 1-2px verschuiving van de grote klok tegen OLED burn-in. */
  jitter?: { x: number; y: number };
}) {
  // F4: op een wandkiosk moet een hangende refresh zichtbaar zijn — rose bij
  // een echte fout, amber wanneer de data ouder is dan ~2 refresh-intervallen.
  const timestampClass = summaryError ? "text-rose-300" : stale ? "text-amber-300" : "text-slate-500";
  return (
    <header className="relative flex shrink-0 flex-col gap-2 border-b border-white/[0.07] bg-black/25 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      {/* Dunne accentlijn onderaan de header — geeft de kiosk een as. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
      />
      <div className="flex min-w-0 items-end gap-3 sm:gap-5">
        <div
          className="shrink-0 font-mono text-4xl font-semibold leading-none tracking-tight text-white sm:text-6xl"
          style={{
            // Alleen transform (geen reflow); verschuift elke paar minuten 1-2px.
            transform: `translate(${jitter?.x ?? 0}px, ${jitter?.y ?? 0}px)`,
            transition: "transform 1.5s ease",
          }}
        >
          {time ?? "--:--"}
        </div>
        <div className="min-w-0 pb-1">
          <p className="truncate text-sm font-semibold capitalize text-slate-100 sm:text-base">{today ?? "Focus laden"}</p>
          <p className={`mt-0.5 truncate text-xs ${timestampClass}`}>
            Bijgewerkt {formatGeneratedAt(generatedAt)}
            {summaryError ? " · verversen mislukt" : stale ? " · verouderd" : ""}
          </p>
        </div>
      </div>
      <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 lg:flex lg:w-auto">
        <HeaderPill
          icon="radar"
          label={attentionCount === 0 ? "Alles rustig" : `${attentionCount} aandacht`}
          tone={attentionCount === 0 ? "ok" : "warn"}
        />
        <HeaderPill icon={bridgeOnline ? "wifi" : "wifiOff"} label={bridgeOnline ? "Bridge live" : "Bridge offline"} tone={bridgeOnline ? "ok" : "warn"} />
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.08]"
        >
          <AppIcon name="dashboard" size="xs" />
          App
        </Link>
      </div>
    </header>
  );
}

function HeaderPill({ icon, label, tone }: { icon: "radar" | "wifi" | "wifiOff"; label: string; tone: "ok" | "warn" }) {
  return (
    <div
      className={cn(
        "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border px-2.5 text-xs font-semibold sm:px-3.5",
        tone === "ok"
          ? "border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-200"
          : "border-amber-400/30 bg-amber-500/10 text-amber-200",
      )}
    >
      <AppIcon name={icon} size="xs" />
      <span className="truncate">{label}</span>
    </div>
  );
}

/* ─── Hero: eerstvolgende item, groot ────────────────────────────────────── */

// M9: while data is loading the kiosk must show placeholders — a confident
// "Geen blokkades / Geen habits gepland" on a cold start is indistinguishable
// from a genuinely empty day.
function SkeletonLines({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]" />
      ))}
      <span className="sr-only">Laden…</span>
    </div>
  );
}

/**
 * Countdown t.o.v. de Amsterdam-minuutklok. Beide kanten worden als kale
 * wall-time geparsed (device-lokaal), dus het verschil klopt onafhankelijk van
 * de device-timezone (op DST-overgangsuren na — acceptabel voor een countdown).
 */
function countdownLabel(item: FocusTimelineItem, clock?: { iso: string; time: string } | null) {
  if (!clock) return null;
  if (item.status === "now") return item.endTime ? `Bezig · tot ${item.endTime}` : "Nu bezig";
  const pad = (t: string) => (t.length === 4 ? `0${t}` : t);
  const start = Date.parse(`${item.date}T${pad(item.startTime || "00:00")}:00`);
  const now = Date.parse(`${clock.iso}T${pad(clock.time)}:00`);
  if (Number.isNaN(start) || Number.isNaN(now)) return null;
  const min = Math.round((start - now) / 60_000);
  if (min <= 0) return null;
  if (min < 60) return `Over ${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 48) return `Over ${hours} uur`;
  return `Over ${Math.round(hours / 24)} dagen`;
}

function HeroPanel({
  item,
  todayIso,
  clock,
  isLoading,
  onOpen,
}: {
  item: FocusTimelineItem | null;
  todayIso?: string;
  clock?: { iso: string; time: string } | null;
  isLoading?: boolean;
  onOpen: (item: FocusTimelineItem) => void;
}) {
  const accent = item ? accentFor(item) : ACCENTS.dienst;
  const countdown = item ? countdownLabel(item, clock) : null;
  return (
    <section className={`${PANEL} relative shrink-0 overflow-hidden p-5`}>
      {/* Zachte glow in de accentkleur — de hero mag als enige paneel gloeien. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl"
        style={{ background: item ? accent.glow : "rgba(245,158,11,0.08)" }}
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Nu centraal</p>
          {item && (
            <span className={cn("rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide", accent.chip)}>
              {item.status === "now" ? "Bezig" : "Volgende"}
            </span>
          )}
        </div>

        {item ? (
          // In-place detail (afspraak-modal / dienst-modal) i.p.v. een
          // paginanavigatie die je van het kiosk-scherm haalt (R4-interactie).
          <button type="button" onClick={() => onOpen(item)} className="group mt-4 block w-full text-left">
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="min-w-0 truncate text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
                {item.title}
              </h1>
              <span className="hidden shrink-0 font-mono text-lg font-semibold text-slate-300 sm:block">{item.timeLabel}</span>
            </div>
            <p className="mt-2 truncate text-base text-slate-400">{item.subtitle}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {countdown && (
                <span className={cn("rounded-lg border px-3 py-1.5 font-mono text-sm font-semibold", accent.chip)}>
                  {countdown}
                </span>
              )}
              <span className="truncate text-sm font-medium text-slate-500 transition-colors group-hover:text-slate-400">
                {formatTimelineMeta(item, todayIso)}
              </span>
            </div>
          </button>
        ) : isLoading ? (
          <div role="status" aria-live="polite" className="mt-4 animate-pulse rounded-xl border border-white/[0.07] bg-white/[0.03] p-6">
            <p className="text-lg font-semibold text-slate-400">Laden…</p>
            <p className="mt-1 text-sm text-slate-600">Rooster en agenda worden opgehaald.</p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.03] p-6">
            <p className="text-2xl font-bold text-white">Vrij moment</p>
            <p className="mt-1 text-sm text-slate-500">Geen dienst of afspraak in de komende dagen.</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Tijdlijn: dag-gegroepeerd, zonder hero-duplicaat ───────────────────── */

function relativeDayLabel(date: string, todayIso?: string) {
  if (!todayIso) return date.slice(5);
  // Zelfde register als dashboard/habits: met hoofdletter (low).
  if (date === todayIso) return "Vandaag";
  if (date === addDaysIso(todayIso, 1)) return "Morgen";
  if (date === addDaysIso(todayIso, 2)) return "Overmorgen";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date.slice(5);
  return parsed.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

function TimelinePanel({
  items,
  heroId,
  todayIso,
  isLoading,
  onOpen,
}: {
  items: FocusTimelineItem[];
  heroId?: string;
  todayIso?: string;
  isLoading?: boolean;
  onOpen: (item: FocusTimelineItem) => void;
}) {
  // De hero toont het eerste item al groot — hier niet nogmaals (dedupe).
  const visible = items.filter((item) => item.id !== heroId).slice(0, 8);
  const groups = useMemo(() => {
    const out: Array<{ label: string; items: FocusTimelineItem[] }> = [];
    for (const item of visible) {
      const label = relativeDayLabel(item.date, todayIso);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(item);
      else out.push({ label, items: [item] });
    }
    return out;
  }, [visible, todayIso]);

  return (
    <section className={`${PANEL} flex min-h-[240px] flex-1 flex-col overflow-hidden p-4 sm:p-5 xl:min-h-0`}>
      <PanelHeader
        icon="calendarDays"
        label="Vandaag en straks"
        value={isLoading && visible.length === 0 ? "Laden…" : visible.length === 0 ? "Leeg" : `${visible.length} komend`}
      />
      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {isLoading && visible.length === 0 ? (
          <SkeletonLines rows={4} />
        ) : visible.length > 0 ? (
          groups.map((group) => (
            <div key={group.label}>
              <div className="mb-1.5 flex items-center gap-3">
                <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{group.label}</p>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const accent = accentFor(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpen(item)}
                      className={cn(
                        "grid min-h-[52px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-white/[0.02] px-3 py-2 text-left transition-colors hover:bg-white/[0.055]",
                        item.status === "now" ? "border-emerald-400/30" : "border-white/[0.06]",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span aria-hidden className={cn("h-8 w-1 shrink-0 rounded-full", accent.rail)} />
                        <span className="w-[86px] font-mono text-[13px] font-semibold leading-tight text-slate-200">
                          {item.timeLabel}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-white">{item.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{item.subtitle}</p>
                      </div>
                      <span
                        className={cn(
                          "hidden shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold sm:inline-block",
                          item.status === "now" ? ACCENTS.now.chip : "border-transparent text-slate-500",
                        )}
                      >
                        {item.status === "now" ? "Nu" : item.kind === "dienst" ? "Dienst" : "Afspraak"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <EmptyLine title="Verder niets gepland" detail="Na het huidige item is de komende dagen leeg." />
        )}
      </div>
    </section>
  );
}

/* ─── Aandacht ───────────────────────────────────────────────────────────── */

function AttentionPanel({
  items,
  isLoading,
  inPlaceIds,
  onOpen,
}: {
  items: FocusAttention[];
  isLoading?: boolean;
  /** Kaarten met een in-place modal (geen paginanavigatie, geen pijl). */
  inPlaceIds: ReadonlySet<string>;
  onOpen: (item: FocusAttention) => void;
}) {
  return (
    <section className={`${PANEL} flex min-h-[220px] flex-1 flex-col overflow-hidden p-4 sm:p-5 xl:min-h-0`}>
      <PanelHeader
        icon="warning"
        label="Aandacht nodig"
        value={isLoading && items.length === 0 ? "Laden…" : items.length === 0 ? "Rustig" : `${items.length}`}
      />
      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {isLoading && items.length === 0 ? (
          <SkeletonLines rows={3} />
        ) : items.length > 0 ? (
          items.map((item) => {
            const inPlace = inPlaceIds.has(item.id);
            const content = (
              <div className={`rounded-xl border px-3.5 py-3 ${severityClasses(item.severity)}`}>
                <div className="flex items-start gap-3">
                  <AppIcon
                    name={item.severity === "high" ? "warning" : "info"}
                    size="sm"
                    iconClassName={cn("mt-0.5 shrink-0", severityIconTone(item.severity))}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">{item.detail}</p>
                  </div>
                  {/* In-place kaarten openen een modal op de kiosk; de rest
                      verlaat bewust de pagina — de pijl markeert dat verschil. */}
                  <span aria-hidden className="mt-0.5 shrink-0 text-sm font-semibold text-slate-500">
                    {inPlace ? "▸" : item.href ? "→" : ""}
                  </span>
                </div>
              </div>
            );
            if (inPlace) {
              return (
                <button key={item.id} type="button" onClick={() => onOpen(item)} className="block min-h-11 w-full text-left transition-opacity hover:opacity-85">
                  {content}
                </button>
              );
            }
            return item.href ? (
              <Link key={item.id} href={item.href} className="block min-h-11 transition-opacity hover:opacity-85">
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })
        ) : (
          <EmptyLine title="Geen blokkades" detail="Bridge, sync en planning hebben geen harde aandachtspunten." />
        )}
      </div>
    </section>
  );
}

/* ─── Systeem: status-strip + lichten + geld ─────────────────────────────── */

function SystemPanel({
  devices,
  finance,
  sync,
  summaryError,
  nextAppointment,
}: {
  devices: { total: number; online: number; on: number; bridgeOnline: boolean };
  finance: { value: string; hidden: boolean; meta: string; togglePrivacy: () => void };
  sync?: FocusSyncSummary;
  summaryError?: boolean;
  nextAppointment: string;
}) {
  const syncFallback = summaryError ? "fout" : "laden";
  // Backend-statussen zijn Engelse enums ("success"/"failed"/…) — vertaal ze
  // naar het NL-register van de rest van de kiosk.
  const syncWord = (status?: string) => {
    switch (status) {
      case "success": return "ok";
      case "failed": return "fout";
      case "pending": return "wacht";
      case undefined: return syncFallback;
      default: return status;
    }
  };
  const syncOk = sync ? sync.schedule.status === "success" && sync.gmail.status === "success" : !summaryError;
  const syncValue = [syncWord(sync?.schedule.status), syncWord(sync?.gmail.status)].join(" · ");
  return (
    <section className={`${PANEL} flex min-h-0 flex-1 flex-col overflow-hidden p-4`}>
      <PanelHeader icon="shield" label="Systeem" value={devices.bridgeOnline ? "Actief" : "Aandacht"} />
      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
        {/* Eén statusregel i.p.v. drie losse metric-dozen. */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* "X aan" is informatie, geen waarschuwing — 0 lampen aan overdag is normaal. */}
          <StatusChip ok label={`${devices.on} aan`} />
          <StatusChip ok={devices.online === devices.total && devices.total > 0} label={`${devices.online}/${devices.total} online`} />
          <StatusChip ok={devices.bridgeOnline} label={devices.bridgeOnline ? "Bridge live" : "Bridge offline"} />
          <StatusChip ok={syncOk && !summaryError} label={`Sync ${syncValue}`} />
        </div>

        <FocusLightControls />

        <div className="space-y-1.5">
          <InfoRow
            label="Netto"
            value={finance.value}
            meta={finance.hidden ? "Privacy actief" : finance.meta}
            action={
              // F5: dezelfde "finance"-privacyscope als de eye-toggles op de
              // andere pagina's — maskeren/tonen kan nu ook vanaf de kiosk.
              <button
                type="button"
                onClick={finance.togglePrivacy}
                aria-pressed={finance.hidden}
                aria-label={finance.hidden ? "Financiën tonen" : "Financiën verbergen"}
                title={finance.hidden ? "Financiën tonen" : "Financiën verbergen"}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors",
                  finance.hidden
                    ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07] hover:text-slate-200",
                )}
              >
                <AppIcon name={finance.hidden ? "hide" : "show"} size="xs" />
              </button>
            }
          />
          <InfoRow label="Volgende afspraak" value={nextAppointment} />
        </div>
      </div>
    </section>
  );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold",
        ok ? "border-white/[0.08] bg-white/[0.03] text-slate-300" : "border-amber-400/30 bg-amber-500/10 text-amber-200",
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-400" : "bg-amber-400")} />
      {label}
    </span>
  );
}

const FOCUS_LIGHT_SCENE_IDS = ["focus", "avond", "nacht", "ochtend"] as const;

function FocusLightControls() {
  const { data: devices = [], isLoading } = useDevices();
  const { sendBatch, isPending } = useLampCommand();
  const { success, error } = useToast();

  const onlineDevices = useMemo(() => devices.filter((device) => device.status === "online"), [devices]);
  const onDevices = useMemo(() => onlineDevices.filter((device) => device.current_state?.on), [onlineDevices]);
  const activeScene = detectActiveScene(devices);
  const quickScenes = useMemo(
    () => [
      ...FOCUS_LIGHT_SCENE_IDS.map((id) => CUSTOM_SCENES.find((scene) => scene.id === id)).filter((scene): scene is ScenePreset => Boolean(scene)),
      OFF_SCENE,
    ],
    [],
  );

  const canSend = onlineDevices.length > 0 && !isLoading;
  const allOff = onDevices.length === 0;
  const toggleLabel = allOff ? "Alles aan" : "Alles uit";

  const applyCommand = async (label: string, cmd: DeviceCommand) => {
    if (isPending) return;

    if (!canSend) {
      error("Geen online lampen beschikbaar");
      return;
    }

    // sendBatch meldt partial/total failures zelf als één gebundelde fout. Een
    // succesmelding is daarom uitsluitend juist als elk uniek doel slaagde.
    const result = await sendBatch(onlineDevices, cmd);
    if (result.total > 0 && result.failed.length === 0) {
      success(`${label} verstuurd naar ${result.succeeded} lampen`);
    }
  };

  return (
    <div aria-busy={isPending} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <AppIcon name="lights" size="sm" tone="amber" framed />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">Lichten</p>
            <p className="truncate text-xs text-slate-500">
              {isLoading ? "Laden…" : `${onlineDevices.length} online · ${onDevices.length} aan`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void applyCommand(toggleLabel, allOff ? { on: true, brightness: 70 } : { on: false })}
          disabled={!canSend || isPending}
          className={cn(
            "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
            allOff
              ? "border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
              : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]",
          )}
        >
          <AppIcon name="power" size="xs" />
          {toggleLabel}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5 xl:grid-cols-2 2xl:grid-cols-5">
        {quickScenes.map((scene) => {
          const active = activeScene === scene.id;
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => void applyCommand(scene.label, scene.command)}
              disabled={!canSend || isPending}
              aria-pressed={active}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                active ? "bg-white/[0.09]" : "bg-white/[0.02] hover:bg-white/[0.06]",
              )}
              style={{
                borderColor: active ? scene.color : "rgba(255,255,255,0.07)",
                boxShadow: active ? `0 0 18px -6px ${scene.color}` : undefined,
              }}
            >
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: scene.color }} />
              <span className="max-w-full truncate text-[11px] font-bold text-white">{scene.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Habits + notities ──────────────────────────────────────────────────── */

function HabitNotePanel({
  habits,
  habitProgress,
  notes,
  isLoading,
  onToggleHabit,
  habitPendingIds,
  onOpenHabits,
  onOpenNote,
}: {
  habits: FocusHabitItem[];
  habitProgress: { due: number; completed: number };
  notes: Array<{ id: string; title: string; meta: string; priority: string; href: string }>;
  isLoading?: boolean;
  onToggleHabit: (id: string) => void;
  habitPendingIds: ReadonlySet<string>;
  /** Kwantitatieve/negatieve/gepauzeerde habits zijn niet één-tik af te vinken;
   *  een tik opent de volledige checklist-modal (mét stepper) i.p.v. niets. */
  onOpenHabits: () => void;
  onOpenNote: (id: string) => void;
}) {
  const visibleNotes = notes.slice(0, 4);
  return (
    <section className={`${PANEL} flex min-h-[220px] flex-1 flex-col overflow-hidden p-4 sm:p-5 xl:min-h-0 xl:flex-[1.15]`}>
      <PanelHeader
        icon="habit"
        label="Persoonlijk"
        value={isLoading && habits.length === 0 ? "Laden…" : `${habitProgress.completed}/${habitProgress.due} vandaag`}
      />
      <div className="mt-3 grid min-h-0 flex-1 gap-4 sm:grid-cols-2">
        <div className="flex min-h-0 flex-col">
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Habits</p>
          <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {isLoading && habits.length === 0 ? (
              <SkeletonLines rows={3} />
            ) : habits.length > 0 ? (
              habits.map((habit) => {
                const pending = habitPendingIds.has(habit.id);
                const inner = (
                  <>
                    <AppIcon
                      name={habit.done ? "statusOk" : "statusActive"}
                      size="sm"
                      iconClassName={cn(habit.done ? "text-emerald-300" : "text-slate-500", pending && "animate-pulse")}
                    />
                    <div className="min-w-0">
                      <p className={cn("truncate text-sm font-semibold", habit.done ? "text-slate-400" : "text-white")}>{habit.title}</p>
                      <p className="truncate text-xs text-slate-500">{habit.meta}</p>
                    </div>
                  </>
                );
                const rowClass = cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/[0.06] px-3 py-2 text-left transition-colors hover:bg-white/[0.055]",
                  habit.done ? "bg-emerald-500/[0.05]" : "bg-white/[0.02]",
                );
                // Toggle-bare (positieve, niet-kwantitatieve) habits: één tik vinkt
                // direct af (optimistic via useHabits). Kwantitatief/negatief/
                // gepauzeerd is niet één-tik af te vinken, maar een tik opent de
                // volledige checklist-modal (mét stepper) i.p.v. niets te doen.
                return habit.toggleable ? (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={() => onToggleHabit(habit.id)}
                    disabled={pending}
                    aria-pressed={habit.done}
                    title={habit.done ? "Heropenen" : "Afvinken"}
                    className={cn(rowClass, "disabled:cursor-wait")}
                  >
                    {inner}
                  </button>
                ) : (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={onOpenHabits}
                    title="Open in checklist"
                    className={rowClass}
                  >
                    {inner}
                    <span aria-hidden className="ml-auto shrink-0 text-sm font-semibold text-slate-600">▸</span>
                  </button>
                );
              })
            ) : (
              <EmptyLine title="Geen habits gepland" detail="Vandaag heeft geen actieve habit-items." />
            )}
          </div>
        </div>
        <div className="flex min-h-0 flex-col">
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Notities</p>
          <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {isLoading && visibleNotes.length === 0 ? (
              <SkeletonLines rows={3} />
            ) : visibleNotes.length > 0 ? (
              visibleNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => onOpenNote(note.id)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left transition-colors hover:bg-white/[0.055]"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      note.priority === "hoog" ? "bg-rose-400" : note.priority === "laag" ? "bg-slate-500" : "bg-sky-400",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{note.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{note.meta}</p>
                  </div>
                </button>
              ))
            ) : (
              <EmptyLine title="Geen notitie-focus" detail="Geen pinned, deadline of triage notities." />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── LaventeCare ────────────────────────────────────────────────────────── */

function BusinessPanel({ business, summaryError }: { business?: FocusBusinessStatus; summaryError?: boolean }) {
  const headerValue = business ? `${business.activeProjects} projecten` : summaryError ? "Fout" : "Laden…";
  // F3 parity (R3-17): while the summary hasn't loaded, unknown ≠ zero — show
  // "—" for every metric (matching the outstandingCents treatment) instead of a
  // misleading row of 0's.
  const metric = (value?: number) => (business ? `${value ?? 0}` : "—");
  const overdue = (business?.overdueActions ?? 0) > 0;
  return (
    <section className={`${PANEL} shrink-0 p-4`}>
      <PanelHeader icon="business" label="LaventeCare" value={headerValue} />
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <Metric label="Opdrachten" value={metric(business?.activeWorkstreams)} />
        <Metric label="Acties" value={metric(business?.openActions)} tone={overdue ? "rose" : undefined} />
        <Metric label="Offertes" value={metric(business?.openQuotes)} />
        <Metric label="Open" value={formatEuroCents(business?.outstandingCents)} tone={(business?.openInvoices ?? 0) > 0 ? "amber" : undefined} />
      </div>
    </section>
  );
}

/* ─── Primitives ─────────────────────────────────────────────────────────── */

function PanelHeader({ icon, label, value }: { icon: Parameters<typeof AppIcon>[0]["name"]; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <AppIcon name={icon} size="xs" iconClassName="text-amber-200/80" />
        <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      </div>
      <span className="shrink-0 rounded-lg border border-white/[0.08] bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
        {value}
      </span>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "amber" | "rose" }) {
  const color = tone === "rose" ? "text-rose-300" : tone === "amber" ? "text-amber-200" : "text-slate-100";
  return (
    <div className="min-h-[52px] rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
      <p className="truncate text-[11px] text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-lg font-bold leading-tight ${color}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value, meta, tone, action }: { label: string; value: string; meta?: string; tone?: "rose"; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500">{label}</p>
          <p className={cn("mt-0.5 truncate text-sm font-semibold", tone === "rose" ? "text-rose-300" : "text-white")}>{value}</p>
          {meta && <p className="mt-0.5 truncate text-[11px] text-slate-600">{meta}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

function EmptyLine({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-3 py-4">
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/* ─── Kiosk-modals: details in-place i.p.v. paginanavigatie ──────────────── */

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function ModalFooter({ href, hrefLabel, onClose }: { href: string; hrefLabel: string; onClose: () => void }) {
  return (
    <div className="mt-5 flex items-center justify-end gap-2 border-t border-white/[0.06] pt-4">
      <Link
        href={href}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.08]"
      >
        {hrefLabel}
        <span aria-hidden>→</span>
      </Link>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-11 items-center rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 text-xs font-bold text-amber-100 transition-colors hover:bg-amber-500/15"
      >
        Sluiten
      </button>
    </div>
  );
}

/** Dienst-detail in de kiosk — er bestaat geen dienst-modal elders (diensten
 *  zijn read-only rooster-rijen), dus dit is de lichtgewicht variant met een
 *  secundaire "Open rooster"-uitgang voor wie echt de pagina wil. */
function DienstDetailModal({ dienst, todayIso, onClose }: { dienst: DienstRow | null; todayIso?: string; onClose: () => void }) {
  return (
    <Modal isOpen={Boolean(dienst)} onClose={onClose} title="Dienst" icon={<AppIcon name="calendarDays" size="sm" />} maxWidth="md" theme="amber">
      {dienst && (
        <div>
          <p className="text-3xl font-bold tracking-tight text-white">{dienst.shiftType || dienst.titel || "Dienst"}</p>
          <p className="mt-1 text-sm capitalize text-slate-400">
            {relativeDayLabel(dienst.startDatum, todayIso)} · {dienst.werktijd || `${dienst.startTijd}–${dienst.eindTijd}`}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <DetailRow label="Locatie" value={dienst.locatie || "—"} />
            <DetailRow label="Team" value={dienst.team || "—"} />
            <DetailRow label="Duur" value={dienst.duur ? `${dienst.duur}u` : "—"} />
            <DetailRow label="Status" value={dienst.status || "—"} />
          </div>
          {dienst.beschrijving && (
            <p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm leading-6 text-slate-300">
              {dienst.beschrijving}
            </p>
          )}
          <ModalFooter href="/rooster" hrefLabel="Open rooster" onClose={onClose} />
        </div>
      )}
    </Modal>
  );
}

/** Notitie-viewer: de kiosk heeft alleen summary-previews in cache, dus de
 *  volledige inhoud wordt on-demand opgehaald. Lezen gebeurt hier; bewerken
 *  blijft op /notities (volledige editor met concurrency/drafts). */
function NoteViewModal({ noteId, onClose }: { noteId: string | null; onClose: () => void }) {
  const open = Boolean(noteId);
  const noteQuery = useQuery({
    queryKey: ["focus-note-detail", noteId],
    queryFn: () => notesApi.get(noteId as string),
    enabled: open,
    staleTime: 30_000,
  });
  const note = noteQuery.data;
  const title = note ? (note.titel || note.inhoud?.split("\n")[0] || "Naamloze notitie").trim() : "";
  const deadline = note?.deadline
    ? new Date(note.deadline).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })
    : null;
  return (
    <Modal isOpen={open} onClose={onClose} title="Notitie" icon={<AppIcon name="habit" size="sm" />} maxWidth="lg" theme="sky">
      {noteQuery.isLoading ? (
        <SkeletonLines rows={4} />
      ) : noteQuery.isError || !note ? (
        <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3">
          <p className="text-sm font-bold text-white">Notitie kon niet worden geladen</p>
          <p className="mt-1 text-xs text-slate-300">Controleer de verbinding en probeer het opnieuw.</p>
        </div>
      ) : (
        <div>
          <p className="text-2xl font-bold leading-tight tracking-tight text-white">{title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {note.prioriteit && (
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[11px] font-semibold capitalize",
                  note.prioriteit === "hoog"
                    ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                    : "border-white/[0.08] bg-white/[0.03] text-slate-300",
                )}
              >
                {note.prioriteit}
              </span>
            )}
            {deadline && (
              <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                {deadline}
              </span>
            )}
            {(note.tags ?? []).slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                #{tag}
              </span>
            ))}
          </div>
          {note.inhoud && (
            <p className="mt-4 max-h-[46dvh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-sm leading-6 text-slate-200">
              {note.inhoud}
            </p>
          )}
          <ModalFooter href="/notities" hrefLabel="Bewerken in Notities" onClose={onClose} />
        </div>
      )}
    </Modal>
  );
}

/* ─── Aandacht-modals: de tellers uitklappen zonder de kiosk te verlaten ─── */

/** Agenda-conflicten: de conflicterende afspraken mét melding; een tik opent
 *  direct de afspraak-modal (verplaatsen = de echte oplossing). */
function ConflictListModal({
  open,
  events,
  conflictMap,
  onClose,
  onOpenEvent,
}: {
  open: boolean;
  events: PersonalEvent[];
  conflictMap: Map<string, { level: string; message: string }>;
  onClose: () => void;
  onOpenEvent: (event: PersonalEvent) => void;
}) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Agenda conflicten" icon={<AppIcon name="warning" size="sm" />} maxWidth="lg" theme="rose">
      <div className="space-y-1.5">
        {events.length === 0 ? (
          <EmptyLine title="Geen conflicten meer" detail="Alle afspraken passen naast je diensten." />
        ) : (
          events.map((event) => {
            const conflict = conflictMap.get(event.eventId);
            return (
              <button
                key={event.eventId}
                type="button"
                onClick={() => onOpenEvent(event)}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.055]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-bold text-white">{event.titel}</p>
                  <span className="shrink-0 font-mono text-xs font-semibold text-slate-400">{getTimeLabel(event)}</span>
                </div>
                {conflict && <p className="mt-1 text-xs leading-5 text-rose-200">{conflict.message}</p>}
                <p className="mt-1 text-[11px] text-slate-500">Tik om te verplaatsen of aan te passen</p>
              </button>
            );
          })
        )}
      </div>
      <ModalFooter href="/agenda" hrefLabel="Open agenda" onClose={onClose} />
    </Modal>
  );
}

const NOTE_KIND_CHIP: Record<FocusAttentionNote["kind"], string> = {
  verlopen: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  vandaag: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  triage: "border-sky-400/25 bg-sky-400/10 text-sky-200",
};

/** Notities met aandacht: verlopen/vandaag/triage; een tik opent de viewer. */
function NotesAttentionModal({
  open,
  notes,
  onClose,
  onOpenNote,
}: {
  open: boolean;
  notes: FocusAttentionNote[];
  onClose: () => void;
  onOpenNote: (id: string) => void;
}) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Notities met aandacht" icon={<AppIcon name="habit" size="sm" />} maxWidth="lg" theme="amber">
      <div className="space-y-1.5">
        {notes.length === 0 ? (
          <EmptyLine title="Niets dat aandacht vraagt" detail="Geen verlopen, vandaag- of triage-notities." />
        ) : (
          notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => onOpenNote(note.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.055]"
            >
              <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold capitalize", NOTE_KIND_CHIP[note.kind])}>
                {note.kind}
              </span>
              <p className="min-w-0 truncate text-sm font-semibold text-white">{note.title}</p>
            </button>
          ))
        )}
      </div>
      <ModalFooter href="/notities" hrefLabel="Open notities" onClose={onClose} />
    </Modal>
  );
}

/** Habits vandaag: de complete home-checklist (incl. stepper voor kwantitatieve
 *  habits) hergebruikt in een kiosk-modal — afvinken zonder paginawissel. */
function HabitsTodayModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="Habits vandaag" icon={<AppIcon name="habit" size="sm" />} maxWidth="lg" theme="emerald">
      <DailyChecklist />
      <ModalFooter href="/habits" hrefLabel="Open habits" onClose={onClose} />
    </Modal>
  );
}

const LC_ACTION_DONE_STATUSES = new Set(["afgerond", "vervallen", "done", "closed"]);

/** LaventeCare-acties (vandaag of verlopen): direct afvinkbaar, zelfde
 *  status-mutatie als de LaventeCare-pagina ("afgerond"). */
function LcActionsModal({ open, todayIso, onClose }: { open: boolean; todayIso?: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const actionsQuery = useQuery({
    queryKey: ["focus-lc-actions"],
    queryFn: () => laventecareApi.listActions(),
    enabled: open,
    staleTime: 30_000,
  });
  const complete = useMutation({
    mutationFn: (id: string) => laventecareApi.updateActionStatus(id, "afgerond"),
    onSuccess: () => {
      success("Actie afgerond");
      void queryClient.invalidateQueries({ queryKey: ["focus-lc-actions"] });
      void queryClient.invalidateQueries({ queryKey: ["focus-summary"] });
    },
    onError: () => error("Actie afronden is mislukt"),
    onSettled: () => setPendingId(null),
  });

  // Zelfde venster als de teller op de kaart: open acties met een due-datum
  // van vandaag of eerder.
  const items = useMemo(() => {
    if (!todayIso) return [];
    return (actionsQuery.data ?? [])
      .filter((action) => !LC_ACTION_DONE_STATUSES.has(action.status) && action.due_date && action.due_date.slice(0, 10) <= todayIso)
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  }, [actionsQuery.data, todayIso]);

  const dueLabel = (action: LCActionItem) => {
    const due = action.due_date?.slice(0, 10);
    if (!due || !todayIso) return "";
    if (due === todayIso) return "Vandaag";
    const days = Math.max(1, Math.round((Date.parse(`${todayIso}T12:00:00`) - Date.parse(`${due}T12:00:00`)) / 86_400_000));
    return `${days} ${days === 1 ? "dag" : "dagen"} te laat`;
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="LaventeCare acties" icon={<AppIcon name="business" size="sm" />} maxWidth="lg" theme="rose">
      {actionsQuery.isLoading ? (
        <SkeletonLines rows={4} />
      ) : actionsQuery.isError ? (
        <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3">
          <p className="text-sm font-bold text-white">Acties konden niet worden geladen</p>
          <p className="mt-1 text-xs text-slate-300">Controleer de verbinding en probeer het opnieuw.</p>
        </div>
      ) : (
        <div className="max-h-[52dvh] space-y-1.5 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <EmptyLine title="Geen openstaande acties" detail="Niets is vandaag due of verlopen." />
          ) : (
            items.map((action) => {
              const overdue = action.due_date ? action.due_date.slice(0, 10) < (todayIso ?? "") : false;
              const pending = pendingId === action.id;
              return (
                <div key={action.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingId(action.id);
                      complete.mutate(action.id);
                    }}
                    disabled={pending}
                    aria-label={`${action.title} afronden`}
                    title="Afronden"
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors",
                      pending
                        ? "cursor-wait border-white/10 bg-white/[0.04] text-slate-500"
                        : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20",
                    )}
                  >
                    <AppIcon name="statusOk" size="xs" iconClassName={pending ? "animate-pulse" : undefined} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{action.title}</p>
                    {action.summary && <p className="mt-0.5 truncate text-xs text-slate-500">{action.summary}</p>}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                      overdue ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-amber-400/25 bg-amber-400/10 text-amber-200",
                    )}
                  >
                    {dueLabel(action)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
      <ModalFooter href="/laventecare" hrefLabel="Open LaventeCare" onClose={onClose} />
    </Modal>
  );
}

/* ─── Pagina ─────────────────────────────────────────────────────────────── */

// De focus-summary refresht elke 30s; ~2 gemiste intervallen betekent dat de
// kiosk verouderde data toont (F4).
const GENERATED_AT_STALE_MS = 90_000;

export default function FocusPage() {
  const focus = useFocusData();
  const router = useRouter();
  const todayIso = focus.dateInfo?.todayIso;

  // R4-interactie: tijdlijn/hero-taps openen details in-place. Afspraken
  // hergebruiken de bestaande CreateEventModal (zelfde embed als home);
  // diensten krijgen een lichtgewicht detail-modal; alleen als de rauwe rij
  // onvindbaar is (bv. buiten het geladen venster) valt de tap terug op de
  // oude paginanavigatie.
  const [eventModal, setEventModal] = useState<PersonalEvent | null>(null);
  const [dienstModal, setDienstModal] = useState<DienstRow | null>(null);
  const [noteModalId, setNoteModalId] = useState<string | null>(null);
  const [attentionModal, setAttentionModal] = useState<"conflicts" | "notes" | "habits" | "lc-actions" | null>(null);

  // Aandacht-kaarten met een in-place modal; de rest (bridge/sync/wachtrij/
  // facturen) blijft bewust navigeren — dat zijn ga-het-regelen-acties elders.
  const attentionInPlace = useMemo(
    () =>
      new Map<string, "conflicts" | "notes" | "habits" | "lc-actions">([
        ["local-agenda-conflicts", "conflicts"],
        ["notes-focus", "notes"],
        ["habits-open", "habits"],
        ["lc-overdue-actions", "lc-actions"],
      ]),
    [],
  );
  const attentionInPlaceIds = useMemo(() => new Set(attentionInPlace.keys()), [attentionInPlace]);
  const openAttentionItem = (item: FocusAttention) => {
    const modal = attentionInPlace.get(item.id);
    if (modal) setAttentionModal(modal);
    else if (item.href) router.push(item.href);
  };

  const openTimelineItem = (item: FocusTimelineItem) => {
    if (item.kind === "afspraak") {
      const event = focus.rawEvents.find((row) => `event-${row.eventId}` === item.id);
      if (event) {
        setEventModal(event);
        return;
      }
    } else {
      const dienst = focus.rawDiensten.find((row) => `dienst-${row.eventId}` === item.id);
      if (dienst) {
        setDienstModal(dienst);
        return;
      }
    }
    router.push(item.href);
  };
  // Pure staleness check: vergelijk tegen de minuut-klok in state i.p.v.
  // Date.now() tijdens render (react-hooks/purity); de klok tikt elke minuut,
  // ruim vaak genoeg voor een 90s-drempel.
  const generatedStale = Boolean(
    focus.generatedAt &&
      focus.clock &&
      focus.clock.epochMs - new Date(focus.generatedAt).getTime() > GENERATED_AT_STALE_MS,
  );

  // M-G: nachtdimmen 23:00–07:00 (Amsterdam, via de bestaande minuutklok) +
  // deterministische 1-2px klok-jitter per ~3 minuten tegen burn-in.
  const clockHour = focus.clock ? Number(focus.clock.time.slice(0, 2)) : null;
  const nightDim = clockHour !== null && Number.isFinite(clockHour) && (clockHour >= 23 || clockHour < 7);
  const jitterBucket = focus.clock ? Math.floor(focus.clock.epochMs / 180_000) : 0;
  const clockJitter = {
    x: (jitterBucket % 3) - 1,
    y: (Math.floor(jitterBucket / 3) % 3) - 1,
  };

  return (
    <div
      className="min-h-dvh min-w-0 overflow-x-clip overflow-y-auto text-slate-100 xl:flex xl:h-dvh xl:flex-col xl:overflow-hidden"
      style={{
        // Gelaagde achtergrond: vlak zwart → nachtblauw met twee zachte glows.
        background:
          "radial-gradient(1100px 480px at 82% -12%, rgba(245,158,11,0.055), transparent 65%), radial-gradient(900px 520px at -8% 112%, rgba(99,102,241,0.05), transparent 60%), #05070c",
        filter: nightDim ? "brightness(0.6)" : "none",
        transition: "filter 2s ease",
      }}
    >
      <Header
        time={focus.clock?.time ?? focus.summary?.time}
        today={focus.dateInfo?.todayLabel}
        generatedAt={focus.generatedAt}
        attentionCount={focus.attention.length}
        bridgeOnline={focus.devices.bridgeOnline}
        summaryError={focus.summaryError}
        stale={generatedStale}
        jitter={clockJitter}
      />

      {/*
       * xl: drie kolommen van flex-cols met min-h-0 — panelen krimpen/scrollen
       * intern en kunnen nooit meer buiten de viewport geknipt worden (het oude
       * grid met vaste row-fracties kapte het Netto-paneel en de onderste rij af).
       * Onder xl stapelt alles in prioriteitsvolgorde en scrollt de pagina.
       */}
      <main className="grid min-w-0 gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))] sm:pt-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(310px,0.98fr)_minmax(430px,1.35fr)_minmax(310px,0.98fr)] xl:pb-4">
        <div className="order-1 flex min-h-0 min-w-0 flex-col gap-3 xl:order-none">
          <HeroPanel item={focus.nextItem} todayIso={todayIso} clock={focus.clock} isLoading={focus.isLoading} onOpen={openTimelineItem} />
          <SystemPanel
            devices={focus.devices}
            finance={focus.finance}
            sync={focus.sync}
            summaryError={focus.summaryError}
            nextAppointment={formatNextAppointmentMeta(focus.personal.nextAppointment, todayIso)}
          />
        </div>

        <div className="order-3 flex min-h-0 min-w-0 flex-col gap-3 xl:order-none">
          <TimelinePanel items={focus.timeline} heroId={focus.nextItem?.id} todayIso={todayIso} isLoading={focus.isLoading} onOpen={openTimelineItem} />
          <HabitNotePanel
            habits={focus.habitItems}
            habitProgress={{ due: focus.habits.due, completed: focus.habits.completed }}
            notes={focus.focusNotes}
            isLoading={focus.isLoading}
            onToggleHabit={(id) => void focus.habitActions.toggle(id)}
            habitPendingIds={focus.habitActions.pendingIds}
            onOpenHabits={() => setAttentionModal("habits")}
            onOpenNote={setNoteModalId}
          />
        </div>

        <div className="order-2 flex min-h-0 min-w-0 flex-col gap-3 xl:order-none">
          <AttentionPanel items={focus.attention} isLoading={focus.isLoading} inPlaceIds={attentionInPlaceIds} onOpen={openAttentionItem} />
          <BusinessPanel business={focus.business} summaryError={focus.summaryError} />
        </div>
      </main>

      {/* Kiosk-modals: details openen in-place; navigatie is de secundaire
          uitgang in de modal-footer (of de fallback als de rij niet geladen is). */}
      {eventModal && (
        <LazyCreateEventModal
          open
          editEvent={eventModal}
          onClose={() => setEventModal(null)}
          onSuccess={() => void focus.refetchPersonal()}
        />
      )}
      <DienstDetailModal dienst={dienstModal} todayIso={todayIso} onClose={() => setDienstModal(null)} />
      <NoteViewModal noteId={noteModalId} onClose={() => setNoteModalId(null)} />

      {/* Aandacht-modals: tellers uitklappen op de kiosk zelf. Doorklikken naar
          een detail (afspraak/notitie) sluit eerst de lijst-modal — geen
          gestapelde dialogen met vechtende Escape-handlers. */}
      <ConflictListModal
        open={attentionModal === "conflicts"}
        events={focus.conflictEvents}
        conflictMap={focus.conflictMap}
        onClose={() => setAttentionModal(null)}
        onOpenEvent={(event) => {
          setAttentionModal(null);
          setEventModal(event);
        }}
      />
      <NotesAttentionModal
        open={attentionModal === "notes"}
        notes={focus.attentionNotes}
        onClose={() => setAttentionModal(null)}
        onOpenNote={(id) => {
          setAttentionModal(null);
          setNoteModalId(id);
        }}
      />
      <HabitsTodayModal open={attentionModal === "habits"} onClose={() => setAttentionModal(null)} />
      <LcActionsModal open={attentionModal === "lc-actions"} todayIso={todayIso} onClose={() => setAttentionModal(null)} />

      {/* SR-aankondiging van optimistic habit-toggles (zelfde patroon als /habits). */}
      <p aria-live="polite" className="sr-only">
        {focus.habitActions.announcement}
      </p>
    </div>
  );
}
