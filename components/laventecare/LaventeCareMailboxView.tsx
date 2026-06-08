"use client";

import { FormEvent, type ReactNode, useMemo, useState } from "react";
import { CheckCircle2, MailCheck, MailPlus, Send, Sparkles, TriangleAlert } from "lucide-react";
import type { LCMailAISuggestion } from "@/lib/api";
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

type SuggestPayload = Omit<SendPayload, "cc" | "bcc" | "send"> & {
  quote_id?: string;
  invoice_id?: string;
  intent?: string;
  tone?: string;
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
  const [toEmail, setToEmail] = useState("");
  const [toName, setToName] = useState("");
  const [aiIntent, setAiIntent] = useState("Maak een klantmail op basis van de gekoppelde LaventeCare context.");
  const [aiTone, setAiTone] = useState("professioneel, warm en concreet");
  const [aiSuggestion, setAiSuggestion] = useState<LCMailAISuggestion | null>(null);
  const [variables, setVariables] = useState(
    [
      "next_step=Ik stel voor om de eerstvolgende stap samen scherp te zetten.",
      "laventecare.email=jeffrey@laventecare.nl",
      "laventecare.tagline=Van idee tot werkend systeem",
      "cta.label=Afstemmen",
      "quote.summary=scope, planning en uitvoering volgens afspraak",
      "invoice.amount=zie factuur",
      "invoice.due_date=14 dagen",
      "project.status=in uitvoering",
      "project.update=De voortgang loopt volgens afspraak.",
      "project.risk=geen bijzonderheden",
      "pilot.scope=de afgesproken testscope",
      "pilot.criteria=kernfunctionaliteit, gebruiksgemak en betrouwbaarheid",
      "pilot.feedback_moment=na de eerste testperiode",
      "pilot.access_summary=pilottoegang stemmen we voor de start af via het afgesproken kanaal",
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
  const selectedCompany = companies.find((company) => (company._id ?? company.id) === companyId);
  const companyContacts = contacts.filter((contact) => !companyId || contact.company_id === companyId || contact.companyId === companyId);
  const selectedContact = contacts.find((contact) => (contact._id ?? contact.id) === contactId);
  const resolvedEmail = toEmail.trim() || selectedContact?.email || "";
  const resolvedName = toName.trim() || selectedContact?.naam || "";
  const parsedVariables = useMemo(() => parseVariables(variables), [variables]);
  const outboundVariables = useMemo(() => prepareOutboundVariables(parsedVariables), [parsedVariables]);
  const variableHints = useMemo(() => extractPlaceholders(selectedTemplate), [selectedTemplate]);
  const previewHTML = useMemo(() => renderMailPreview(selectedTemplate?.body_html ?? "", parsedVariables), [selectedTemplate, parsedVariables]);
  const sendReadiness = useMemo(
    () =>
      buildSendReadiness({
        template: selectedTemplate,
        variables: parsedVariables,
        previewHTML,
        resolvedEmail,
        companyLinked: Boolean(companyId || selectedCompany),
      }),
    [selectedTemplate, parsedVariables, previewHTML, resolvedEmail, companyId, selectedCompany]
  );

  const handleSuggest = async () => {
    if (!selectedTemplate) return;
    let suggestion: LCMailAISuggestion;
    try {
      suggestion = await onSuggestMailContent({
        template_id: selectedTemplate.id,
        company_id: companyId || undefined,
        contact_id: contactId || undefined,
        project_id: projectId || undefined,
        workstream_id: workstreamId || undefined,
        to_email: resolvedEmail || undefined,
        to_name: resolvedName || undefined,
        intent: aiIntent,
        tone: aiTone,
        variables: outboundVariables,
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
      company_id: companyId || undefined,
      contact_id: contactId || undefined,
      project_id: projectId || undefined,
      workstream_id: workstreamId || undefined,
      to_email: resolvedEmail || undefined,
      to_name: resolvedName || undefined,
      variables: outboundVariables,
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
                disabled={aiSuggesting || !selectedTemplate}
                onClick={() => void handleSuggest()}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-sky-300 px-3 text-sm font-bold text-sky-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles size={15} />
                {aiSuggesting ? "AI leest context..." : "AI vullen"}
              </button>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
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

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
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

function prepareOutboundVariables(values: Record<string, string>) {
  const next = { ...values };
  if (isDefaultPilotAccessSummary(next["pilot.access_summary"])) {
    delete next["pilot.access_summary"];
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
}: {
  template?: MailTemplateItem;
  variables: Record<string, string>;
  previewHTML: string;
  resolvedEmail: string;
  companyLinked: boolean;
}) {
  const placeholders = extractPlaceholders(template);
  const unresolved = placeholders.filter((placeholder) => !variables[placeholder]?.trim() && !placeholder.endsWith(".url"));
  const originalHasCTA = Boolean(template?.body_html.match(/<a\s+href="/i));
  const renderedCTAUrls = Array.from(previewHTML.matchAll(/<a\s+href="([^"]+)"/gi), (match) => match[1]);
  const safeCTAs = renderedCTAUrls.filter(isSafePreviewUrl);
  const hasLogo = previewHTML.includes("ik.imagekit.io/a0oim4e3e") || previewHTML.includes("LaventeCare");
  const hasAccessPlaceholder = placeholders.some((placeholder) => placeholder.startsWith("pilot.access"));
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
  if (hasAccessPlaceholder || sensitiveAccessDetected) {
    items.push({
      label: "Toegang",
      detail: sensitiveAccessDetected
        ? "Gevoelige toegang lijkt aanwezig; deel dit alleen bewust via het juiste kanaal."
        : "Toegangsafspraak wordt klantvriendelijk samengevat.",
      status: sensitiveAccessDetected ? "warn" : "ok",
    });
  }

  const status: ReadinessStatus = items.some((item) => item.status === "missing")
    ? "missing"
    : items.some((item) => item.status === "warn")
      ? "warn"
      : "ok";
  return { status, items };
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
