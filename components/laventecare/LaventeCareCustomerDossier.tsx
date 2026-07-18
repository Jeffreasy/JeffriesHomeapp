"use client";

import { scrollElementIntoView } from "@/lib/ui/scroll";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { laventecareApi } from "@/lib/api";
import {
  Activity,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FolderKanban,
  History,
  KeyRound,
  Loader2,
  Mail,
  NotebookPen,
  Phone,
  Plus,
  ReceiptText,
  Save,
  UserRound,
  Workflow,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalCancelButton } from "@/components/ui/ModalCancelButton";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";
import { cn } from "@/lib/utils";
import { laventeCareQueryKeys } from "@/lib/laventecare/query-keys";
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
  type InvoiceItem,
  type LeadItem,
  type ProjectItem,
  type TimeEntryItem,
  type WorkstreamItem,
} from "./LaventeCareTypes";
import {
  formatCents,
  formatDate,
  formatMinutes,
  formatMoney,
  isDossierDocumentForCompany,
  isPastDate,
  label,
  projectFaseLabel,
  projectStatusLabel,
} from "./LaventeCareUtils";

type DossierTab = "overview" | "timeline" | "work" | "documents" | "access";
const DOSSIER_TABS = [
  { id: "overview", label: "Overzicht", icon: Activity },
  { id: "timeline", label: "Timeline", icon: History },
  { id: "work", label: "Werk", icon: FolderKanban },
  { id: "documents", label: "Documenten", icon: FileCheck2 },
  { id: "access", label: "Toegang", icon: KeyRound },
] satisfies ReadonlyArray<{ id: DossierTab; label: string; icon: typeof Activity }>;

// M-J: groepen voor de timeline-filterchips.
type TimelineGroup =
  | "moment"
  | "actie"
  | "document"
  | "werk"
  | "uren"
  | "factuur"
  | "relatie";

type TimelineItem = {
  id: string;
  kind: string;
  group: TimelineGroup;
  title: string;
  body?: string | null;
  date: string;
  meta?: string;
  /** M-L: klikbare verwijzing naar een ander timeline-item (moment↔actie). */
  link?: { label: string; targetId: string };
  tone: UiTone;
};

const TIMELINE_GROUPS: Array<{ key: TimelineGroup; label: string }> = [
  { key: "moment", label: "Momenten" },
  { key: "actie", label: "Acties" },
  { key: "document", label: "Documenten" },
  { key: "werk", label: "Werk" },
  { key: "uren", label: "Uren" },
  { key: "factuur", label: "Facturen" },
  { key: "relatie", label: "Relatie" },
];

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

