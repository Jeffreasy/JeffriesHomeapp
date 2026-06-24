"use client";

import { FormEvent, type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, ExternalLink, Eye, FileText, Loader2, MailCheck, MailPlus, MessagesSquare, Paperclip, Pencil, Reply, RefreshCw, Send, Sparkles, TriangleAlert, X } from "lucide-react";
import type { LCMailAISuggestion } from "@/lib/api";
import { extractLaventeCareMailAttachmentContext, type LaventeCareMailAttachmentContext } from "@/lib/laventecare/mail-attachments";
import type {
  CompanyItem,
  ContactItem,
  InvoiceItem,
  MailboxItem,
  MailInboxItem,
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
  inbox,
  sending,
  aiSuggesting,
  syncingInbox,
  onSuggestMailContent,
  onSendTemplatedMail,
  onSyncInbox,
  onMarkInboxRead,
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
  inbox: MailInboxItem[];
  sending: boolean;
  aiSuggesting: boolean;
  syncingInbox: boolean;
  onSuggestMailContent: (payload: SuggestPayload) => Promise<LCMailAISuggestion>;
  onSendTemplatedMail: (payload: SendPayload) => Promise<void>;
  onSyncInbox: () => Promise<void>;
  onMarkInboxRead: (id: string) => void;
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
  const [mailModal, setMailModal] = useState<MailModalState | null>(null);
  const [threadConv, setThreadConv] = useState<MailConversation | null>(null);
  const [showAllConversations, setShowAllConversations] = useState(false);
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
  const previewSubject = useMemo(() => renderMailSubjectPreview(selectedTemplate?.subject_template ?? "", previewVariables), [selectedTemplate, previewVariables]);
  const recipientEcho = resolvedEmail ? (resolvedName ? `${resolvedName} <${resolvedEmail}>` : resolvedEmail) : "—";
  const conversations = useMemo(() => buildConversations(outbox, inbox), [outbox, inbox]);
  const draftOutbox = useMemo(() => outbox.filter((item) => item.status !== "sent"), [outbox]);
  const unreadCount = useMemo(() => inbox.filter((item) => !item.is_read).length, [inbox]);
  const failedCount = useMemo(() => outbox.filter((item) => item.status === "failed").length, [outbox]);

  const insertVariable = (key: string) => {
    setVariables((current) => {
      const lines = current.split("\n");
      if (lines.some((line) => line.split("=")[0]?.trim() === key)) return current;
      return current.trim() ? `${current.replace(/\n+$/, "")}\n${key}=` : `${key}=`;
    });
  };
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

  const openPreview = () => {
    if (!selectedTemplate) return;
    setMailModal({
      title: "Voorbeeld — zo ontvangt de klant de mail",
      subtitle: selectedTemplate.name,
      html: previewHTML,
      meta: [
        { label: "Aan", value: recipientEcho },
        { label: "Onderwerp", value: previewSubject || "(geen onderwerp)" },
        { label: "Bijlagen", value: attachments.length ? `${attachments.length}` : "geen" },
      ],
    });
  };

  const openSendConfirm = () => {
    if (!selectedTemplate || !resolvedEmail) return;
    setMailModal({
      title: "Versturen naar klant?",
      subtitle: selectedTemplate.name,
      html: previewHTML,
      meta: [
        { label: "Aan", value: recipientEcho },
        { label: "Onderwerp", value: previewSubject || "(geen onderwerp)" },
        { label: "Bijlagen", value: attachments.length ? `${attachments.length}` : "geen" },
      ],
      primaryAction: {
        label: "Definitief versturen",
        variant: "send",
        icon: <Send size={15} />,
        onClick: () => {
          setMailModal(null);
          void handleSend(true);
        },
      },
    });
  };

  const prefillFromOutbox = (item: MailOutboxItem) => {
    setTemplateId(item.template_id ?? "");
    setCompanyId(item.company_id ?? "");
    setContactId(item.contact_id ?? "");
    setProjectId(item.project_id ?? "");
    setWorkstreamId(item.workstream_id ?? "");
    setInvoiceId(item.invoice_id ?? "");
    setToEmail(item.to_email ?? "");
    setToName(item.to_name ?? "");
    setMailModal(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openOutbox = (item: MailOutboxItem) => {
    setMailModal({
      title: item.subject || "(geen onderwerp)",
      subtitle: `${label(item.status)} · aan ${item.to_email}`,
      html: item.body_html,
      meta: [
        { label: "Aan", value: item.to_name ? `${item.to_name} <${item.to_email}>` : item.to_email },
        { label: "Status", value: label(item.status) },
        { label: "Datum", value: formatDate(item.sent_at ?? item.created_at) },
      ],
      primaryAction:
        item.status === "concept" || item.status === "failed"
          ? { label: "Bewerken in opsteller", icon: <Pencil size={15} />, onClick: () => prefillFromOutbox(item) }
          : undefined,
    });
  };

  const replyFromInbox = (item: MailInboxItem) => {
    setToEmail(item.from_email ?? "");
    setToName(item.from_name ?? "");
    if (item.company_id) setCompanyId(item.company_id);
    setMailModal(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openInbox = (item: MailInboxItem) => {
    if (!item.is_read) onMarkInboxRead(item.id);
    setMailModal({
      title: item.subject || "(geen onderwerp)",
      subtitle: `van ${item.from_name || item.from_email}`,
      text: item.body_preview || "Geen voorbeeldtekst beschikbaar. Open in Outlook voor de volledige mail.",
      meta: [
        { label: "Van", value: item.from_name ? `${item.from_name} <${item.from_email}>` : item.from_email },
        { label: "Ontvangen", value: formatDate(item.received_at) },
        ...(item.company_name ? [{ label: "Bedrijf", value: item.company_name }] : []),
      ],
      primaryAction: { label: "Beantwoorden", icon: <Reply size={15} />, onClick: () => replyFromInbox(item) },
      externalLink: item.web_link ? { label: "Openen in Outlook", href: item.web_link } : undefined,
    });
  };

  const openThread = (conversation: MailConversation) => setThreadConv(conversation);

  const openThreadEntry = (entry: ThreadEntry) => {
    if (entry.kind === "in") openInbox(entry.inbox);
    else openOutbox(entry.outbox);
  };

  const replyToConversation = (conversation: MailConversation) => {
    const reversed = [...conversation.entries].reverse();
    const lastIn = reversed.find((entry) => entry.kind === "in");
    const lastOut = reversed.find((entry) => entry.kind === "out");
    if (lastIn && lastIn.kind === "in") {
      setToEmail(lastIn.inbox.from_email ?? "");
      setToName(lastIn.inbox.from_name ?? "");
      if (lastIn.inbox.company_id) setCompanyId(lastIn.inbox.company_id);
    } else if (lastOut && lastOut.kind === "out") {
      setToEmail(lastOut.outbox.to_email ?? "");
      setToName(lastOut.outbox.to_name ?? "");
      if (lastOut.outbox.company_id) setCompanyId(lastOut.outbox.company_id);
    }
    setThreadConv(null);
    setMailModal(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
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
        <MailboxMetric label="Gesprekken" value={conversations.length} detail={unreadCount ? `${unreadCount} ongelezen` : "geen ongelezen"} tone={unreadCount ? "warn" : "default"} />
        <MailboxMetric label="Verzonden" value={mailbox?.summary.sent ?? 0} detail={failedCount ? `${failedCount} mislukt` : "bezorgd"} tone={failedCount ? "warn" : "default"} />
        <MailboxMetric label="Concepten" value={mailbox?.summary.drafts ?? draftOutbox.length} detail="wachten op verzending" />
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

          <Field label="Variabelen overschrijven (optioneel)" className="mt-3">
            <textarea
              value={variables}
              onChange={(event) => setVariables(event.target.value)}
              rows={6}
              placeholder="bijv. next_step=Ik bel je donderdag"
              className={`${inputClass} min-h-36 resize-y leading-6`}
            />
          </Field>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            Eén per regel als <span className="font-mono text-slate-400">sleutel=waarde</span>. De meeste velden vullen automatisch uit klant, opdracht en AI —
            vul hier alleen wat je wilt overschrijven. Klik een veld bij &ldquo;Template context&rdquo; hieronder om het toe te voegen.
          </p>

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
                  <button
                    key={hint}
                    type="button"
                    onClick={() => insertVariable(hint)}
                    title="Klik om te overschrijven in het variabelenveld"
                    className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-100 transition hover:border-sky-400/40 hover:bg-sky-500/20"
                  >
                    {hint}
                  </button>
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
                <p className="text-xs font-bold uppercase text-slate-500">Voorbeeld</p>
                <button
                  type="button"
                  onClick={openPreview}
                  disabled={!selectedTemplate}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Eye size={12} /> Vergroten
                </button>
              </div>
              <iframe
                title="LaventeCare mail preview"
                sandbox=""
                srcDoc={previewHTML}
                className="h-64 w-full bg-slate-100"
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
              onClick={openSendConfirm}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} />
              {sending ? "Verwerken..." : "Versturen..."}
            </button>
          </div>
        </form>

        <aside className="min-w-0 space-y-4">
          <section className="glass min-w-0 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                <MessagesSquare size={13} /> Gesprekken
                {conversations.length > 0 ? <span className="text-slate-600">({conversations.length})</span> : null}
              </p>
              <button
                type="button"
                onClick={() => { void onSyncInbox(); }}
                disabled={syncingInbox}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-sky-500/25 bg-sky-500/10 px-2.5 text-[11px] font-semibold text-sky-200 transition-colors hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncingInbox ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Sync inbox
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {mailboxLoading ? (
                <p className="text-sm text-slate-500">Mailbox laden...</p>
              ) : conversations.length === 0 ? (
                <p className="text-sm leading-6 text-slate-500">Nog geen verzonden of ontvangen mail. Sync haalt je LaventeCare-inbox op.</p>
              ) : (
                (showAllConversations ? conversations : conversations.slice(0, 10)).map((conversation) => (
                  <ConversationRow key={conversation.key} conversation={conversation} onOpen={openThread} />
                ))
              )}
            </div>
            {conversations.length > 10 ? (
              <button
                type="button"
                onClick={() => setShowAllConversations((value) => !value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.02] py-1.5 text-[11px] font-semibold text-slate-400 transition hover:bg-white/[0.05]"
              >
                {showAllConversations ? "Toon minder" : `Toon alle ${conversations.length} gesprekken`}
              </button>
            ) : null}
          </section>

          {draftOutbox.length > 0 ? (
            <section className="glass min-w-0 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Concepten &amp; mislukt</p>
              <div className="mt-3 space-y-2">
                {draftOutbox.slice(0, 6).map((item) => (
                  <OutboxRow key={item.id} item={item} onOpen={openOutbox} />
                ))}
              </div>
            </section>
          ) : null}

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

      <MailThreadModal
        conversation={threadConv}
        onClose={() => setThreadConv(null)}
        onOpenEntry={openThreadEntry}
        onReply={replyToConversation}
      />
      <MailPreviewModal state={mailModal} onClose={() => setMailModal(null)} />
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

function MailboxMetric({ label, value, detail, tone = "default" }: { label: string; value: number | string; detail: string; tone?: "default" | "warn" }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className={`mt-1 text-xs ${tone === "warn" ? "font-semibold text-amber-300" : "text-slate-500"}`}>{detail}</p>
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

type ThreadEntry =
  | { kind: "out"; at: string; outbox: MailOutboxItem }
  | { kind: "in"; at: string; inbox: MailInboxItem };

type MailConversation = {
  key: string;
  party: string;
  subject: string;
  latestAt: string;
  count: number;
  hasUnread: boolean;
  latestKind: "out" | "in";
  entries: ThreadEntry[];
};

// Groups SENT outbox mails + received inbox mails into conversations by conversation_id
// (a message with none becomes its own single-message thread), newest activity first.
// Drafts/failed outbox rows have no conversation yet and are handled separately.
function buildConversations(outbox: MailOutboxItem[], inbox: MailInboxItem[]): MailConversation[] {
  const groups = new Map<string, ThreadEntry[]>();
  const add = (key: string, entry: ThreadEntry) => {
    const arr = groups.get(key);
    if (arr) arr.push(entry);
    else groups.set(key, [entry]);
  };
  for (const o of outbox) {
    if (o.status !== "sent") continue;
    add(o.conversation_id || `out:${o.id}`, { kind: "out", at: o.sent_at ?? o.created_at, outbox: o });
  }
  for (const i of inbox) {
    add(i.conversation_id || `in:${i.id}`, { kind: "in", at: i.received_at, inbox: i });
  }
  const conversations: MailConversation[] = [];
  for (const [key, entries] of groups) {
    entries.sort((a, b) => a.at.localeCompare(b.at));
    const latest = entries[entries.length - 1];
    const companyName = entries
      .map((e) => (e.kind === "in" ? e.inbox.company_name : e.outbox.company_name))
      .find(Boolean);
    const party =
      companyName ||
      (latest.kind === "in"
        ? latest.inbox.from_name || latest.inbox.from_email
        : latest.outbox.to_name || latest.outbox.to_email);
    const subject = latest.kind === "in" ? latest.inbox.subject || "(geen onderwerp)" : latest.outbox.subject;
    conversations.push({
      key,
      party,
      subject,
      latestAt: latest.at,
      count: entries.length,
      hasUnread: entries.some((e) => e.kind === "in" && !e.inbox.is_read),
      latestKind: latest.kind,
      entries,
    });
  }
  conversations.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
  return conversations;
}

type MailModalAction = {
  label: string;
  onClick: () => void;
  variant?: "send" | "default";
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
};

type MailModalState = {
  title: string;
  subtitle?: string;
  html?: string;
  text?: string;
  meta?: { label: string; value: string }[];
  primaryAction?: MailModalAction;
  externalLink?: { label: string; href: string };
};

// One reusable surface for: the full-fidelity send preview, the pre-send confirmation
// (recipient echo), opening an outbox row (read-only + resend), and opening an inbox
// message (read-only + reply). The iframe is sandboxed and renders exactly the escaped
// HTML that gets sent — preview == artifact.
function MailPreviewModal({ state, onClose }: { state: MailModalState | null; onClose: () => void }) {
  useEffect(() => {
    if (!state) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose]);

  if (!state) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="glass flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{state.title}</p>
            {state.subtitle ? <p className="mt-0.5 truncate text-xs text-slate-400">{state.subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-slate-300 transition hover:bg-white/[0.08]"
          >
            <X size={16} />
          </button>
        </div>
        {state.meta && state.meta.length ? (
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-b border-white/10 bg-white/[0.02] px-4 py-2.5 sm:px-5">
            {state.meta.map((entry) => (
              <div key={entry.label} className="min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{entry.label}</span>
                <p className="truncate text-xs font-medium text-slate-200">{entry.value}</p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-auto bg-slate-100">
          {state.html ? (
            <iframe title="LaventeCare mail" sandbox="" srcDoc={state.html} className="h-[60vh] min-h-[320px] w-full bg-slate-100" />
          ) : (
            <div className="whitespace-pre-wrap p-5 text-sm leading-6 text-slate-800">{state.text || "Geen inhoud beschikbaar."}</div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3 sm:px-5">
          {state.externalLink ? (
            <a
              href={state.externalLink.href}
              target="_blank"
              rel="noreferrer"
              className="mr-auto inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300 hover:underline"
            >
              <ExternalLink size={13} /> {state.externalLink.label}
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
          >
            Sluiten
          </button>
          {state.primaryAction ? (
            <button
              type="button"
              disabled={state.primaryAction.disabled || state.primaryAction.loading}
              onClick={state.primaryAction.onClick}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                state.primaryAction.variant === "send"
                  ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                  : "border border-sky-500/30 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25"
              }`}
            >
              {state.primaryAction.loading ? <Loader2 size={15} className="animate-spin" /> : state.primaryAction.icon}
              {state.primaryAction.loading ? "Verwerken..." : state.primaryAction.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ConversationRow({ conversation, onOpen }: { conversation: MailConversation; onOpen: (c: MailConversation) => void }) {
  const c = conversation;
  return (
    <button
      type="button"
      onClick={() => onOpen(c)}
      className={`w-full rounded-lg border px-3 py-2 text-left transition hover:bg-white/[0.06] ${c.hasUnread ? "border-sky-500/25 bg-sky-500/[0.05]" : "border-white/10 bg-white/[0.03]"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-white">{c.party}</p>
        <span className="shrink-0 text-[10px] text-slate-500">{formatDate(c.latestAt)}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5">
        {c.latestKind === "in" ? (
          <ArrowDownLeft size={12} className="shrink-0 text-emerald-300" />
        ) : (
          <ArrowUpRight size={12} className="shrink-0 text-sky-300" />
        )}
        <p className="min-w-0 truncate text-xs font-medium text-slate-300">{c.subject}</p>
      </div>
      {c.count > 1 || c.hasUnread ? (
        <div className="mt-1.5 flex items-center gap-2">
          {c.count > 1 ? (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">{c.count} berichten</span>
          ) : null}
          {c.hasUnread ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-300">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> ongelezen
            </span>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}

function ThreadEntryCard({ entry, onOpen }: { entry: ThreadEntry; onOpen: () => void }) {
  if (entry.kind === "in") {
    const m = entry.inbox;
    return (
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] px-3 py-2 text-left transition hover:bg-emerald-500/[0.09]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
            <ArrowDownLeft size={11} /> Ontvangen
          </span>
          <span className="text-[10px] text-slate-500">{formatDate(m.received_at)}</span>
        </div>
        <p className="mt-1 truncate text-xs font-semibold text-white">{m.from_name || m.from_email}</p>
        <p className="truncate text-xs text-slate-400">{m.subject || "(geen onderwerp)"}</p>
        {m.body_preview ? <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{m.body_preview}</p> : null}
      </button>
    );
  }
  const m = entry.outbox;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-lg border border-sky-500/20 bg-sky-500/[0.05] px-3 py-2 text-left transition hover:bg-sky-500/[0.09]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-sky-300">
          <ArrowUpRight size={11} /> Verzonden{m.status === "failed" ? " · mislukt" : ""}
        </span>
        <span className="text-[10px] text-slate-500">{formatDate(m.sent_at ?? m.created_at)}</span>
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-white">Aan {m.to_name || m.to_email}</p>
      <p className="truncate text-xs text-slate-400">{m.subject}</p>
    </button>
  );
}

function MailThreadModal({
  conversation,
  onClose,
  onOpenEntry,
  onReply,
}: {
  conversation: MailConversation | null;
  onClose: () => void;
  onOpenEntry: (entry: ThreadEntry) => void;
  onReply: (conversation: MailConversation) => void;
}) {
  useEffect(() => {
    if (!conversation) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [conversation, onClose]);

  if (!conversation) return null;
  const ordered = [...conversation.entries].reverse();
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="glass flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{conversation.party}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {conversation.count} bericht{conversation.count === 1 ? "" : "en"} · {conversation.subject}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-slate-300 transition hover:bg-white/[0.08]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-auto p-4 sm:p-5">
          {ordered.map((entry, idx) => (
            <ThreadEntryCard key={`${entry.kind}-${idx}`} entry={entry} onOpen={() => onOpenEntry(entry)} />
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
          >
            Sluiten
          </button>
          <button
            type="button"
            onClick={() => onReply(conversation)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/15 px-4 text-sm font-bold text-sky-100 transition hover:bg-sky-500/25"
          >
            <Reply size={15} /> Beantwoorden
          </button>
        </div>
      </div>
    </div>
  );
}

function OutboxRow({ item, onOpen }: { item: MailOutboxItem; onOpen: (item: MailOutboxItem) => void }) {
  const statusClass =
    item.status === "sent"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
      : item.status === "failed"
        ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
        : item.status === "sending"
          ? "border-sky-500/20 bg-sky-500/10 text-sky-200"
          : "border-amber-500/20 bg-amber-500/10 text-amber-200";
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:bg-white/[0.06]"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-bold text-white">{item.subject}</p>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClass}`}>{label(item.status)}</span>
      </div>
      <p className="mt-1 truncate text-xs text-slate-500">Aan {item.to_email} · {formatDate(item.sent_at ?? item.created_at)}</p>
      {item.error_message ? <p className="mt-1 line-clamp-2 text-xs text-rose-300">{item.error_message}</p> : null}
    </button>
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

// Keys whose value is trusted, server-built HTML and must NOT be escaped — mirrors
// the backend rawMailHTMLKeys so the preview renders exactly what gets sent.
const RAW_MAIL_HTML_KEYS = new Set(["pilot.access_block_html"]);

// Mirrors the backend escapeMailText (html.EscapeString + \n -> <br>) so a CRM field,
// the free-text variable editor, or an AI/PDF draft can never inject markup into the
// preview — and, crucially, so the preview matches the escaped mail that is actually sent.
function escapeMailHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&#34;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br>");
}

function renderMailPreview(html: string, values: Record<string, string>) {
  let result = html;
  for (const [key, value] of Object.entries(values)) {
    const rendered = RAW_MAIL_HTML_KEYS.has(key) ? value : escapeMailHtml(value);
    result = result.replaceAll(`{{${key}}}`, rendered);
    result = result.replaceAll(`{{ ${key} }}`, rendered);
  }
  result = result.replace(/<tr>\s*<td\s+align="center"[^>]*>\s*<a\s+href="([^"]*)"[^>]*>[\s\S]*?<\/a>\s*<\/td>\s*<\/tr>/gi, (block, href) => {
    return isSafePreviewUrl(href) ? block : "";
  });
  return result.replace(/\{\{\s*[a-zA-Z0-9_.-]+\s*\}\}/g, "");
}

function renderMailSubjectPreview(subject: string, values: Record<string, string>) {
  let result = subject;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, value).replaceAll(`{{ ${key} }}`, value);
  }
  return result.replace(/\{\{\s*[a-zA-Z0-9_.-]+\s*\}\}/g, "").replace(/\s+/g, " ").trim();
}

function isSafePreviewUrl(value: string) {
  // Mirror the backend isSafeMailCTAURL, which unescapes before validating — our
  // escaped render turns "&" in an href into "&amp;".
  const trimmed = value.trim().replace(/&amp;/g, "&").toLowerCase();
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
