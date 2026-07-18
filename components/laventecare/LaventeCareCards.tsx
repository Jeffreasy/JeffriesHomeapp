import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { IconButton } from "@/components/ui/IconButton";
import { MetricCard as UiMetricCard } from "@/components/ui/MetricCard";
import { Surface } from "@/components/ui/Surface";
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
  return (
    <UiMetricCard
      icon={Icon}
      label={metricLabel}
      value={value}
      description={detail}
      tone={tone}
      appearance="neutral"
    />
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return <FeedbackState compact title={title} description={body} className="border-dashed" />;
}

function signalMeta(source: BusinessSignal["source"]): { icon: LucideIcon; label: string; tone: Tone } {
  if (source === "email") return { icon: Mail, label: "Email", tone: "info" };
  if (source === "agenda") return { icon: CalendarClock, label: "Agenda", tone: "success" };
  return { icon: StickyNote, label: "Notitie", tone: "accent" };
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
    <Surface padding="none" className="p-4">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", tone.border, tone.surface)}>
          <Icon size={16} className={tone.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone} size="sm">
              {meta.label}
            </Badge>
            <Badge tone={signal.urgency === "hoog" ? "danger" : "neutral"} size="sm">
              {signal.urgency}
            </Badge>
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-[var(--color-text)]">{signal.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-muted)]">{signal.subtitle}</p>
          <p className="mt-3 text-xs font-semibold text-[var(--color-text-muted)]">
            {formatDate(signal.date)} - match: {signal.matchedTerm}
          </p>
          <p className="mt-2 text-sm leading-5 text-[var(--color-text-muted)]">{signal.actionHint}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={() => onCreateAction(signal)}
              disabled={disabled}
              variant="ghost" size="sm" className="flex-1"
            >
              {busyAction ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Plus size={14} />}
              Actie
            </Button>
            <Button
              type="button"
              onClick={() => onConvertToLead(signal)}
              disabled={disabled}
              variant="primary" size="sm" className="flex-1"
            >
              {busyLead ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <ArrowRight size={14} />}
              Lead
            </Button>
          </div>
        </div>
      </div>
    </Surface>
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
    <Surface padding="none" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">
            {followUpSourceLabels[followUp.source] ?? label(followUp.source)}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--color-text)]">{followUp.title}</h3>
        </div>
        <Badge tone={followUp.priority === "hoog" ? "danger" : "success"} className="shrink-0">
          {formatDate(followUp.date)}
        </Badge>
      </div>
      <p className="mt-3 text-xs font-semibold text-[var(--color-text-muted)]">{label(followUp.status)}</p>
      <p className="mt-2 text-sm leading-5 text-[var(--color-text-muted)]">{followUp.actionHint}</p>
    </Surface>
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
    <Surface padding="none" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral" size="sm">
              {label(action.actionType)}
            </Badge>
            <Badge tone={highPriority ? "danger" : "success"} size="sm">
              {label(action.priority)}
            </Badge>
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-[var(--color-text)]">{action.title}</h3>
          {(action.company_name || action.project_name || action.workstream_title || action.lead_title) && (
            <p className="mt-1 truncate text-xs font-semibold text-[var(--color-primary-hover)]">
              {[action.company_name, action.project_name ?? action.workstream_title ?? action.lead_title].filter(Boolean).join(" · ")}
            </p>
          )}
          {action.summary && <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--color-text-muted)]">{action.summary}</p>}
          <p className="mt-3 text-xs font-semibold text-[var(--color-text-muted)]">
            {label(action.source)}
            {action.dueDate ? ` - ${formatDate(action.dueDate)}${action.due_time ? ` ${action.due_time}` : ""}` : ""}
          </p>
          {action.source_activity_title && (
            <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">← vanuit moment: {action.source_activity_title}</p>
          )}
        </div>
        <IconButton
          onClick={() => onComplete(action)}
          disabled={busy}
          label={`Rond actie af: ${action.title}`}
          variant="success"
          loading={busy}
          icon={<CheckCircle2 size={16} />}
        />
      </div>
    </Surface>
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
    <Surface padding="none" className="p-4">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", toneClass.border, toneClass.surface)}>
          <Icon size={16} className={toneClass.icon} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">{meta}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--color-text)]">{title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-5 text-[var(--color-text-muted)]">{body}</p>
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </Surface>
  );
}
