"use client";

import Link from "next/link";
import { AppIcon } from "@/components/ui/AppIcon";
import {
  formatNextAppointmentMeta,
  formatTimelineMeta,
  type FocusTimelineItem,
  useFocusData,
} from "@/hooks/useFocusData";
import type { FocusAttention, FocusBusinessStatus, FocusSyncSummary } from "@/lib/api";

const PANEL = "rounded-lg border border-white/10 bg-white/[0.035] shadow-[0_18px_60px_rgba(0,0,0,0.26)]";

function severityClasses(severity: string) {
  switch (severity) {
    case "high":
      return "border-rose-400/25 bg-rose-500/10 text-rose-100";
    case "medium":
      return "border-amber-400/25 bg-amber-500/10 text-amber-100";
    default:
      return "border-sky-400/20 bg-sky-500/10 text-sky-100";
  }
}

function toneClasses(tone: FocusTimelineItem["tone"]) {
  switch (tone) {
    case "green":
      return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
    case "amber":
      return "border-amber-400/25 bg-amber-500/10 text-amber-100";
    case "rose":
      return "border-rose-400/25 bg-rose-500/10 text-rose-100";
    case "blue":
      return "border-sky-400/25 bg-sky-500/10 text-sky-100";
    case "indigo":
      return "border-indigo-400/25 bg-indigo-500/10 text-indigo-100";
    default:
      return "border-white/10 bg-white/[0.035] text-slate-100";
  }
}

function formatGeneratedAt(value?: string) {
  if (!value) return "Nog niet geladen";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Bijgewerkt";
  return date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function formatEuroCents(value?: number) {
  if (!value) return "€0";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function Header({
  time,
  today,
  generatedAt,
  attentionCount,
  bridgeOnline,
}: {
  time?: string;
  today?: string;
  generatedAt?: string;
  attentionCount: number;
  bridgeOnline: boolean;
}) {
  return (
    <header className="flex shrink-0 flex-col gap-3 border-b border-white/8 bg-black/20 px-3 py-3 backdrop-blur-xl sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-end gap-4">
        <div className="font-mono text-5xl font-semibold leading-none text-white sm:text-6xl">
          {time ?? "--:--"}
        </div>
        <div className="min-w-0 pb-1">
          <p className="truncate text-sm font-semibold text-slate-200 sm:text-base">{today ?? "Focus laden"}</p>
          <p className="mt-1 text-xs text-slate-500">Laatst bijgewerkt {formatGeneratedAt(generatedAt)}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
        <StatusPill icon="radar" label={`${attentionCount} aandacht`} active={attentionCount === 0} />
        <StatusPill icon={bridgeOnline ? "wifi" : "wifiOff"} label={bridgeOnline ? "Bridge live" : "Bridge offline"} active={bridgeOnline} />
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.08]"
        >
          <AppIcon name="dashboard" size="xs" />
          App
        </Link>
      </div>
    </header>
  );
}

function StatusPill({ icon, label, active }: { icon: "radar" | "wifi" | "wifiOff"; label: string; active: boolean }) {
  return (
    <div
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold ${
        active ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-amber-400/25 bg-amber-500/10 text-amber-100"
      }`}
    >
      <AppIcon name={icon} size="xs" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function NowPanel({ item, todayIso }: { item: FocusTimelineItem | null; todayIso?: string }) {
  return (
    <section className={`${PANEL} flex h-full min-h-[260px] flex-col p-4 sm:p-5 xl:min-h-0`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Nu centraal</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Focus</h1>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-500/10">
          <AppIcon name="radar" size="md" iconClassName="text-amber-200" />
        </div>
      </div>

      <div className="mt-6 flex flex-1 flex-col justify-center">
        {item ? (
          <Link href={item.href} className={`block rounded-lg border p-4 transition-colors hover:bg-white/[0.06] ${toneClasses(item.tone)}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase">{item.status === "now" ? "Bezig" : "Volgende"}</p>
              <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 font-mono text-sm">{item.timeLabel}</span>
            </div>
            <h2 className="mt-4 line-clamp-2 text-3xl font-bold leading-tight text-white sm:text-4xl">{item.title}</h2>
            <p className="mt-3 line-clamp-2 text-base leading-6 text-slate-300">{item.subtitle}</p>
            <p className="mt-5 text-sm font-semibold text-slate-400">{formatTimelineMeta(item, todayIso)}</p>
          </Link>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-center">
            <p className="text-lg font-semibold text-white">Geen directe planning</p>
            <p className="mt-2 text-sm text-slate-500">Je rooster en agenda hebben nu geen eerstvolgende item.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function TimelinePanel({ items, todayIso }: { items: FocusTimelineItem[]; todayIso?: string }) {
  const visible = items.slice(0, 9);
  return (
    <section className={`${PANEL} flex h-full min-h-[240px] flex-col overflow-hidden p-4 sm:p-5 xl:min-h-0`}>
      <PanelHeader icon="calendarDays" label="Vandaag en straks" value={`${visible.length} items`} />
      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {visible.length > 0 ? (
          visible.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`grid min-h-16 grid-cols-[74px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-white/[0.06] ${toneClasses(item.status === "now" ? "green" : item.tone)}`}
            >
              <div className="font-mono text-sm font-semibold">{item.timeLabel}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{item.title}</p>
                <p className="mt-0.5 truncate text-xs text-slate-400">{item.subtitle}</p>
              </div>
              <div className="hidden text-right text-xs font-medium text-slate-500 sm:block">
                {formatRelativeCompact(item.date, todayIso)}
              </div>
            </Link>
          ))
        ) : (
          <EmptyLine title="Geen agenda-items" detail="Er staat niets in de komende dagen." />
        )}
      </div>
    </section>
  );
}

