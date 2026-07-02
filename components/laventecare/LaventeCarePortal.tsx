"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BookOpenText,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  FileCheck2,
  FolderKanban,
  Gauge,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  MailCheck,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatChip } from "@/components/ui/StatChip";

export type PortalView =
  | "overview"
  | "pipeline"
  | "signals"
  | "commerce"
  | "mailbox"
  | "operations"
  | "knowledge";

export type PortalSection = {
  id: PortalView;
  label: string;
  eyebrow: string;
  description: string;
  count: string;
  icon: LucideIcon;
  tone: "amber" | "emerald" | "sky" | "rose" | "violet" | "slate";
};

export type CapabilityStatus = "ready" | "attention" | "missing";

export type CapabilityRow = {
  label: string;
  detail: string;
  status: CapabilityStatus;
  owner: string;
  view: PortalView;
  score: number;
  priority: "hoog" | "middel" | "laag";
  nextStep: string;
  actionLabel: string;
};

export const portalIcons = {
  overview: LayoutDashboard,
  pipeline: Handshake,
  signals: Sparkles,
  commerce: ReceiptText,
  mailbox: MailCheck,
  operations: LifeBuoy,
  knowledge: BookOpenText,
};

export function LaventeCarePortalHero({
  capabilityRows,
  companies,
  contacts,
  leads,
  workstreams,
  projects,
  invoices,
  documents,
  onOpenCapabilities,
}: {
  capabilityRows: CapabilityRow[];
  companies: number;
  contacts: number;
  leads: number;
  workstreams: number;
  projects: number;
  invoices: number;
  documents: number;
  onOpenCapabilities: () => void;
}) {
  const ready = capabilityRows.filter((row) => row.status === "ready").length;
  const attention = capabilityRows.filter((row) => row.status === "attention").length;
  const missing = capabilityRows.filter((row) => row.status === "missing").length;

  return (
    <section className="glass min-w-0 p-3 sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-200">
              <BriefcaseBusiness size={14} />
              Bedrijfsportaal
            </div>
            <button
              type="button"
              onClick={onOpenCapabilities}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 text-[11px] font-bold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              <Gauge size={13} />
              {ready}/{capabilityRows.length} klaar
              {attention + missing > 0 ? ` - ${attention + missing} focus` : ""}
            </button>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
            LaventeCare cockpit
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            Klanten, opdrachten, projecten, mails, documenten en betalingen in een rustige bedrijfswerkruimte.
          </p>
        </div>
      </div>

      <details className="mt-3" open>
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-normal text-slate-500 marker:hidden">
          Kerncijfers
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatChip icon={UsersRound} label="Klanten" value={String(companies)} meta={`${contacts} contacten`} tone="amber" />
          <StatChip icon={Sparkles} label="Leads" value={String(leads)} meta="sales" tone="indigo" />
          <StatChip icon={Workflow} label="Opdrachten" value={String(workstreams)} meta="werkbank" tone="indigo" />
          <StatChip icon={FolderKanban} label="Projecten" value={String(projects)} meta="delivery" tone="green" />
          <StatChip icon={Banknote} label="Facturen" value={String(invoices)} meta="bunq" tone="amber" />
          <StatChip icon={BookOpenText} label="Docs" value={String(documents)} meta="templates" tone="sky" />
          <StatChip
            icon={Gauge}
            label="Vulling"
            value={`${ready}/${capabilityRows.length}`}
            meta={attention || missing ? `${attention + missing} focus` : "op orde"}
            tone={attention || missing ? "rose" : "green"}
          />
        </div>
      </details>

      {(attention > 0 || missing > 0) && (
        <div className="mt-3 hidden gap-2 lg:grid lg:grid-cols-3">
          {capabilityRows
            .filter((row) => row.status !== "ready")
            .slice(0, 3)
            .map((row) => (
              <button
                key={row.label}
                type="button"
                onClick={onOpenCapabilities}
                className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-amber-500/15 bg-amber-500/[0.06] px-3 py-2 text-left transition hover:bg-amber-500/10"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-amber-100">{row.label}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-500">{row.nextStep}</span>
                </span>
                <CapabilityBadge status={row.status} />
              </button>
            ))}
        </div>
      )}
    </section>
  );
}

export function PortalNavigation({
  sections,
  activeView,
  onChange,
}: {
  sections: PortalSection[];
  activeView: PortalView;
  onChange: (view: PortalView) => void;
}) {
  return (
    <nav className="relative z-20 -mx-4 border-y border-white/10 bg-[var(--color-background)]/92 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:sticky lg:top-[76px] lg:-mx-8 lg:px-8">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const active = section.id === activeView;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              className={cn(
                "flex min-w-[108px] items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition sm:min-w-[138px]",
                active
                  ? "border-sky-500/30 bg-sky-500/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", active ? "border-sky-500/20 bg-sky-500/10 text-sky-200" : "border-white/10 bg-black/10")}>
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{section.label}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-black/20 px-1.5 py-0.5 text-[11px] font-bold text-slate-300 sm:px-2 sm:text-xs">{section.count}</span>
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute right-0 top-2 bottom-3 w-8 bg-gradient-to-l from-[var(--color-background)] to-transparent sm:right-6 lg:right-8" />
    </nav>
  );
}