const DOSSIER_ACTIVITY_FORM_ID = "laventecare-dossier-activity-form";
const DOSSIER_ACCESS_FORM_ID = "laventecare-dossier-access-form";

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
  timeEntries = [],
  invoices = [],
  savingActivity,
  savingAccessCredential,
  updatingAccessCredentialId,
  onClose,
  onEditCompany,
  onAddContact,
  onStartWorkstream,
  onOpenCommerce,
  onCreateActivity,
  onCreateAccessCredential,
  onUpdateAccessCredential,
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
  /** M-J: uren en facturen van deze klant als timeline-soorten. */
  timeEntries?: TimeEntryItem[];
  invoices?: InvoiceItem[];
  savingActivity: boolean;
  savingAccessCredential: boolean;
  updatingAccessCredentialId?: string | null;
  onClose: () => void;
  onEditCompany: (company: CompanyItem) => void;
  onAddContact: (company: CompanyItem) => void;
  onStartWorkstream: (company: CompanyItem) => void;
  /** R3-maandafsluiting: open Commercie met deze klant voorgeselecteerd. */
  onOpenCommerce?: (company: CompanyItem) => void;
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
  onUpdateAccessCredential?: (
    id: string,
    data: { status?: string; secret_label?: string; secret_hint?: string; notes?: string },
  ) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<DossierTab>("overview");
  const [form, setForm] = useState<ActivityFormState>(emptyActivityForm);
  // M-B: dirty-status van het toegang-formulier (leeft in AccessCredentialPanel),
  // gelift zodat de modal-dirty-guard hem meeneemt.
  const [accessFormDirty, setAccessFormDirty] = useState(false);
  const [accessFormCanSubmit, setAccessFormCanSubmit] = useState(false);
  const companyId = company?._id ?? company?.id ?? "";

  // R3-9: per-klant activiteit + toegang direct uit de list-endpoints, i.p.v.
  // de globaal op 30 afgekapte cockpit-payload (waar een drukke klant de rest
  // uit de timeline/credentials verdringt). Alleen actief zolang het dossier
  // open is.
  const { data: companyActivityData } = useQuery({
    queryKey: laventeCareQueryKeys.companyActivity.detail(companyId),
    queryFn: () => laventecareApi.listActivityEvents({ companyId, limit: 250 }),
    enabled: isOpen && Boolean(companyId),
    staleTime: 15_000,
  });
  const { data: companyAccessData } = useQuery({
    queryKey: laventeCareQueryKeys.companyAccessCredentials.detail(companyId),
    queryFn: () => laventecareApi.listAccessCredentials({ companyId, limit: 250 }),
    enabled: isOpen && Boolean(companyId),
    staleTime: 15_000,
  });

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
    () =>
      // R3-9: prefereer de uncapped per-klant-query; val terug op de cockpit-
      // lijst zolang die nog laadt.
      (companyActivityData ??
        activityEvents.filter((event) => event.company_id === companyId)) as ActivityEventItem[],
    [companyActivityData, activityEvents, companyId]
  );
  const companyAccess = useMemo(
    () =>
      (companyAccessData
        ? companyAccessData.map((item) => ({ ...item, _id: item.id }))
        : accessCredentials.filter((item) => item.company_id === companyId)) as AccessCredentialItem[],
    [companyAccessData, accessCredentials, companyId]
  );
  // M-J: uren en facturen van deze klant (direct of via project/opdracht).
  const companyTimeEntries = useMemo(
    () =>
      timeEntries.filter(
        (entry) =>
          entry.company_id === companyId ||
          Boolean(entry.project_id && projectIds.has(entry.project_id)) ||
          Boolean(entry.workstream_id && workstreamIds.has(entry.workstream_id))
      ),
    [timeEntries, companyId, projectIds, workstreamIds]
  );
  const companyInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.company_id === companyId ||
          Boolean(invoice.project_id && projectIds.has(invoice.project_id)) ||
          Boolean(invoice.workstream_id && workstreamIds.has(invoice.workstream_id))
      ),
    [invoices, companyId, projectIds, workstreamIds]
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
        timeEntries: companyTimeEntries,
        invoices: companyInvoices,
      }),
    [company, companyAccess, companyActions, companyActivity, companyContacts, companyDocuments, companyInvoices, companyLeads, companyProjects, companyTimeEntries, companyWorkstreams]
  );

  if (!company) return null;

  const primaryContact = companyContacts.find((contact) => contact.is_primary) ?? companyContacts[0];
  const openWorkCount = companyLeads.length + companyWorkstreams.length + companyProjects.length;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingActivity || !form.title.trim()) return;
    if (form.createFollowUp && !form.followUpTitle.trim()) return;

    // M-C: alleen resetten na een geslaagde save — bij een fout (de pagina
    // toont al een toast en rethrowt) blijft de invoer staan.
    try {
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
    } catch {
      return;
    }
    setForm(emptyActivityForm);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      // M-B: de guard dekt zowel het moment-formulier als het
      // toegang-formulier (dat zijn dirty-status hierheen lift).
      dirty={JSON.stringify(form) !== JSON.stringify(emptyActivityForm) || accessFormDirty}
      dirtyMessage="Het dossier bevat niet-opgeslagen formulierinvoer."
      title={`Klantdossier: ${company.naam}`}
      icon={<Building2 size={18} className="text-[var(--color-primary-hover)]" />}
      tone="accent"
      maxWidth="4xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ModalCancelButton onFallback={onClose} className="w-full sm:w-auto">
            {activeTab === "timeline" || activeTab === "access" ? "Annuleren" : "Sluiten"}
          </ModalCancelButton>
          {activeTab === "timeline" ? (
            <Button
              type="submit"
              form={DOSSIER_ACTIVITY_FORM_ID}
              variant="primary"
              loading={savingActivity}
              loadingLabel="Vastleggen..."
              disabled={!form.title.trim() || (form.createFollowUp && !form.followUpTitle.trim())}
              className="w-full sm:w-auto"
            >
              <Plus size={15} aria-hidden="true" />
              Vastleggen
            </Button>
          ) : null}
          {activeTab === "access" ? (
            <Button
              type="submit"
              form={DOSSIER_ACCESS_FORM_ID}
              variant="primary"
              loading={savingAccessCredential}
              loadingLabel="Toegang vastleggen..."
              disabled={!accessFormCanSubmit}
              className="w-full sm:w-auto"
            >
              <Plus size={15} aria-hidden="true" />
              Toegang vastleggen
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 sm:p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary-hover)]">
                  {label(company.relatie_type)}
                </span>
                <span className="rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--color-success)]">
                  {label(company.status)}
                </span>
                {company.sector ? (
                  <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs font-bold text-[var(--color-text-muted)]">
                    {company.sector}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
                {company.notities || "Nog geen klantcontext vastgelegd. Log een moment of voeg notities toe zodat Brain dit dossier beter begrijpt."}
              </p>
              {primaryContact ? (
                <div className="mt-3 grid gap-2 text-xs text-[var(--color-text-muted)] sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
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
              <Button
                type="button"
                onClick={() => onEditCompany(company)}
                variant="ghost" size="sm"
                aria-label={`${company.naam} bewerken`}
                title="Klant bewerken"
              >
                <Save size={14} />
                <span className="hidden sm:inline">Bewerken</span>
              </Button>
              <Button
                type="button"
                onClick={() => onAddContact(company)}
                variant="ghost" size="sm"
                aria-label={`Contact toevoegen aan ${company.naam}`}
                title="Contact toevoegen"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Contact</span>
              </Button>
              <Button
                type="button"
                onClick={() => onStartWorkstream(company)}
                variant="primary" size="sm"
                aria-label={`Nieuwe opdracht voor ${company.naam}`}
                title="Nieuwe opdracht"
              >
                <Workflow size={14} />
                <span className="hidden sm:inline">Opdracht</span>
              </Button>
              {onOpenCommerce ? (
                <Button
                  type="button"
                  onClick={() => onOpenCommerce(company)}
                  variant="ghost" size="sm"
                  aria-label={`Open Commercie voor ${company.naam}`}
                  title="Open in Commercie (klant voorgeselecteerd)"
                >
                  <ReceiptText size={14} />
                  <span className="hidden sm:inline">Commercie</span>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <DossierMetric label="Open werk" value={openWorkCount} detail="leads, opdrachten, projecten" />
            <DossierMetric label="Contacten" value={companyContacts.length} detail="gekoppelde personen" />
            <DossierMetric label="Documenten" value={companyDocuments.length} detail="vastgelegd dossier" />
            <DossierMetric label="Toegang" value={companyAccess.length} detail="accounts en portalen" />
          </div>
        </section>

        <Tabs
          items={DOSSIER_TABS}
          value={activeTab}
          onValueChange={setActiveTab}
          idPrefix="laventecare-dossier"
          ariaLabel="Klantdossier onderdelen"
          appearance="contained"
        />

        {activeTab === "timeline" ? (
          <TabPanel idPrefix="laventecare-dossier" value="timeline" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
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
          </TabPanel>
        ) : null}

        {activeTab === "overview" ? (
          <TabPanel idPrefix="laventecare-dossier" value="overview" className="grid gap-3 md:grid-cols-2">
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
          </TabPanel>
        ) : null}

        {activeTab === "work" ? (
          <TabPanel idPrefix="laventecare-dossier" value="work" className="grid gap-3 lg:grid-cols-3">
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
              meta: `${projectFaseLabel(project.fase)} - ${formatMoney(project.waarde_indicatie ?? undefined)}`,
              body: project.samenvatting,
            }))} />
          </TabPanel>
        ) : null}

        {activeTab === "documents" ? (
          <TabPanel idPrefix="laventecare-dossier" value="documents" className="space-y-3">
            {companyDocuments.length > 0 ? (
              companyDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  // L8: bij meerdere versies van dezelfde template is direct
                  // zichtbaar welke de nieuwste is.
                  versionBadge={documentVersionBadge(doc, companyDocuments)}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 text-sm text-[var(--color-text-muted)]">
                Nog geen PDF of dossierdocument vastgelegd voor deze klant.
              </div>
            )}
          </TabPanel>
        ) : null}

        {/* Blijft gemount (alleen visueel verborgen) zodat een half ingevuld
            toegang-formulier een tabwissel binnen het dossier overleeft en de
            dirty-guard (M-B) waarheidsgetrouw is. */}
        <TabPanel
          idPrefix="laventecare-dossier"
          value="access"
          className={activeTab === "access" ? undefined : "hidden"}
        >
          <AccessCredentialPanel
            companyId={companyId}
            contacts={companyContacts}
            projects={companyProjects}
            workstreams={companyWorkstreams}
            credentials={companyAccess}
            defaultLoginUrl={company.default_login_url ?? company.portal_url ?? ""}
            saving={savingAccessCredential}
            updatingCredentialId={updatingAccessCredentialId}
            onCreate={onCreateAccessCredential}
            onUpdate={onUpdateAccessCredential}
            onDirtyChange={setAccessFormDirty}
            onCanSubmitChange={setAccessFormCanSubmit}
          />
        </TabPanel>
      </div>
    </Modal>
  );
}

