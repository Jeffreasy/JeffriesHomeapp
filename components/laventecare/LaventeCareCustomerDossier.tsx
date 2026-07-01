"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  FolderKanban,
  History,
  KeyRound,
  Loader2,
  Mail,
  NotebookPen,
  Phone,
  Plus,
  Save,
  UserRound,
  Workflow,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { LCActivityEventCreate } from "@/lib/api";
import {
  emptyAccessCredentialForm,
  LAVENTECARE_ACTIVITY_TYPES,
  type AccessCredentialForm,
  type AccessCredentialItem,
  type ActivityEventItem,
  type ActionItem,
  type CompanyItem,
  type ContactItem,
  type DossierDocumentItem,
  type LeadItem,
  type ProjectItem,
  type WorkstreamItem,
} from "./LaventeCareTypes";
import { formatDate, formatMoney, label } from "./LaventeCareUtils";

type DossierTab = "overview" | "timeline" | "work" | "documents" | "access";

type TimelineItem = {
  id: string;
  kind: string;
  title: string;
  body?: string | null;
  date: string;
  meta?: string;
  tone: "amber" | "emerald" | "sky" | "violet" | "slate" | "rose";
};

type ActivityFormState = {
  eventType: string;
  channel: string;
  title: string;
  body: string;
  occurredAt: string;
  contactId: string;
  projectId: string;
  workstreamId: string;
  createFollowUp: boolean;
  followUpTitle: string;
  followUpDueDate: string;
  followUpDueTime: string;
  followUpPriority: string;
};

const emptyActivityForm: ActivityFormState = {
  eventType: "contact",
  channel: "manual",
  title: "",
  body: "",
  occurredAt: "",
  contactId: "",
  projectId: "",
  workstreamId: "",
  createFollowUp: false,
  followUpTitle: "",
  followUpDueDate: "",
  followUpDueTime: "",
  followUpPriority: "normaal",
};

export type ActivityEventSubmitPayload = LCActivityEventCreate & {
  follow_up?: {
    title: string;
    due_date?: string;
    due_time?: string;
    priority: string;
  };
};

