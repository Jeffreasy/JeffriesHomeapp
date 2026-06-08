"use client";

import { FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  GitPullRequest,
  Loader2,
  Plus,
  RotateCcw,
  ScrollText,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, label } from "./LaventeCareUtils";
import { EmptyState, OperationCard } from "./LaventeCareCards";
import type { ChangeRequestItem, DecisionItem, ProjectItem, SlaIncidentItem } from "./LaventeCareTypes";

type OperationMode = "decision" | "change" | "incident";

type DecisionPayload = {
  project_id?: string;
  titel: string;
  besluit: string;
  reden?: string;
  impact?: string;
  status?: string;
  datum?: string;
};

type ChangePayload = {
  project_id?: string;
  titel: string;
  impact: string;
  planning_impact?: string;
  budget_impact?: string;
  status?: string;
};

type IncidentPayload = {
  project_id?: string;
  titel: string;
  prioriteit?: string;
  status?: string;
  kanaal?: string;
  reactie_deadline?: string;
  samenvatting?: string;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10";

const textareaClass = `${inputClass} min-h-24 resize-none`;

export function LaventeCareOperationsView({
  recentDecisions,
  openChanges,
  openIncidents,
  activeProjects,
  creatingDecision,
  creatingChange,
  creatingIncident,
  processingOperation,
  onCreateDecision,
  onCreateChangeRequest,
  onCreateSlaIncident,
  onUpdateDecisionStatus,
  onUpdateChangeStatus,
  onUpdateIncidentStatus,
}: {
  recentDecisions: DecisionItem[];
  openChanges: ChangeRequestItem[];
  openIncidents: SlaIncidentItem[];
  activeProjects: ProjectItem[];
  creatingDecision: boolean;
  creatingChange: boolean;
  creatingIncident: boolean;
  processingOperation: string | null;
  onCreateDecision: (payload: DecisionPayload) => Promise<void>;
  onCreateChangeRequest: (payload: ChangePayload) => Promise<void>;
  onCreateSlaIncident: (payload: IncidentPayload) => Promise<void>;
  onUpdateDecisionStatus: (id: string, status: string) => Promise<void>;
  onUpdateChangeStatus: (id: string, status: string) => Promise<void>;
  onUpdateIncidentStatus: (id: string, status: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<OperationMode>("decision");
  const [decisionForm, setDecisionForm] = useState({
    projectId: "",
    titel: "",
    besluit: "",
    reden: "",
    impact: "",
    status: "genomen",
    datum: "",
  });
  const [changeForm, setChangeForm] = useState({
    projectId: "",
    titel: "",
    impact: "",
    planningImpact: "",
    budgetImpact: "",
    status: "nieuw",
  });
  const [incidentForm, setIncidentForm] = useState({
    projectId: "",
    titel: "",
    prioriteit: "P3",
    status: "open",
    kanaal: "manual",
    reactieDeadline: "",
    samenvatting: "",
  });

  const busy = creatingDecision || creatingChange || creatingIncident;
  const projectOptions = useMemo(
    () =>
      activeProjects.map((project) => ({
        id: project.id,
        label: project.naam,
      })),
    [activeProjects]
  );

  const handleDecisionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!decisionForm.titel.trim() || !decisionForm.besluit.trim()) return;
    await onCreateDecision({
      project_id: emptyToUndefined(decisionForm.projectId),
      titel: decisionForm.titel.trim(),
      besluit: decisionForm.besluit.trim(),
      reden: emptyToUndefined(decisionForm.reden) ?? "Niet gespecificeerd",
      impact: emptyToUndefined(decisionForm.impact),
      status: decisionForm.status,
      datum: emptyToUndefined(decisionForm.datum),
    });
    setDecisionForm({ projectId: "", titel: "", besluit: "", reden: "", impact: "", status: "genomen", datum: "" });
  };

  const handleChangeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!changeForm.titel.trim() || !changeForm.impact.trim()) return;
    await onCreateChangeRequest({
      project_id: emptyToUndefined(changeForm.projectId),
      titel: changeForm.titel.trim(),
      impact: changeForm.impact.trim(),
      planning_impact: emptyToUndefined(changeForm.planningImpact),
      budget_impact: emptyToUndefined(changeForm.budgetImpact),
      status: changeForm.status,
    });
    setChangeForm({ projectId: "", titel: "", impact: "", planningImpact: "", budgetImpact: "", status: "nieuw" });
  };

  const handleIncidentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!incidentForm.titel.trim()) return;
    await onCreateSlaIncident({
      project_id: emptyToUndefined(incidentForm.projectId),
      titel: incidentForm.titel.trim(),
      prioriteit: incidentForm.prioriteit,
      status: incidentForm.status,
      kanaal: incidentForm.kanaal,
      reactie_deadline: emptyToUndefined(incidentForm.reactieDeadline),
      samenvatting: emptyToUndefined(incidentForm.samenvatting),
    });
    setIncidentForm({
      projectId: "",
      titel: "",
      prioriteit: "P3",
      status: "open",
      kanaal: "manual",
      reactieDeadline: "",
      samenvatting: "",
    });
  };

  return (
    <section className="space-y-4">
      <div className="glass min-w-0 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Operatie</p>
            <h2 className="mt-1 text-lg font-bold text-white">Governance registreren</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Leg besluiten, scopewijzigingen en supportincidenten direct vast, zodat LaventeCare niet afhankelijk blijft van losse notities of chatgeschiedenis.
            </p>
          </div>
          <ClipboardList size={20} className="hidden text-slate-400 lg:block" />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <ModeButton mode="decision" activeMode={mode} icon={ScrollText} label="Besluit" onClick={setMode} />
          <ModeButton mode="change" activeMode={mode} icon={GitPullRequest} label="Change" onClick={setMode} />
          <ModeButton mode="incident" activeMode={mode} icon={AlertTriangle} label="Incident" onClick={setMode} />
        </div>

        {mode === "decision" ? (
          <form onSubmit={handleDecisionSubmit} className="mt-4 grid gap-3 lg:grid-cols-2">
            <ProjectSelect value={decisionForm.projectId} projects={projectOptions} onChange={(value) => setDecisionForm((form) => ({ ...form, projectId: value }))} />
            <input
              className={inputClass}
              value={decisionForm.titel}
              onChange={(event) => setDecisionForm((form) => ({ ...form, titel: event.target.value }))}
              placeholder="Besluit titel"
            />
            <textarea
              className={textareaClass}
              value={decisionForm.besluit}
              onChange={(event) => setDecisionForm((form) => ({ ...form, besluit: event.target.value }))}
              placeholder="Wat is besloten?"
            />
            <textarea
              className={textareaClass}
              value={decisionForm.reden}
              onChange={(event) => setDecisionForm((form) => ({ ...form, reden: event.target.value }))}
              placeholder="Waarom?"
            />
            <input
              className={inputClass}
              value={decisionForm.impact}
              onChange={(event) => setDecisionForm((form) => ({ ...form, impact: event.target.value }))}
              placeholder="Impact op klant, planning of scope"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className={inputClass}
                type="date"
                value={decisionForm.datum}
                onChange={(event) => setDecisionForm((form) => ({ ...form, datum: event.target.value }))}
              />
              <select
                className={inputClass}
                value={decisionForm.status}
                onChange={(event) => setDecisionForm((form) => ({ ...form, status: event.target.value }))}
              >
                <option value="genomen">Genomen</option>
                <option value="voorstel">Voorstel</option>
                <option value="herzien">Herzien</option>
              </select>
            </div>
            <SubmitButton busy={creatingDecision} disabled={busy || !decisionForm.titel.trim() || !decisionForm.besluit.trim()} label="Besluit vastleggen" />
          </form>
        ) : null}

        {mode === "change" ? (
          <form onSubmit={handleChangeSubmit} className="mt-4 grid gap-3 lg:grid-cols-2">
            <ProjectSelect value={changeForm.projectId} projects={projectOptions} onChange={(value) => setChangeForm((form) => ({ ...form, projectId: value }))} />
            <input
              className={inputClass}
              value={changeForm.titel}
              onChange={(event) => setChangeForm((form) => ({ ...form, titel: event.target.value }))}
              placeholder="Change titel"
            />
            <textarea
              className={textareaClass}
              value={changeForm.impact}
              onChange={(event) => setChangeForm((form) => ({ ...form, impact: event.target.value }))}
              placeholder="Scope, risico of klantimpact"
            />
            <textarea
              className={textareaClass}
              value={changeForm.planningImpact}
              onChange={(event) => setChangeForm((form) => ({ ...form, planningImpact: event.target.value }))}
              placeholder="Planning impact"
            />
            <input
              className={inputClass}
              value={changeForm.budgetImpact}
              onChange={(event) => setChangeForm((form) => ({ ...form, budgetImpact: event.target.value }))}
              placeholder="Budget impact"
            />
            <select
              className={inputClass}
              value={changeForm.status}
              onChange={(event) => setChangeForm((form) => ({ ...form, status: event.target.value }))}
            >
              <option value="nieuw">Nieuw</option>
              <option value="beoordeeld">Beoordeeld</option>
              <option value="goedgekeurd">Goedgekeurd</option>
              <option value="afgewezen">Afgewezen</option>
            </select>
            <SubmitButton busy={creatingChange} disabled={busy || !changeForm.titel.trim() || !changeForm.impact.trim()} label="Change registreren" />
          </form>
        ) : null}

        {mode === "incident" ? (
          <form onSubmit={handleIncidentSubmit} className="mt-4 grid gap-3 lg:grid-cols-2">
            <ProjectSelect value={incidentForm.projectId} projects={projectOptions} onChange={(value) => setIncidentForm((form) => ({ ...form, projectId: value }))} />
            <input
              className={inputClass}
              value={incidentForm.titel}
              onChange={(event) => setIncidentForm((form) => ({ ...form, titel: event.target.value }))}
              placeholder="Incident titel"
            />
            <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2">
              <select
                className={inputClass}
                value={incidentForm.prioriteit}
                onChange={(event) => setIncidentForm((form) => ({ ...form, prioriteit: event.target.value }))}
              >
                <option value="P1">P1 kritiek</option>
                <option value="P2">P2 hoog</option>
                <option value="P3">P3 normaal</option>
                <option value="P4">P4 laag</option>
              </select>
              <select
                className={inputClass}
                value={incidentForm.status}
                onChange={(event) => setIncidentForm((form) => ({ ...form, status: event.target.value }))}
              >
                <option value="open">Open</option>
                <option value="in_behandeling">In behandeling</option>
                <option value="wacht_op_klant">Wacht op klant</option>
                <option value="gesloten">Gesloten</option>
              </select>
              <select
                className={inputClass}
                value={incidentForm.kanaal}
                onChange={(event) => setIncidentForm((form) => ({ ...form, kanaal: event.target.value }))}
              >
                <option value="manual">Handmatig</option>
                <option value="email">Email</option>
                <option value="telefoon">Telefoon</option>
                <option value="telegram">Telegram</option>
                <option value="klant">Klant</option>
              </select>
            </div>
            <input
              className={inputClass}
              type="datetime-local"
              value={incidentForm.reactieDeadline}
              onChange={(event) => setIncidentForm((form) => ({ ...form, reactieDeadline: event.target.value }))}
            />
            <textarea
              className={textareaClass}
              value={incidentForm.samenvatting}
              onChange={(event) => setIncidentForm((form) => ({ ...form, samenvatting: event.target.value }))}
              placeholder="Samenvatting, impact en eerste actie"
            />
            <SubmitButton busy={creatingIncident} disabled={busy || !incidentForm.titel.trim()} label="Incident registreren" />
          </form>
        ) : null}
      </div>

      <div className="glass min-w-0 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Audit trail</p>
            <h2 className="mt-1 text-lg font-bold text-white">Besluiten, wijzigingen en SLA</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-sky-200">{recentDecisions.length} besluiten</span>
            <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-200">{openChanges.length} changes</span>
            <span className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-rose-200">{openIncidents.length} incidenten</span>
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <OperationColumn
            icon={ScrollText}
            tone="sky"
            title="Decision log"
            emptyTitle="Geen besluiten"
            emptyBody="Leg keuzes vast zodra scope, aanpak, prijs of planning verandert."
          >
            {recentDecisions.slice(0, 4).map((decision) => (
              <OperationCard
                key={decision._id ?? `${decision.titel}-${decision.datum}`}
                icon={ScrollText}
                title={decision.titel}
                meta={`${formatDate(decision.datum)} - ${label(decision.status)}`}
                body={decision.besluit}
                tone="sky"
                actions={
                  <StatusActions
                    itemId={decision._id ?? decision.id}
                    itemType="decision"
                    currentStatus={decision.status}
                    processingOperation={processingOperation}
                    actions={[
                      { status: "genomen", label: "Genomen", icon: CheckCircle2 },
                      { status: "herzien", label: "Herzien", icon: RotateCcw },
                    ]}
                    onUpdate={onUpdateDecisionStatus}
                  />
                }
              />
            ))}
          </OperationColumn>

          <OperationColumn
            icon={GitPullRequest}
            tone="amber"
            title="Change requests"
            emptyTitle="Geen open changes"
            emptyBody="Scope-, planning- of budgetwijzigingen blijven hier zichtbaar tot ze zijn afgehandeld."
          >
            {openChanges.slice(0, 4).map((change) => (
              <OperationCard
                key={change._id ?? change.titel}
                icon={GitPullRequest}
                title={change.titel}
                meta={label(change.status)}
                body={change.impact}
                tone="amber"
                actions={
                  <StatusActions
                    itemId={change._id ?? change.id}
                    itemType="change"
                    currentStatus={change.status}
                    processingOperation={processingOperation}
                    actions={[
                      { status: "beoordeeld", label: "Beoordeeld", icon: ClipboardList },
                      { status: "goedgekeurd", label: "Goedkeuren", icon: CheckCircle2 },
                      { status: "afgehandeld", label: "Afhandelen", icon: CheckCircle2 },
                      { status: "afgewezen", label: "Afwijzen", icon: XCircle },
                    ]}
                    onUpdate={onUpdateChangeStatus}
                  />
                }
              />
            ))}
          </OperationColumn>

          <OperationColumn
            icon={AlertTriangle}
            tone="rose"
            title="SLA incidenten"
            emptyTitle="Geen open incidenten"
            emptyBody="Support- of beheerissues die je vastlegt komen hier met prioriteit en kanaal terug."
          >
            {openIncidents.slice(0, 4).map((incident) => (
              <OperationCard
                key={incident._id ?? incident.titel}
                icon={AlertTriangle}
                title={incident.titel}
                meta={`${incident.prioriteit} - ${label(incident.status)} - ${label(incident.kanaal)}`}
                body={incident.samenvatting ?? `Gemeld op ${formatDate(incident.gemeldOp)}`}
                tone={incident.prioriteit === "P1" || incident.prioriteit === "P2" ? "rose" : "violet"}
                actions={
                  <StatusActions
                    itemId={incident._id ?? incident.id}
                    itemType="incident"
                    currentStatus={incident.status}
                    processingOperation={processingOperation}
                    actions={[
                      { status: "in_behandeling", label: "Behandel", icon: ClipboardList },
                      { status: "wacht_op_klant", label: "Wacht klant", icon: RotateCcw },
                      { status: "gesloten", label: "Sluiten", icon: CheckCircle2 },
                    ]}
                    onUpdate={onUpdateIncidentStatus}
                  />
                }
              />
            ))}
          </OperationColumn>
        </div>
      </div>
    </section>
  );
}

