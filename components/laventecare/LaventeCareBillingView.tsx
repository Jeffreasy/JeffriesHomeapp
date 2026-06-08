"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  FileSignature,
  Loader2,
  ReceiptText,
  Send,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import {
  emptyBillingInvoiceForm,
  emptyBillingQuoteForm,
  emptyBillingTimeForm,
  type BillingInvoiceForm,
  type BillingItem,
  type BillingQuoteForm,
  type BillingTimeForm,
  type CompanyItem,
  type InvoiceItem,
  type ProjectItem,
  type QuoteItem,
  type TimeEntryItem,
  type WorkstreamItem,
} from "./LaventeCareTypes";
import { formatCents, formatDate, formatMinutes, label } from "./LaventeCareUtils";

type BillingMode = "uren" | "offerte" | "factuur";

type QuotePayload = {
  company_id?: string;
  project_id?: string;
  workstream_id?: string;
  titel: string;
  status?: string;
  valid_until?: string;
  currency?: string;
  vat_rate_bps?: number;
  notes?: string;
  lines: Array<{ description: string; quantity: number; unit_amount_cents: number; sort_order?: number }>;
};

type TimeEntryPayload = {
  company_id?: string;
  project_id?: string;
  workstream_id?: string;
  description: string;
  entry_date?: string;
  minutes: number;
  hourly_rate_cents?: number;
  billable?: boolean;
  status?: string;
};

