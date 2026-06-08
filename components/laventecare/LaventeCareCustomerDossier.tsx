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
  LAVENTECARE_ACTIVITY_TYPES,
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

type DossierTab = "overview" | "timeline" | "work" | "documents";

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
};

export function LaventeCareCustomerDossier({
  isOpen,
  company,
  contacts,
  leads,
  workstreams,
  projects,
  actions,
  dossierDocuments,
  activityEvents,
  savingActivity,
  onClose,
  onEditCompany,
  onAddContact,
  onStartWorkstream,
  onCreateActivity,
}: {
  isOpen: boolean;
  company: CompanyItem | null;
  contacts: ContactItem[];
  leads: LeadItem[];
  workstreams: WorkstreamItem[];
  projects: ProjectItem[];
  actions: ActionItem[];
  dossierDocuments: DossierDocumentItem[];
  activityEvents: ActivityEventItem[];
  savingActivity: boolean;
  onClose: () => void;
  onEditCompany: (company: CompanyItem) => void;
  onAddContact: (company: CompanyItem) => void;
  onStartWorkstream: (company: CompanyItem) => void;
  onCreateActivity: (payload: LCActivityEventCreate) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<DossierTab>("timeline");
  const [form, setForm] = useState<ActivityFormState>(emptyActivityForm);
  const companyId = company?._id ?? company?.id ?? "";

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
        (doc) =>
          doc.company_id === companyId ||
          Boolean(doc.project_id && projectIds.has(doc.project_id)) ||
          Boolean(doc.workstream_id && workstreamIds.has(doc.workstream_id))
      ),
    [dossierDocuments, companyId, projectIds, workstreamIds]
  );
  const companyActivity = useMemo(
    () => activityEvents.filter((event) => event.company_id === companyId),
    [activityEvents, companyId]
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
      }),
    [company, companyActions, companyActivity, companyContacts, companyDocuments, companyLeads, companyProjects, companyWorkstreams]
  );

  if (!company) return null;

  const primaryContact = companyContacts.find((contact) => contact.is_primary) ?? companyContacts[0];
  const openWorkCount = companyLeads.length + companyWorkstreams.length + companyProjects.length;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) return;

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
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
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
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound size={13} />
                    {primaryContact.naam}
                  </span>
                  {primaryContact.email ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail size={13} />
                      {primaryContact.email}
                    </span>
                  ) : null}
                  {primaryContact.telefoon ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone size={13} />
                      {primaryContact.telefoon}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
              <button type="button" onClick={() => onEditCompany(company)} className="btn btn--ghost btn--sm justify-center">
                <Save size={14} />
                Bewerken
              </button>
              <button type="button" onClick={() => onAddContact(company)} className="btn btn--ghost btn--sm justify-center">
                <Plus size={14} />
                Contact
              </button>
              <button type="button" onClick={() => onStartWorkstream(company)} className="btn btn--primary btn--sm justify-center">
                <Workflow size={14} />
                Opdracht
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <DossierMetric label="Open werk" value={openWorkCount} detail="leads, opdrachten, projecten" />
            <DossierMetric label="Contacten" value={companyContacts.length} detail="gekoppelde personen" />
            <DossierMetric label="Documenten" value={companyDocuments.length} detail="vastgelegd dossier" />
            <DossierMetric label="Timeline" value={timeline.length} detail="momenten en events" />
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <TabButton active={activeTab === "timeline"} icon={History} label="Timeline" onClick={() => setActiveTab("timeline")} />
          <TabButton active={activeTab === "overview"} icon={Activity} label="Overzicht" onClick={() => setActiveTab("overview")} />
          <TabButton active={activeTab === "work"} icon={FolderKanban} label="Werk" onClick={() => setActiveTab("work")} />
          <TabButton active={activeTab === "documents"} icon={FileCheck2} label="Documenten" onClick={() => setActiveTab("documents")} />
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
              ["Laatste contact", formatDate(company.laatste_contact ?? undefined)],
              ["Volgende actie", company.volgende_actie ?? "Niet gevuld"],
            ]} />
            <InfoPanel title="Primaire contactpersoon" rows={[
              ["Naam", primaryContact?.naam ?? "Niet gevuld"],
              ["Rol", primaryContact?.rol ?? "Niet gevuld"],
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
                <a
                  key={doc.id}
                  href={doc.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
                >
                  <p className="text-sm font-bold text-white">{doc.titel}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {doc.template_label ?? label(doc.context_type)} - {formatDate(doc.created_at)}
                  </p>
                  {doc.notes ? <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-400">{doc.notes}</p> : null}
                </a>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-500">
                Nog geen PDF of dossierdocument vastgelegd voor deze klant.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function DossierMetric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
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
      className={cn(
        "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
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
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-500">
        Nog geen dossiermomenten. Log het eerste contactmoment om de klantgeschiedenis te starten.
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
    <form onSubmit={onSubmit} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
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
      </div>

      <button
        type="submit"
        disabled={saving || !form.title.trim()}
        className="btn mt-4 w-full border-transparent bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        Vastleggen
      </button>
    </form>
  );
}

function InfoPanel({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map(([rowLabel, value]) => (
          <div key={rowLabel} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-slate-500">{rowLabel}</span>
            <span className="max-w-[60%] text-right font-semibold text-slate-200">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
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

function buildTimeline(input: {
  company: CompanyItem | null;
  contacts: ContactItem[];
  leads: LeadItem[];
  workstreams: WorkstreamItem[];
  projects: ProjectItem[];
  actions: ActionItem[];
  documents: DossierDocumentItem[];
  activities: ActivityEventItem[];
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
      meta: [event.contact_name, event.project_name, event.workstream_name].filter(Boolean).join(" - "),
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

  for (const action of input.actions) {
    items.push({
      id: `action:${action._id ?? action.id}`,
      kind: "actie",
      title: action.title,
      body: action.summary,
      date: action.updatedAt ?? action.updated_at ?? action.created_at,
      meta: `${label(action.status)} - ${label(action.priority)}`,
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
  if (kind === "klant") return <Building2 size={16} />;
  return <CalendarClock size={16} />;
}
