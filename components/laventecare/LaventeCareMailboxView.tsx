"use client";

import { FormEvent, type ChangeEvent, type ReactNode, useMemo, useState } from "react";
import { CheckCircle2, FileText, MailCheck, MailPlus, Paperclip, Send, Sparkles, TriangleAlert, X } from "lucide-react";
import type { LCMailAISuggestion } from "@/lib/api";
import { extractLaventeCareMailAttachmentContext, type LaventeCareMailAttachmentContext } from "@/lib/laventecare/mail-attachments";
import type {
  CompanyItem,
  ContactItem,
  InvoiceItem,
  MailboxItem,
  MailOutboxItem,
  MailTemplateItem,
  ProjectItem,
  WorkstreamItem,
} from "./LaventeCareTypes";
import { formatCents, formatDate, label } from "./LaventeCareUtils";

type SendPayload = {
  template_id: string;
  company_id?: string;
  contact_id?: string;
  project_id?: string;
  workstream_id?: string;
  invoice_id?: string;
  to_email?: string;
  to_name?: string;
  variables?: Record<string, string>;
  send?: boolean;
  attachments?: MailAttachmentPayload[];
};

type MailAttachmentPayload = {
  name: string;
  content_type: string;
  content_bytes: string;
};

type MailAttachment = MailAttachmentPayload & {
  size: number;
  pages: number;
  extracted_text: string;
  summary: string;
  extraction_status: "ok" | "partial" | "failed";
};

type SuggestPayload = Omit<SendPayload, "cc" | "bcc" | "send" | "attachments"> & {
  quote_id?: string;
  invoice_id?: string;
  intent?: string;
  tone?: string;
  attachments?: LaventeCareMailAttachmentContext[];
};

const inputClass =
  "w-full min-w-0 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-500/20";
const MAX_MAIL_ATTACHMENTS = 6;
const MAX_MAIL_ATTACHMENT_BYTES = 3 * 1024 * 1024;