export function LaventeCareCustomerDossier({
  isOpen,
  company,
  contacts,
  accessCredentials,
  leads,
  workstreams,
  projects,
  actions,
  dossierDocuments,
  activityEvents,
  savingActivity,
  savingAccessCredential,
  onClose,
  onEditCompany,
  onAddContact,
  onStartWorkstream,
  onCreateActivity,
  onCreateAccessCredential,
}: {
  isOpen: boolean;
  company: CompanyItem | null;
  contacts: ContactItem[];
  accessCredentials: AccessCredentialItem[];
  leads: LeadItem[];
  workstreams: WorkstreamItem[];
  projects: ProjectItem[];
  actions: ActionItem[];
  dossierDocuments: DossierDocumentItem[];
  activityEvents: ActivityEventItem[];
  savingActivity: boolean;
  savingAccessCredential: boolean;
  onClose: () => void;
  onEditCompany: (company: CompanyItem) => void;
  onAddContact: (company: CompanyItem) => void;
  onStartWorkstream: (company: CompanyItem) => void;
  onCreateActivity: (payload: ActivityEventSubmitPayload) => Promise<void>;
  onCreateAccessCredential: (payload: {
    company_id: string;
    contact_id?: string;
    project_id?: string;
    workstream_id?: string;
    title: string;
    login_url?: string;
    username?: string;
    role?: string;
    environment?: string;
    status?: string;
    owner_contact?: string;
    secret_label?: string;
    secret_value?: string;
    secret_hint?: string;
    sharing_policy?: string;
    last_checked_at?: string;
    expires_at?: string;
    notes?: string;
  }) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<DossierTab>("overview");
  const [form, setForm] = useState<ActivityFormState>(emptyActivityForm);
  const companyId = company?._id ?? company?.id ?? "";
  const companyName = company?.naam ?? "";

  const companyContacts = useMemo(
    () => contacts.filter((contact) => contact.company_id === companyId),
    [contacts, companyId]
  );
  const companyLeads = useMemo(
    () => leads.filter((lead) => lead.company_id === companyId),
    [leads, companyId]
  );
  const companyWorkstreams = useMemo(
    () => workstreams.filter((workstream) => workstream.company_id === companyId),
    [workstreams, companyId]
  );
  const companyProjects = useMemo(
    () => projects.filter((project) => project.company_id === companyId),
    [projects, companyId]
  );
  const leadIds = useMemo(() => new Set(companyLeads.map((lead) => lead._id ?? lead.id)), [companyLeads]);
  const projectIds = useMemo(() => new Set(companyProjects.map((project) => project._id ?? project.id)), [companyProjects]);
  const workstreamIds = useMemo(
    () => new Set(companyWorkstreams.map((workstream) => workstream._id ?? workstream.id)),
    [companyWorkstreams]
  );
  const companyActions = useMemo(
    () =>
      actions.filter(
        (action) =>
          action.linkedCompanyId === companyId ||
          Boolean(action.linkedProjectId && projectIds.has(action.linkedProjectId)) ||
          Boolean(action.linkedWorkstreamId && workstreamIds.has(action.linkedWorkstreamId))
      ),
    [actions, companyId, projectIds, workstreamIds]
  );
  const companyDocuments = useMemo(
    () =>
      dossierDocuments.filter(
        (doc) => isDossierDocumentForCompany(doc, companyId, companyName, leadIds, projectIds, workstreamIds)
      ),
    [dossierDocuments, companyId, companyName, leadIds, projectIds, workstreamIds]
  );
  const companyActivity = useMemo(
    () => activityEvents.filter((event) => event.company_id === companyId),
    [activityEvents, companyId]
  );
  const companyAccess = useMemo(
    () => accessCredentials.filter((item) => item.company_id === companyId),
    [accessCredentials, companyId]
  );

  const timeline = useMemo(
    () =>
      buildTimeline({
        company,
        contacts: companyContacts,
        leads: companyLeads,
        workstreams: companyWorkstreams,
        projects: companyProjects,
        actions: companyActions,
        documents: companyDocuments,
        activities: companyActivity,
        accessCredentials: companyAccess,
      }),
    [company, companyAccess, companyActions, companyActivity, companyContacts, companyDocuments, companyLeads, companyProjects, companyWorkstreams]
  );

  if (!company) return null;

  const primaryContact = companyContacts.find((contact) => contact.is_primary) ?? companyContacts[0];
  const openWorkCount = companyLeads.length + companyWorkstreams.length + companyProjects.length;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    if (form.createFollowUp && !form.followUpTitle.trim()) return;

    await onCreateActivity({
      company_id: companyId,
      contact_id: form.contactId || undefined,
      project_id: form.projectId || undefined,
      workstream_id: form.workstreamId || undefined,
      event_type: form.eventType,
      channel: form.channel,
      title: form.title.trim(),
      body: form.body.trim() || undefined,
      occurred_at: form.occurredAt ? new Date(form.occurredAt).toISOString() : undefined,
      follow_up: form.createFollowUp
        ? {
            title: form.followUpTitle.trim(),
            due_date: form.followUpDueDate || undefined,
            due_time: form.followUpDueTime || undefined,
            priority: form.followUpPriority,
          }
        : undefined,
    });
    setForm(emptyActivityForm);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Klantdossier: ${company.naam}`}
      icon={<Building2 size={18} className="text-amber-300" />}
      theme="amber"
      maxWidth="4xl"
    >
      <div className="space-y-5">
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-200">
                  {label(company.relatie_type)}
                </span>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-200">
                  {label(company.status)}
                </span>
                {company.sector ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-bold text-slate-300">
                    {company.sector}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
                {company.notities || "Nog geen klantcontext vastgelegd. Log een moment of voeg notities toe zodat Brain dit dossier beter begrijpt."}
              </p>
              {primaryContact ? (
                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <UserRound size={13} />
                    <span className="truncate">{primaryContact.naam}</span>
                  </span>
                  {primaryContact.email ? (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Mail size={13} />
                      <span className="truncate">{primaryContact.email}</span>
                    </span>
                  ) : null}
                  {primaryContact.telefoon ? (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Phone size={13} />
                      <span className="truncate">{primaryContact.telefoon}</span>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid shrink-0 grid-cols-3 gap-2 lg:flex">
              <button
                type="button"
                onClick={() => onEditCompany(company)}
                className="btn btn--ghost btn--sm justify-center"
                aria-label={`${company.naam} bewerken`}
                title="Klant bewerken"
              >
                <Save size={14} />
                <span className="hidden sm:inline">Bewerken</span>
              </button>
              <button
                type="button"
                onClick={() => onAddContact(company)}
                className="btn btn--ghost btn--sm justify-center"
                aria-label={`Contact toevoegen aan ${company.naam}`}
                title="Contact toevoegen"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Contact</span>
              </button>
              <button
                type="button"
                onClick={() => onStartWorkstream(company)}
                className="btn btn--primary btn--sm justify-center"
                aria-label={`Nieuwe opdracht voor ${company.naam}`}
                title="Nieuwe opdracht"
              >
                <Workflow size={14} />
                <span className="hidden sm:inline">Opdracht</span>
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <DossierMetric label="Open werk" value={openWorkCount} detail="leads, opdrachten, projecten" />
            <DossierMetric label="Contacten" value={companyContacts.length} detail="gekoppelde personen" />
            <DossierMetric label="Documenten" value={companyDocuments.length} detail="vastgelegd dossier" />
            <DossierMetric label="Toegang" value={companyAccess.length} detail="accounts en portalen" />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:overflow-x-auto sm:pb-1" role="tablist" aria-label="Klantdossier onderdelen">
          <TabButton active={activeTab === "overview"} icon={Activity} label="Overzicht" onClick={() => setActiveTab("overview")} />
          <TabButton active={activeTab === "timeline"} icon={History} label="Timeline" onClick={() => setActiveTab("timeline")} />
          <TabButton active={activeTab === "work"} icon={FolderKanban} label="Werk" onClick={() => setActiveTab("work")} />
          <TabButton active={activeTab === "documents"} icon={FileCheck2} label="Documenten" onClick={() => setActiveTab("documents")} />
          <TabButton active={activeTab === "access"} icon={KeyRound} label="Toegang" onClick={() => setActiveTab("access")} />
        </div>

        {activeTab === "timeline" ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <TimelineList timeline={timeline} />
            <ActivityForm
              form={form}
              setForm={setForm}
              contacts={companyContacts}
              projects={companyProjects}
              workstreams={companyWorkstreams}
              saving={savingActivity}
              onSubmit={handleSubmit}
            />
          </div>
        ) : null}

        {activeTab === "overview" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <InfoPanel title="Relatie" rows={[
              ["Relatietype", label(company.relatie_type)],
              ["Status", label(company.status)],
              ["Website", company.website ?? "Niet gevuld"],
              ["Klantportaal", company.portal_url ?? "Niet gevuld"],
              ["Standaard login", company.default_login_url ?? "Niet gevuld"],
              ["Laatste contact", formatDate(company.laatste_contact ?? undefined)],
              ["Volgende actie", company.volgende_actie ?? "Niet gevuld"],
            ]} />
            <InfoPanel title="Zakelijk" rows={[
              ["KVK", company.kvk_number ?? "Niet gevuld"],
              ["BTW", company.vat_number ?? "Niet gevuld"],
              ["Factuurmail", company.billing_email ?? "Niet gevuld"],
              ["Betaaltermijn", `${company.payment_terms_days ?? 14} dagen`],
              ["Contract", label(company.contract_status ?? "geen_contract")],
              ["Service", label(company.service_level ?? "basis")],
            ]} />
            <InfoPanel title="Primaire contactpersoon" rows={[
              ["Naam", primaryContact?.naam ?? "Niet gevuld"],
              ["Rol", primaryContact?.rol ?? "Niet gevuld"],
              ["Beslisrol", primaryContact?.decision_role ? label(primaryContact.decision_role) : "Niet gevuld"],
              ["Kanaal", primaryContact?.preferred_channel ?? company.preferred_channel ?? "Niet gevuld"],
              ["Email", primaryContact?.email ?? "Niet gevuld"],
              ["Telefoon", primaryContact?.telefoon ?? "Niet gevuld"],
            ]} />
          </div>
        ) : null}

        {activeTab === "work" ? (
          <div className="grid gap-3 lg:grid-cols-3">
            <WorkColumn title="Leads" empty="Geen open leads" items={companyLeads.map((lead) => ({
              id: lead._id ?? lead.id,
              title: lead.titel,
              meta: `${label(lead.status)}${lead.prioriteit ? ` - ${label(lead.prioriteit)}` : ""}`,
              body: lead.pijnpunt,
            }))} />
            <WorkColumn title="Opdrachten" empty="Geen actieve opdrachten" items={companyWorkstreams.map((workstream) => ({
              id: workstream._id ?? workstream.id,
              title: workstream.titel,
              meta: `${label(workstream.status)} - ${label(workstream.type)}`,
              body: workstream.volgende_stap ?? workstream.doel,
            }))} />
            <WorkColumn title="Projecten" empty="Geen actieve projecten" items={companyProjects.map((project) => ({
              id: project._id ?? project.id,
              title: project.naam,
              meta: `${label(project.fase)} - ${formatMoney(project.waarde_indicatie ?? undefined)}`,
              body: project.samenvatting,
            }))} />
          </div>
        ) : null}

        {activeTab === "documents" ? (
          <div className="space-y-3">
            {companyDocuments.length > 0 ? (
              companyDocuments.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-500">
                Nog geen PDF of dossierdocument vastgelegd voor deze klant.
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "access" ? (
          <AccessCredentialPanel
            companyId={companyId}
            contacts={companyContacts}
            projects={companyProjects}
            workstreams={companyWorkstreams}
            credentials={companyAccess}
            defaultLoginUrl={company.default_login_url ?? company.portal_url ?? ""}
            saving={savingAccessCredential}
            onCreate={onCreateAccessCredential}
          />
        ) : null}
      </div>
    </Modal>
  );
}

function DossierMetric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-black/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-500">{detail}</p>
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label: tabLabel,
  onClick,
}: {
  active: boolean;
  icon: typeof History;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={cn(
        "inline-flex h-10 min-w-0 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition sm:min-w-[132px]",
        active
          ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
          : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white"
      )}
    >
      <Icon size={15} />
      {tabLabel}
    </button>
  );
}

function TimelineList({ timeline }: { timeline: TimelineItem[] }) {
  if (timeline.length === 0) {
    return (
      <div className="order-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-500 lg:order-1">
        Nog geen dossiermomenten. Log het eerste contactmoment om de klantgeschiedenis te starten.
      </div>
    );
  }

  return (
    <div className="order-2 space-y-3 lg:order-1">
      {timeline.map((item) => (
        <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex gap-3">
            <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", toneClass(item.tone))}>
              {timelineIcon(item.kind)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-bold uppercase tracking-normal text-slate-400">
                  {label(item.kind)}
                </span>
                <span className="text-xs font-semibold text-slate-500">{formatDate(item.date)}</span>
              </div>
              <h3 className="mt-2 line-clamp-2 text-sm font-bold text-white">{item.title}</h3>
              {item.meta ? <p className="mt-1 text-xs font-semibold text-slate-500">{item.meta}</p> : null}
              {item.body ? <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-400">{item.body}</p> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityForm({
  form,
  setForm,
  contacts,
  projects,
  workstreams,
  saving,
  onSubmit,
}: {
  form: ActivityFormState;
  setForm: (form: ActivityFormState | ((form: ActivityFormState) => ActivityFormState)) => void;
  contacts: ContactItem[];
  projects: ProjectItem[];
  workstreams: WorkstreamItem[];
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <form onSubmit={onSubmit} className="order-1 rounded-xl border border-amber-500/15 bg-amber-500/[0.05] p-4 lg:order-2 lg:sticky lg:top-4">
      <div className="flex items-center gap-2">
        <NotebookPen size={16} className="text-amber-300" />
        <h3 className="text-sm font-bold text-white">Moment loggen</h3>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Type</span>
          <select
            value={form.eventType}
            onChange={(event) => setForm((current) => ({ ...current, eventType: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
          >
            {LAVENTECARE_ACTIVITY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Titel</span>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Bijv. Scope afgestemd"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Notitie</span>
          <textarea
            value={form.body}
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            rows={4}
            placeholder="Wat is er besproken, besloten of afgesproken?"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Datum/tijd</span>
          <input
            type="datetime-local"
            value={form.occurredAt}
            onChange={(event) => setForm((current) => ({ ...current, occurredAt: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Contactpersoon</span>
          <select
            value={form.contactId}
            onChange={(event) => setForm((current) => ({ ...current, contactId: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
          >
            <option value="">Geen specifieke contactpersoon</option>
            {contacts.map((contact) => (
              <option key={contact._id ?? contact.id} value={contact._id ?? contact.id}>
                {contact.naam}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-slate-400">Project/opdracht</span>
          <select
            value={form.projectId || `workstream:${form.workstreamId}`}
            onChange={(event) => {
              const value = event.target.value;
              if (value.startsWith("workstream:")) {
                setForm((current) => ({ ...current, projectId: "", workstreamId: value.replace("workstream:", "") }));
              } else {
                setForm((current) => ({ ...current, projectId: value, workstreamId: "" }));
              }
            }}
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
          >
            <option value="">Geen koppeling</option>
            {projects.map((project) => (
              <option key={project._id ?? project.id} value={project._id ?? project.id}>
                Project: {project.naam}
              </option>
            ))}
            {workstreams.map((workstream) => (
              <option key={workstream._id ?? workstream.id} value={`workstream:${workstream._id ?? workstream.id}`}>
                Opdracht: {workstream.titel}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <input
            type="checkbox"
            checked={form.createFollowUp}
            onChange={(event) => {
              const checked = event.target.checked;
              setForm((current) => ({
                ...current,
                createFollowUp: checked,
                followUpTitle: checked && !current.followUpTitle && current.title ? `Opvolgen: ${current.title}` : current.followUpTitle,
              }));
            }}
            className="h-4 w-4 rounded border-white/20 bg-transparent accent-amber-500"
          />
          <span className="text-xs font-semibold text-slate-300">Vervolgactie aanmaken vanuit dit moment</span>
        </label>

        {form.createFollowUp ? (
          <div className="space-y-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Actie-titel</span>
              <input
                value={form.followUpTitle}
                onChange={(event) => setForm((current) => ({ ...current, followUpTitle: event.target.value }))}
                placeholder="Bijv. Prijsindicatie terugkoppelen"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-500"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-semibold text-slate-400">Vervaldatum</span>
                <input
                  type="date"
                  value={form.followUpDueDate}
                  onChange={(event) => setForm((current) => ({ ...current, followUpDueDate: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-400">Tijdstip</span>
                <input
                  type="time"
                  value={form.followUpDueTime}
                  onChange={(event) => setForm((current) => ({ ...current, followUpDueTime: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Prioriteit</span>
              <select
                value={form.followUpPriority}
                onChange={(event) => setForm((current) => ({ ...current, followUpPriority: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
              >
                <option value="laag">Laag</option>
                <option value="normaal">Normaal</option>
                <option value="hoog">Hoog</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={saving || !form.title.trim() || (form.createFollowUp && !form.followUpTitle.trim())}
        className="btn mt-4 w-full border-transparent bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        Vastleggen
      </button>
    </form>
  );
}

function AccessCredentialPanel({
  companyId,
  contacts,
  projects,
  workstreams,
  credentials,
  defaultLoginUrl,
  saving,
  onCreate,
}: {
  companyId: string;
  contacts: ContactItem[];
  projects: ProjectItem[];
  workstreams: WorkstreamItem[];
  credentials: AccessCredentialItem[];
  defaultLoginUrl: string;
  saving: boolean;
  onCreate: (payload: {
    company_id: string;
    contact_id?: string;
    project_id?: string;
    workstream_id?: string;
    title: string;
    login_url?: string;
    username?: string;
    role?: string;
    environment?: string;
    status?: string;
    owner_contact?: string;
    secret_label?: string;
    secret_value?: string;
    secret_hint?: string;
    sharing_policy?: string;
    last_checked_at?: string;
    expires_at?: string;
    notes?: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState<AccessCredentialForm>({
    ...emptyAccessCredentialForm,
    companyId,
    loginUrl: defaultLoginUrl,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    await onCreate({
      company_id: companyId,
      contact_id: optionalPayload(form.contactId),
      project_id: optionalPayload(form.projectId),
      workstream_id: optionalPayload(form.workstreamId),
      title: form.title.trim(),
      login_url: optionalPayload(form.loginUrl),
      username: optionalPayload(form.username),
      role: optionalPayload(form.role),
      environment: form.environment,
      status: form.status,
      owner_contact: optionalPayload(form.ownerContact),
      secret_label: optionalPayload(form.secretLabel),
      secret_value: optionalPayload(form.secretValue),
      secret_hint: optionalPayload(form.secretHint),
      sharing_policy: form.sharingPolicy,
      last_checked_at: optionalPayload(form.lastCheckedAt),
      expires_at: optionalPayload(form.expiresAt),
      notes: optionalPayload(form.notes),
    });
    setForm({ ...emptyAccessCredentialForm, companyId, loginUrl: defaultLoginUrl });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">
        {credentials.length > 0 ? (
          credentials.map((item) => (
            <div key={item._id ?? item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className="text-amber-300" />
                    <h3 className="truncate text-sm font-bold text-white">{item.title}</h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {label(item.environment)} - {label(item.status)}
                    {item.role ? ` - ${item.role}` : ""}
                  </p>
                </div>
                <span className={cn(
                  "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-bold",
                  item.secret_configured
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                    : "border-amber-500/25 bg-amber-500/10 text-amber-200"
                )}>
                  {item.secret_configured ? "Secret aanwezig" : "Via veilig kanaal"}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <AccessRow label="Gebruiker" value={item.username ?? "Niet gevuld"} />
                <AccessRow label="Eigenaar" value={item.owner_contact ?? item.contact_name ?? "Niet gevuld"} />
                <AccessRow label="Vervalt" value={formatDate(item.expires_at ?? undefined)} />
                <AccessRow label="Laatst getest" value={formatDate(item.last_checked_at ?? undefined)} />
              </div>

              {item.login_url ? (
                <a
                  href={toExternalHref(item.login_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block truncate rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-200 transition hover:bg-sky-500/20"
                >
                  {item.login_url}
                </a>
              ) : null}
              {item.notes ? <p className="mt-3 text-xs leading-5 text-slate-500">{item.notes}</p> : null}
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm leading-6 text-slate-500">
            Nog geen toegang vastgelegd. Leg pilotaccounts, portalen en tijdelijke rollen hier vast zodat mails, dossiers en AI-context niet afhankelijk zijn van losse notities.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-amber-500/15 bg-amber-500/[0.05] p-4 lg:sticky lg:top-4">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-amber-300" />
          <h3 className="text-sm font-bold text-white">Toegang toevoegen</h3>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-400">Titel</span>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Pilot admin, WordPress beheer, klantportaal..."
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-400">Login URL</span>
            <input
              value={form.loginUrl}
              onChange={(event) => setForm((current) => ({ ...current, loginUrl: event.target.value }))}
              placeholder="https://.../login"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-500"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Gebruiker</span>
              <input
                value={form.username}
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                placeholder="email of gebruikersnaam"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Rol</span>
              <input
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                placeholder="Admin, editor, klant..."
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-500"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Omgeving</span>
              <select
                value={form.environment}
                onChange={(event) => setForm((current) => ({ ...current, environment: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
              >
                <option value="test">Test</option>
                <option value="pilot">Pilot</option>
                <option value="productie">Productie</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
              >
                <option value="actief">Actief</option>
                <option value="tijdelijk">Tijdelijk</option>
                <option value="te_controleren">Te controleren</option>
                <option value="verlopen">Verlopen</option>
                <option value="ingetrokken">Ingetrokken</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-400">Secret</span>
            <input
              type="password"
              value={form.secretValue}
              onChange={(event) => setForm((current) => ({ ...current, secretValue: event.target.value }))}
              placeholder="Alleen invullen als backend secret key staat"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-400">Secret hint</span>
            <input
              value={form.secretHint}
              onChange={(event) => setForm((current) => ({ ...current, secretHint: event.target.value }))}
              placeholder="Bijv. gedeeld via veilige mail"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-400">Contactpersoon</span>
            <select
              value={form.contactId}
              onChange={(event) => setForm((current) => ({ ...current, contactId: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
            >
              <option value="">Niet gekoppeld</option>
              {contacts.map((contact) => (
                <option key={contact._id ?? contact.id} value={contact._id ?? contact.id}>{contact.naam}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-400">Project/opdracht</span>
            <select
              value={form.projectId || `workstream:${form.workstreamId}`}
              onChange={(event) => {
                const value = event.target.value;
                if (value.startsWith("workstream:")) {
                  setForm((current) => ({ ...current, projectId: "", workstreamId: value.replace("workstream:", "") }));
                } else {
                  setForm((current) => ({ ...current, projectId: value, workstreamId: "" }));
                }
              }}
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
            >
              <option value="">Niet gekoppeld</option>
              {projects.map((project) => (
                <option key={project._id ?? project.id} value={project._id ?? project.id}>Project: {project.naam}</option>
              ))}
              {workstreams.map((workstream) => (
                <option key={workstream._id ?? workstream.id} value={`workstream:${workstream._id ?? workstream.id}`}>
                  Opdracht: {workstream.titel}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Gecontroleerd</span>
              <input
                type="date"
                value={form.lastCheckedAt}
                onChange={(event) => setForm((current) => ({ ...current, lastCheckedAt: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Vervalt</span>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !form.title.trim()}
          className="btn mt-4 w-full border-transparent bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Toegang vastleggen
        </button>
      </form>
    </div>
  );
}

function AccessRow({ label: rowLabel, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-black/10 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-normal text-slate-500">{rowLabel}</p>
      <p className="mt-1 truncate text-xs font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function InfoPanel({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map(([rowLabel, value]) => (
          <div key={rowLabel} className="grid gap-1 text-sm sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] sm:gap-3">
            <span className="text-slate-500">{rowLabel}</span>
            <span className="min-w-0 break-words font-semibold text-slate-200 sm:text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function optionalPayload(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toExternalHref(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function WorkColumn({ title, empty, items }: { title: string; empty: string; items: { id: string; title: string; meta: string; body?: string | null }[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-white/10 bg-black/10 p-3">
              <p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
              {item.body ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{item.body}</p> : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">{empty}</p>
        )}
      </div>
    </div>
  );
}

function DocumentCard({ doc }: { doc: DossierDocumentItem }) {
  return (
    <a
      href={doc.pdf_url}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-amber-500/25 hover:bg-white/[0.06]"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-300">
          <FileCheck2 size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-white">{doc.titel}</span>
          <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>{doc.template_label ?? label(doc.context_type)}</span>
            <span aria-hidden="true">-</span>
            <span>{formatDate(doc.created_at)}</span>
          </span>
          {doc.notes ? <span className="mt-2 line-clamp-2 block text-sm leading-5 text-slate-400">{doc.notes}</span> : null}
        </span>
        <span className="hidden shrink-0 rounded-lg border border-white/10 bg-black/10 px-2.5 py-1 text-xs font-bold text-slate-300 transition group-hover:border-amber-500/25 group-hover:text-amber-200 sm:inline-flex">
          Open PDF
        </span>
      </div>
    </a>
  );
}

function isDossierDocumentForCompany(
  doc: DossierDocumentItem,
  companyId: string,
  companyName: string,
  leadIds: Set<string>,
  projectIds: Set<string>,
  workstreamIds: Set<string>
) {
  if (!companyId) return false;
  if (doc.company_id === companyId) return true;
  if (doc.context_id === companyId && ["company", "klant", "klantdossier", "laventecare_company"].includes(doc.context_type)) return true;
  if (doc.lead_id && leadIds.has(doc.lead_id)) return true;
  if (doc.project_id && projectIds.has(doc.project_id)) return true;
  if (doc.workstream_id && workstreamIds.has(doc.workstream_id)) return true;
  // Name-match fallback only for documents with NO id-based context at all. A
  // document already tied to another entity by id must not also be pulled into
  // this dossier by a coincidental or same-name title (cross-customer misfile).
  const hasIdContext = Boolean(doc.company_id || doc.context_id || doc.lead_id || doc.project_id || doc.workstream_id);
  if (hasIdContext) return false;
  return Boolean(doc.context_title && normalizeDossierText(doc.context_title) === normalizeDossierText(companyName));
}

function normalizeDossierText(value: string) {
  return value.trim().toLowerCase();
}

function buildTimeline(input: {
  company: CompanyItem | null;
  contacts: ContactItem[];
  leads: LeadItem[];
  workstreams: WorkstreamItem[];
  projects: ProjectItem[];
  actions: ActionItem[];
  documents: DossierDocumentItem[];
  activities: ActivityEventItem[];
  accessCredentials: AccessCredentialItem[];
}) {
  const items: TimelineItem[] = [];
  if (!input.company) return items;

  for (const event of input.activities) {
    items.push({
      id: `activity:${event.id}`,
      kind: event.event_type,
      title: event.title,
      body: event.body,
      date: event.occurred_at,
      meta: [
        event.contact_name,
        event.project_name,
        event.workstream_name,
        event.linked_action_title ? `→ actie: ${event.linked_action_title} (${label(event.linked_action_status ?? "")})` : null,
      ]
        .filter(Boolean)
        .join(" - "),
      tone: activityTone(event.event_type),
    });
  }

  for (const doc of input.documents) {
    items.push({
      id: `document:${doc.id}`,
      kind: "document",
      title: doc.titel,
      body: doc.notes,
      date: doc.created_at,
      meta: doc.template_label ?? label(doc.context_type),
      tone: "amber",
    });
  }

  for (const access of input.accessCredentials) {
    items.push({
      id: `access:${access._id ?? access.id}`,
      kind: "toegang",
      title: access.title,
      body: access.login_url,
      date: access.updated_at ?? access.created_at,
      meta: `${label(access.environment)} - ${label(access.status)}`,
      tone: access.status === "actief" ? "emerald" : "amber",
    });
  }

  for (const action of input.actions) {
    items.push({
      id: `action:${action._id ?? action.id}`,
      kind: "actie",
      title: action.title,
      body: action.summary,
      date: action.updatedAt ?? action.updated_at ?? action.created_at,
      meta: [
        `${label(action.status)} - ${label(action.priority)}`,
        action.due_date ? `Vervalt: ${formatDate(action.due_date)}${action.due_time ? ` ${action.due_time}` : ""}` : null,
        action.source_activity_title ? `← vanuit moment: ${action.source_activity_title}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      tone: action.status === "done" || action.status === "afgerond" ? "emerald" : "sky",
    });
  }

  for (const project of input.projects) {
    items.push({
      id: `project:${project._id ?? project.id}`,
      kind: "project",
      title: project.naam,
      body: project.samenvatting,
      date: project.updated_at ?? project.created_at,
      meta: `${label(project.fase)} - ${label(project.status)}`,
      tone: "violet",
    });
  }

  for (const workstream of input.workstreams) {
    items.push({
      id: `workstream:${workstream._id ?? workstream.id}`,
      kind: "opdracht",
      title: workstream.titel,
      body: workstream.volgende_stap ?? workstream.doel,
      date: workstream.updated_at ?? workstream.created_at,
      meta: `${label(workstream.type)} - ${label(workstream.status)}`,
      tone: "sky",
    });
  }

  for (const lead of input.leads) {
    items.push({
      id: `lead:${lead._id ?? lead.id}`,
      kind: "lead",
      title: lead.titel,
      body: lead.pijnpunt,
      date: lead.updated_at ?? lead.created_at,
      meta: `${label(lead.status)}${lead.prioriteit ? ` - ${label(lead.prioriteit)}` : ""}`,
      tone: "emerald",
    });
  }

  for (const contact of input.contacts) {
    items.push({
      id: `contact:${contact._id ?? contact.id}`,
      kind: "contact",
      title: contact.naam,
      body: contact.notities,
      date: contact.updated_at ?? contact.created_at,
      meta: contact.rol ?? "Contactpersoon",
      tone: "slate",
    });
  }

  items.push({
    id: `company:${input.company._id ?? input.company.id}`,
    kind: "klant",
    title: `${input.company.naam} aangemaakt`,
    body: input.company.notities,
    date: input.company.created_at,
    meta: label(input.company.relatie_type),
    tone: "amber",
  });

  return items
    .filter((item) => Boolean(item.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 40);
}