export function PortalInsightRail({
  capabilityRows,
  sections,
  activeView,
  signals,
  actions,
  openInvoices,
  openIncidents,
  onChange,
}: {
  capabilityRows: CapabilityRow[];
  sections: PortalSection[];
  activeView: PortalView;
  signals: number;
  actions: number;
  openInvoices: number;
  openIncidents: number;
  onChange: (view: PortalView) => void;
}) {
  const attentionRows = capabilityRows.filter((row) => row.status !== "ready");
  const railRows = [...capabilityRows].sort((a, b) => statusWeight(a.status) - statusWeight(b.status));
  return (
    <aside className="space-y-4 xl:sticky xl:top-[168px] xl:self-start">
      <div className="glass min-w-0 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={17} className="text-emerald-300" />
          <h3 className="text-sm font-bold text-white">Business dekking</h3>
        </div>
        <div className="mt-4 space-y-2">
          {railRows.slice(0, 6).map((row) => (
            <button
              key={row.label}
              type="button"
              onClick={() => onChange(row.view)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:bg-white/[0.06]"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-slate-200">{row.label}</span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">{row.score}% - {row.owner}</span>
              </span>
              <CapabilityIcon status={row.status} />
            </button>
          ))}
        </div>
      </div>

      <div className="glass min-w-0 p-4">
        <div className="flex items-center gap-2">
          <Gauge size={17} className="text-sky-300" />
          <h3 className="text-sm font-bold text-white">Aandacht</h3>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <RailMetric label="Signalen" value={signals} icon={Sparkles} tone="violet" />
          <RailMetric label="Acties" value={actions} icon={ListChecks} tone="sky" />
          <RailMetric label="Facturen" value={openInvoices} icon={ReceiptText} tone="amber" />
          <RailMetric label="SLA" value={openIncidents} icon={LifeBuoy} tone={openIncidents > 0 ? "rose" : "slate"} />
        </div>
        {attentionRows.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange("overview")}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-500/15"
          >
            <AlertTriangle size={14} />
            {attentionRows.length} functie(s) vullen
          </button>
        ) : null}
      </div>

      <div className="hidden xl:block">
        <div className="glass min-w-0 p-4">
          <div className="flex items-center gap-2">
            <Search size={17} className="text-slate-400" />
            <h3 className="text-sm font-bold text-white">Werkgebieden</h3>
          </div>
          <div className="mt-3 space-y-1.5">
            {sections.slice(0, 6).map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => onChange(section.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold transition",
                  section.id === activeView ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-200"
                )}
              >
                {section.label}
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function RailMetric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: PortalSection["tone"] }) {
  const toneClass = {
    amber: "text-amber-300",
    emerald: "text-emerald-300",
    sky: "text-sky-300",
    rose: "text-rose-300",
    violet: "text-violet-300",
    slate: "text-slate-400",
  }[tone];
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <Icon size={15} className={toneClass} />
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
      <p className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-normal text-slate-500">{label}</p>
    </div>
  );
}