function AttentionPanel({ items }: { items: FocusAttention[] }) {
  return (
    <section className={`${PANEL} flex h-full min-h-[240px] flex-col overflow-hidden p-4 sm:p-5 xl:min-h-0`}>
      <PanelHeader icon="warning" label="Aandacht nodig" value={items.length === 0 ? "Rustig" : `${items.length}`} />
      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {items.length > 0 ? (
          items.map((item) => {
            const content = (
              <div className={`rounded-lg border px-3 py-3 ${severityClasses(item.severity)}`}>
                <div className="flex items-start gap-3">
                  <AppIcon name={item.severity === "high" ? "warning" : "info"} size="sm" iconClassName="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">{item.detail}</p>
                  </div>
                </div>
              </div>
            );
            return item.href ? (
              <Link key={item.id} href={item.href} className="block transition-opacity hover:opacity-90">
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

function SystemPanel({
  devices,
  finance,
  sync,
  nextAppointment,
}: {
  devices: { total: number; online: number; on: number; bridgeOnline: boolean };
  finance: { value: string; hidden: boolean; meta: string };
  sync?: FocusSyncSummary;
  nextAppointment: string;
}) {
  const syncValue = [sync?.schedule.status ?? "laden", sync?.gmail.status ?? "laden"].join(" / ");
  return (
    <section className={`${PANEL} h-full min-h-[250px] p-4 xl:min-h-0`}>
      <PanelHeader icon="shield" label="Systeemlijn" value={devices.bridgeOnline ? "Live" : "Aandacht"} />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Lampen aan" value={`${devices.on}`} tone="amber" />
        <Metric label="Online" value={`${devices.online}/${devices.total}`} tone="green" />
        <Metric label="Bridge" value={devices.bridgeOnline ? "Live" : "Offline"} tone={devices.bridgeOnline ? "green" : "rose"} />
      </div>
      <div className="mt-3 space-y-2">
        <InfoRow label="Netto" value={finance.value} meta={finance.hidden ? "Privacy actief" : finance.meta} />
        <InfoRow label="Afspraak" value={nextAppointment} />
        <InfoRow label="Sync" value={syncValue} />
      </div>
    </section>
  );
}

function HabitNotePanel({
  habits,
  habitProgress,
  notes,
}: {
  habits: Array<{ id: string; title: string; meta: string; done: boolean }>;
  habitProgress: { due: number; completed: number };
  notes: Array<{ id: string; title: string; meta: string; priority: string; href: string }>;
}) {
  return (
    <section className={`${PANEL} flex h-full min-h-[280px] flex-col overflow-hidden p-4 sm:p-5 xl:min-h-0`}>
      <PanelHeader icon="habit" label="Persoonlijk systeem" value={`${habitProgress.completed}/${habitProgress.due} habits`} />
      <div className="mt-4 grid min-h-0 flex-1 gap-4 sm:grid-cols-2">
        <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
          <p className="text-xs font-semibold uppercase text-slate-500">Habits vandaag</p>
          {habits.length > 0 ? (
            habits.map((habit) => (
              <div key={habit.id} className="flex min-h-12 items-center gap-3 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2">
                <AppIcon name={habit.done ? "statusOk" : "statusActive"} size="sm" iconClassName={habit.done ? "text-emerald-300" : "text-slate-500"} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{habit.title}</p>
                  <p className="truncate text-xs text-slate-500">{habit.meta}</p>
                </div>
              </div>
            ))
          ) : (
            <EmptyLine title="Geen habits gepland" detail="Vandaag heeft geen actieve habit-items." />
          )}
        </div>
        <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
          <p className="text-xs font-semibold uppercase text-slate-500">Notitie focus</p>
          {notes.length > 0 ? (
            notes.map((note) => (
              <Link key={note.id} href={note.href} className="block min-h-12 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2 transition-colors hover:bg-white/[0.06]">
                <p className="truncate text-sm font-semibold text-white">{note.title}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{note.meta}</p>
              </Link>
            ))
          ) : (
            <EmptyLine title="Geen notitie-focus" detail="Geen pinned, deadline of triage notities." />
          )}
        </div>
      </div>
    </section>
  );
}

function BusinessPanel({ business }: { business?: FocusBusinessStatus }) {
  return (
    <section className={`${PANEL} h-full min-h-[230px] p-4 xl:min-h-0 xl:p-3.5`}>
      <PanelHeader icon="business" label="LaventeCare" value={business ? `${business.activeProjects} projecten` : "Laden"} />
      <div className="mt-4 grid grid-cols-2 gap-2 xl:mt-3 xl:grid-cols-4 xl:gap-1.5">
        <Metric label="Opdrachten" value={`${business?.activeWorkstreams ?? 0}`} tone="blue" />
        <Metric label="Acties" value={`${business?.openActions ?? 0}`} tone={(business?.overdueActions ?? 0) > 0 ? "rose" : "green"} />
        <Metric label="Offertes" value={`${business?.openQuotes ?? 0}`} tone="amber" />
        <Metric label="Open" value={formatEuroCents(business?.outstandingCents)} tone={(business?.openInvoices ?? 0) > 0 ? "amber" : "green"} />
      </div>
    </section>
  );
}

function PanelHeader({ icon, label, value }: { icon: Parameters<typeof AppIcon>[0]["name"]; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045]">
          <AppIcon name={icon} size="sm" iconClassName="text-amber-200" />
        </div>
        <p className="min-w-0 truncate text-xs font-semibold uppercase text-slate-500">{label}</p>
      </div>
      <span className="shrink-0 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs font-semibold text-slate-300">{value}</span>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "amber" | "blue" | "green" | "rose" }) {
  const color =
    tone === "green"
      ? "text-emerald-200"
      : tone === "rose"
        ? "text-rose-200"
        : tone === "blue"
          ? "text-sky-200"
          : "text-amber-200";
  return (
    <div className="min-h-14 rounded-lg border border-white/8 bg-white/[0.025] p-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 truncate text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="shrink-0 text-xs text-slate-500">{label}</p>
        <p className="min-w-0 truncate text-sm font-semibold text-white sm:text-right">{value}</p>
      </div>
      {meta && <p className="mt-1 truncate text-xs text-slate-600 sm:text-right">{meta}</p>}
    </div>
  );
}

function EmptyLine({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-4">
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function formatRelativeCompact(date: string, todayIso?: string) {
  if (!todayIso) return date.slice(5);
  if (date === todayIso) return "vandaag";
  if (date === addDaysIso(todayIso, 1)) return "morgen";
  if (date === addDaysIso(todayIso, 2)) return "overmorgen";
  return date.slice(5).split("-").reverse().join("-");
}

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function FocusPage() {
  const focus = useFocusData();
  const todayIso = focus.dateInfo?.todayIso;

  return (
    <div className="min-h-dvh overflow-y-auto bg-[#07090f] text-slate-100 xl:flex xl:h-dvh xl:flex-col xl:overflow-hidden">
      <Header
        time={focus.clock?.time ?? focus.summary?.time}
        today={focus.dateInfo?.todayLabel}
        generatedAt={focus.generatedAt}
        attentionCount={focus.attention.length}
        bridgeOnline={focus.devices.bridgeOnline}
      />

      <main className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2 xl:min-h-0 xl:flex-1 xl:overflow-hidden xl:grid-cols-[minmax(280px,0.9fr)_minmax(400px,1.28fr)_minmax(280px,0.92fr)] xl:grid-rows-[minmax(210px,0.9fr)_minmax(160px,0.72fr)_minmax(200px,0.58fr)]">
        <div className="order-1 xl:col-start-1 xl:row-start-1 xl:min-h-0">
          <NowPanel item={focus.nextItem} todayIso={todayIso} />
        </div>

        <div className="order-2 xl:col-start-3 xl:row-span-2 xl:row-start-1 xl:min-h-0">
          <AttentionPanel items={focus.attention} />
        </div>

        <div className="order-3 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:min-h-0">
          <TimelinePanel items={focus.timeline} todayIso={todayIso} />
        </div>

        <div className="order-4 xl:col-start-1 xl:row-span-2 xl:row-start-2 xl:min-h-0">
          <SystemPanel
            devices={focus.devices}
            finance={focus.finance}
            sync={focus.sync}
            nextAppointment={formatNextAppointmentMeta(focus.personal.nextAppointment, todayIso)}
          />
        </div>

        <div className="order-5 xl:col-start-2 xl:row-start-3 xl:min-h-0">
          <HabitNotePanel
            habits={focus.habitItems}
            habitProgress={{ due: focus.habits.due, completed: focus.habits.completed }}
            notes={focus.focusNotes}
          />
        </div>

        <div className="order-6 xl:col-start-3 xl:row-start-3 xl:min-h-0">
          <BusinessPanel business={focus.business} />
        </div>
      </main>
    </div>
  );
}
