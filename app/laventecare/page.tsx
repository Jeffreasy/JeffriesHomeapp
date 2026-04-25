"use client";

import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Flag,
  FolderKanban,
  GitPullRequest,
  Handshake,
  Layers3,
  LifeBuoy,
  Loader2,
  Plus,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Target,
  Mail,
  X,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type Tone = "amber" | "emerald" | "sky" | "rose" | "violet" | "slate";

type DocumentItem = {
  documentKey?: string;
  titel: string;
  categorie: string;
  fase?: string;
  versie?: string;
  sourcePath?: string;
  samenvatting: string;
  tags: string[];
};

type LeadItem = {
  _id?: string;
  titel: string;
  status: string;
  bron: string;
  fitScore?: number;
  pijnpunt?: string;
  prioriteit?: string;
  volgendeStap?: string;
  volgendeActieDatum?: string;
  gewijzigd?: string;
  aangemaakt?: string;
};

type ProjectItem = {
  _id?: string;
  naam: string;
  fase: string;
  status: string;
  waardeIndicatie?: number;
  deadline?: string;
  samenvatting?: string;
};

type BusinessSignal = {
  source: "email" | "agenda" | "notitie";
  id: string;
  title: string;
  subtitle: string;
  date: string;
  matchedTerm: string;
  urgency: "laag" | "normaal" | "hoog";
  actionHint: string;
};

type FollowUpSignal = {
  source: "lead" | "project";
  id: string;
  title: string;
  date: string;
  status: string;
  priority: "laag" | "normaal" | "hoog";
  actionHint: string;
};

type ActionItem = {
  _id: Id<"laventecareActionItems">;
  source: string;
  sourceId?: string;
  title: string;
  summary?: string;
  actionType: string;
  status: string;
  priority: string;
  dueDate?: string;
  linkedLeadId?: Id<"laventecareLeads">;
  linkedProjectId?: Id<"laventecareProjects">;
  updatedAt?: string;
};

type DecisionItem = {
  _id?: string;
  titel: string;
  besluit: string;
  reden: string;
  impact?: string;
  status: string;
  datum: string;
};

type ChangeRequestItem = {
  _id?: string;
  titel: string;
  impact: string;
  planningImpact?: string;
  budgetImpact?: string;
  status: string;
  gewijzigd?: string;
};

type SlaIncidentItem = {
  _id?: string;
  titel: string;
  prioriteit: string;
  status: string;
  kanaal: string;
  gemeldOp: string;
  reactieDeadline?: string;
  samenvatting?: string;
};

type LeadForm = {
  titel: string;
  companyName: string;
  website: string;
  pijnpunt: string;
  volgendeStap: string;
  prioriteit: string;
};

const emptyLeadForm: LeadForm = {
  titel: "",
  companyName: "",
  website: "",
  pijnpunt: "",
  volgendeStap: "",
  prioriteit: "normaal",
};

const toneClasses: Record<Tone, { border: string; surface: string; text: string; icon: string }> = {
  amber: {
    border: "border-amber-500/25",
    surface: "bg-amber-500/10",
    text: "text-amber-200",
    icon: "text-amber-300",
  },
  emerald: {
    border: "border-emerald-500/25",
    surface: "bg-emerald-500/10",
    text: "text-emerald-200",
    icon: "text-emerald-300",
  },
  sky: {
    border: "border-sky-500/25",
    surface: "bg-sky-500/10",
    text: "text-sky-200",
    icon: "text-sky-300",
  },
  rose: {
    border: "border-rose-500/25",
    surface: "bg-rose-500/10",
    text: "text-rose-200",
    icon: "text-rose-300",
  },
  violet: {
    border: "border-violet-500/25",
    surface: "bg-violet-500/10",
    text: "text-violet-200",
    icon: "text-violet-300",
  },
  slate: {
    border: "border-white/10",
    surface: "bg-white/[0.04]",
    text: "text-slate-200",
    icon: "text-slate-300",
  },
};

