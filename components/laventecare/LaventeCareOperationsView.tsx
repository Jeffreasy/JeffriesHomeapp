"use client";

import { Badge } from "@/components/ui/Badge";
import { surfaceVariants } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { FormField, type FormControlAccessibilityProps } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { cloneElement, FormEvent, isValidElement, type ReactElement, type ReactNode, useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  GitPullRequest,
  Plus,
  RotateCcw,
  ScrollText,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";
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
  // L6: de kolommen tonen standaard 4 items met een "Toon alle N"-toggle.
  const [showAllDecisions, setShowAllDecisions] = useState(false);
  const [showAllChanges, setShowAllChanges] = useState(false);
  const [showAllIncidents, setShowAllIncidents] = useState(false);
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

  // M-C: de resets draaien alleen na een geslaagde save — de page-handlers
  // rethrowen bij een fout (met toast), zodat de invoer blijft staan.
  const handleDecisionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!decisionForm.titel.trim() || !decisionForm.besluit.trim()) return;
    try {
      await onCreateDecision({
        project_id: emptyToUndefined(decisionForm.projectId),
        titel: decisionForm.titel.trim(),
        besluit: decisionForm.besluit.trim(),
        reden: emptyToUndefined(decisionForm.reden) ?? "Niet gespecificeerd",
        impact: emptyToUndefined(decisionForm.impact),
        status: decisionForm.status,
        datum: emptyToUndefined(decisionForm.datum),
      });
    } catch {
      return;
    }
    setDecisionForm({ projectId: "", titel: "", besluit: "", reden: "", impact: "", status: "genomen", datum: "" });
  };

  const handleChangeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!changeForm.titel.trim() || !changeForm.impact.trim()) return;
    try {
      await onCreateChangeRequest({
        project_id: emptyToUndefined(changeForm.projectId),
        titel: changeForm.titel.trim(),
        impact: changeForm.impact.trim(),
        planning_impact: emptyToUndefined(changeForm.planningImpact),
        budget_impact: emptyToUndefined(changeForm.budgetImpact),
        status: changeForm.status,
      });
    } catch {
      return;
    }
    setChangeForm({ projectId: "", titel: "", impact: "", planningImpact: "", budgetImpact: "", status: "nieuw" });
  };

  const handleIncidentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!incidentForm.titel.trim()) return;
    try {
      await onCreateSlaIncident({
        project_id: emptyToUndefined(incidentForm.projectId),
        titel: incidentForm.titel.trim(),
        prioriteit: incidentForm.prioriteit,
        status: incidentForm.status,
        kanaal: incidentForm.kanaal,
        reactie_deadline: emptyToUndefined(incidentForm.reactieDeadline),
        samenvatting: emptyToUndefined(incidentForm.samenvatting),
      });
    } catch {
      return;
    }
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
      <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-4 sm:p-5")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Operatie</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--color-text)]">Governance registreren</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
              Leg besluiten, scopewijzigingen en supportincidenten direct vast, zodat LaventeCare niet afhankelijk blijft van losse notities of chatgeschiedenis.
            </p>
          </div>
          <ClipboardList size={20} className="hidden text-[var(--color-text-muted)] lg:block" />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <ModeButton mode="decision" activeMode={mode} icon={ScrollText} label="Besluit" onClick={setMode} />
          <ModeButton mode="change" activeMode={mode} icon={GitPullRequest} label="Change" onClick={setMode} />
          <ModeButton mode="incident" activeMode={mode} icon={AlertTriangle} label="Incident" onClick={setMode} />
        </div>

        {mode === "decision" ? (
          <form onSubmit={handleDecisionSubmit} className="mt-4 grid gap-3 lg:grid-cols-2">
            <LabeledField label="Project">
              <ProjectSelect value={decisionForm.projectId} projects={projectOptions} onChange={(value) => setDecisionForm((form) => ({ ...form, projectId: value }))} />
            </LabeledField>
            <LabeledField label="Titel" required>
              <Input

                required
                value={decisionForm.titel}
                onChange={(event) => setDecisionForm((form) => ({ ...form, titel: event.target.value }))}
                placeholder="Besluit titel"
              />
            </LabeledField>
            <LabeledField label="Besluit" required>
              <Textarea
                className="min-h-24 resize-none"
                required
                value={decisionForm.besluit}
                onChange={(event) => setDecisionForm((form) => ({ ...form, besluit: event.target.value }))}
                placeholder="Wat is besloten?"
              />
            </LabeledField>
            <LabeledField label="Reden">
              <Textarea
                className="min-h-24 resize-none"
                value={decisionForm.reden}
                onChange={(event) => setDecisionForm((form) => ({ ...form, reden: event.target.value }))}
                placeholder="Waarom?"
              />
            </LabeledField>
            <LabeledField label="Impact">
              <Input

                value={decisionForm.impact}
                onChange={(event) => setDecisionForm((form) => ({ ...form, impact: event.target.value }))}
                placeholder="Impact op klant, planning of scope"
              />
            </LabeledField>
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledField label="Besluitdatum">
                <Input

                  type="date"
                  value={decisionForm.datum}
                  onChange={(event) => setDecisionForm((form) => ({ ...form, datum: event.target.value }))}
                />
              </LabeledField>
              <LabeledField label="Status">
                <Select

                  value={decisionForm.status}
                  onChange={(event) => setDecisionForm((form) => ({ ...form, status: event.target.value }))}
                >
                  <option value="genomen">Genomen</option>
                  <option value="voorstel">Voorstel</option>
                  <option value="herzien">Herzien</option>
                </Select>
              </LabeledField>
            </div>
            <SubmitButton busy={creatingDecision} disabled={busy || !decisionForm.titel.trim() || !decisionForm.besluit.trim()} label="Besluit vastleggen" />
          </form>
        ) : null}

        {mode === "change" ? (
          <form onSubmit={handleChangeSubmit} className="mt-4 grid gap-3 lg:grid-cols-2">
            <LabeledField label="Project">
              <ProjectSelect value={changeForm.projectId} projects={projectOptions} onChange={(value) => setChangeForm((form) => ({ ...form, projectId: value }))} />
            </LabeledField>
            <LabeledField label="Titel" required>
              <Input

                required
                value={changeForm.titel}
                onChange={(event) => setChangeForm((form) => ({ ...form, titel: event.target.value }))}
                placeholder="Change titel"
              />
            </LabeledField>
            <LabeledField label="Impact" required>
              <Textarea
                className="min-h-24 resize-none"
                required
                value={changeForm.impact}
                onChange={(event) => setChangeForm((form) => ({ ...form, impact: event.target.value }))}
                placeholder="Scope, risico of klantimpact"
              />
            </LabeledField>
            <LabeledField label="Planning impact">
              <Textarea
                className="min-h-24 resize-none"
                value={changeForm.planningImpact}
                onChange={(event) => setChangeForm((form) => ({ ...form, planningImpact: event.target.value }))}
                placeholder="Planning impact"
              />
            </LabeledField>
            <LabeledField label="Budget impact">
              <Input

                value={changeForm.budgetImpact}
                onChange={(event) => setChangeForm((form) => ({ ...form, budgetImpact: event.target.value }))}
                placeholder="Budget impact"
              />
            </LabeledField>
            <LabeledField label="Status">
              <Select

                value={changeForm.status}
                onChange={(event) => setChangeForm((form) => ({ ...form, status: event.target.value }))}
              >
                <option value="nieuw">Nieuw</option>
                <option value="beoordeeld">Beoordeeld</option>
                <option value="goedgekeurd">Goedgekeurd</option>
                <option value="afgewezen">Afgewezen</option>
              </Select>
            </LabeledField>
            <SubmitButton busy={creatingChange} disabled={busy || !changeForm.titel.trim() || !changeForm.impact.trim()} label="Change registreren" />
          </form>
        ) : null}

        {mode === "incident" ? (
          <form onSubmit={handleIncidentSubmit} className="mt-4 grid gap-3 lg:grid-cols-2">
            <LabeledField label="Project">
              <ProjectSelect value={incidentForm.projectId} projects={projectOptions} onChange={(value) => setIncidentForm((form) => ({ ...form, projectId: value }))} />
            </LabeledField>
            <LabeledField label="Titel" required>
              <Input

                required
                value={incidentForm.titel}
                onChange={(event) => setIncidentForm((form) => ({ ...form, titel: event.target.value }))}
                placeholder="Incident titel"
              />
            </LabeledField>
            <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2">
              <LabeledField label="Prioriteit">
                <Select

                  value={incidentForm.prioriteit}
                  onChange={(event) => setIncidentForm((form) => ({ ...form, prioriteit: event.target.value }))}
                >
                  <option value="P1">P1 kritiek</option>
                  <option value="P2">P2 hoog</option>
                  <option value="P3">P3 normaal</option>
                  <option value="P4">P4 laag</option>
                </Select>
              </LabeledField>
              <LabeledField label="Status">
                <Select

                  value={incidentForm.status}
                  onChange={(event) => setIncidentForm((form) => ({ ...form, status: event.target.value }))}
                >
                  <option value="open">Open</option>
                  <option value="in_behandeling">In behandeling</option>
                  <option value="wacht_op_klant">Wacht op klant</option>
                  <option value="gesloten">Gesloten</option>
                </Select>
              </LabeledField>
              <LabeledField label="Kanaal">
                <Select

                  value={incidentForm.kanaal}
                  onChange={(event) => setIncidentForm((form) => ({ ...form, kanaal: event.target.value }))}
                >
                  <option value="manual">Handmatig</option>
                  <option value="email">Email</option>
                  <option value="telefoon">Telefoon</option>
                  <option value="telegram">Telegram</option>
                  <option value="klant">Klant</option>
                </Select>
              </LabeledField>
            </div>
            <LabeledField label="Reactie-deadline">
              <Input

                type="datetime-local"
                value={incidentForm.reactieDeadline}
                onChange={(event) => setIncidentForm((form) => ({ ...form, reactieDeadline: event.target.value }))}
              />
            </LabeledField>
            <LabeledField label="Samenvatting">
              <Textarea
                className="min-h-24 resize-none"
                value={incidentForm.samenvatting}
                onChange={(event) => setIncidentForm((form) => ({ ...form, samenvatting: event.target.value }))}
                placeholder="Samenvatting, impact en eerste actie"
              />
            </LabeledField>
            <SubmitButton busy={creatingIncident} disabled={busy || !incidentForm.titel.trim()} label="Incident registreren" />
          </form>
        ) : null}
      </div>

      <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-4 sm:p-5")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Audit trail</p>
            <h2 className="mt-1 text-lg font-bold text-[var(--color-text)]">Besluiten, wijzigingen en SLA</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <Badge tone="info">{recentDecisions.length} besluiten</Badge>
            <Badge tone="accent">{openChanges.length} changes</Badge>
            <Badge tone="danger">{openIncidents.length} incidenten</Badge>
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <OperationColumn
            icon={ScrollText}
            tone="info"
            title="Decision log"
            emptyTitle="Geen besluiten"
            emptyBody="Leg keuzes vast zodra scope, aanpak, prijs of planning verandert."
            total={recentDecisions.length}
            expanded={showAllDecisions}
            onToggle={() => setShowAllDecisions((value) => !value)}
            noun="besluiten"
          >
            {(showAllDecisions ? recentDecisions : recentDecisions.slice(0, 4)).map((decision) => (
              <OperationCard
                key={decision._id ?? `${decision.titel}-${decision.datum}`}
                icon={ScrollText}
                title={decision.titel}
                meta={`${formatDate(decision.datum)} - ${label(decision.status)}`}
                body={decision.besluit}
                tone="info"
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
            tone="accent"
            title="Change requests"
            emptyTitle="Geen open changes"
            emptyBody="Scope-, planning- of budgetwijzigingen blijven hier zichtbaar tot ze zijn afgehandeld."
            total={openChanges.length}
            expanded={showAllChanges}
            onToggle={() => setShowAllChanges((value) => !value)}
            noun="changes"
          >
            {(showAllChanges ? openChanges : openChanges.slice(0, 4)).map((change) => (
              <OperationCard
                key={change._id ?? change.titel}
                icon={GitPullRequest}
                title={change.titel}
                meta={label(change.status)}
                body={change.impact}
                tone="accent"
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
            tone="danger"
            title="SLA incidenten"
            emptyTitle="Geen open incidenten"
            emptyBody="Support- of beheerissues die je vastlegt komen hier met prioriteit en kanaal terug."
            total={openIncidents.length}
            expanded={showAllIncidents}
            onToggle={() => setShowAllIncidents((value) => !value)}
            noun="incidenten"
          >
            {(showAllIncidents ? openIncidents : openIncidents.slice(0, 4)).map((incident) => (
              <OperationCard
                key={incident._id ?? incident.titel}
                icon={AlertTriangle}
                title={incident.titel}
                meta={`${incident.prioriteit} - ${label(incident.status)} - ${label(incident.kanaal)}`}
                body={incident.samenvatting ?? `Gemeld op ${formatDate(incident.gemeldOp)}`}
                tone={incident.prioriteit === "P1" || incident.prioriteit === "P2" ? "danger" : "info"}
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

// Proper labels op alle governance-velden (incl. het voorheen naamloze
// datumveld) i.p.v. placeholder-only inputs.
function LabeledField({
  label: fieldLabel,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <FormField
      id={id}
      label={
        <>
          {fieldLabel}
          {required ? <span className="text-[var(--color-danger)]"> *</span> : null}
        </>
      }
    >
      {(controlProps) =>
        isValidElement(children)
          ? cloneElement(children as ReactElement<FormControlAccessibilityProps>, controlProps)
          : children
      }
    </FormField>
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
    <Button
      type="button"
      onClick={() => onClick(mode)}
      variant={active ? "primary" : "secondary"}
      aria-pressed={active}
      fullWidth
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </Button>
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
  // Per-item busy scoping: alleen de knoppen van het item waarvan een update
  // loopt disabled, niet alle sibling-kaarten.
  const itemBusy = Boolean(processingOperation?.startsWith(`${itemType}:${itemId}:`));
  return (
    <>
      {visibleActions.map((action) => {
        const Icon = action.icon;
        const key = `${itemType}:${itemId}:${action.status}`;
        const busy = processingOperation === key;
        return (
          <Button
            key={action.status}
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onUpdate(itemId, action.status)}
            disabled={itemBusy}
            loading={busy}
            loadingLabel={action.label}
          >
            <Icon size={13} aria-hidden="true" />
            {action.label}
          </Button>
        );
      })}
    </>
  );
}

function ProjectSelect({
  id,
  value,
  projects,
  onChange,
}: {
  id?: string;
  value: string;
  projects: Array<{ id: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Geen project gekoppeld</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.label}
        </option>
      ))}
    </Select>
  );
}

function SubmitButton({ busy, disabled, label }: { busy: boolean; disabled: boolean; label: string }) {
  return (
    <Button
      type="submit"
      variant="primary"
      disabled={disabled}
      loading={busy}
      loadingLabel={label}
    >
      <Plus size={16} aria-hidden="true" />
      {label}
    </Button>
  );
}

function OperationColumn({
  icon: Icon,
  tone,
  title,
  emptyTitle,
  emptyBody,
  total,
  expanded,
  onToggle,
  noun = "items",
  children,
}: {
  icon: LucideIcon;
  tone: UiTone;
  title: string;
  emptyTitle: string;
  emptyBody: string;
  /** L6: totaal aantal items; boven de 4 verschijnt een "Toon alle N"-toggle. */
  total?: number;
  expanded?: boolean;
  onToggle?: () => void;
  noun?: string;
  children: ReactNode;
}) {
  const color = uiToneClasses[tone].icon;
  const empty = !children || (Array.isArray(children) && children.length === 0);
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className={color} />
        <h3 className="text-sm font-bold text-[var(--color-text)]">{title}</h3>
      </div>
      <div className="space-y-3">{empty ? <EmptyState title={emptyTitle} body={emptyBody} /> : children}</div>
      {typeof total === "number" && total > 4 && onToggle ? (
        <Button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          variant="ghost"
          size="sm"
          fullWidth
          className="mt-2"
        >
          {expanded ? "Toon minder" : `Toon alle ${total} ${noun}`}
        </Button>
      ) : null}
    </div>
  );
}

function emptyToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