export function CapabilityMatrix({
  capabilityRows,
  expanded = false,
  onOpenView,
}: {
  capabilityRows: CapabilityRow[];
  expanded?: boolean;
  onOpenView?: (view: PortalView) => void;
}) {
  const ready = capabilityRows.filter((row) => row.status === "ready").length;
  const attention = capabilityRows.filter((row) => row.status === "attention").length;
  const missing = capabilityRows.filter((row) => row.status === "missing").length;
  const maturity = Math.round(capabilityRows.reduce((sum, row) => sum + row.score, 0) / Math.max(1, capabilityRows.length));
  const focusRows = capabilityRows.filter((row) => row.status !== "ready").sort((a, b) => statusWeight(a.status) - statusWeight(b.status));
  const visibleRows = expanded
    ? capabilityRows
    : focusRows.length > 0
      ? focusRows.slice(0, 4)
      : capabilityRows.slice(0, 4);

  return (
    <section className="glass min-w-0 p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Bedrijfsfunctionaliteit</p>
          <h3 className="mt-1 text-lg font-bold text-white">{expanded ? "Dekking en inrichting" : "Bedrijfsgereedheid"}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            Per bedrijfsfunctie zie je of de flow klaar is, gevuld moet worden of echt nog niet is ingericht.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-200">
            <BadgeCheck size={14} />
            {ready} klaar
          </span>
          <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 text-xs font-bold text-amber-200">
            <CircleDashed size={14} />
            {attention} inrichten
          </span>
          <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 text-xs font-bold text-rose-200">
            <AlertTriangle size={14} />
            {missing} niet ingericht
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Functionele volwassenheid</p>
              <p className="mt-1 text-2xl font-bold text-white">{maturity}%</p>
            </div>
            <Gauge size={24} className="text-sky-300" />
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-300 to-amber-300" style={{ width: `${Math.max(6, maturity)}%` }} />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {/* R3-11: alleen "alle kernflows zijn ingericht" beweren als dat écht zo is. */}
            {attention + missing === 0
              ? "Alle kernflows zijn ingericht; de resterende signalen gaan over het vullen van echte bedrijfsdata en werkdiscipline."
              : `${attention + missing} bedrijfsfunctie(s) vragen nog aandacht; richt die in en vul echte bedrijfsdata om de volwassenheid te verhogen.`}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-300" />
            <p className="text-sm font-bold text-white">Focus nu</p>
          </div>
          <div className="mt-3 space-y-2">
            {focusRows.slice(0, 3).map((row, index) => (
              <button
                key={row.label}
                type="button"
                onClick={() => onOpenView?.(row.view)}
                className="flex w-full items-start gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-left transition hover:bg-white/[0.05]"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-slate-300">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-white">{row.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">{row.nextStep}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={cn("mt-4 grid gap-3", expanded ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4")}>
        {visibleRows.map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={() => onOpenView?.(row.view)}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{row.label}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{row.detail}</p>
              </div>
              <CapabilityBadge status={row.status} />
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full",
                  row.status === "ready" ? "bg-emerald-300" : row.status === "attention" ? "bg-amber-300" : "bg-rose-300"
                )}
                style={{ width: `${Math.max(6, row.score)}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-slate-500">
                <ClipboardList size={13} />
                <span className="truncate">{row.owner} - {row.score}%</span>
              </span>
              <PriorityBadge priority={row.priority} />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">{row.nextStep}</p>
            <span className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-sky-200">
              {row.actionLabel}
              <ArrowRight size={13} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function PortalRoadmapPanel({
  onOpenCommerce,
  onOpenOperations,
  onOpenKnowledge,
}: {
  onOpenCommerce: () => void;
  onOpenOperations: () => void;
  onOpenKnowledge: () => void;
}) {
  const rows = [
    {
      icon: ReceiptText,
      title: "Commercie volwassen maken",
      body: "Offerteversies, declarabele uren, factuurhistorie, betaalstatus en periodieke omzetrapportage.",
      action: "Commercie",
      onClick: onOpenCommerce,
      tone: "amber" as const,
    },
    {
      icon: LifeBuoy,
      title: "Beheer en SLA laag",
      body: "Incidenten, wijzigingsverzoeken, besluitvorming en klantafspraken als vaste operationele audit trail.",
      action: "Operations",
      onClick: onOpenOperations,
      tone: "rose" as const,
    },
    {
      icon: FileCheck2,
      title: "Dossiervolledigheid",
      body: "Per klant zichtbaar maken welke documenten, contactmomenten, projecten en acties nog ontbreken.",
      action: "Kennisbank",
      onClick: onOpenKnowledge,
      tone: "sky" as const,
    },
  ];

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {rows.map((row) => {
        const Icon = row.icon;
        return (
          <article key={row.title} className="glass min-w-0 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                <Icon size={18} className={row.tone === "amber" ? "text-amber-300" : row.tone === "rose" ? "text-rose-300" : "text-sky-300"} />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white">{row.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-400">{row.body}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={row.onClick}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08]"
            >
              <ArrowRight size={14} />
              {row.action}
            </button>
          </article>
        );
      })}
    </section>
  );
}

function CapabilityBadge({ status }: { status: CapabilityStatus }) {
  const config = {
    ready: { label: "Klaar", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200" },
    attention: { label: "Inrichten", className: "border-amber-500/20 bg-amber-500/10 text-amber-200" },
    missing: { label: "Niet ingericht", className: "border-rose-500/20 bg-rose-500/10 text-rose-200" },
  }[status];
  return (
    <span className={cn("inline-flex h-7 shrink-0 items-center rounded-full border px-2 text-[11px] font-bold", config.className)}>
      {config.label}
    </span>
  );
}

function CapabilityIcon({ status }: { status: CapabilityStatus }) {
  if (status === "ready") return <CheckCircle2 size={15} className="text-emerald-300" />;
  if (status === "attention") return <CircleDashed size={15} className="text-amber-300" />;
  return <AlertTriangle size={15} className="text-rose-300" />;
}

function PriorityBadge({ priority }: { priority: CapabilityRow["priority"] }) {
  const config = {
    hoog: "border-rose-500/20 bg-rose-500/10 text-rose-200",
    middel: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    laag: "border-white/10 bg-white/[0.04] text-slate-300",
  }[priority];
  return <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold", config)}>{priority}</span>;
}

function statusWeight(status: CapabilityStatus) {
  if (status === "missing") return 0;
  if (status === "attention") return 1;
  return 2;
}