function DossierMetric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-active)] p-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[var(--color-text)]">{value}</p>
      <p className="mt-0.5 truncate text-micro text-[var(--color-text-muted)]">{detail}</p>
    </div>
  );
}

const TIMELINE_INITIAL_COUNT = 40;

function TimelineList({ timeline }: { timeline: TimelineItem[] }) {
  const [showAll, setShowAll] = useState(false);
  // M-J: filterchips per soort timeline-item.
  const [groupFilter, setGroupFilter] = useState<TimelineGroup | null>(null);
  // M-L: kort gehighlight item na een moment↔actie-sprong.
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current);
    },
    []
  );

  if (timeline.length === 0) {
    return (
      <div className="order-2 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 text-sm text-[var(--color-text-muted)] lg:order-1">
        Nog geen dossiermomenten. Log het eerste contactmoment om de klantgeschiedenis te starten.
      </div>
    );
  }

  const presentGroups = TIMELINE_GROUPS.filter((group) =>
    timeline.some((item) => item.group === group.key)
  );
  const filtered = groupFilter
    ? timeline.filter((item) => item.group === groupFilter)
    : timeline;
  const visible = showAll ? filtered : filtered.slice(0, TIMELINE_INITIAL_COUNT);

  // M-L: spring naar het gelinkte item — filter en afkapping eerst opheffen,
  // daarna scrollen en kort highlighten.
  const jumpTo = (targetId: string) => {
    setGroupFilter(null);
    setShowAll(true);
    window.setTimeout(() => {
      const element = document.getElementById(`dossier-timeline-${targetId}`);
      if (!element) return;
      scrollElementIntoView(element, { block: "center" });
      setHighlightId(targetId);
      if (highlightTimer.current !== null) window.clearTimeout(highlightTimer.current);
      highlightTimer.current = window.setTimeout(() => setHighlightId(null), 2200);
    }, 60);
  };

  return (
    <div className="order-2 space-y-3 lg:order-1">
      {presentGroups.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={groupFilter === null ? "primary" : "secondary"}
            onClick={() => setGroupFilter(null)}
            aria-pressed={groupFilter === null}
            className="rounded-full"
          >
            Alles ({timeline.length})
          </Button>
          {presentGroups.map((group) => {
            const count = timeline.filter((item) => item.group === group.key).length;
            return (
              <Button
                key={group.key}
                type="button"
                size="sm"
                variant={groupFilter === group.key ? "primary" : "secondary"}
                onClick={() =>
                  setGroupFilter((current) => (current === group.key ? null : group.key))
                }
                aria-pressed={groupFilter === group.key}
                className="rounded-full"
              >
                {group.label} ({count})
              </Button>
            );
          })}
        </div>
      ) : null}
      {visible.map((item) => (
        <div
          key={item.id}
          id={`dossier-timeline-${item.id}`}
          className={cn(
            "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 transition-colors duration-[var(--motion-slow)]",
            highlightId === item.id && "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)]"
          )}
        >
          <div className="flex gap-3">
            <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", toneClass(item.tone))}>
              {timelineIcon(item.kind)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-micro font-bold uppercase tracking-normal text-[var(--color-text-muted)]">
                  {label(item.kind)}
                </span>
                <span className="text-xs font-semibold text-[var(--color-text-muted)]">{formatDate(item.date)}</span>
              </div>
              <h3 className="mt-2 line-clamp-2 text-sm font-bold text-[var(--color-text)]">{item.title}</h3>
              {item.meta ? <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">{item.meta}</p> : null}
              {item.link ? (
                <TimelineLinkButton link={item.link} onJump={jumpTo} />
              ) : null}
              {item.body ? <p className="mt-2 line-clamp-3 text-sm leading-5 text-[var(--color-text-muted)]">{item.body}</p> : null}
            </div>
          </div>
        </div>
      ))}
      {filtered.length > TIMELINE_INITIAL_COUNT ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          fullWidth
          onClick={() => setShowAll((value) => !value)}
          aria-expanded={showAll}
        >
          {showAll
            ? "Toon minder"
            : `Toon alle ${filtered.length} momenten`}
        </Button>
      ) : null}
    </div>
  );
}

