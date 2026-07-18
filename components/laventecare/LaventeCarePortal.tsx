"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Surface, surfaceVariants } from "@/components/ui/Surface";
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
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";
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
  tone: UiTone;
};

export type CapabilityStatus = "ready" | "attention" | "missing" | "unknown";

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
  invoices: number | null;
  documents: number;
  onOpenCapabilities: () => void;
}) {
  const ready = capabilityRows.filter((row) => row.status === "ready").length;
  const attention = capabilityRows.filter((row) => row.status === "attention").length;
  const missing = capabilityRows.filter((row) => row.status === "missing").length;
  const unknown = capabilityRows.filter((row) => row.status === "unknown").length;
  const known = capabilityRows.length - unknown;

  return (
    <section className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-3 sm:p-4")}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info" size="md">
              <BriefcaseBusiness size={14} aria-hidden="true" />
              Bedrijfsportaal
            </Badge>
            <Button
              size="sm"
              variant="secondary"
              onClick={onOpenCapabilities}
              className="gap-1.5 px-2 text-micro"
            >
              <Gauge size={13} aria-hidden="true" />
              {ready}/{known} beoordeeld als klaar
              {attention + missing > 0 ? ` - ${attention + missing} focus` : ""}
              {unknown > 0 ? ` - ${unknown} onbekend` : ""}
            </Button>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-[var(--color-text)] sm:text-2xl">
            LaventeCare cockpit
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
            Klanten, opdrachten, projecten, mails, documenten en betalingen in een rustige bedrijfswerkruimte.
          </p>
        </div>
      </div>

      <details className="mt-3" open>
        <summary className="cursor-pointer text-micro font-semibold uppercase tracking-normal text-[var(--color-text-muted)] marker:hidden">
          Kerncijfers
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatChip icon={UsersRound} label="Klanten" value={String(companies)} meta={`${contacts} contacten`} tone="accent" />
          <StatChip icon={Sparkles} label="Leads" value={String(leads)} meta="sales" tone="info" />
          <StatChip icon={Workflow} label="Opdrachten" value={String(workstreams)} meta="werkbank" tone="info" />
          <StatChip icon={FolderKanban} label="Projecten" value={String(projects)} meta="delivery" tone="success" />
          <StatChip icon={Banknote} label="Facturen" value={invoices === null ? "?" : String(invoices)} meta="bunq" tone="accent" />
          <StatChip icon={BookOpenText} label="Docs" value={String(documents)} meta="templates" tone="info" />
          <StatChip
            icon={Gauge}
            label="Vulling"
            value={`${ready}/${known}`}
            meta={attention || missing ? `${attention + missing} focus` : unknown ? `${unknown} onbekend` : "op orde"}
            tone={attention || missing ? "danger" : unknown ? "info" : "success"}
          />
        </div>
      </details>

      {(attention > 0 || missing > 0) && (
        <div className="mt-3 hidden gap-2 lg:grid lg:grid-cols-3">
          {capabilityRows
            .filter((row) => row.status === "attention" || row.status === "missing")
            .slice(0, 3)
            .map((row) => (
              <button
                key={row.label}
                type="button"
                onClick={onOpenCapabilities}
                className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] px-3 py-2 text-left transition-colors duration-[var(--motion-fast)] hover:bg-[var(--color-warning-border)]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-[var(--color-warning)]">{row.label}</span>
                  <span className="mt-0.5 block truncate text-micro text-[var(--color-text-muted)]">{row.nextStep}</span>
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
    <nav className="relative z-[var(--layer-sticky)] -mx-4 border-y border-[var(--color-border)] bg-[var(--color-background)]/92 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:sticky lg:top-[76px] lg:-mx-8 lg:px-8">
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
                "flex min-h-11 min-w-[108px] items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors duration-[var(--motion-fast)] sm:min-w-[138px]",
                active
                  ? "border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-[var(--color-text)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              )}
            >
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", active ? "border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-[var(--color-info)]" : "border-[var(--color-border)] bg-[var(--color-surface-active)]")}>
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{section.label}</span>
              </span>
              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-active)] px-1.5 py-0.5 text-micro font-bold text-[var(--color-text-muted)] sm:px-2 sm:text-xs">{section.count}</span>
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
  openInvoices: number | null;
  openIncidents: number;
  onChange: (view: PortalView) => void;
}) {
  const attentionRows = capabilityRows.filter(
    (row) => row.status === "attention" || row.status === "missing",
  );
  const railRows = [...capabilityRows].sort((a, b) => statusWeight(a.status) - statusWeight(b.status));
  return (
    <aside className="space-y-4 xl:sticky xl:top-[168px] xl:self-start">
      <Surface padding="none" className="min-w-0 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={17} className="text-[var(--color-success)]" />
          <h3 className="text-sm font-bold text-[var(--color-text)]">Business dekking</h3>
        </div>
        <div className="mt-4 space-y-2">
          {railRows.slice(0, 6).map((row) => (
            <button
              key={row.label}
              type="button"
              onClick={() => onChange(row.view)}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-left transition-colors duration-[var(--motion-fast)] hover:bg-[var(--color-surface-hover)]"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-[var(--color-text)]">{row.label}</span>
                <span className="mt-0.5 block truncate text-micro text-[var(--color-text-muted)]">{row.status === "unknown" ? "Nog niet geladen" : `${row.score}% - ${row.owner}`}</span>
              </span>
              <CapabilityIcon status={row.status} />
            </button>
          ))}
        </div>
      </Surface>

      <Surface padding="none" className="min-w-0 p-4">
        <div className="flex items-center gap-2">
          <Gauge size={17} className="text-[var(--color-info)]" />
          <h3 className="text-sm font-bold text-[var(--color-text)]">Aandacht</h3>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <RailMetric label="Signalen" value={signals} icon={Sparkles} tone="info" />
          <RailMetric label="Acties" value={actions} icon={ListChecks} tone="info" />
          <RailMetric label="Facturen" value={openInvoices ?? "?"} icon={ReceiptText} tone="warning" />
          <RailMetric label="SLA" value={openIncidents} icon={LifeBuoy} tone={openIncidents > 0 ? "danger" : "neutral"} />
        </div>
        {attentionRows.length > 0 ? (
          <Button type="button" variant="danger" size="sm" fullWidth onClick={() => onChange("overview")} className="mt-3">
            <AlertTriangle size={14} aria-hidden="true" />
            {attentionRows.length} functie(s) vullen
          </Button>
        ) : null}
      </Surface>

      <div className="hidden xl:block">
        <Surface padding="none" className="min-w-0 p-4">
          <div className="flex items-center gap-2">
            <Search size={17} className="text-[var(--color-text-muted)]" />
            <h3 className="text-sm font-bold text-[var(--color-text)]">Werkgebieden</h3>
          </div>
          <div className="mt-3 space-y-1.5">
            {sections.slice(0, 6).map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => onChange(section.id)}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold transition-colors duration-[var(--motion-fast)]",
                  section.id === activeView ? "bg-[var(--color-surface-active)] text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                )}
              >
                {section.label}
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
        </Surface>
      </div>
    </aside>
  );
}

function RailMetric({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: LucideIcon; tone: PortalSection["tone"] }) {
  const toneClass = uiToneClasses[tone].icon;
  return (
    <Surface tone="subtle" radius="sm" padding="sm" className="min-h-11">
      <Icon size={15} className={toneClass} aria-hidden="true" />
      <p className="mt-2 text-lg font-bold text-[var(--color-text)]">{value}</p>
      <p className="mt-0.5 truncate text-micro font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">{label}</p>
    </Surface>
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
  const unknown = capabilityRows.filter((row) => row.status === "unknown").length;
  const scoredRows = capabilityRows.filter((row) => row.status !== "unknown");
  const maturity = Math.round(scoredRows.reduce((sum, row) => sum + row.score, 0) / Math.max(1, scoredRows.length));
  const focusRows = capabilityRows
    .filter((row) => row.status === "attention" || row.status === "missing")
    .sort((a, b) => statusWeight(a.status) - statusWeight(b.status));
  const visibleRows = expanded
    ? capabilityRows
    : focusRows.length > 0
      ? focusRows.slice(0, 4)
      : capabilityRows.slice(0, 4);

  return (
    <section className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-3 sm:p-4")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Bedrijfsfunctionaliteit</p>
          <h3 className="mt-1 text-lg font-bold text-[var(--color-text)]">{expanded ? "Dekking en inrichting" : "Bedrijfsgereedheid"}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            Per bedrijfsfunctie zie je of de flow klaar is, gevuld moet worden of echt nog niet is ingericht.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="success" size="md" className="min-h-8 px-3">
            <BadgeCheck size={14} aria-hidden="true" />
            {ready} klaar
          </Badge>
          <Badge tone="warning" size="md" className="min-h-8 px-3">
            <CircleDashed size={14} aria-hidden="true" />
            {attention} inrichten
          </Badge>
          {unknown > 0 ? (
            <Badge tone="neutral" size="md" className="min-h-8 px-3">
              <CircleDashed size={14} aria-hidden="true" />
              {unknown} onbekend
            </Badge>
          ) : null}
          <Badge tone="danger" size="md" className="min-h-8 px-3">
            <AlertTriangle size={14} aria-hidden="true" />
            {missing} niet ingericht
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Surface tone="subtle" radius="sm" padding="sm" className="min-h-11">
          <div className="flex items-center justify-between gap-3">
            <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Functionele volwassenheid</p>
              <p className="mt-1 text-2xl font-bold text-[var(--color-text)]">{maturity}%</p>
            </div>
            <Gauge size={24} className="text-[var(--color-info)]" />
          </div>
          <Progress value={maturity} label="Functionele volwassenheid" tone={maturity >= 80 ? "success" : maturity >= 50 ? "warning" : "danger"} className="mt-3" />
          <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
            {/* R3-11: alleen "alle kernflows zijn ingericht" beweren als dat écht zo is. */}
            {attention + missing === 0 && unknown === 0
              ? "Alle kernflows zijn ingericht; de resterende signalen gaan over het vullen van echte bedrijfsdata en werkdiscipline."
              : attention + missing > 0
                ? `${attention + missing} bedrijfsfunctie(s) vragen nog aandacht; richt die in en vul echte bedrijfsdata om de volwassenheid te verhogen.`
                : `${unknown} bedrijfsfunctie(s) worden pas beoordeeld wanneer je de bijbehorende werkruimte opent.`}
          </p>
        </Surface>

        <Surface tone="subtle" radius="sm" padding="sm" className="min-h-11">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-[var(--color-warning)]" />
            <p className="text-sm font-bold text-[var(--color-text)]">Focus nu</p>
          </div>
          <div className="mt-3 space-y-2">
            {focusRows.length > 0 ? (
              focusRows.slice(0, 3).map((row, index) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => onOpenView?.(row.view)}
                  className="flex min-h-11 w-full items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-active)] px-3 py-2 text-left transition-colors duration-[var(--motion-fast)] hover:bg-[var(--color-surface-hover)]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-active)] text-micro font-bold text-[var(--color-text-muted)]">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-[var(--color-text)]">{row.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-[var(--color-text-muted)]">{row.nextStep}</span>
                  </span>
                </button>
              ))
            ) : (
              <Surface tone="subtle" radius="sm" padding="xs" className="min-h-11 bg-[var(--color-surface-active)] text-xs leading-5 text-[var(--color-text-muted)]">
                {unknown > 0
                  ? "Geen bekende actiepunten; open de overige werkruimtes voor een volledige beoordeling."
                  : "Geen openstaande actiepunten."
                }
              </Surface>
            )}
          </div>
        </Surface>
      </div>

      <div className={cn("mt-4 grid gap-3", expanded ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4")}>
        {visibleRows.map((row) => (
          <button
            key={row.label}
            type="button"
            onClick={() => onOpenView?.(row.view)}
            className="min-h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-left transition-colors duration-[var(--motion-fast)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[var(--color-text)]">{row.label}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-muted)]">{row.detail}</p>
              </div>
              <CapabilityBadge status={row.status} />
            </div>
            <Progress
              value={row.score}
              label={`${row.label} voortgang`}
              tone={row.status === "ready" ? "success" : row.status === "attention" ? "warning" : row.status === "missing" ? "danger" : "accent"}
              className="mt-3 h-1.5"
            />
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-[var(--color-text-muted)]">
                <ClipboardList size={13} />
                <span className="truncate">{row.status === "unknown" ? `${row.owner} - nog niet geladen` : `${row.owner} - ${row.score}%`}</span>
              </span>
              <PriorityBadge priority={row.priority} />
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">{row.nextStep}</p>
            <span className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[var(--color-info)]">
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
      tone: "accent" as const,
    },
    {
      icon: LifeBuoy,
      title: "Beheer en SLA laag",
      body: "Incidenten, wijzigingsverzoeken, besluitvorming en klantafspraken als vaste operationele audit trail.",
      action: "Operations",
      onClick: onOpenOperations,
      tone: "danger" as const,
    },
    {
      icon: FileCheck2,
      title: "Dossiervolledigheid",
      body: "Per klant zichtbaar maken welke documenten, contactmomenten, projecten en acties nog ontbreken.",
      action: "Kennisbank",
      onClick: onOpenKnowledge,
      tone: "info" as const,
    },
  ];

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {rows.map((row) => {
        const Icon = row.icon;
        return (
          <article key={row.title} className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-4")}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                <Icon size={18} className={uiToneClasses[row.tone].icon} />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-[var(--color-text)]">{row.title}</h4>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{row.body}</p>
              </div>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={row.onClick} className="mt-4">
              <ArrowRight size={14} aria-hidden="true" />
              {row.action}
            </Button>
          </article>
        );
      })}
    </section>
  );
}

function CapabilityBadge({ status }: { status: CapabilityStatus }) {
  const config = {
    ready: { label: "Klaar", tone: "success" as const },
    attention: { label: "Inrichten", tone: "warning" as const },
    missing: { label: "Niet ingericht", tone: "danger" as const },
    unknown: { label: "Onbekend", tone: "neutral" as const },
  }[status];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
function CapabilityIcon({ status }: { status: CapabilityStatus }) {
  if (status === "ready") return <CheckCircle2 size={15} className="text-[var(--color-success)]" />;
  if (status === "attention") return <CircleDashed size={15} className="text-[var(--color-warning)]" />;
  if (status === "missing") return <AlertTriangle size={15} className="text-[var(--color-danger)]" />;
  return <CircleDashed size={15} className="text-[var(--color-text-muted)]" />;
}

function PriorityBadge({ priority }: { priority: CapabilityRow["priority"] }) {
  const tone = priority === "hoog" ? "danger" : priority === "middel" ? "warning" : "neutral";
  return <Badge tone={tone}>{priority}</Badge>;
}
function statusWeight(status: CapabilityStatus) {
  if (status === "missing") return 0;
  if (status === "attention") return 1;
  if (status === "unknown") return 2;
  return 3;
}