function ModeButton({
  mode,
  activeMode,
  icon: Icon,
  label,
  onClick,
}: {
  mode: OperationMode;
  activeMode: OperationMode;
  icon: LucideIcon;
  label: string;
  onClick: (mode: OperationMode) => void;
}) {
  const active = mode === activeMode;
  return (
    <button
      type="button"
      onClick={() => onClick(mode)}
      className={cn(
        "flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition",
        active ? "border-amber-500/30 bg-amber-500/12 text-amber-100" : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white"
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function StatusActions({
  itemId,
  itemType,
  currentStatus,
  processingOperation,
  actions,
  onUpdate,
}: {
  itemId?: string;
  itemType: "decision" | "change" | "incident";
  currentStatus: string;
  processingOperation: string | null;
  actions: Array<{ status: string; label: string; icon: LucideIcon }>;
  onUpdate: (id: string, status: string) => Promise<void>;
}) {
  if (!itemId) return null;
  const visibleActions = actions.filter((action) => action.status !== currentStatus);
  if (visibleActions.length === 0) return null;
  return (
    <>
      {visibleActions.map((action) => {
        const Icon = action.icon;
        const key = `${itemType}:${itemId}:${action.status}`;
        const busy = processingOperation === key;
        return (
          <button
            key={action.status}
            type="button"
            onClick={() => onUpdate(itemId, action.status)}
            disabled={Boolean(processingOperation)}
            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-[11px] font-bold text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
            {action.label}
          </button>
        );
      })}
    </>
  );
}

function ProjectSelect({
  value,
  projects,
  onChange,
}: {
  value: string;
  projects: Array<{ id: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Geen project gekoppeld</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.label}
        </option>
      ))}
    </select>
  );
}

function SubmitButton({ busy, disabled, label }: { busy: boolean; disabled: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
      {label}
    </button>
  );
}

function OperationColumn({
  icon: Icon,
  tone,
  title,
  emptyTitle,
  emptyBody,
  children,
}: {
  icon: LucideIcon;
  tone: "sky" | "amber" | "rose";
  title: string;
  emptyTitle: string;
  emptyBody: string;
  children: ReactNode;
}) {
  const color = tone === "sky" ? "text-sky-300" : tone === "amber" ? "text-amber-300" : "text-rose-300";
  const empty = !children || (Array.isArray(children) && children.length === 0);
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className={color} />
        <h3 className="text-sm font-bold text-slate-200">{title}</h3>
      </div>
      <div className="space-y-3">{empty ? <EmptyState title={emptyTitle} body={emptyBody} /> : children}</div>
    </div>
  );
}

function emptyToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