export function LaventeCareMailboxView({
  mailbox,
  mailboxLoading,
  companies,
  contacts,
  activeProjects,
  activeWorkstreams,
  invoices,
  prefillInvoiceId,
  templates,
  outbox,
  sending,
  aiSuggesting,
  onSuggestMailContent,
  onSendTemplatedMail,
}: {
  mailbox?: MailboxItem;
  mailboxLoading: boolean;
  companies: CompanyItem[];
  contacts: ContactItem[];
  activeProjects: ProjectItem[];
  activeWorkstreams: WorkstreamItem[];
  invoices: InvoiceItem[];
  prefillInvoiceId?: string;
  templates: MailTemplateItem[];
  outbox: MailOutboxItem[];
  sending: boolean;
  aiSuggesting: boolean;
  onSuggestMailContent: (payload: SuggestPayload) => Promise<LCMailAISuggestion>;
  onSendTemplatedMail: (payload: SendPayload) => Promise<void>;
}) {
  const [templateId, setTemplateId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [workstreamId, setWorkstreamId] = useState("");
  const [invoiceId, setInvoiceId] = useState(prefillInvoiceId ?? "");
  const [toEmail, setToEmail] = useState("");
  const [toName, setToName] = useState("");
  const [aiIntent, setAiIntent] = useState("Maak een klantmail op basis van de gekoppelde LaventeCare context.");
  const [aiTone, setAiTone] = useState("professioneel, warm en concreet");
  const [aiSuggestion, setAiSuggestion] = useState<LCMailAISuggestion | null>(null);
  const [attachments, setAttachments] = useState<MailAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [attachmentsReading, setAttachmentsReading] = useState(false);
  const [variables, setVariables] = useState(
    [
      "next_step=Ik stel voor om de eerstvolgende stap samen scherp te zetten.",
      "laventecare.email=jeffrey@laventecare.nl",
      "laventecare.tagline=Van idee tot werkend systeem",
      "cta.label=Afstemmen",
      "quote.summary=scope, planning en uitvoering volgens afspraak",
      "project.status=in uitvoering",
      "project.update=De voortgang loopt volgens afspraak.",
      "project.risk=geen bijzonderheden",
      "pilot.scope=de afgesproken testscope",
      "pilot.criteria=kernfunctionaliteit, gebruiksgemak en betrouwbaarheid",
      "pilot.feedback_moment=na de eerste testperiode",
      "pilot.access_summary=pilottoegang stemmen we voor de start af via het afgesproken kanaal",
      "documentation.summary=De klantdocumentatie voor de pilot staat klaar als praktische start- en naslagset.",
      "documentation.attachments=quickstart, workflowhandleiding, pilotafspraken en vrijgave/datakwaliteit",
      "documentation.next_step=Loop de documenten rustig door; daarna stemmen we de pilotstart en eventuele vragen samen af.",
      "meeting.topic=afstemming",
      "meeting.summary=De besproken punten zijn vastgelegd in het klantdossier.",
      "meeting.actions=de vervolgstap wordt opgepakt",
    ].join("\n")
  );

  const activeTemplates = useMemo(
    () => templates.filter((template) => template.status === "active"),
    [templates]
  );
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? activeTemplates[0] ?? templates[0];
  const selectedInvoice = invoices.find((invoice) => invoice.id === invoiceId);
  const effectiveCompanyId = selectedInvoice?.company_id ?? companyId;
  const effectiveProjectId = selectedInvoice?.project_id ?? projectId;
  const effectiveWorkstreamId = selectedInvoice?.workstream_id ?? workstreamId;
  const selectedCompany = companies.find((company) => (company._id ?? company.id) === effectiveCompanyId);
  const companyContacts = contacts.filter((contact) => !effectiveCompanyId || contact.company_id === effectiveCompanyId || contact.companyId === effectiveCompanyId);
  const selectedContact = contacts.find((contact) => (contact._id ?? contact.id) === contactId);
  const filteredInvoices = useMemo(
    () =>
      invoices
        .filter((invoice) => invoice.status !== "geannuleerd")
        .filter((invoice) => !companyId || invoice.company_id === companyId)
        .filter((invoice) => !projectId || invoice.project_id === projectId)
        .filter((invoice) => !workstreamId || invoice.workstream_id === workstreamId)
        .slice(0, 20),
    [companyId, invoices, projectId, workstreamId]
  );
  const resolvedEmail = toEmail.trim() || selectedContact?.email || "";
  const resolvedName = toName.trim() || selectedContact?.naam || "";
  const parsedVariables = useMemo(() => parseVariables(variables), [variables]);
  const previewVariables = useMemo(() => applyInvoicePreviewVariables(parsedVariables, selectedInvoice), [parsedVariables, selectedInvoice]);
  const outboundVariables = useMemo(() => prepareOutboundVariables(parsedVariables, selectedInvoice), [parsedVariables, selectedInvoice]);
  const variableHints = useMemo(() => extractPlaceholders(selectedTemplate), [selectedTemplate]);
  const previewHTML = useMemo(() => renderMailPreview(selectedTemplate?.body_html ?? "", previewVariables), [selectedTemplate, previewVariables]);
  const sendReadiness = useMemo(
    () =>
      buildSendReadiness({
        template: selectedTemplate,
        variables: previewVariables,
        previewHTML,
        resolvedEmail,
        companyLinked: Boolean(effectiveCompanyId || selectedCompany),
        selectedInvoice,
        attachmentCount: attachments.length,
        unreadableAttachmentCount: attachments.filter((attachment) => attachment.extraction_status === "failed").length,
      }),
    [selectedTemplate, previewVariables, previewHTML, resolvedEmail, effectiveCompanyId, selectedCompany, selectedInvoice, attachments]
  );

  const handleSuggest = async () => {
    if (!selectedTemplate || attachmentsReading) return;
    let suggestion: LCMailAISuggestion;
    try {
      suggestion = await onSuggestMailContent({
        template_id: selectedTemplate.id,
        company_id: effectiveCompanyId || undefined,
        contact_id: contactId || undefined,
        project_id: effectiveProjectId || undefined,
        workstream_id: effectiveWorkstreamId || undefined,
        invoice_id: invoiceId || undefined,
        to_email: resolvedEmail || undefined,
        to_name: resolvedName || undefined,
        intent: aiIntent,
        tone: aiTone,
        variables: outboundVariables,
        attachments: attachmentAIContext(attachments),
      });
    } catch {
      return;
    }
    const merged = { ...parsedVariables, ...suggestion.variables };
    setVariables(serializeVariables(merged, variableHints));
    setAiSuggestion(suggestion);
  };

  const handleSend = async (send: boolean) => {
    if (!selectedTemplate) return;
    await onSendTemplatedMail({
      template_id: selectedTemplate.id,
      company_id: effectiveCompanyId || undefined,
      contact_id: contactId || undefined,
      project_id: effectiveProjectId || undefined,
      workstream_id: effectiveWorkstreamId || undefined,
      invoice_id: invoiceId || undefined,
      to_email: resolvedEmail || undefined,
      to_name: resolvedName || undefined,
      variables: outboundVariables,
      send,
      attachments: send && attachments.length ? attachments.map(({ name, content_type, content_bytes }) => ({ name, content_type, content_bytes })) : undefined,
    });
  };

  const handleAttachmentFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    setAttachmentError("");
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    if (attachments.length + files.length > MAX_MAIL_ATTACHMENTS) {
      setAttachmentError(`Maximaal ${MAX_MAIL_ATTACHMENTS} bijlagen per mail.`);
      return;
    }
    setAttachmentsReading(true);
    try {
      const next = await Promise.all(files.map(readMailAttachment));
      setAttachments((current) => [...current, ...next]);
      const documentNames = [...attachments, ...next].map((item) => readableAttachmentName(item.name)).join(", ");
      if (documentNames) {
        setVariables((current) => upsertVariables(current, { "documentation.attachments": documentNames }));
      }
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Bijlage kon niet worden gelezen.");
    } finally {
      setAttachmentsReading(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <section className="grid min-w-0 gap-3 lg:grid-cols-4">
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

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void handleSend(false);
          }}
          className="glass min-w-0 max-w-full overflow-hidden p-4 sm:p-5"
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

          <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
            <Field label="Template">
              <select value={selectedTemplate?.id ?? ""} onChange={(event) => setTemplateId(event.target.value)} className={inputClass}>
                {activeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Klant">
              <select
                value={effectiveCompanyId ?? ""}
                onChange={(event) => {
                  const nextCompanyId = event.target.value;
                  setCompanyId(nextCompanyId);
                  setContactId("");
                  if (!nextCompanyId || selectedInvoice?.company_id !== nextCompanyId) {
                    setInvoiceId("");
                  }
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
            <Field label="Naam ontvanger">
              <input value={resolvedName} onChange={(event) => setToName(event.target.value)} placeholder="Voornaam achternaam" className={inputClass} />
            </Field>
            <Field label="Project">
              <select
                value={effectiveProjectId ?? ""}
                onChange={(event) => {
                  const nextProjectId = event.target.value;
                  setProjectId(nextProjectId);
                  if (selectedInvoice && selectedInvoice.project_id !== nextProjectId) {
                    setInvoiceId("");
                  }
                }}
                className={inputClass}
              >
                <option value="">Geen project</option>
                {activeProjects.map((project) => (
                  <option key={project._id ?? project.id} value={project._id ?? project.id}>{project.naam}</option>
                ))}
              </select>
            </Field>
            <Field label="Opdracht">
              <select
                value={effectiveWorkstreamId ?? ""}
                onChange={(event) => {
                  const nextWorkstreamId = event.target.value;
                  setWorkstreamId(nextWorkstreamId);
                  if (selectedInvoice && selectedInvoice.workstream_id !== nextWorkstreamId) {
                    setInvoiceId("");
                  }
                }}
                className={inputClass}
              >
                <option value="">Geen opdracht</option>
                {activeWorkstreams.map((workstream) => (
                  <option key={workstream._id ?? workstream.id} value={workstream._id ?? workstream.id}>{workstream.titel}</option>
                ))}
              </select>
            </Field>
            <Field label="Factuur / Bunq">
              <select value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} className={inputClass}>
                <option value="">Geen factuur gekoppeld</option>
                {filteredInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - {formatCents(invoice.total_cents)} - {label(invoice.status)}
                    {invoice.payment_url ? " - bunq link" : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <InvoiceMailStatus invoice={selectedInvoice} template={selectedTemplate} />

          <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-slate-300" />
                  <p className="text-xs font-semibold uppercase text-slate-500">Bijlagen</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Voeg klant-PDF-bestanden toe bij direct versturen. De AI leest de tekstextractie mee voordat hij de mail invult.
                </p>
              </div>
              <label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-slate-200 transition hover:bg-white/[0.08]">
                <Paperclip size={15} />
                {attachmentsReading ? "PDF lezen..." : "PDF kiezen"}
                <input type="file" accept="application/pdf,.pdf" multiple className="sr-only" onChange={handleAttachmentFiles} />
              </label>
            </div>
            {attachmentError ? <p className="mt-2 text-xs font-semibold text-rose-300">{attachmentError}</p> : null}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {attachments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-xs leading-5 text-slate-500 sm:col-span-2">
                  Voor HenkeWonen: quickstart, workflowhandleiding, pilotafspraken en vrijgave/datakwaliteit selecteren.
                </div>
              ) : (
                attachments.map((attachment, index) => (
                  <div key={`${attachment.name}-${index}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-sky-200" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white">{attachment.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {formatFileSize(attachment.size)} - {attachment.pages || "?"} pag. - {attachmentStatusLabel(attachment.extraction_status)}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500">{attachment.summary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
                      aria-label={`${attachment.name} verwijderen`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <Field label="Variabelen" className="mt-3">
            <textarea
              value={variables}
              onChange={(event) => setVariables(event.target.value)}
              rows={6}
              className={`${inputClass} min-h-36 resize-y leading-6`}
            />
          </Field>

          <div className="mt-3 rounded-lg border border-sky-400/20 bg-sky-500/[0.06] p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-200" />
                  <p className="text-xs font-semibold uppercase text-sky-100">AI context vullen</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Gebruikt gekoppelde klant, opdracht, project, notities, agenda, rooster, dossier en billing-context. Verstuurt niets automatisch.
                </p>
              </div>
              <button
                type="button"
                disabled={aiSuggesting || attachmentsReading || !selectedTemplate}
                onClick={() => void handleSuggest()}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-sky-300 px-3 text-sm font-bold text-sky-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles size={15} />
                {attachmentsReading ? "PDF's lezen..." : aiSuggesting ? "AI leest context..." : "AI vullen"}
              </button>
            </div>
            <div className="mt-3 grid min-w-0 gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
              <input
                value={aiIntent}
                onChange={(event) => setAiIntent(event.target.value)}
                className={inputClass}
                placeholder="Doel van deze mail"
              />
              <select value={aiTone} onChange={(event) => setAiTone(event.target.value)} className={inputClass}>
                <option value="professioneel, warm en concreet">Professioneel warm</option>
                <option value="kort, duidelijk en actiegericht">Kort en actiegericht</option>
                <option value="zorgvuldig, adviserend en strategisch">Adviserend strategisch</option>
                <option value="vriendelijk, informeel en helder">Vriendelijk informeel</option>
              </select>
            </div>
            {aiSuggestion ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-slate-500">Interne AI briefing</p>
                    <p className="mt-1 text-sm leading-6 text-slate-200">{aiSuggestion.briefing}</p>
                    {aiSuggestion.subject_hint ? (
                      <p className="mt-2 text-xs font-semibold text-sky-100">Onderwerp hint: {aiSuggestion.subject_hint}</p>
                    ) : null}
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Niet meegestuurd naar de klant</p>
                  </div>
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold ${confidenceClass(aiSuggestion.confidence)}`}>
                    {label(aiSuggestion.confidence)}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase text-slate-500">Bronnen voor jouw controle</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {aiSuggestion.sources.slice(0, 6).map((source, index) => (
                    <div key={`${source.type}-${source.title}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-white">{source.title}</p>
                        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-400">
                          {sourceTypeLabel(source.type)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                        {[source.date, source.summary].filter(Boolean).join(" - ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Template context</p>
              <p className="mt-2 text-sm font-bold text-white">{selectedTemplate?.subject_template ?? "Geen template"}</p>
              <p className="mt-2 line-clamp-4 text-xs leading-5 text-slate-400">{stripHtml(selectedTemplate?.body_html ?? "")}</p>
              {selectedCompany ? <p className="mt-2 text-xs text-slate-500">Klantcontext: {selectedCompany.naam}</p> : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {variableHints.slice(0, 18).map((hint) => (
                  <span key={hint} className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-100">
                    {hint}
                  </span>
                ))}
                {variableHints.length > 18 ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-slate-400">
                    +{variableHints.length - 18}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-100">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
                <p className="text-xs font-bold uppercase text-slate-500">HTML preview</p>
                <p className="truncate text-[11px] font-semibold text-slate-400">{selectedTemplate?.name ?? "Template"}</p>
              </div>
              <iframe
                title="LaventeCare mail preview"
                sandbox=""
                srcDoc={previewHTML}
                className="h-72 w-full bg-slate-100"
              />
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 lg:col-span-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Interne verzendcheck</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Controle voor jou. Deze regels worden niet in de mail gezet.</p>
                </div>
                <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold ${readinessBadgeClass(sendReadiness.status)}`}>
                  {sendReadiness.status === "ok" ? "Send ready" : sendReadiness.status === "warn" ? "Controleer" : "Niet klaar"}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {sendReadiness.items.map((item) => (
                  <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-bold text-white">{item.label}</p>
                      <span className={`h-2.5 w-2.5 rounded-full ${readinessDotClass(item.status)}`} />
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
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

        <aside className="min-w-0 space-y-4">
          <section className="glass min-w-0 p-4">
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

          <section className="glass min-w-0 p-4">
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

function InvoiceMailStatus({ invoice, template }: { invoice?: InvoiceItem; template?: MailTemplateItem }) {
  const invoiceTemplate = extractPlaceholders(template).some((placeholder) => placeholder.startsWith("invoice."));
  if (!invoice && !invoiceTemplate) return null;

  if (!invoice) {
    return (
      <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.07] p-3">
        <p className="text-xs font-semibold uppercase text-amber-100">Factuurcontext nodig</p>
        <p className="mt-1 text-sm leading-5 text-slate-300">
          Deze template gebruikt factuurvelden. Selecteer een factuur zodat bedrag, vervaldatum en Bunq-link uit de backend komen.
        </p>
      </div>
    );
  }

  const hasPaymentURL = Boolean(invoice.payment_url);
  return (
    <div className={`mt-3 rounded-lg border p-3 ${hasPaymentURL ? "border-emerald-400/20 bg-emerald-400/[0.07]" : "border-amber-400/20 bg-amber-400/[0.07]"}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase ${hasPaymentURL ? "text-emerald-100" : "text-amber-100"}`}>Factuur gekoppeld</p>
          <p className="mt-1 text-sm font-bold text-white">
            {invoice.invoice_number} - {formatCents(invoice.total_cents)} - {label(invoice.status)}
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-300">
            {hasPaymentURL
              ? "Bunq betaal-URL staat klaar en wordt in factuurtemplates gebruikt."
              : "Nog geen Bunq-link. Maak in Commercie eerst een betaalverzoek en bevestig de pending action via Settings of Telegram."}
          </p>
        </div>
        {invoice.payment_url ? (
          <a
            href={invoice.payment_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 text-xs font-bold text-emerald-100 transition hover:bg-emerald-300/15"
          >
            Link testen
          </a>
        ) : null}
      </div>
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
    const parsedValue = rest.join("=").trim();
    if (!parsedValue) continue;
    vars[key] = parsedValue;
  }
  return vars;
}

function serializeVariables(values: Record<string, string>, hints: string[]) {
  const seen = new Set<string>();
  const orderedKeys = [
    ...hints,
    ...Object.keys(values).sort((a, b) => a.localeCompare(b, "nl")),
  ].filter((key) => {
    const normalized = key.trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  return orderedKeys
    .map((key) => {
      const value = values[key];
      if (!value?.trim()) return "";
      return `${key}=${value.trim()}`;
    })
    .filter(Boolean)
    .join("\n");
}

function prepareOutboundVariables(values: Record<string, string>, invoice?: InvoiceItem) {
  const next = { ...values };
  if (isDefaultPilotAccessSummary(next["pilot.access_summary"])) {
    delete next["pilot.access_summary"];
  }
  if (invoice) {
    if (next["invoice.amount"]?.trim().toLowerCase() === "zie factuur") {
      delete next["invoice.amount"];
    }
    if (next["invoice.due_date"]?.trim().toLowerCase() === "14 dagen") {
      delete next["invoice.due_date"];
    }
    if (next["invoice.number"]?.trim().toLowerCase() === "concept") {
      delete next["invoice.number"];
    }
  }
  return next;
}

function applyInvoicePreviewVariables(values: Record<string, string>, invoice?: InvoiceItem) {
  if (!invoice) return values;
  const next = { ...values };
  next["invoice.number"] = invoice.invoice_number;
  next["invoice.amount"] = formatCents(invoice.total_cents);
  next["invoice.due_date"] = invoice.due_date ? formatDate(invoice.due_date) : "14 dagen";
  if (invoice.payment_url) {
    next["invoice.payment_url"] = invoice.payment_url;
    if (!next["cta.url"]) next["cta.url"] = invoice.payment_url;
    if (!next["cta.label"] || next["cta.label"] === "Afstemmen") next["cta.label"] = "Betaal factuur";
  }
  return next;
}

function isDefaultPilotAccessSummary(value?: string) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return (
    normalized === "" ||
    normalized === "via het afgesproken veilige kanaal" ||
    normalized === "pilottoegang stemmen we voor de start af via het afgesproken kanaal" ||
    normalized === "pilotaccounts staan klaar; gevoelige inloggegevens deel ik via het afgesproken veilige kanaal"
  );
}

type ReadinessStatus = "ok" | "warn" | "missing";

function buildSendReadiness({
  template,
  variables,
  previewHTML,
  resolvedEmail,
  companyLinked,
  selectedInvoice,
  attachmentCount,
  unreadableAttachmentCount,
}: {
  template?: MailTemplateItem;
  variables: Record<string, string>;
  previewHTML: string;
  resolvedEmail: string;
  companyLinked: boolean;
  selectedInvoice?: InvoiceItem;
  attachmentCount: number;
  unreadableAttachmentCount: number;
}) {
  const placeholders = extractPlaceholders(template);
  const unresolved = placeholders.filter((placeholder) => !variables[placeholder]?.trim() && !placeholder.endsWith(".url"));
  const originalHasCTA = Boolean(template?.body_html.match(/<a\s+href="/i));
  const renderedCTAUrls = Array.from(previewHTML.matchAll(/<a\s+href="([^"]+)"/gi), (match) => match[1]);
  const safeCTAs = renderedCTAUrls.filter(isSafePreviewUrl);
  const hasLogo = previewHTML.includes("ik.imagekit.io/a0oim4e3e") || previewHTML.includes("LaventeCare");
  const hasAccessPlaceholder = placeholders.some((placeholder) => placeholder.startsWith("pilot.access"));
  const documentationTemplate = placeholders.some((placeholder) => placeholder.startsWith("documentation."));
  const sensitiveAccessDetected = hasSensitiveAccessValue(Object.values(variables).join("\n"));

  const items: Array<{ label: string; detail: string; status: ReadinessStatus }> = [
    {
      label: "Ontvanger",
      detail: resolvedEmail ? resolvedEmail : "Nog geen e-mailadres geselecteerd.",
      status: resolvedEmail ? "ok" : "missing",
    },
    {
      label: "Klantcontext",
      detail: companyLinked ? "Klant of context gekoppeld." : "Geen klant gekoppeld; controleer aanspreekvorm.",
      status: companyLinked ? "ok" : "warn",
    },
    {
      label: "Placeholders",
      detail: unresolved.length === 0 ? "Geen zichtbare ontbrekende velden." : `${unresolved.length} veld(en) missen nog waarde.`,
      status: unresolved.length === 0 ? "ok" : "warn",
    },
    {
      label: "CTA",
      detail: !originalHasCTA
        ? "Template heeft geen knop nodig."
        : safeCTAs.length > 0
          ? "Knop heeft een geldige link."
          : "Knop wordt verborgen omdat er geen echte link is.",
      status: !originalHasCTA || safeCTAs.length > 0 ? "ok" : "warn",
    },
    {
      label: "Branding",
      detail: hasLogo ? "LaventeCare branding actief." : "Logo/branding ontbreekt in preview.",
      status: hasLogo ? "ok" : "warn",
    },
  ];
  const invoiceTemplate = placeholders.some((placeholder) => placeholder.startsWith("invoice."));
  if (invoiceTemplate || selectedInvoice) {
    items.push({
      label: "Factuur/Bunq",
      detail: selectedInvoice
        ? selectedInvoice.payment_url
          ? `${selectedInvoice.invoice_number}: betaal-URL gekoppeld.`
          : `${selectedInvoice.invoice_number}: maak eerst het Bunq betaalverzoek en bevestig de pending action.`
        : "Deze template verwacht factuurcontext; selecteer een factuur.",
      status: selectedInvoice ? (selectedInvoice.payment_url ? "ok" : "warn") : "missing",
    });
  }
  if (hasAccessPlaceholder || sensitiveAccessDetected) {
    items.push({
      label: "Toegang",
      detail: sensitiveAccessDetected
        ? "Gevoelige toegang lijkt aanwezig; deel dit alleen bewust via het juiste kanaal."
        : "Toegangsafspraak wordt klantvriendelijk samengevat.",
      status: sensitiveAccessDetected ? "warn" : "ok",
    });
  }
  if (documentationTemplate || attachmentCount > 0) {
    items.push({
      label: "Bijlagen",
      detail:
        attachmentCount > 0
          ? unreadableAttachmentCount > 0
            ? `${unreadableAttachmentCount} van ${attachmentCount} PDF-bijlage(n) niet volledig leesbaar; controleer handmatig.`
            : `${attachmentCount} PDF-bijlage(n) gelezen; AI-context wordt meegenomen bij AI vullen.`
          : "Documentatietemplate geselecteerd; voeg de klant-PDF-bestanden toe voordat je verstuurt.",
      status: attachmentCount > 0 ? (unreadableAttachmentCount > 0 ? "warn" : "ok") : "warn",
    });
  }

  const status: ReadinessStatus = items.some((item) => item.status === "missing")
    ? "missing"
    : items.some((item) => item.status === "warn")
      ? "warn"
      : "ok";
  return { status, items };
}

async function readMailAttachment(file: File): Promise<MailAttachment> {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    throw new Error(`${file.name} is geen PDF.`);
  }
  if (file.size > MAX_MAIL_ATTACHMENT_BYTES) {
    throw new Error(`${file.name} is groter dan 3MB.`);
  }
  const dataURL = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`${file.name} kon niet worden gelezen.`));
    reader.readAsDataURL(file);
  });
  const contentBytes = dataURL.split(",")[1]?.trim();
  if (!contentBytes) {
    throw new Error(`${file.name} bevat geen leesbare inhoud.`);
  }
  const context = await extractLaventeCareMailAttachmentContext(file);
  return {
    name: file.name,
    content_type: file.type || "application/pdf",
    content_bytes: contentBytes,
    size: file.size,
    pages: context.pages,
    extracted_text: context.extracted_text,
    summary: context.summary,
    extraction_status: context.extraction_status,
  };
}

function attachmentAIContext(attachments: MailAttachment[]): LaventeCareMailAttachmentContext[] {
  return attachments.map(({ name, content_type, size, pages, extracted_text, summary, extraction_status }) => ({
    name,
    content_type,
    size,
    pages,
    extracted_text,
    summary,
    extraction_status,
  }));
}

function upsertVariables(current: string, nextValues: Record<string, string>) {
  const currentValues = parseVariables(current);
  return serializeVariables({ ...currentValues, ...nextValues }, Object.keys(nextValues));
}

function readableAttachmentName(name: string) {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/henke-wonen-portal-/i, "")
    .replace(/-Print$/i, "")
    .replace(/-/g, " ")
    .trim();
}

function attachmentStatusLabel(value: MailAttachment["extraction_status"]) {
  switch (value) {
    case "ok":
      return "AI gelezen";
    case "partial":
      return "AI uittreksel";
    default:
      return "niet leesbaar";
  }
}

function formatFileSize(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function readinessBadgeClass(value: ReadinessStatus) {
  switch (value) {
    case "ok":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
    case "warn":
      return "border-amber-400/20 bg-amber-400/10 text-amber-100";
    default:
      return "border-rose-400/20 bg-rose-400/10 text-rose-100";
  }
}

function readinessDotClass(value: ReadinessStatus) {
  switch (value) {
    case "ok":
      return "bg-emerald-300";
    case "warn":
      return "bg-amber-300";
    default:
      return "bg-rose-300";
  }
}

function renderMailPreview(html: string, values: Record<string, string>) {
  let result = html;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, value);
    result = result.replaceAll(`{{ ${key} }}`, value);
  }
  result = result.replace(/<tr>\s*<td\s+align="center"[^>]*>\s*<a\s+href="([^"]*)"[^>]*>[\s\S]*?<\/a>\s*<\/td>\s*<\/tr>/gi, (block, href) => {
    return isSafePreviewUrl(href) ? block : "";
  });
  return result.replace(/\{\{\s*[a-zA-Z0-9_.-]+\s*\}\}/g, "");
}

function isSafePreviewUrl(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.includes("{{") || trimmed.includes("}}")) return false;
  if (trimmed.replace(/\/+$/, "") === "https://www.laventecare.nl/contact" || trimmed.replace(/\/+$/, "") === "http://www.laventecare.nl/contact") return false;
  return trimmed.startsWith("https://") || trimmed.startsWith("http://");
}

function hasSensitiveAccessValue(value: string) {
  return /\b(wachtwoord|password|pass|token|api[-_ ]?key|client[-_ ]?secret|secret|refresh[-_ ]?token|bearer|pincode|pin)\b\s*[:=]/i.test(value);
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractPlaceholders(template?: MailTemplateItem) {
  if (!template) return [];
  const matches = `${template.subject_template} ${template.body_html} ${template.body_text ?? ""}`.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g);
  return Array.from(new Set(Array.from(matches, (match) => match[1]))).sort();
}

function confidenceClass(value: string) {
  switch (value) {
    case "hoog":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
    case "normaal":
      return "border-sky-400/20 bg-sky-400/10 text-sky-100";
    default:
      return "border-amber-400/20 bg-amber-400/10 text-amber-100";
  }
}

function sourceTypeLabel(value: string) {
  const normalized = value.replace(/^billing_/, "");
  const labels: Record<string, string> = {
    action: "Actie",
    agenda: "Agenda",
    schedule: "Rooster",
    note: "Notitie",
    activity: "Moment",
    quote: "Offerte",
    invoice: "Factuur",
    dossier: "Dossier",
    laventecare: "Context",
  };
  return labels[normalized] ?? label(normalized);
}
