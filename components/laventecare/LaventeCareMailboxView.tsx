"use client";

import { FormEvent, type ReactNode, useMemo, useState } from "react";
import { CheckCircle2, MailCheck, MailPlus, Send, TriangleAlert } from "lucide-react";
import type {
  CompanyItem,
  ContactItem,
  MailboxItem,
  MailOutboxItem,
  MailTemplateItem,
  ProjectItem,
  WorkstreamItem,
} from "./LaventeCareTypes";
import { formatDate, label } from "./LaventeCareUtils";

type SendPayload = {
  template_id: string;
  company_id?: string;
  contact_id?: string;
  project_id?: string;
  workstream_id?: string;
  to_email?: string;
  to_name?: string;
  variables?: Record<string, string>;
  send?: boolean;
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-500/20";

export function LaventeCareMailboxView({
  mailbox,
  mailboxLoading,
  companies,
  contacts,
  activeProjects,
  activeWorkstreams,
  templates,
  outbox,
  sending,
  onSendTemplatedMail,
}: {
  mailbox?: MailboxItem;
  mailboxLoading: boolean;
  companies: CompanyItem[];
  contacts: ContactItem[];
  activeProjects: ProjectItem[];
  activeWorkstreams: WorkstreamItem[];
  templates: MailTemplateItem[];
  outbox: MailOutboxItem[];
  sending: boolean;
  onSendTemplatedMail: (payload: SendPayload) => Promise<void>;
}) {
  const [templateId, setTemplateId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [workstreamId, setWorkstreamId] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [toName, setToName] = useState("");
  const [variables, setVariables] = useState("next_step=Ik hoor graag wat voor jou het beste moment is.\nquote.summary=\ninvoice.payment_url=\nproject.update=\nmeeting.summary=\nmeeting.actions=");

  const activeTemplates = useMemo(
    () => templates.filter((template) => template.status === "active"),
    [templates]
  );
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? activeTemplates[0] ?? templates[0];
  const selectedCompany = companies.find((company) => (company._id ?? company.id) === companyId);
  const companyContacts = contacts.filter((contact) => !companyId || contact.company_id === companyId || contact.companyId === companyId);
  const selectedContact = contacts.find((contact) => (contact._id ?? contact.id) === contactId);
  const resolvedEmail = toEmail.trim() || selectedContact?.email || "";
  const resolvedName = toName.trim() || selectedContact?.naam || "";

  const handleSend = async (send: boolean) => {
    if (!selectedTemplate) return;
    await onSendTemplatedMail({
      template_id: selectedTemplate.id,
      company_id: companyId || undefined,
      contact_id: contactId || undefined,
      project_id: projectId || undefined,
      workstream_id: workstreamId || undefined,
      to_email: resolvedEmail || undefined,
      to_name: resolvedName || undefined,
      variables: parseVariables(variables),
      send,
    });
  };

  return (
    <div className="space-y-4">
      <section className="grid gap-3 lg:grid-cols-4">
        <MailboxMetric label="Templates" value={mailbox?.summary.activeTemplates ?? activeTemplates.length} detail="actief" />
        <MailboxMetric label="Outbox" value={mailbox?.summary.outbox ?? outbox.length} detail={`${mailbox?.summary.sent ?? 0} verzonden`} />
        <MailboxMetric label="Concepten" value={mailbox?.summary.drafts ?? 0} detail="klaar voor controle" />
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start gap-3">
            {mailbox?.summary.configured ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            ) : (
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-slate-500">Graph sender</p>
              <p className="mt-1 truncate text-sm font-bold text-white">
                {mailbox?.summary.configured ? mailbox.summary.senderEmail || "Geconfigureerd" : "Nog niet live"}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{mailbox?.summary.nextStep ?? "Mailbox laden..."}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void handleSend(false);
          }}
          className="glass min-w-0 p-4 sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Templated mail</p>
              <h3 className="mt-1 text-lg font-bold text-white">Nieuwe klantmail</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Render een vaste LaventeCare-template met klant, contact en extra variabelen. Concepten blijven in de outbox staan.
              </p>
            </div>
            <MailPlus className="hidden h-8 w-8 shrink-0 text-sky-300 sm:block" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Template">
              <select value={selectedTemplate?.id ?? ""} onChange={(event) => setTemplateId(event.target.value)} className={inputClass}>
                {activeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Klant">
              <select
                value={companyId}
                onChange={(event) => {
                  setCompanyId(event.target.value);
                  setContactId("");
                }}
                className={inputClass}
              >
                <option value="">Geen klant gekoppeld</option>
                {companies.map((company) => (
                  <option key={company._id ?? company.id} value={company._id ?? company.id}>{company.naam}</option>
                ))}
              </select>
            </Field>
            <Field label="Contactpersoon">
              <select value={contactId} onChange={(event) => setContactId(event.target.value)} className={inputClass}>
                <option value="">Handmatige ontvanger</option>
                {companyContacts.map((contact) => (
                  <option key={contact._id ?? contact.id} value={contact._id ?? contact.id}>
                    {contact.naam}{contact.email ? ` - ${contact.email}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ontvanger">
              <input value={resolvedEmail} onChange={(event) => setToEmail(event.target.value)} placeholder="naam@bedrijf.nl" className={inputClass} />
            </Field>
            <Field label="Project">
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className={inputClass}>
                <option value="">Geen project</option>
                {activeProjects.map((project) => (
                  <option key={project._id ?? project.id} value={project._id ?? project.id}>{project.naam}</option>
                ))}
              </select>
            </Field>
            <Field label="Opdracht">
              <select value={workstreamId} onChange={(event) => setWorkstreamId(event.target.value)} className={inputClass}>
                <option value="">Geen opdracht</option>
                {activeWorkstreams.map((workstream) => (
                  <option key={workstream._id ?? workstream.id} value={workstream._id ?? workstream.id}>{workstream.titel}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Variabelen" className="mt-3">
            <textarea
              value={variables}
              onChange={(event) => setVariables(event.target.value)}
              rows={6}
              className={`${inputClass} min-h-36 resize-y leading-6`}
            />
          </Field>

          <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Preview bron</p>
            <p className="mt-2 text-sm font-bold text-white">{selectedTemplate?.subject_template ?? "Geen template"}</p>
            <p className="mt-2 line-clamp-4 text-xs leading-5 text-slate-400">{stripHtml(selectedTemplate?.body_html ?? "")}</p>
            {selectedCompany ? <p className="mt-2 text-xs text-slate-500">Klantcontext: {selectedCompany.naam}</p> : null}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="submit"
              disabled={sending || !selectedTemplate || !resolvedEmail}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MailCheck size={16} />
              Concept maken
            </button>
            <button
              type="button"
              disabled={sending || !selectedTemplate || !resolvedEmail}
              onClick={() => void handleSend(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} />
              {sending ? "Verwerken..." : "Versturen"}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="glass p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Outbox</p>
            <div className="mt-3 space-y-2">
              {mailboxLoading ? (
                <p className="text-sm text-slate-500">Mailbox laden...</p>
              ) : outbox.length === 0 ? (
                <p className="text-sm leading-6 text-slate-500">Nog geen concepten of verzonden LaventeCare-mails.</p>
              ) : (
                outbox.slice(0, 8).map((item) => <OutboxRow key={item.id} item={item} />)
              )}
            </div>
          </section>

          <section className="glass p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Templatebibliotheek</p>
            <div className="mt-3 space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setTemplateId(template.id)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:bg-white/[0.06]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-white">{template.name}</p>
                    <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-200">
                      {label(template.category)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{template.subject_template}</p>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function MailboxMetric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function OutboxRow({ item }: { item: MailOutboxItem }) {
  const statusClass =
    item.status === "sent"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
      : item.status === "failed"
        ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
        : "border-amber-500/20 bg-amber-500/10 text-amber-200";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-bold text-white">{item.subject}</p>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClass}`}>{label(item.status)}</span>
      </div>
      <p className="mt-1 truncate text-xs text-slate-500">Aan {item.to_email} · {formatDate(item.sent_at ?? item.created_at)}</p>
      {item.error_message ? <p className="mt-1 line-clamp-2 text-xs text-rose-300">{item.error_message}</p> : null}
    </div>
  );
}

function parseVariables(value: string) {
  const vars: Record<string, string> = {};
  for (const line of value.split(/\n/)) {
    const [rawKey, ...rest] = line.split("=");
    const key = rawKey?.trim();
    if (!key) continue;
    vars[key] = rest.join("=").trim();
  }
  return vars;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