type InvoicePayload = {
  company_id?: string;
  project_id?: string;
  workstream_id?: string;
  quote_id?: string;
  status?: string;
  due_date?: string;
  currency?: string;
  vat_rate_bps?: number;
  notes?: string;
  time_entry_ids?: string[];
  lines?: Array<{ description: string; quantity_minutes: number; unit_amount_cents: number; sort_order?: number }>;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10";

const selectClass = inputClass;

export function LaventeCareBillingView({
  billing,
  billingLoading,
  companies,
  activeProjects,
  activeWorkstreams,
  quotes,
  timeEntries,
  invoices,
  creatingQuote,
  creatingTimeEntry,
  creatingInvoice,
  updatingQuoteId,
  creatingInvoiceFromQuoteId,
  updatingInvoiceId,
  onCreateQuote,
  onCreateTimeEntry,
  onCreateInvoice,
  onCreateInvoiceFromQuote,
  onUpdateQuoteStatus,
  onUpdateInvoiceStatus,
}: {
  billing?: BillingItem;
  billingLoading: boolean;
  companies: CompanyItem[];
  activeProjects: ProjectItem[];
  activeWorkstreams: WorkstreamItem[];
  quotes: QuoteItem[];
  timeEntries: TimeEntryItem[];
  invoices: InvoiceItem[];
  creatingQuote: boolean;
  creatingTimeEntry: boolean;
  creatingInvoice: boolean;
  updatingQuoteId: string | null;
  creatingInvoiceFromQuoteId: string | null;
  updatingInvoiceId: string | null;
  onCreateQuote: (payload: QuotePayload) => Promise<void>;
  onCreateTimeEntry: (payload: TimeEntryPayload) => Promise<void>;
  onCreateInvoice: (payload: InvoicePayload) => Promise<void>;
  onCreateInvoiceFromQuote: (id: string) => Promise<void>;
  onUpdateQuoteStatus: (id: string, status: string) => Promise<void>;
  onUpdateInvoiceStatus: (id: string, status: string) => Promise<void>;
}) {
  const { success, error: toastError } = useToast();
  const [mode, setMode] = useState<BillingMode>("uren");
  const [timeForm, setTimeForm] = useState<BillingTimeForm>(emptyBillingTimeForm);
  const [quoteForm, setQuoteForm] = useState<BillingQuoteForm>(emptyBillingQuoteForm);
  const [invoiceForm, setInvoiceForm] = useState<BillingInvoiceForm>(emptyBillingInvoiceForm);

  const uninvoicedEntries = useMemo(
    () => timeEntries.filter((entry) => entry.billable && !entry.invoice_id && entry.status !== "afgeschreven"),
    [timeEntries]
  );

  const recentQuotes = quotes.slice(0, 5);
  const recentInvoices = invoices.slice(0, 5);
  const invoicesByQuoteId = useMemo(() => {
    const byQuote = new Map<string, InvoiceItem>();
    for (const invoice of invoices) {
      if (invoice.quote_id && invoice.status !== "geannuleerd") {
        byQuote.set(invoice.quote_id, invoice);
      }
    }
    return byQuote;
  }, [invoices]);

  const handleTimeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minutes = asNumber(timeForm.minutes);
    const rate = asNumber(timeForm.hourlyRate);
    if (!timeForm.companyId) {
      toastError("Kies eerst een klant voor deze urenregel");
      return;
    }
    if (!timeForm.description.trim() || minutes <= 0) {
      toastError("Omschrijving en minuten zijn verplicht");
      return;
    }
    try {
      await onCreateTimeEntry({
        company_id: emptyToUndefined(timeForm.companyId),
        project_id: emptyToUndefined(timeForm.projectId),
        workstream_id: emptyToUndefined(timeForm.workstreamId),
        description: timeForm.description.trim(),
        entry_date: emptyToUndefined(timeForm.entryDate),
        minutes,
        hourly_rate_cents: euroToCents(rate),
        billable: timeForm.billable,
        status: "concept",
      });
      setTimeForm(emptyBillingTimeForm);
      success("Urenregel vastgelegd");
    } catch {
      return;
    }
  };

  const handleQuoteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = asNumber(quoteForm.quantity);
    const amount = asNumber(quoteForm.unitAmount);
    if (!quoteForm.companyId) {
      toastError("Kies eerst een klant voor deze offerte");
      return;
    }
    if (!quoteForm.titel.trim() || !quoteForm.description.trim()) {
      toastError("Titel en offerteregel zijn verplicht");
      return;
    }
    try {
      await onCreateQuote({
        company_id: emptyToUndefined(quoteForm.companyId),
        project_id: emptyToUndefined(quoteForm.projectId),
        workstream_id: emptyToUndefined(quoteForm.workstreamId),
        titel: quoteForm.titel.trim(),
        status: "concept",
        valid_until: emptyToUndefined(quoteForm.validUntil),
        currency: "EUR",
        vat_rate_bps: 2100,
        notes: emptyToUndefined(quoteForm.notes),
        lines: [
          {
            description: quoteForm.description.trim(),
            quantity: Math.max(1, quantity),
            unit_amount_cents: euroToCents(amount),
            sort_order: 1,
          },
        ],
      });
      setQuoteForm(emptyBillingQuoteForm);
      success("Offerteconcept aangemaakt");
    } catch {
      return;
    }
  };

  const handleInvoiceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedIds = invoiceForm.selectedTimeEntryIds;
    const minutes = asNumber(invoiceForm.minutes);
    const amount = asNumber(invoiceForm.hourlyRate);
    if (!invoiceForm.companyId && selectedIds.length === 0) {
      toastError("Kies een klant of selecteer urenregels");
      return;
    }
    if (selectedIds.length === 0 && (!invoiceForm.description.trim() || minutes <= 0)) {
      toastError("Gebruik geselecteerde uren of vul een factuurregel in");
      return;
    }
    try {
      await onCreateInvoice({
        company_id: emptyToUndefined(invoiceForm.companyId),
        project_id: emptyToUndefined(invoiceForm.projectId),
        workstream_id: emptyToUndefined(invoiceForm.workstreamId),
        status: "concept",
        due_date: emptyToUndefined(invoiceForm.dueDate),
        currency: "EUR",
        vat_rate_bps: 2100,
        notes: emptyToUndefined(invoiceForm.notes),
        time_entry_ids: selectedIds.length > 0 ? selectedIds : undefined,
        lines:
          selectedIds.length > 0
            ? undefined
            : [
                {
                  description: invoiceForm.description.trim(),
                  quantity_minutes: minutes,
                  unit_amount_cents: euroToCents(amount),
                  sort_order: 1,
                },
              ],
      });
      setInvoiceForm(emptyBillingInvoiceForm);
      success("Factuurconcept aangemaakt");
    } catch {
      return;
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BillingMetric
          icon={Clock3}
          label="Niet gefactureerd"
          value={formatMinutes(billing?.summary.uninvoicedMinutes)}
          detail={`${uninvoicedEntries.length} open urenregels`}
        />
        <BillingMetric
          icon={ReceiptText}
          label="Open facturen"
          value={formatCents(billing?.summary.outstandingCents)}
          detail={`${billing?.summary.openInvoices ?? 0} facturen niet betaald`}
        />
        <BillingMetric
          icon={FileSignature}
          label="Offertes"
          value={billingLoading ? "..." : String(billing?.summary.openQuotes ?? 0)}
          detail="concept/verzonden offertes"
        />
        <BillingMetric
          icon={ShieldCheck}
          label="Bunq"
          value={billing?.summary.bunqReady ? "Klaar" : "Voorbereid"}
          detail={billing?.summary.bunqReady ? "API key, user en rekening staan klaar" : "wacht op Render env"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="glass min-w-0 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Commerciele workflow</p>
              <h3 className="mt-1 text-lg font-bold text-white">Offerte, uren en factuur</h3>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
              {(["uren", "offerte", "factuur"] as BillingMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn(
                    "min-h-9 rounded-md px-2 text-xs font-bold capitalize transition sm:px-3",
                    mode === item ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {mode === "uren" ? (
            <form onSubmit={handleTimeSubmit} className="mt-5 space-y-4">
              <TargetFields
                companyId={timeForm.companyId}
                projectId={timeForm.projectId}
                workstreamId={timeForm.workstreamId}
                companies={companies}
                projects={activeProjects}
                workstreams={activeWorkstreams}
                onChange={(fields) => setTimeForm((current) => ({ ...current, ...fields }))}
              />
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Werk gedaan</span>
                <input
                  value={timeForm.description}
                  onChange={(event) => setTimeForm((current) => ({ ...current, description: event.target.value }))}
                  className={inputClass}
                  placeholder="Bijv. integratiecheck, advies, configuratie..."
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Datum</span>
                  <input
                    type="date"
                    value={timeForm.entryDate}
                    onChange={(event) => setTimeForm((current) => ({ ...current, entryDate: event.target.value }))}
                    className={inputClass}
                  />
                </label>
                <NumberField
                  label="Minuten"
                  value={timeForm.minutes}
                  onChange={(minutes) => setTimeForm((current) => ({ ...current, minutes }))}
                />
                <NumberField
                  label="Uurtarief"
                  value={timeForm.hourlyRate}
                  onChange={(hourlyRate) => setTimeForm((current) => ({ ...current, hourlyRate }))}
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={timeForm.billable}
                    onChange={(event) => setTimeForm((current) => ({ ...current, billable: event.target.checked }))}
                    className="h-4 w-4 rounded border-white/20 bg-black/20 text-amber-400"
                  />
                  Factureerbaar
                </label>
                <button type="submit" disabled={creatingTimeEntry} className="btn btn--primary justify-center sm:min-w-40">
                  {creatingTimeEntry ? <Loader2 size={16} className="animate-spin" /> : <Clock3 size={16} />}
                  Uren opslaan
                </button>
              </div>
            </form>
          ) : null}

          {mode === "offerte" ? (
            <form onSubmit={handleQuoteSubmit} className="mt-5 space-y-4">
              <TargetFields
                companyId={quoteForm.companyId}
                projectId={quoteForm.projectId}
                workstreamId={quoteForm.workstreamId}
                companies={companies}
                projects={activeProjects}
                workstreams={activeWorkstreams}
                onChange={(fields) => setQuoteForm((current) => ({ ...current, ...fields }))}
              />
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Offertetitel</span>
                <input
                  value={quoteForm.titel}
                  onChange={(event) => setQuoteForm((current) => ({ ...current, titel: event.target.value }))}
                  className={inputClass}
                  placeholder="Bijv. Advies en integratie audit"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Regel</span>
                <textarea
                  value={quoteForm.description}
                  onChange={(event) => setQuoteForm((current) => ({ ...current, description: event.target.value }))}
                  className={cn(inputClass, "min-h-24 resize-none")}
                  placeholder="Scope, deliverable of vaste projectregel"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField
                  label="Aantal"
                  value={quoteForm.quantity}
                  onChange={(quantity) => setQuoteForm((current) => ({ ...current, quantity }))}
                />
                <NumberField
                  label="Bedrag"
                  value={quoteForm.unitAmount}
                  onChange={(unitAmount) => setQuoteForm((current) => ({ ...current, unitAmount }))}
                />
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Geldig tot</span>
                  <input
                    type="date"
                    value={quoteForm.validUntil}
                    onChange={(event) => setQuoteForm((current) => ({ ...current, validUntil: event.target.value }))}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Notitie</span>
                <input
                  value={quoteForm.notes}
                  onChange={(event) => setQuoteForm((current) => ({ ...current, notes: event.target.value }))}
                  className={inputClass}
                  placeholder="Optionele interne of klantnotitie"
                />
              </label>
              <div className="flex justify-end">
                <button type="submit" disabled={creatingQuote} className="btn btn--primary justify-center sm:min-w-44">
                  {creatingQuote ? <Loader2 size={16} className="animate-spin" /> : <FileSignature size={16} />}
                  Offerte maken
                </button>
              </div>
            </form>
          ) : null}

          {mode === "factuur" ? (
            <form onSubmit={handleInvoiceSubmit} className="mt-5 space-y-4">
              <TargetFields
                companyId={invoiceForm.companyId}
                projectId={invoiceForm.projectId}
                workstreamId={invoiceForm.workstreamId}
                companies={companies}
                projects={activeProjects}
                workstreams={activeWorkstreams}
                onChange={(fields) => setInvoiceForm((current) => ({ ...current, ...fields }))}
              />
              {uninvoicedEntries.length > 0 ? (
                <div className="rounded-lg border border-white/10 bg-black/15 p-3">
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Open uren meenemen</p>
                  <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                    {uninvoicedEntries.slice(0, 8).map((entry) => {
                      const selected = invoiceForm.selectedTimeEntryIds.includes(entry.id);
                      return (
                        <label
                          key={entry.id}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm transition hover:bg-white/[0.06]"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) =>
                              setInvoiceForm((current) => ({
                                ...current,
                                selectedTimeEntryIds: event.target.checked
                                  ? [...current.selectedTimeEntryIds, entry.id]
                                  : current.selectedTimeEntryIds.filter((id) => id !== entry.id),
                              }))
                            }
                            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/20 text-amber-400"
                          />
                          <span className="min-w-0">
                            <span className="block font-semibold text-white">{entry.description}</span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {formatDate(entry.entry_date)} - {formatMinutes(entry.minutes)} - {formatCents(Math.round((entry.minutes * entry.hourly_rate_cents) / 60))}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Handmatige factuurregel</span>
                <input
                  value={invoiceForm.description}
                  disabled={invoiceForm.selectedTimeEntryIds.length > 0}
                  onChange={(event) => setInvoiceForm((current) => ({ ...current, description: event.target.value }))}
                  className={inputClass}
                  placeholder="Bijv. Advies, implementatie of beheer"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField
                  label="Minuten"
                  value={invoiceForm.minutes}
                  disabled={invoiceForm.selectedTimeEntryIds.length > 0}
                  onChange={(minutes) => setInvoiceForm((current) => ({ ...current, minutes }))}
                />
                <NumberField
                  label="Uurtarief"
                  value={invoiceForm.hourlyRate}
                  disabled={invoiceForm.selectedTimeEntryIds.length > 0}
                  onChange={(hourlyRate) => setInvoiceForm((current) => ({ ...current, hourlyRate }))}
                />
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Vervaldatum</span>
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(event) => setInvoiceForm((current) => ({ ...current, dueDate: event.target.value }))}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Notitie</span>
                <input
                  value={invoiceForm.notes}
                  onChange={(event) => setInvoiceForm((current) => ({ ...current, notes: event.target.value }))}
                  className={inputClass}
                  placeholder="Bijv. bunq betaalverzoek volgt na akkoord"
                />
              </label>
              <div className="flex justify-end">
                <button type="submit" disabled={creatingInvoice} className="btn btn--primary justify-center sm:min-w-44">
                  {creatingInvoice ? <Loader2 size={16} className="animate-spin" /> : <ReceiptText size={16} />}
                  Factuur maken
                </button>
              </div>
            </form>
          ) : null}
        </div>

        <div className="space-y-4">
          <ProviderStatus billing={billing} />
          <ListPanel
            title="Recente offertes"
            empty="Nog geen offertes"
            items={recentQuotes.map((quote) => {
              const linkedInvoice = invoicesByQuoteId.get(quote.id);
              return {
                id: quote.id,
                title: quote.titel,
                meta: `${quote.quote_number} - ${label(quote.status)} - ${formatCents(quote.total_cents)}${
                  linkedInvoice ? ` - gefactureerd via ${linkedInvoice.invoice_number}` : ""
                }`,
                action:
                  quote.status === "concept"
                    ? {
                        label: "Verstuurd",
                        busy: updatingQuoteId === quote.id,
                        onClick: () => onUpdateQuoteStatus(quote.id, "verstuurd"),
                      }
                    : quote.status === "verstuurd"
                      ? {
                          label: "Akkoord",
                          busy: updatingQuoteId === quote.id,
                          onClick: () => onUpdateQuoteStatus(quote.id, "geaccepteerd"),
                        }
                      : quote.status === "geaccepteerd" && !linkedInvoice
                        ? {
                            label: "Factuur",
                            busy: creatingInvoiceFromQuoteId === quote.id,
                            onClick: () => onCreateInvoiceFromQuote(quote.id),
                          }
                        : undefined,
              };
            })}
          />
          <ListPanel
            title="Recente facturen"
            empty="Nog geen facturen"
            items={recentInvoices.map((invoice) => ({
              id: invoice.id,
              title: invoice.invoice_number,
              meta: `${label(invoice.status)} - ${formatCents(invoice.total_cents)} - ${invoice.company_name ?? "geen klant"}`,
              action:
                invoice.status === "concept"
                  ? {
                      label: "Verstuurd",
                      busy: updatingInvoiceId === invoice.id,
                      onClick: () => onUpdateInvoiceStatus(invoice.id, "verstuurd"),
                    }
                  : invoice.status === "verstuurd"
                    ? {
                        label: "Betaald",
                        busy: updatingInvoiceId === invoice.id,
                        onClick: () => onUpdateInvoiceStatus(invoice.id, "betaald"),
                      }
                    : undefined,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

function BillingMetric({
  icon: Icon,
  label: metricLabel,
  value,
  detail,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="glass min-w-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{metricLabel}</p>
          <p className="mt-2 truncate text-xl font-bold text-white">{value}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-300">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-slate-400">{detail}</p>
    </div>
  );
}

function ProviderStatus({ billing }: { billing?: BillingItem }) {
  const ready = Boolean(billing?.summary.bunqReady);
  return (
    <div className="glass p-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
            ready ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-sky-500/25 bg-sky-500/10 text-sky-300"
          )}
        >
          <Banknote size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Betaalprovider</p>
          <h4 className="mt-1 text-sm font-bold text-white">bunq {ready ? "klaar voor live koppeling" : "voorbereid in facturen"}</h4>
          <p className="mt-2 text-sm leading-5 text-slate-400">
            {ready
              ? "Facturen kunnen straks via bevestiging aan RequestInquiry/betaallinks worden gekoppeld."
              : "Zet BUNQ_API_KEY, BUNQ_USER_ID en BUNQ_MONETARY_ACCOUNT_ID op Render voordat live betaalverzoeken aan gaan."}
          </p>
        </div>
      </div>
    </div>
  );
}

function TargetFields({
  companyId,
  projectId,
  workstreamId,
  companies,
  projects,
  workstreams,
  onChange,
}: {
  companyId: string;
  projectId: string;
  workstreamId: string;
  companies: CompanyItem[];
  projects: ProjectItem[];
  workstreams: WorkstreamItem[];
  onChange: (fields: { companyId?: string; projectId?: string; workstreamId?: string }) => void;
}) {
  const filteredProjects = companyId ? projects.filter((project) => project.company_id === companyId) : projects;
  const filteredWorkstreams = companyId ? workstreams.filter((workstream) => workstream.company_id === companyId) : workstreams;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Klant</span>
        <select
          value={companyId}
          onChange={(event) => onChange({ companyId: event.target.value, projectId: "", workstreamId: "" })}
          className={selectClass}
        >
          <option value="">Kies klant</option>
          {companies.map((company) => (
            <option key={company._id ?? company.id} value={company._id ?? company.id}>
              {company.naam}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Project</span>
        <select value={projectId} onChange={(event) => onChange({ projectId: event.target.value })} className={selectClass}>
          <option value="">Geen project</option>
          {filteredProjects.map((project) => (
            <option key={project._id ?? project.id} value={project._id ?? project.id}>
              {project.naam}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Opdracht</span>
        <select value={workstreamId} onChange={(event) => onChange({ workstreamId: event.target.value })} className={selectClass}>
          <option value="">Geen opdracht</option>
          {filteredWorkstreams.map((workstream) => (
            <option key={workstream._id ?? workstream.id} value={workstream._id ?? workstream.id}>
              {workstream.titel}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function NumberField({
  label: fieldLabel,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number | "";
  disabled?: boolean;
  onChange: (value: number | "") => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">{fieldLabel}</span>
      <input
        type="number"
        min={0}
        step="0.01"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
        className={inputClass}
      />
    </label>
  );
}

function ListPanel({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; meta: string; action?: { label: string; busy: boolean; onClick: () => void } }>;
}) {
  return (
    <div className="glass p-4">
      <h4 className="text-sm font-bold text-white">{title}</h4>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.meta}</p>
                </div>
                {item.action ? (
                  <button
                    type="button"
                    onClick={item.action.onClick}
                    disabled={item.action.busy}
                    className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-60"
                  >
                    {item.action.busy ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : item.action.label === "Betaald" || item.action.label === "Akkoord" ? (
                      <CheckCircle2 size={13} />
                    ) : item.action.label === "Factuur" ? (
                      <ReceiptText size={13} />
                    ) : (
                      <Send size={13} />
                    )}
                    {item.action.label}
                  </button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-3 text-sm text-slate-500">{empty}</p>
        )}
      </div>
    </div>
  );
}

function emptyToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function asNumber(value: number | "") {
  return value === "" ? 0 : Number(value);
}

function euroToCents(value: number) {
  return Math.round(value * 100);
}