// M-L: klikbare moment↔actie-verwijzing binnen de dossiertimeline.
function TimelineLinkButton({
  link,
  onJump,
}: {
  link: { label: string; targetId: string };
  onJump: (targetId: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => onJump(link.targetId)}
      className="mt-1 max-w-full justify-start px-0 text-left text-[var(--color-info)] underline decoration-[var(--color-info)] underline-offset-2"
    >
      <span className="truncate">{link.label}</span>
    </Button>
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
    <form
      id={DOSSIER_ACTIVITY_FORM_ID}
      onSubmit={onSubmit}
      aria-busy={saving || undefined}
      className="order-1 rounded-xl border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] p-4 lg:order-2 lg:sticky lg:top-4"
    >
      <div className="flex items-center gap-2">
        <NotebookPen size={16} className="text-[var(--color-primary-hover)]" />
        <h3 className="text-sm font-bold text-[var(--color-text)]">Moment loggen</h3>
      </div>

      <div className="mt-4 space-y-3">
        <FormField
          id="dossier-activity-type"
          label="Type"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              value={form.eventType}
              onChange={(event) => setForm((current) => ({ ...current, eventType: event.target.value }))}
            >
              {LAVENTECARE_ACTIVITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          id="dossier-activity-title"
          label="Titel"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Bijv. Scope afgestemd"
            />
          )}
        </FormField>

        <FormField
          id="dossier-activity-notes"
          label="Notitie"
        >
          {(controlProps) => (
            <Textarea
              {...controlProps}
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              rows={4}
              placeholder="Wat is er besproken, besloten of afgesproken?"
            />
          )}
        </FormField>

        <FormField
          id="dossier-activity-occurred-at"
          label="Datum/tijd"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="datetime-local"
              value={form.occurredAt}
              onChange={(event) => setForm((current) => ({ ...current, occurredAt: event.target.value }))}
            />
          )}
        </FormField>

        <FormField
          id="dossier-activity-contact"
          label="Contactpersoon"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              value={form.contactId}
              onChange={(event) => setForm((current) => ({ ...current, contactId: event.target.value }))}
            >
              <option value="">Geen specifieke contactpersoon</option>
              {contacts.map((contact) => (
                <option key={contact._id ?? contact.id} value={contact._id ?? contact.id}>
                  {contact.naam}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          id="dossier-activity-context"
          label="Project/opdracht"
        >
          {(controlProps) => (
            <Select
              {...controlProps}
              value={form.projectId || `workstream:${form.workstreamId}`}
              onChange={(event) => {
                const value = event.target.value;
                if (value.startsWith("workstream:")) {
                  setForm((current) => ({ ...current, projectId: "", workstreamId: value.replace("workstream:", "") }));
                } else {
                  setForm((current) => ({ ...current, projectId: value, workstreamId: "" }));
                }
              }}
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
            </Select>
          )}
        </FormField>

        <Checkbox
          label="Vervolgactie aanmaken vanuit dit moment"
          checked={form.createFollowUp}
          onChange={(event) => {
            const checked = event.target.checked;
            setForm((current) => ({
              ...current,
              createFollowUp: checked,
              followUpTitle:
                checked && !current.followUpTitle && current.title
                  ? `Opvolgen: ${current.title}`
                  : current.followUpTitle,
            }));
          }}
          className="border border-[var(--color-border)] bg-[var(--color-surface-muted)]"
        />

        {form.createFollowUp ? (
          <div className="space-y-3 rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] p-3">
            <FormField
              id="dossier-activity-follow-up-title"
              label="Actie-titel"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  value={form.followUpTitle}
                  onChange={(event) => setForm((current) => ({ ...current, followUpTitle: event.target.value }))}
                  placeholder="Bijv. Prijsindicatie terugkoppelen"
                />
              )}
            </FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField
                id="dossier-activity-follow-up-due-date"
                label="Vervaldatum"
              >
                {(controlProps) => (
                  <Input
                    {...controlProps}
                    type="date"
                    value={form.followUpDueDate}
                    onChange={(event) => setForm((current) => ({ ...current, followUpDueDate: event.target.value }))}
                  />
                )}
              </FormField>
              <FormField
                id="dossier-activity-follow-up-due-time"
                label="Tijdstip"
              >
                {(controlProps) => (
                  <Input
                    {...controlProps}
                    type="time"
                    value={form.followUpDueTime}
                    onChange={(event) => setForm((current) => ({ ...current, followUpDueTime: event.target.value }))}
                  />
                )}
              </FormField>
            </div>
            <FormField
              id="dossier-activity-follow-up-priority"
              label="Prioriteit"
            >
              {(controlProps) => (
                <Select
                  {...controlProps}
                  value={form.followUpPriority}
                  onChange={(event) => setForm((current) => ({ ...current, followUpPriority: event.target.value }))}
                >
                  <option value="laag">Laag</option>
                  <option value="normaal">Normaal</option>
                  <option value="hoog">Hoog</option>
                </Select>
              )}
            </FormField>
          </div>
        ) : null}
      </div>
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
  updatingCredentialId,
  onCreate,
  onUpdate,
  onDirtyChange,
  onCanSubmitChange,
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
  updatingCredentialId?: string | null;
  onUpdate?: (
    id: string,
    data: { status?: string; secret_label?: string; secret_hint?: string; notes?: string },
  ) => Promise<void>;
  /** M-B: lift de dirty-status naar de dossier-modal-guard. */
  onDirtyChange?: (dirty: boolean) => void;
  onCanSubmitChange?: (canSubmit: boolean) => void;
}) {
  const [form, setForm] = useState<AccessCredentialForm>({
    ...emptyAccessCredentialForm,
    companyId,
    loginUrl: defaultLoginUrl,
  });

  // M-B: dirty t.o.v. de (geprefillde) beginstand van dit dossier.
  const baseline = JSON.stringify({
    ...emptyAccessCredentialForm,
    companyId,
    loginUrl: defaultLoginUrl,
  });
  const dirty = JSON.stringify(form) !== baseline;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onCanSubmitChange?.(Boolean(form.title.trim()));
  }, [form.title, onCanSubmitChange]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !form.title.trim()) return;
    // M-C: alleen resetten na een geslaagde save — bij een fout (de pagina
    // toont al een toast en rethrowt) blijft de invoer staan.
    try {
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
    } catch {
      return;
    }
    setForm({ ...emptyAccessCredentialForm, companyId, loginUrl: defaultLoginUrl });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">
        {credentials.length > 0 ? (
          credentials.map((item) => (
            <AccessCredentialCard
              key={item._id ?? item.id}
              item={item}
              busy={updatingCredentialId === (item._id ?? item.id)}
              onUpdate={onUpdate}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 text-sm leading-6 text-[var(--color-text-muted)]">
            Nog geen toegang vastgelegd. Leg pilotaccounts, portalen en tijdelijke rollen hier vast zodat mails, dossiers en AI-context niet afhankelijk zijn van losse notities.
          </div>
        )}
      </div>

      <form
        id={DOSSIER_ACCESS_FORM_ID}
        onSubmit={handleSubmit}
        aria-busy={saving || undefined}
        className="rounded-xl border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] p-4 lg:sticky lg:top-4"
      >
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-[var(--color-primary-hover)]" />
          <h3 className="text-sm font-bold text-[var(--color-text)]">Toegang toevoegen</h3>
        </div>

        <div className="mt-4 space-y-3">
          <FormField
            id="dossier-credential-title"
            label="Titel"
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Pilot admin, WordPress beheer, klantportaal..."
              />
            )}
          </FormField>
          <FormField
            id="dossier-credential-login-url"
            label="Login URL"
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                value={form.loginUrl}
                onChange={(event) => setForm((current) => ({ ...current, loginUrl: event.target.value }))}
                placeholder="https://.../login"
              />
            )}
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <FormField
              id="dossier-credential-username"
              label="Gebruiker"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  value={form.username}
                  onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
                  placeholder="email of gebruikersnaam"
                />
              )}
            </FormField>
            <FormField
              id="dossier-credential-role"
              label="Rol"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                  placeholder="Admin, editor, klant..."
                />
              )}
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <FormField
              id="dossier-credential-environment"
              label="Omgeving"
            >
              {(controlProps) => (
                <Select
                  {...controlProps}
                  value={form.environment}
                  onChange={(event) => setForm((current) => ({ ...current, environment: event.target.value }))}
                >
                  <option value="test">Test</option>
                  <option value="pilot">Pilot</option>
                  <option value="productie">Productie</option>
                </Select>
              )}
            </FormField>
            <FormField
              id="dossier-credential-status"
              label="Status"
            >
              {(controlProps) => (
                <Select
                  {...controlProps}
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="actief">Actief</option>
                  <option value="tijdelijk">Tijdelijk</option>
                  <option value="te_controleren">Te controleren</option>
                  <option value="verlopen">Verlopen</option>
                  <option value="ingetrokken">Ingetrokken</option>
                </Select>
              )}
            </FormField>
          </div>
          <FormField
            id="dossier-credential-secret"
            label="Secret"
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                type="password"
                value={form.secretValue}
                onChange={(event) => setForm((current) => ({ ...current, secretValue: event.target.value }))}
                placeholder="Alleen invullen als backend secret key staat"
              />
            )}
          </FormField>
          <FormField
            id="dossier-credential-secret-hint"
            label="Secret hint"
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                value={form.secretHint}
                onChange={(event) => setForm((current) => ({ ...current, secretHint: event.target.value }))}
                placeholder="Bijv. gedeeld via veilige mail"
              />
            )}
          </FormField>
          <FormField
            id="dossier-credential-contact"
            label="Contactpersoon"
          >
            {(controlProps) => (
              <Select
                {...controlProps}
                value={form.contactId}
                onChange={(event) => setForm((current) => ({ ...current, contactId: event.target.value }))}
              >
                <option value="">Niet gekoppeld</option>
                {contacts.map((contact) => (
                  <option key={contact._id ?? contact.id} value={contact._id ?? contact.id}>{contact.naam}</option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField
            id="dossier-credential-context"
            label="Project/opdracht"
          >
            {(controlProps) => (
              <Select
                {...controlProps}
                value={form.projectId || `workstream:${form.workstreamId}`}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value.startsWith("workstream:")) {
                    setForm((current) => ({ ...current, projectId: "", workstreamId: value.replace("workstream:", "") }));
                  } else {
                    setForm((current) => ({ ...current, projectId: value, workstreamId: "" }));
                  }
                }}
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
              </Select>
            )}
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <FormField
              id="dossier-credential-last-checked-at"
              label="Gecontroleerd"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  type="date"
                  value={form.lastCheckedAt}
                  onChange={(event) => setForm((current) => ({ ...current, lastCheckedAt: event.target.value }))}
                />
              )}
            </FormField>
            <FormField
              id="dossier-credential-expires-at"
              label="Vervalt"
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  type="date"
                  value={form.expiresAt}
                  onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                />
              )}
            </FormField>
          </div>
        </div>
      </form>
    </div>
  );
}