function activityTone(eventType: string): TimelineItem["tone"] {
  if (eventType === "meeting" || eventType === "contact" || eventType === "call") return "emerald";
  if (eventType === "email") return "sky";
  if (eventType === "besluit") return "violet";
  if (eventType === "project_update") return "amber";
  return "slate";
}

function toneClass(tone: TimelineItem["tone"]) {
  if (tone === "emerald") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  if (tone === "sky") return "border-sky-500/25 bg-sky-500/10 text-sky-300";
  if (tone === "violet") return "border-violet-500/25 bg-violet-500/10 text-violet-300";
  if (tone === "rose") return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  if (tone === "amber") return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  return "border-white/10 bg-white/[0.04] text-slate-300";
}

function timelineIcon(kind: string) {
  if (kind === "document") return <FileCheck2 size={16} />;
  if (kind === "project") return <FolderKanban size={16} />;
  if (kind === "opdracht") return <Workflow size={16} />;
  if (kind === "contact" || kind === "call" || kind === "meeting") return <UserRound size={16} />;
  if (kind === "email") return <Mail size={16} />;
  if (kind === "actie") return <CheckCircle2 size={16} />;
  if (kind === "lead") return <Activity size={16} />;
  if (kind === "toegang") return <KeyRound size={16} />;
  if (kind === "klant") return <Building2 size={16} />;
  return <CalendarClock size={16} />;
}
