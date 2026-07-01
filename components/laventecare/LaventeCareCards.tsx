import type { ReactNode } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Mail,
  StickyNote,
  Loader2,
  Plus,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  type Tone,
  type BusinessSignal,
  type FollowUpSignal,
  type ActionItem,
} from "./LaventeCareTypes";
import { toneClasses, formatDate, label } from "./LaventeCareUtils";

export function MetricCard({
  icon: Icon,
  label: metricLabel,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  tone: Tone;
}) {
  const toneClass = toneClasses[tone];
  return (
    <div className="glass min-w-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{metricLabel}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", toneClass.border, toneClass.surface)}>
          <Icon size={18} className={toneClass.icon} />
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-400">{detail}</p>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass min-w-0 border-dashed p-5 text-sm text-slate-400">
      <p className="font-semibold text-slate-200">{title}</p>
      <p className="mt-1">{body}</p>
    </div>
  );
}

function signalMeta(source: BusinessSignal["source"]): { icon: LucideIcon; label: string; tone: Tone } {
  if (source === "email") return { icon: Mail, label: "Email", tone: "sky" };
  if (source === "agenda") return { icon: CalendarClock, label: "Agenda", tone: "emerald" };
  return { icon: StickyNote, label: "Notitie", tone: "amber" };
}

export function SignalCard({
  signal,
  busyAction,
  busyLead,
  onCreateAction,
  onConvertToLead,
}: {
  signal: BusinessSignal;
  busyAction: boolean;
  busyLead: boolean;
  onCreateAction: (signal: BusinessSignal) => void;
  onConvertToLead: (signal: BusinessSignal) => void;
}) {
  const meta = signalMeta(signal.source);
  const Icon = meta.icon;
  const tone = toneClasses[meta.tone];
  const disabled = busyAction || busyLead;
  return (
    <div className="glass min-w-0 p-4">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", tone.border, tone.surface)}>
          <Icon size={16} className={tone.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2 py-0.5 text-xs font-bold", tone.border, tone.surface, tone.text)}>
              {meta.label}
            </span>
            <span className={cn(
              "rounded-full border px-2 py-0.5 text-xs font-bold",
              signal.urgency === "hoog" ? "border-rose-500/25 bg-rose-500/10 text-rose-200" : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400",
            )}>
              {signal.urgency}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-white">{signal.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{signal.subtitle}</p>
          <p className="mt-3 text-xs font-semibold text-slate-400">
            {formatDate(signal.date)} - match: {signal.matchedTerm}
          </p>
          <p className="mt-2 text-sm leading-5 text-slate-400">{signal.actionHint}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => onCreateAction(signal)}
              disabled={disabled}
              className="btn btn--ghost btn--sm flex-1 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busyAction ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Actie
            </button>
            <button
              type="button"
              onClick={() => onConvertToLead(signal)}
              disabled={disabled}
              className="btn btn--primary btn--sm flex-1 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busyLead ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              Lead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dutch labels for the raw follow-up source enum (mirrors sourceTypeLabel in
// LaventeCareMailboxView) — no raw "company"/"workstream" on cards.
const followUpSourceLabels: Record<FollowUpSignal["source"], string> = {
  company: "Klant",
  lead: "Lead",
  workstream: "Opdracht",
  project: "Project",
};

export function FollowUpCard({ followUp }: { followUp: FollowUpSignal }) {
  return (
    <div className="glass min-w-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            {followUpSourceLabels[followUp.source] ?? label(followUp.source)}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-white">{followUp.title}</h3>
        </div>
        <span className={cn(
          "shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold",
          followUp.priority === "hoog" ? "border-rose-500/25 bg-rose-500/10 text-rose-200" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
        )}>
          {formatDate(followUp.date)}
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500">{label(followUp.status)}</p>
      <p className="mt-2 text-sm leading-5 text-slate-400">{followUp.actionHint}</p>
    </div>
  );
}

export function ActionItemCard({
  action,
  busy,
  onComplete,
}: {
  action: ActionItem;
  busy: boolean;
  onComplete: (action: ActionItem) => void;
}) {
  const highPriority = action.priority === "hoog";
  return (
    <div className="glass min-w-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs font-bold text-slate-300">
              {label(action.actionType)}
            </span>
            <span className={cn(
              "rounded-full border px-2 py-0.5 text-xs font-bold",
              highPriority ? "border-rose-500/25 bg-rose-500/10 text-rose-200" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
            )}>
              {label(action.priority)}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-white">{action.title}</h3>
          {(action.company_name || action.project_name || action.workstream_title || action.lead_title) && (
            <p className="mt-1 truncate text-xs font-semibold text-amber-300/80">
              {[action.company_name, action.project_name ?? action.workstream_title ?? action.lead_title].filter(Boolean).join(" · ")}
            </p>
          )}
          {action.summary && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{action.summary}</p>}
          <p className="mt-3 text-xs font-semibold text-slate-500">
            {label(action.source)}
            {action.dueDate ? ` - ${formatDate(action.dueDate)}${action.due_time ? ` ${action.due_time}` : ""}` : ""}
          </p>
          {action.source_activity_title && (
            <p className="mt-1 truncate text-xs text-slate-500">← vanuit moment: {action.source_activity_title}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onComplete(action)}
          disabled={busy}
          aria-label={`Rond actie af: ${action.title}`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-online)]/25 bg-[var(--color-online)]/10 text-[var(--color-online)] transition-colors hover:bg-[var(--color-online)]/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={16} />}
        </button>
      </div>
    </div>
  );
}

export function OperationCard({
  icon: Icon,
  title,
  meta,
  body,
  tone,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  meta: string;
  body: string;
  tone: Tone;
  actions?: ReactNode;
}) {
  const toneClass = toneClasses[tone];
  return (
    <div className="glass min-w-0 p-4">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", toneClass.border, toneClass.surface)}>
          <Icon size={16} className={toneClass.icon} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{meta}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-white">{title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-400">{body}</p>
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