const ACCESS_CREDENTIAL_STATUSES = [
  { value: "actief", label: "Actief" },
  { value: "tijdelijk", label: "Tijdelijk" },
  { value: "te_controleren", label: "Te controleren" },
  { value: "verlopen", label: "Verlopen" },
  { value: "ingetrokken", label: "Ingetrokken" },
] as const;

// Wires the (previously unused) update-mutation into the credential cards:
// quick status changes (verlopen/ingetrokken/...) plus editing label & hint.
function AccessCredentialCard({
  item,
  busy,
  onUpdate,
}: {
  item: AccessCredentialItem;
  busy: boolean;
  onUpdate?: (
    id: string,
    data: { status?: string; secret_label?: string; secret_hint?: string; notes?: string },
  ) => Promise<void>;
}) {
  const id = item._id ?? item.id;
  const [editing, setEditing] = useState(false);
  const [secretLabel, setSecretLabel] = useState(item.secret_label ?? "");
  const [secretHint, setSecretHint] = useState(item.secret_hint ?? "");

  const startEdit = () => {
    setSecretLabel(item.secret_label ?? "");
    setSecretHint(item.secret_hint ?? "");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!onUpdate || !id) return;
    await onUpdate(id, {
      secret_label: secretLabel.trim() || undefined,
      secret_hint: secretHint.trim() || undefined,
    });
    setEditing(false);
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-[var(--color-primary-hover)]" />
            <h3 className="truncate text-sm font-bold text-[var(--color-text)]">{item.title}</h3>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {label(item.environment)} - {label(item.status)}
            {item.role ? ` - ${item.role}` : ""}
          </p>
        </div>
        <span className={cn(
          "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-micro font-bold",
          item.secret_configured
            ? "border-[var(--color-success-border)] bg-[var(--color-success-subtle)] text-[var(--color-success)]"
            : "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]"
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
          className="mt-3 block truncate rounded-lg border border-[var(--color-info-border)] bg-[var(--color-info-subtle)] px-3 py-2 text-xs font-bold text-[var(--color-info)] transition-colors hover:bg-[var(--color-info-border)]"
        >
          {item.login_url}
        </a>
      ) : null}
      {item.notes ? <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">{item.notes}</p> : null}

      {onUpdate && id ? (
        <div className="mt-3 border-t border-[var(--color-border)] pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <FormField
              id={`access-credential-${id}-status`}
              label="Status"
              className="min-w-0 flex-1 sm:max-w-48"
            >
              {(controlProps) => (
                <Select
                  {...controlProps}
                  value={item.status}
                  disabled={busy}
                  onChange={(event) => {
                    void onUpdate(id, { status: event.target.value });
                  }}
                  density="compact"
                >
                  {ACCESS_CREDENTIAL_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                  {ACCESS_CREDENTIAL_STATUSES.every((status) => status.value !== item.status) ? (
                    <option value={item.status}>{label(item.status)}</option>
                  ) : null}
                </Select>
              )}
            </FormField>
            <Button type="button" variant="secondary" size="sm" onClick={() => (editing ? setEditing(false) : startEdit())} disabled={busy}>
              {editing ? "Annuleren" : "Label/hint bewerken"}
            </Button>
            {busy ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none text-[var(--color-text-muted)]" /> : null}
          </div>
          {editing ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <FormField
                id={`access-credential-${id}-secret-label`}
                label="Secret label"
              >
                {(controlProps) => (
                  <Input
                    {...controlProps}
                    value={secretLabel}
                    onChange={(event) => setSecretLabel(event.target.value)}
                    placeholder="wachtwoord, API key..."
                  />
                )}
              </FormField>
              <FormField
                id={`access-credential-${id}-secret-hint`}
                label="Secret hint"
              >
                {(controlProps) => (
                  <Input
                    {...controlProps}
                    value={secretHint}
                    onChange={(event) => setSecretHint(event.target.value)}
                    placeholder="Bijv. gedeeld via veilige mail"
                  />
                )}
              </FormField>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void saveEdit()}
                loading={busy}
                loadingLabel="Wijzigingen opslaan"
                className="sm:col-span-2"
              >
                <Save size={13} aria-hidden="true" />
                Wijzigingen opslaan
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AccessRow({ label: rowLabel, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-active)] px-3 py-2">
      <p className="text-micro font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">{rowLabel}</p>
      <p className="mt-1 truncate text-xs font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function InfoPanel({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <h3 className="text-sm font-bold text-[var(--color-text)]">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.map(([rowLabel, value]) => (
          <div key={rowLabel} className="grid gap-1 text-sm sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] sm:gap-3">
            <span className="text-[var(--color-text-muted)]">{rowLabel}</span>
            <span className="min-w-0 break-words font-semibold text-[var(--color-text)] sm:text-right">{value}</span>
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
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
      <h3 className="text-sm font-bold text-[var(--color-text)]">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-active)] p-3">
              <p className="line-clamp-2 text-sm font-semibold text-[var(--color-text)]">{item.title}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{item.meta}</p>
              {item.body ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--color-text-muted)]">{item.body}</p> : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">{empty}</p>
        )}
      </div>
    </div>
  );
}