const optional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

function formatDate(value?: string) {
  if (!value) return "Geen datum";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function formatMoney(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Nog geen waarde";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function label(value?: string) {
  if (!value) return "Onbekend";
  return value.replace(/_/g, " ");
}

function fitTone(score?: number): Tone {
  if (typeof score !== "number") return "slate";
  if (score >= 75) return "emerald";
  if (score >= 55) return "amber";
  return "rose";
}

function MetricCard({
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
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
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

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.025] p-5 text-sm text-slate-400">
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

function SignalCard({
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
    <div className="rounded-lg border border-white/10 bg-[#0d1119] p-4">
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
              signal.urgency === "hoog" ? "border-rose-500/25 bg-rose-500/10 text-rose-200" : "border-white/10 bg-white/[0.04] text-slate-400",
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
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 text-xs font-bold text-slate-200 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyAction ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Actie
            </button>
            <button
              type="button"
              onClick={() => onConvertToLead(signal)}
              disabled={disabled}
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/15 px-3 text-xs font-bold text-sky-100 transition-colors hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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

function FollowUpCard({ followUp }: { followUp: FollowUpSignal }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1119] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{followUp.source}</p>
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

function ActionItemCard({
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
    <div className="rounded-lg border border-white/10 bg-[#0d1119] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs font-bold text-slate-300">
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
          {action.summary && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{action.summary}</p>}
          <p className="mt-3 text-xs font-semibold text-slate-500">
            {label(action.source)}{action.dueDate ? ` - ${formatDate(action.dueDate)}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onComplete(action)}
          disabled={busy}
          aria-label={`Rond actie af: ${action.title}`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-200 transition-colors hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={16} />}
        </button>
      </div>
    </div>
  );
}

function OperationCard({
  icon: Icon,
  title,
  meta,
  body,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  meta: string;
  body: string;
  tone: Tone;
}) {
  const toneClass = toneClasses[tone];
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1119] p-4">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", toneClass.border, toneClass.surface)}>
          <Icon size={16} className={toneClass.icon} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{meta}</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-white">{title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-400">{body}</p>
        </div>
      </div>
    </div>
  );
}

export default function LaventeCarePage() {
  const cockpit = useQuery(api.laventecare.getCockpit);
  const createLead = useMutation(api.laventecare.createLead);
  const createActionItem = useMutation(api.laventecare.createActionItem);
  const convertSignalToLead = useMutation(api.laventecare.convertSignalToLead);
  const updateActionItemStatus = useMutation(api.laventecare.updateActionItemStatus);
  const seedDocuments = useMutation(api.laventecare.seedDocuments);
  const { success, error: toastError } = useToast();
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadForm, setLeadForm] = useState<LeadForm>(emptyLeadForm);
  const [savingLead, setSavingLead] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [processingSignal, setProcessingSignal] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<Id<"laventecareActionItems"> | null>(null);
  const [search, setSearch] = useState("");

  const documents = useMemo(() => (cockpit?.documentCatalog ?? []) as DocumentItem[], [cockpit]);
  const activeLeads = useMemo(() => (cockpit?.activeLeads ?? []) as LeadItem[], [cockpit]);
  const activeProjects = useMemo(() => (cockpit?.activeProjects ?? []) as ProjectItem[], [cockpit]);
  const businessSignals = useMemo(() => (cockpit?.businessSignals ?? []) as BusinessSignal[], [cockpit]);
  const actionItems = useMemo(() => (cockpit?.actionItems ?? []) as ActionItem[], [cockpit]);
  const followUps = useMemo(() => (cockpit?.followUps ?? []) as FollowUpSignal[], [cockpit]);
  const openIncidents = useMemo(() => (cockpit?.openIncidents ?? []) as SlaIncidentItem[], [cockpit]);
  const openChanges = useMemo(() => (cockpit?.openChanges ?? []) as ChangeRequestItem[], [cockpit]);
  const recentDecisions = useMemo(() => (cockpit?.recentDecisions ?? []) as DecisionItem[], [cockpit]);

  const filteredDocuments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter((doc) =>
      [doc.titel, doc.categorie, doc.fase, doc.samenvatting, ...(doc.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [documents, search]);

  const documentGroups = useMemo(() => {
    const groups = new Map<string, DocumentItem[]>();
    for (const doc of filteredDocuments) {
      const key = doc.categorie || "overig";
      groups.set(key, [...(groups.get(key) ?? []), doc]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredDocuments]);

  const handleLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leadForm.titel.trim()) {
      toastError("Geef de lead een titel");
      return;
    }

    setSavingLead(true);
    try {
      await createLead({
        titel: leadForm.titel.trim(),
        companyName: optional(leadForm.companyName),
        website: optional(leadForm.website),
        pijnpunt: optional(leadForm.pijnpunt),
        volgendeStap: optional(leadForm.volgendeStap),
        prioriteit: leadForm.prioriteit,
        bron: "cockpit",
      });
      setLeadForm(emptyLeadForm);
      setShowLeadForm(false);
      success("LaventeCare lead aangemaakt");
    } catch {
      toastError("Lead aanmaken is mislukt");
    } finally {
      setSavingLead(false);
    }
  };

  const handleSeedDocuments = async () => {
    setSeeding(true);
    try {
      const result = await seedDocuments({});
      success(`${result.total} documenten klaargezet`);
    } catch {
      toastError("Documentbasis initialiseren is mislukt");
    } finally {
      setSeeding(false);
    }
  };

  const signalKey = (kind: "action" | "lead", signal: BusinessSignal) => `${kind}:${signal.source}:${signal.id}`;

  const handleCreateActionFromSignal = async (signal: BusinessSignal) => {
    setProcessingSignal(signalKey("action", signal));
    try {
      await createActionItem({
        source:     signal.source,
        sourceId:   signal.id,
        title:      signal.title,
        summary:    [signal.subtitle, signal.actionHint, `Match: ${signal.matchedTerm}`].filter(Boolean).join("\n\n"),
        actionType: "opvolgen",
        priority:   signal.urgency === "hoog" ? "hoog" : "normaal",
        dueDate:    signal.date,
      });
      success("LaventeCare actie klaargezet");
    } catch {
      toastError("Actie aanmaken is mislukt");
    } finally {
      setProcessingSignal(null);
    }
  };

  const handleConvertSignalToLead = async (signal: BusinessSignal) => {
    setProcessingSignal(signalKey("lead", signal));
    try {
      const result = await convertSignalToLead({
        source:      signal.source,
        sourceId:    signal.id,
        title:       signal.title,
        subtitle:    signal.subtitle,
        date:        signal.date,
        matchedTerm: signal.matchedTerm,
        urgency:     signal.urgency,
        actionHint:  signal.actionHint,
      });
      success(result.reused ? "Bestaande lead opnieuw gekoppeld" : "Signaal omgezet naar lead");
    } catch {
      toastError("Lead maken vanuit signaal is mislukt");
    } finally {
      setProcessingSignal(null);
    }
  };

  const handleCompleteAction = async (action: ActionItem) => {
    setProcessingAction(action._id);
    try {
      await updateActionItemStatus({ id: action._id, status: "afgerond" });
      success("LaventeCare actie afgerond");
    } catch {
      toastError("Actie afronden is mislukt");
    } finally {
      setProcessingAction(null);
    }
  };

  if (cockpit === undefined) {
    return (
      <div className="min-h-screen bg-[#080a0f] px-4 py-10 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="h-40 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!cockpit) {
    return (
      <div className="min-h-screen bg-[#080a0f] px-4 py-10 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <p className="text-lg font-semibold text-white">Log in om LaventeCare te openen</p>
          <p className="mt-2 text-sm text-slate-400">De bedrijfscockpit gebruikt je persoonlijke Convex-context.</p>
        </div>
      </div>
    );
  }

  const { summary } = cockpit;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080a0f] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080a0f]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10">
              <BriefcaseBusiness size={21} className="text-sky-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Bedrijfsbrein</p>
              <h1 className="mt-0.5 truncate text-2xl font-bold text-white">LaventeCare Cockpit</h1>
              <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{cockpit.profile.rol}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleSeedDocuments}
              disabled={seeding}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {seeding ? <Loader2 size={16} className="animate-spin" /> : <BookOpenText size={16} />}
              <span>{summary.documentsSeeded ? "Documentbasis bijwerken" : "Documentbasis initialiseren"}</span>
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowLeadForm((value) => !value)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/15 px-3 text-sm font-semibold text-sky-100 transition-colors hover:bg-sky-500/20"
            >
              {showLeadForm ? <X size={16} /> : <Plus size={16} />}
              <span>Nieuwe lead</span>
            </motion.button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 pb-28 sm:px-6">
        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                <Sparkles size={14} />
                Geintegreerde businesslaag actief
              </div>
              <h2 className="mt-4 max-w-3xl text-2xl font-bold text-white sm:text-3xl">
                Van bedrijfsdocumentatie naar een werkbaar LaventeCare-systeem.
              </h2>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
                {cockpit.profile.kernbelofte}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0d1119] p-4">
              <p className="text-sm font-semibold text-white">Integratieprincipe</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Leads, projecten, documenten, decisions, change requests en SLA-signalen staan nu als eigen domein klaar voor Brain, Telegram, Agenda, Email, Notities en Finance.
              </p>
            </div>
          </div>
        </section>

        {showLeadForm && (
          <motion.section
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-lg border border-sky-500/20 bg-sky-500/[0.06] p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <Target size={18} className="text-sky-300" />
              <h2 className="text-lg font-bold text-white">Nieuwe lead kwalificeren</h2>
            </div>
            <form onSubmit={handleLeadSubmit} className="grid gap-3 lg:grid-cols-6">
              <label className="lg:col-span-2">
                <span className="text-xs font-semibold text-slate-400">Titel</span>
                <input
                  value={leadForm.titel}
                  onChange={(event) => setLeadForm((form) => ({ ...form, titel: event.target.value }))}
                  placeholder="Bijv. automatisering klantintake"
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#0b0f16] px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-400/50"
                />
              </label>
              <label className="lg:col-span-2">
                <span className="text-xs font-semibold text-slate-400">Bedrijf</span>
                <input
                  value={leadForm.companyName}
                  onChange={(event) => setLeadForm((form) => ({ ...form, companyName: event.target.value }))}
                  placeholder="Bedrijfsnaam"
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#0b0f16] px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-400/50"
                />
              </label>
              <label className="lg:col-span-2">
                <span className="text-xs font-semibold text-slate-400">Website</span>
                <input
                  value={leadForm.website}
                  onChange={(event) => setLeadForm((form) => ({ ...form, website: event.target.value }))}
                  placeholder="https://..."
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#0b0f16] px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-400/50"
                />
              </label>
              <label className="lg:col-span-3">
                <span className="text-xs font-semibold text-slate-400">Pijnpunt</span>
                <textarea
                  value={leadForm.pijnpunt}
                  onChange={(event) => setLeadForm((form) => ({ ...form, pijnpunt: event.target.value }))}
                  placeholder="Welke workflow, foutkans of groeirem speelt er?"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b0f16] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-400/50"
                />
              </label>
              <label className="lg:col-span-2">
                <span className="text-xs font-semibold text-slate-400">Volgende stap</span>
                <textarea
                  value={leadForm.volgendeStap}
                  onChange={(event) => setLeadForm((form) => ({ ...form, volgendeStap: event.target.value }))}
                  placeholder="Bijv. discovery-call plannen"
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b0f16] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-400/50"
                />
              </label>
              <div>
                <label>
                  <span className="text-xs font-semibold text-slate-400">Prioriteit</span>
                  <select
                    value={leadForm.prioriteit}
                    onChange={(event) => setLeadForm((form) => ({ ...form, prioriteit: event.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#0b0f16] px-3 text-sm text-white outline-none transition-colors focus:border-sky-400/50"
                  >
                    <option value="laag">Laag</option>
                    <option value="normaal">Normaal</option>
                    <option value="hoog">Hoog</option>
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={savingLead}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/20 px-3 text-sm font-semibold text-sky-100 transition-colors hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingLead ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Opslaan
                </button>
              </div>
            </form>
          </motion.section>
        )}

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={Handshake} label="Open leads" value={summary.activeLeads} detail={`${summary.leads} totaal in de funnel`} tone="sky" />
          <MetricCard icon={FolderKanban} label="Actieve projecten" value={summary.activeProjects} detail={`${summary.projects} projecten geregistreerd`} tone="emerald" />
          <MetricCard icon={Sparkles} label="Signalen" value={summary.businessSignals} detail={`${summary.actionItems ?? 0} acties open, ${summary.followUps} follow-ups`} tone="violet" />
          <MetricCard icon={FileText} label="Documentbasis" value={`${summary.documents || summary.knowledgeDocuments}/24`} detail={summary.documentsSeeded ? "Geindexeerd in Convex" : "Catalogus klaar om te initialiseren"} tone="amber" />
          <MetricCard icon={LifeBuoy} label="SLA signalen" value={summary.openIncidents} detail={`${summary.openChanges} open change requests`} tone={summary.openIncidents > 0 ? "rose" : "violet"} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Live koppelingen</p>
                <h2 className="mt-1 text-lg font-bold text-white">Zakelijke signalen</h2>
              </div>
              <Sparkles size={20} className="text-violet-300" />
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {businessSignals.length === 0 ? (
                <div className="lg:col-span-2">
                  <EmptyState title="Nog geen zakelijke signalen" body="Emails, agenda-afspraken en notities met LaventeCare-termen of lead/projectnamen verschijnen hier automatisch." />
                </div>
              ) : (
                businessSignals.slice(0, 6).map((signal) => (
                  <SignalCard
                    key={`${signal.source}-${signal.id}`}
                    signal={signal}
                    busyAction={processingSignal === signalKey("action", signal)}
                    busyLead={processingSignal === signalKey("lead", signal)}
                    onCreateAction={handleCreateActionFromSignal}
                    onConvertToLead={handleConvertSignalToLead}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center gap-2">
              <Clock3 size={18} className="text-amber-300" />
              <h2 className="text-lg font-bold text-white">Acties</h2>
            </div>
            <div className="mt-4 space-y-3">
              {actionItems.length === 0 ? (
                <EmptyState title="Geen open acties" body="Maak vanuit zakelijke signalen een actie, dan neemt Brain dit mee in Telegram." />
              ) : (
                actionItems.slice(0, 5).map((action) => (
                  <ActionItemCard
                    key={action._id}
                    action={action}
                    busy={processingAction === action._id}
                    onComplete={handleCompleteAction}
                  />
                ))
              )}
            </div>
            {followUps.length > 0 && (
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Follow-ups uit funnel</p>
                <div className="mt-3 space-y-3">
                  {followUps.slice(0, 3).map((followUp) => (
                    <FollowUpCard key={`${followUp.source}-${followUp.id}`} followUp={followUp} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Proces</p>
                <h2 className="mt-1 text-lg font-bold text-white">Van intake naar doorontwikkeling</h2>
              </div>
              <Layers3 size={20} className="text-slate-400" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {cockpit.processStages.map((stage, index) => (
                <div key={stage.key} className="rounded-lg border border-white/10 bg-[#0d1119] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm font-bold text-slate-200">
                      {index + 1}
                    </span>
                    <h3 className="font-semibold text-white">{stage.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{stage.summary}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-500">{stage.output}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-300" />
              <h2 className="text-lg font-bold text-white">Fit guardrails</h2>
            </div>
            <div className="mt-4 space-y-3">
              {cockpit.fitCriteria.slice(0, 5).map((item) => (
                <div key={item} className="flex gap-3 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] p-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                  <p className="text-sm leading-5 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-rose-500/15 bg-rose-500/[0.06] p-4">
              <p className="text-sm font-semibold text-rose-100">No-fit signalen</p>
              <ul className="mt-3 space-y-2">
                {cockpit.noFitSignals.slice(0, 3).map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-5 text-slate-400">
                    <Flag size={14} className="mt-0.5 shrink-0 text-rose-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Funnel</p>
                <h2 className="mt-1 text-lg font-bold text-white">Actieve leads</h2>
              </div>
              <Handshake size={20} className="text-sky-300" />
            </div>
            <div className="mt-4 space-y-3">
              {activeLeads.length === 0 ? (
                <EmptyState title="Nog geen leads" body="Voeg je eerste lead toe om intake, fit-score en opvolging centraal te krijgen." />
              ) : (
                activeLeads.map((lead) => {
                  const tone = toneClasses[fitTone(lead.fitScore)];
                  return (
                    <div key={lead._id ?? lead.titel} className="rounded-lg border border-white/10 bg-[#0d1119] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-white">{lead.titel}</h3>
                          <p className="mt-1 text-xs text-slate-500">{label(lead.status)} - {lead.bron}</p>
                        </div>
                        <span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", tone.border, tone.surface, tone.text)}>
                          {lead.fitScore ?? 0}% fit
                        </span>
                      </div>
                      {lead.pijnpunt && <p className="mt-3 text-sm leading-6 text-slate-400">{lead.pijnpunt}</p>}
                      {lead.volgendeStap && (
                        <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-sky-200">
                          <ArrowRight size={15} />
                          {lead.volgendeStap}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Delivery</p>
                <h2 className="mt-1 text-lg font-bold text-white">Actieve projecten</h2>
              </div>
              <FolderKanban size={20} className="text-emerald-300" />
            </div>
            <div className="mt-4 space-y-3">
              {activeProjects.length === 0 ? (
                <EmptyState title="Nog geen projecten" body="Zodra leads doorgaan naar delivery ontstaat hier de projectlaag met fase, status, waarde en deadlines." />
              ) : (
                activeProjects.map((project) => (
                  <div key={project._id ?? project.naam} className="rounded-lg border border-white/10 bg-[#0d1119] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white">{project.naam}</h3>
                        <p className="mt-1 text-xs text-slate-500">{label(project.fase)} - {label(project.status)}</p>
                      </div>
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-200">
                        {formatMoney(project.waardeIndicatie)}
                      </span>
                    </div>
                    {project.samenvatting && <p className="mt-3 text-sm leading-6 text-slate-400">{project.samenvatting}</p>}
                    {project.deadline && <p className="mt-3 text-xs font-semibold text-slate-500">Deadline: {formatDate(project.deadline)}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Operatie</p>
              <h2 className="mt-1 text-lg font-bold text-white">Besluiten, wijzigingen en SLA</h2>
            </div>
            <ClipboardList size={20} className="text-slate-400" />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <ScrollText size={16} className="text-sky-300" />
                <h3 className="text-sm font-bold text-slate-200">Decision log</h3>
              </div>
              <div className="space-y-3">
                {recentDecisions.length === 0 ? (
                  <EmptyState title="Geen besluiten" body="Besluiten die je via Telegram vastlegt verschijnen hier als audit trail." />
                ) : (
                  recentDecisions.slice(0, 3).map((decision) => (
                    <OperationCard
                      key={decision._id ?? `${decision.titel}-${decision.datum}`}
                      icon={ScrollText}
                      title={decision.titel}
                      meta={`${formatDate(decision.datum)} - ${label(decision.status)}`}
                      body={decision.besluit}
                      tone="sky"
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <GitPullRequest size={16} className="text-amber-300" />
                <h3 className="text-sm font-bold text-slate-200">Change requests</h3>
              </div>
              <div className="space-y-3">
                {openChanges.length === 0 ? (
                  <EmptyState title="Geen open changes" body="Scope-, planning- of budgetwijzigingen blijven hier zichtbaar tot ze zijn afgehandeld." />
                ) : (
                  openChanges.slice(0, 3).map((change) => (
                    <OperationCard
                      key={change._id ?? change.titel}
                      icon={GitPullRequest}
                      title={change.titel}
                      meta={label(change.status)}
                      body={change.impact}
                      tone="amber"
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-300" />
                <h3 className="text-sm font-bold text-slate-200">SLA incidenten</h3>
              </div>
              <div className="space-y-3">
                {openIncidents.length === 0 ? (
                  <EmptyState title="Geen open incidenten" body="Support- of beheerissues die je vastlegt komen hier met prioriteit en kanaal terug." />
                ) : (
                  openIncidents.slice(0, 3).map((incident) => (
                    <OperationCard
                      key={incident._id ?? incident.titel}
                      icon={AlertTriangle}
                      title={incident.titel}
                      meta={`${incident.prioriteit} - ${label(incident.status)} - ${label(incident.kanaal)}`}
                      body={incident.samenvatting ?? `Gemeld op ${formatDate(incident.gemeldOp)}`}
                      tone={incident.prioriteit === "P1" || incident.prioriteit === "P2" ? "rose" : "violet"}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Kennisbasis</p>
                <h2 className="mt-1 text-lg font-bold text-white">Bedrijfsdocumentatie</h2>
              </div>
              <label className="relative block w-full sm:w-72">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Zoek documentatie"
                  className="h-10 w-full rounded-lg border border-white/10 bg-[#0b0f16] pl-9 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-sky-400/50"
                />
              </label>
            </div>

            <div className="mt-4 space-y-4">
              {documentGroups.map(([category, docs]) => (
                <div key={category}>
                  <div className="mb-2 flex items-center gap-2">
                    <ClipboardList size={15} className="text-slate-400" />
                    <h3 className="text-sm font-bold capitalize text-slate-200">{category}</h3>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-slate-500">
                      {docs.length}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {docs.map((doc) => (
                      <div key={doc.documentKey ?? doc.titel} className="rounded-lg border border-white/10 bg-[#0d1119] p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                            <FileText size={16} className="text-amber-300" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="line-clamp-2 text-sm font-semibold text-white">{doc.titel}</h4>
                            <p className="mt-1 text-xs text-slate-500">{label(doc.fase)} - {doc.versie ?? "2026-04"}</p>
                          </div>
                        </div>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{doc.samenvatting}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-center gap-2">
                <BookOpenText size={18} className="text-amber-300" />
                <h2 className="text-lg font-bold text-white">Juridische stapel</h2>
              </div>
              <div className="mt-4 space-y-2">
                {cockpit.legalStack.map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0d1119] px-3 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-xs font-bold text-slate-400">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
              <div className="flex items-center gap-2">
                <Layers3 size={18} className="text-violet-300" />
                <h2 className="text-lg font-bold text-white">Prijsankers</h2>
              </div>
              <div className="mt-4 space-y-3">
                {cockpit.pricing.map((price) => (
                  <div key={price.key} className="rounded-lg border border-white/10 bg-[#0d1119] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{price.title}</p>
                      <p className="shrink-0 text-right text-xs font-bold text-violet-200">{price.price}</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{price.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