// L8: bij meerdere dossierstukken met dezelfde document_key krijgt het
// recentste stuk "Nieuwste versie" en de rest "Oudere versie".
function documentVersionBadge(
  doc: DossierDocumentItem,
  allDocuments: DossierDocumentItem[]
): "nieuwste" | "ouder" | null {
  const siblings = allDocuments.filter((item) => item.document_key === doc.document_key);
  if (siblings.length < 2) return null;
  const newest = siblings.reduce((latest, item) =>
    (item.created_at ?? "") > (latest.created_at ?? "") ? item : latest
  );
  return newest.id === doc.id ? "nieuwste" : "ouder";
}

function DocumentCard({
  doc,
  versionBadge,
}: {
  doc: DossierDocumentItem;
  versionBadge?: "nieuwste" | "ouder" | null;
}) {
  return (
    <a
      href={doc.pdf_url}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 transition-colors hover:border-[var(--color-primary-border)] hover:bg-[var(--color-surface-hover)]"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]">
          <FileCheck2 size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-bold text-[var(--color-text)]">{doc.titel}</span>
            {versionBadge ? (
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-micro font-bold",
                  versionBadge === "nieuwste"
                    ? "border-[var(--color-success-border)] bg-[var(--color-success-subtle)] text-[var(--color-success)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
                )}
              >
                {versionBadge === "nieuwste" ? "Nieuwste versie" : "Oudere versie"}
              </span>
            ) : null}
          </span>
          <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)]">
            <span>{doc.template_label ?? label(doc.context_type)}</span>
            <span aria-hidden="true">-</span>
            <span>{formatDate(doc.created_at)}</span>
          </span>
          {doc.notes ? <span className="mt-2 line-clamp-2 block text-sm leading-5 text-[var(--color-text-muted)]">{doc.notes}</span> : null}
        </span>
        <span className="hidden shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-active)] px-2.5 py-1 text-xs font-bold text-[var(--color-text-muted)] transition-colors group-hover:border-[var(--color-primary-border)] group-hover:text-[var(--color-primary-hover)] sm:inline-flex">
          Open PDF
        </span>
      </div>
    </a>
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
  accessCredentials: AccessCredentialItem[];
  timeEntries: TimeEntryItem[];
  invoices: InvoiceItem[];
}) {
  const items: TimelineItem[] = [];
  if (!input.company) return items;

  for (const event of input.activities) {
    items.push({
      id: `activity:${event.id}`,
      kind: event.event_type,
      group: "moment",
      title: event.title,
      body: event.body,
      date: event.occurred_at,
      meta: [
        event.contact_name,
        event.project_name,
        event.workstream_name,
      ]
        .filter(Boolean)
        .join(" - "),
      // M-L: klikbaar — springt naar de gekoppelde actie in deze timeline.
      link:
        event.action_item_id && event.linked_action_title
          ? {
              label: `→ actie: ${event.linked_action_title} (${label(event.linked_action_status ?? "")})`,
              targetId: `action:${event.action_item_id}`,
            }
          : undefined,
      tone: activityTone(event.event_type),
    });
  }

  for (const doc of input.documents) {
    items.push({
      id: `document:${doc.id}`,
      kind: "document",
      group: "document",
      title: doc.titel,
      body: doc.notes,
      date: doc.created_at,
      meta: doc.template_label ?? label(doc.context_type),
      tone: "accent",
    });
  }

  for (const access of input.accessCredentials) {
    items.push({
      id: `access:${access._id ?? access.id}`,
      kind: "toegang",
      group: "relatie",
      title: access.title,
      body: access.login_url,
      date: access.updated_at ?? access.created_at,
      meta: `${label(access.environment)} - ${label(access.status)}`,
      tone: access.status === "actief" ? "success" : "warning",
    });
  }

  for (const action of input.actions) {
    items.push({
      id: `action:${action._id ?? action.id}`,
      kind: "actie",
      group: "actie",
      title: action.title,
      body: action.summary,
      date: action.updatedAt ?? action.updated_at ?? action.created_at,
      meta: [
        `${label(action.status)} - ${label(action.priority)}`,
        action.due_date ? `Vervalt: ${formatDate(action.due_date)}${action.due_time ? ` ${action.due_time}` : ""}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      // M-L: klikbaar — springt naar het bronmoment in deze timeline.
      link:
        action.source_activity_id && action.source_activity_title
          ? {
              label: `← vanuit moment: ${action.source_activity_title}`,
              targetId: `activity:${action.source_activity_id}`,
            }
          : undefined,
      tone: action.status === "done" || action.status === "afgerond" ? "success" : "info",
    });
  }

  for (const project of input.projects) {
    items.push({
      id: `project:${project._id ?? project.id}`,
      kind: "project",
      group: "werk",
      title: project.naam,
      body: project.samenvatting,
      date: project.updated_at ?? project.created_at,
      meta: `${projectFaseLabel(project.fase)} - ${projectStatusLabel(project.status)}`,
      tone: "info",
    });
  }

  for (const workstream of input.workstreams) {
    items.push({
      id: `workstream:${workstream._id ?? workstream.id}`,
      kind: "opdracht",
      group: "werk",
      title: workstream.titel,
      body: workstream.volgende_stap ?? workstream.doel,
      date: workstream.updated_at ?? workstream.created_at,
      meta: `${label(workstream.type)} - ${label(workstream.status)}`,
      tone: "info",
    });
  }

  for (const lead of input.leads) {
    items.push({
      id: `lead:${lead._id ?? lead.id}`,
      kind: "lead",
      group: "werk",
      title: lead.titel,
      body: lead.pijnpunt,
      date: lead.updated_at ?? lead.created_at,
      meta: `${label(lead.status)}${lead.prioriteit ? ` - ${label(lead.prioriteit)}` : ""}`,
      tone: "success",
    });
  }

  // M-J: uren en facturen maken "wat deed ik vorige maand voor X?"
  // beantwoordbaar vanuit het dossier.
  for (const entry of input.timeEntries) {
    items.push({
      id: `time:${entry.id}`,
      kind: "urenregel",
      group: "uren",
      title: entry.description,
      date: entry.entry_date ?? entry.created_at,
      meta: [
        formatMinutes(entry.minutes),
        `${formatCents(Math.round((entry.minutes * entry.hourly_rate_cents) / 60))} excl. btw`,
        label(entry.status),
        entry.invoice_id ? "gefactureerd" : null,
      ]
        .filter(Boolean)
        .join(" - "),
      tone: entry.invoice_id ? "success" : "neutral",
    });
  }

  for (const invoice of input.invoices) {
    items.push({
      id: `invoice:${invoice.id}`,
      kind: "factuur",
      group: "factuur",
      title: invoice.invoice_number,
      body: invoice.notes,
      date: invoice.issue_date ?? invoice.created_at,
      meta: [
        label(invoice.status),
        `${formatCents(invoice.total_cents)} incl. btw`,
        invoice.due_date ? `vervalt ${formatDate(invoice.due_date)}` : null,
      ]
        .filter(Boolean)
        .join(" - "),
      // L12: rood alleen voor écht te-late facturen; betaald = groen, een verse
      // concept/verstuurd-factuur is neutraal, niet alarmerend rood.
      tone:
        invoice.status === "betaald"
          ? "success"
          : invoice.status !== "geannuleerd" && isPastDate(invoice.due_date)
            ? "danger"
            : "neutral",
    });
  }

  for (const contact of input.contacts) {
    items.push({
      id: `contact:${contact._id ?? contact.id}`,
      kind: "contact",
      group: "relatie",
      title: contact.naam,
      body: contact.notities,
      date: contact.updated_at ?? contact.created_at,
      meta: contact.rol ?? "Contactpersoon",
      tone: "neutral",
    });
  }

  items.push({
    id: `company:${input.company._id ?? input.company.id}`,
    kind: "klant",
    group: "relatie",
    title: `${input.company.naam} aangemaakt`,
    body: input.company.notities,
    date: input.company.created_at,
    meta: label(input.company.relatie_type),
    tone: "accent",
  });

  // Geen harde cap meer: TimelineList toont de eerste 40 met een
  // "Toon alle N"-toggle voor de rest.
  return items
    .filter((item) => Boolean(item.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function activityTone(eventType: string): TimelineItem["tone"] {
  if (eventType === "meeting" || eventType === "contact" || eventType === "call") return "success";
  if (eventType === "email" || eventType === "besluit") return "info";
  if (eventType === "project_update") return "accent";
  return "neutral";
}

function toneClass(tone: TimelineItem["tone"]) {
  const classes = uiToneClasses[tone];
  return cn(classes.border, classes.surface, classes.icon);
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
  if (kind === "urenregel") return <Clock3 size={16} />;
  if (kind === "factuur") return <ReceiptText size={16} />;
  return <CalendarClock size={16} />;
}
