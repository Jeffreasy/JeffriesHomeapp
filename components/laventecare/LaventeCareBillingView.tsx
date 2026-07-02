"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Download,
  FileSignature,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  ReceiptText,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  XCircle,
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
import {
  daysPastDue,
  formatCents,
  formatDate,
  formatMinutes,
  isPastDate,
  label,
} from "./LaventeCareUtils";

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
  lines: Array<{
    description: string;
    quantity: number;
    unit_amount_cents: number;
    sort_order?: number;
  }>;
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
  lines?: Array<{
    description: string;
    quantity_minutes: number;
    unit_amount_cents: number;
    sort_order?: number;
  }>;
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
  requestingPaymentInvoiceId,
  generatingInvoiceDocumentId,
  downloadingInvoiceUBLId,
  refreshingPaymentInvoiceId,
  onCreateQuote,
  onCreateTimeEntry,
  onCreateInvoice,
  onCreateInvoiceFromQuote,
  onUpdateQuoteStatus,
  onUpdateInvoiceStatus,
  onCreatePaymentRequest,
  onOpenInvoiceDocument,
  onDownloadInvoiceUBL,
  onRefreshInvoicePayment,
  onOpenMailboxForInvoice,
  onSendInvoiceReminder,
  pendingPaymentActions,
  onDismissPendingPaymentAction,
  settingsHref,
  prefillCompanyId,
  updatingTimeEntryId,
  onUpdateTimeEntry,
  onWriteOffTimeEntry,
  onReopenTimeEntry,
  onDeleteTimeEntry,
  onDirtyChange,
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
  requestingPaymentInvoiceId: string | null;
  generatingInvoiceDocumentId: string | null;
  downloadingInvoiceUBLId: string | null;
  refreshingPaymentInvoiceId: string | null;
  onCreateQuote: (payload: QuotePayload) => Promise<void>;
  onCreateTimeEntry: (payload: TimeEntryPayload) => Promise<void>;
  onCreateInvoice: (payload: InvoicePayload) => Promise<void>;
  onCreateInvoiceFromQuote: (id: string) => Promise<void>;
  onUpdateQuoteStatus: (id: string, status: string) => Promise<void>;
  onUpdateInvoiceStatus: (id: string, status: string) => Promise<void>;
  onCreatePaymentRequest: (id: string) => Promise<void>;
  onOpenInvoiceDocument: (id: string) => Promise<void>;
  onDownloadInvoiceUBL: (id: string) => Promise<void>;
  onRefreshInvoicePayment: (id: string) => Promise<void>;
  onOpenMailboxForInvoice?: (id: string) => void;
  /** R3-maandafsluiting: prefill een herinneringsmail voor een te-late factuur. */
  onSendInvoiceReminder?: (id: string) => void;
  /** R3-H6: per-factuur pending betaalverzoek dat nog bevestigd moet worden. */
  pendingPaymentActions?: Record<string, { message: string; code?: string; pendingActionId?: string }>;
  onDismissPendingPaymentAction?: (id: string) => void;
  /** R3-H6: deep-link naar de Settings pending-actions sectie. */
  settingsHref?: string;
  /** R3-maandafsluiting: voorgeselecteerde klant vanuit het dossier. */
  prefillCompanyId?: string;
  /** N10: urenregels bewerken/afschrijven/verwijderen. */
  updatingTimeEntryId?: string | null;
  onUpdateTimeEntry?: (id: string, data: { omschrijving?: string; minuten?: number }) => Promise<void>;
  onWriteOffTimeEntry?: (entry: TimeEntryItem) => Promise<void>;
  onReopenTimeEntry?: (entry: TimeEntryItem) => Promise<void>;
  onDeleteTimeEntry?: (entry: TimeEntryItem) => Promise<void>;
  /** M-D: meldt de pagina of er half ingevulde formulierinvoer staat. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { success, error: toastError } = useToast();
  const [mode, setMode] = useState<BillingMode>("uren");
  const [timeForm, setTimeForm] =
    useState<BillingTimeForm>(emptyBillingTimeForm);
  const [quoteForm, setQuoteForm] = useState<BillingQuoteForm>(
    emptyBillingQuoteForm,
  );
  const [invoiceForm, setInvoiceForm] = useState<BillingInvoiceForm>(
    emptyBillingInvoiceForm,
  );
  // Inline veldfouten (M28): toast blijft, maar het schuldige veld kleurt rood
  // en krijgt focus.
  const [timeErrors, setTimeErrors] = useState<Record<string, string>>({});
  const [quoteErrors, setQuoteErrors] = useState<Record<string, string>>({});
  const [invoiceErrors, setInvoiceErrors] = useState<Record<string, string>>({});
  // FH6: standaard 8 open urenregels tonen, met expander voor de rest.
  const [showAllUninvoiced, setShowAllUninvoiced] = useState(false);
  // M6: de inline urenregel-editor telt óók als niet-opgeslagen invoer voor de
  // tabwissel-dirty-guard.
  const [timeEntryEditing, setTimeEntryEditing] = useState(false);

  // R3-maandafsluiting: dossier→Commercie-brug. Als er een klant is
  // voorgeselecteerd, seed die in de drie formulieren (alleen als het veld nog
  // leeg is, zodat we geen handmatige keuze overschrijven).
  useEffect(() => {
    if (!prefillCompanyId) return;
    setTimeForm((current) =>
      current.companyId ? current : { ...current, companyId: prefillCompanyId },
    );
    setQuoteForm((current) =>
      current.companyId ? current : { ...current, companyId: prefillCompanyId },
    );
    setInvoiceForm((current) =>
      current.companyId ? current : { ...current, companyId: prefillCompanyId },
    );
  }, [prefillCompanyId]);

  const focusField = (id: string) => {
    window.setTimeout(() => document.getElementById(id)?.focus(), 0);
  };

  const projectScopeById = useMemo(() => {
    const result = new Map<string, { companyId: string | null }>();
    for (const project of activeProjects) {
      result.set(project.id, { companyId: project.company_id ?? null });
    }
    return result;
  }, [activeProjects]);

  const workstreamScopeById = useMemo(() => {
    const result = new Map<
      string,
      { companyId: string | null; projectId: string | null }
    >();
    for (const workstream of activeWorkstreams) {
      result.set(workstream.id, {
        companyId: workstream.company_id ?? null,
        projectId: workstream.project_id ?? null,
      });
    }
    return result;
  }, [activeWorkstreams]);

  const openUninvoicedEntries = useMemo(
    () =>
      timeEntries.filter(
        (entry) =>
          entry.billable &&
          !entry.invoice_id &&
          entry.status !== "afgeschreven",
      ),
    [timeEntries],
  );
  const uninvoicedEntries = useMemo(
    () =>
      openUninvoicedEntries.filter((entry) =>
        entryMatchesInvoiceTarget(
          entry,
          invoiceForm,
          projectScopeById,
          workstreamScopeById,
        ),
      ),
    [invoiceForm, openUninvoicedEntries, projectScopeById, workstreamScopeById],
  );
  const allowedUninvoicedIds = useMemo(() => {
    return new Set(uninvoicedEntries.map((entry) => entry.id));
  }, [uninvoicedEntries]);

  // R3-maandafsluiting: totaal-preview van de factuurselectie (minuten + €
  // excl./incl. 21% btw) vóór "Factuur maken", zodat het bedrag geen verrassing
  // is. Werkt zowel voor geselecteerde open uren als een handmatige regel.
  const INVOICE_VAT_BPS = 2100;
  const invoiceSelectionPreview = useMemo(() => {
    const selected = uninvoicedEntries.filter((entry) =>
      invoiceForm.selectedTimeEntryIds.includes(entry.id),
    );
    let minutes = 0;
    let exclCents = 0;
    if (selected.length > 0) {
      for (const entry of selected) {
        minutes += entry.minutes;
        exclCents += Math.round((entry.minutes * entry.hourly_rate_cents) / 60);
      }
    } else {
      const manualMinutes = asNumber(invoiceForm.minutes);
      const manualRate = asNumber(invoiceForm.hourlyRate);
      if (manualMinutes > 0 && manualRate > 0) {
        minutes = manualMinutes;
        exclCents = Math.round((manualMinutes * euroToCents(manualRate)) / 60);
      }
    }
    const inclCents = Math.round(exclCents * (1 + INVOICE_VAT_BPS / 10000));
    return { count: selected.length, minutes, exclCents, inclCents };
  }, [uninvoicedEntries, invoiceForm]);

  const invoicesByQuoteId = useMemo(() => {
    const byQuote = new Map<string, InvoiceItem>();
    for (const invoice of invoices) {
      if (invoice.quote_id && invoice.status !== "geannuleerd") {
        byQuote.set(invoice.quote_id, invoice);
      }
    }
    return byQuote;
  }, [invoices]);

  // N9(c): open facturen eerst, daarbinnen oplopend op vervaldatum (zonder
  // vervaldatum achteraan); afgesloten facturen behouden hun bestaande
  // (recentste-eerst) volgorde via de stabiele sort.
  const sortedInvoices = useMemo(() => {
    const isOpen = (invoice: InvoiceItem) =>
      invoice.status !== "betaald" && invoice.status !== "geannuleerd";
    return [...invoices].sort((a, b) => {
      const aOpen = isOpen(a);
      const bOpen = isOpen(b);
      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      if (aOpen) {
        const aDue = a.due_date?.slice(0, 10) ?? "9999-12-31";
        const bDue = b.due_date?.slice(0, 10) ?? "9999-12-31";
        if (aDue !== bDue) return aDue < bDue ? -1 : 1;
      }
      return 0;
    });
  }, [invoices]);

  // N9(b): "waarvan N te laat" op de Open facturen-metric.
  const overdueOpenInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.status !== "betaald" &&
          invoice.status !== "geannuleerd" &&
          isPastDate(invoice.due_date),
      ).length,
    [invoices],
  );

  // M-D: signaleer half ingevulde formulieren aan de pagina, zodat een
  // tabwissel eerst om bevestiging vraagt. Doelvelden (klant/project) alleen
  // tellen niet als dataverlies; getypte tekst en geselecteerde uren wel.
  const formsDirty =
    Boolean(timeForm.description.trim()) ||
    Boolean(
      quoteForm.titel.trim() ||
        quoteForm.description.trim() ||
        quoteForm.notes.trim(),
    ) ||
    Boolean(
      invoiceForm.description.trim() ||
        invoiceForm.notes.trim() ||
        invoiceForm.selectedTimeEntryIds.length > 0,
    ) ||
    // M6: een openstaande inline urenregel-editor telt ook mee.
    timeEntryEditing;
  useEffect(() => {
    onDirtyChange?.(formsDirty);
  }, [formsDirty, onDirtyChange]);

  const handleTimeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const minutes = asNumber(timeForm.minutes);
    const rate = asNumber(timeForm.hourlyRate);
    const errors: Record<string, string> = {};
    if (!timeForm.companyId) errors.companyId = "Kies een klant";
    if (!timeForm.description.trim()) errors.description = "Omschrijving is verplicht";
    if (minutes <= 0) errors.minutes = "Vul een aantal minuten in";
    setTimeErrors(errors);
    if (errors.companyId) {
      toastError("Kies eerst een klant voor deze urenregel");
      focusField("billing-time-company");
      return;
    }
    if (errors.description || errors.minutes) {
      toastError("Omschrijving en minuten zijn verplicht");
      focusField(errors.description ? "billing-time-description" : "billing-time-minutes");
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
      // L4: klant/project/opdracht (en tarief/datum) blijven staan voor de
      // volgende regel van dezelfde sessie; alleen omschrijving en minuten
      // worden leeggemaakt.
      setTimeForm((current) => ({
        ...current,
        description: "",
        minutes: emptyBillingTimeForm.minutes,
      }));
      setTimeErrors({});
      success("Urenregel vastgelegd");
    } catch {
      toastError("Urenregel vastleggen is mislukt");
    }
  };

  const handleQuoteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = asNumber(quoteForm.quantity);
    const amount = asNumber(quoteForm.unitAmount);
    const errors: Record<string, string> = {};
    if (!quoteForm.companyId) errors.companyId = "Kies een klant";
    if (!quoteForm.titel.trim()) errors.titel = "Titel is verplicht";
    if (!quoteForm.description.trim()) errors.description = "Offerteregel is verplicht";
    setQuoteErrors(errors);
    if (errors.companyId) {
      toastError("Kies eerst een klant voor deze offerte");
      focusField("billing-quote-company");
      return;
    }
    if (errors.titel || errors.description) {
      toastError("Titel en offerteregel zijn verplicht");
      focusField(errors.titel ? "billing-quote-titel" : "billing-quote-description");
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
      setQuoteErrors({});
      success("Offerteconcept aangemaakt");
    } catch {
      toastError("Offerte aanmaken is mislukt");
    }
  };

  const handleInvoiceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedIds = invoiceForm.selectedTimeEntryIds.filter((id) =>
      allowedUninvoicedIds.has(id),
    );
    const minutes = asNumber(invoiceForm.minutes);
    const amount = asNumber(invoiceForm.hourlyRate);
    const errors: Record<string, string> = {};
    if (!invoiceForm.companyId) errors.companyId = "Kies een klant";
    if (
      selectedIds.length === 0 &&
      (!invoiceForm.description.trim() || minutes <= 0)
    ) {
      errors.lines = "Selecteer open uren of vul een handmatige factuurregel in";
    }
    // L5: een handmatige regel met tarief 0 zou een €0-factuur maken.
    if (selectedIds.length === 0 && !errors.lines && amount <= 0) {
      errors.rate = "Vul een uurtarief groter dan 0 in";
    }
    setInvoiceErrors(errors);
    if (errors.companyId) {
      toastError("Kies eerst een klant voor deze factuur");
      focusField("billing-invoice-company");
      return;
    }
    if (errors.lines) {
      toastError("Gebruik geselecteerde uren of vul een factuurregel in");
      focusField("billing-invoice-description");
      return;
    }
    if (errors.rate) {
      toastError("Vul een uurtarief groter dan 0 in voor de handmatige regel");
      focusField("billing-invoice-rate");
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
      setInvoiceErrors({});
      success(
        "Factuurconcept aangemaakt. Maak daarna het Bunq betaalverzoek en koppel de factuur in Mailbox.",
      );
    } catch {
      toastError("Factuur aanmaken is mislukt");
    }
  };

  return (
    <div className="min-w-0 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BillingMetric
          icon={Clock3}
          label="Niet gefactureerd"
          value={
            billingLoading
              ? "..."
              : formatMinutes(billing?.summary.uninvoicedMinutes)
          }
          detail={
            // N11: openUninvoicedEntries (alle open regels), niet de op het
            // factuurformulier gefilterde subset die leeg is zonder klantkeuze.
            billingLoading ? "laden..." : `${openUninvoicedEntries.length} open urenregels`
          }
        />
        <BillingMetric
          icon={ReceiptText}
          label="Open facturen"
          value={
            billingLoading
              ? "..."
              : formatCents(billing?.summary.outstandingCents)
          }
          detail={
            billingLoading
              ? "laden..."
              : `${billing?.summary.openInvoices ?? 0} facturen niet betaald (incl. btw)${
                  overdueOpenInvoices > 0 ? `, waarvan ${overdueOpenInvoices} te laat` : ""
                }`
          }
        />
        <BillingMetric
          icon={FileSignature}
          label="Offertes"
          value={
            billingLoading ? "..." : String(billing?.summary.openQuotes ?? 0)
          }
          detail="concept/verzonden offertes"
        />
        <BillingMetric
          icon={ShieldCheck}
          label="Bunq"
          value={billing?.summary.bunqReady ? "Klaar" : "Voorbereid"}
          detail={
            billing?.summary.bunqReady
              ? "API key, user en rekening staan klaar"
              : "provider-configuratie op server ontbreekt"
          }
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="glass min-w-0 overflow-hidden p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                Commerciële workflow
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">
                Offerte, uren en factuur
              </h3>
            </div>
            <div className="grid w-full min-w-0 grid-cols-3 gap-1 rounded-lg border border-white/10 bg-black/20 p-1 sm:w-auto">
              {(["uren", "offerte", "factuur"] as BillingMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={cn(
                    "min-h-9 min-w-0 rounded-md px-2 text-xs font-bold capitalize transition sm:px-3",
                    mode === item
                      ? "bg-amber-400 text-slate-950"
                      : "text-slate-400 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {mode === "uren" ? (
            <form onSubmit={handleTimeSubmit} noValidate className="mt-5 space-y-4">
              <TargetFields
                companyId={timeForm.companyId}
                projectId={timeForm.projectId}
                workstreamId={timeForm.workstreamId}
                companies={companies}
                projects={activeProjects}
                workstreams={activeWorkstreams}
                companySelectId="billing-time-company"
                companyError={timeErrors.companyId}
                onChange={(fields) =>
                  setTimeForm((current) => ({ ...current, ...fields }))
                }
              />
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                  Werk gedaan <span className="text-rose-300">*</span>
                </span>
                <input
                  id="billing-time-description"
                  required
                  aria-invalid={Boolean(timeErrors.description)}
                  value={timeForm.description}
                  onChange={(event) =>
                    setTimeForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className={cn(
                    inputClass,
                    timeErrors.description &&
                      "border-rose-400/60 focus:border-rose-400/60",
                  )}
                  placeholder="Bijv. integratiecheck, advies, configuratie..."
                />
                {timeErrors.description ? (
                  <p className="mt-1 text-xs font-semibold text-rose-300" role="alert">
                    {timeErrors.description}
                  </p>
                ) : null}
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                    Datum
                  </span>
                  <input
                    type="date"
                    value={timeForm.entryDate}
                    onChange={(event) =>
                      setTimeForm((current) => ({
                        ...current,
                        entryDate: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </label>
                <NumberField
                  label="Minuten"
                  id="billing-time-minutes"
                  required
                  integer
                  error={timeErrors.minutes}
                  value={timeForm.minutes}
                  onChange={(minutes) =>
                    setTimeForm((current) => ({ ...current, minutes }))
                  }
                />
                <NumberField
                  label="Uurtarief"
                  hint="excl. 21% btw"
                  value={timeForm.hourlyRate}
                  onChange={(hourlyRate) =>
                    setTimeForm((current) => ({ ...current, hourlyRate }))
                  }
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={timeForm.billable}
                    onChange={(event) =>
                      setTimeForm((current) => ({
                        ...current,
                        billable: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-white/20 bg-black/20 text-amber-400"
                  />
                  Factureerbaar
                </label>
                <button
                  type="submit"
                  disabled={creatingTimeEntry}
                  className="btn btn--primary justify-center sm:min-w-40"
                >
                  {creatingTimeEntry ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Clock3 size={16} />
                  )}
                  Uren opslaan
                </button>
              </div>
            </form>
          ) : null}

          {mode === "offerte" ? (
            <form onSubmit={handleQuoteSubmit} noValidate className="mt-5 space-y-4">
              <TargetFields
                companyId={quoteForm.companyId}
                projectId={quoteForm.projectId}
                workstreamId={quoteForm.workstreamId}
                companies={companies}
                projects={activeProjects}
                workstreams={activeWorkstreams}
                companySelectId="billing-quote-company"
                companyError={quoteErrors.companyId}
                onChange={(fields) =>
                  setQuoteForm((current) => ({ ...current, ...fields }))
                }
              />
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                  Offertetitel <span className="text-rose-300">*</span>
                </span>
                <input
                  id="billing-quote-titel"
                  required
                  aria-invalid={Boolean(quoteErrors.titel)}
                  value={quoteForm.titel}
                  onChange={(event) =>
                    setQuoteForm((current) => ({
                      ...current,
                      titel: event.target.value,
                    }))
                  }
                  className={cn(
                    inputClass,
                    quoteErrors.titel &&
                      "border-rose-400/60 focus:border-rose-400/60",
                  )}
                  placeholder="Bijv. Advies en integratie audit"
                />
                {quoteErrors.titel ? (
                  <p className="mt-1 text-xs font-semibold text-rose-300" role="alert">
                    {quoteErrors.titel}
                  </p>
                ) : null}
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                  Regel <span className="text-rose-300">*</span>
                </span>
                <textarea
                  id="billing-quote-description"
                  required
                  aria-invalid={Boolean(quoteErrors.description)}
                  value={quoteForm.description}
                  onChange={(event) =>
                    setQuoteForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className={cn(
                    inputClass,
                    "min-h-24 resize-none",
                    quoteErrors.description &&
                      "border-rose-400/60 focus:border-rose-400/60",
                  )}
                  placeholder="Scope, deliverable of vaste projectregel"
                />
                {quoteErrors.description ? (
                  <p className="mt-1 text-xs font-semibold text-rose-300" role="alert">
                    {quoteErrors.description}
                  </p>
                ) : null}
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField
                  label="Aantal"
                  integer
                  value={quoteForm.quantity}
                  onChange={(quantity) =>
                    setQuoteForm((current) => ({ ...current, quantity }))
                  }
                />
                <NumberField
                  label="Bedrag"
                  hint="excl. 21% btw"
                  value={quoteForm.unitAmount}
                  onChange={(unitAmount) =>
                    setQuoteForm((current) => ({ ...current, unitAmount }))
                  }
                />
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                    Geldig tot
                  </span>
                  <input
                    type="date"
                    value={quoteForm.validUntil}
                    onChange={(event) =>
                      setQuoteForm((current) => ({
                        ...current,
                        validUntil: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                  Notitie
                </span>
                <input
                  value={quoteForm.notes}
                  onChange={(event) =>
                    setQuoteForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Optionele interne of klantnotitie"
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingQuote}
                  className="btn btn--primary justify-center sm:min-w-44"
                >
                  {creatingQuote ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <FileSignature size={16} />
                  )}
                  Offerte maken
                </button>
              </div>
            </form>
          ) : null}

          {mode === "factuur" ? (
            <form onSubmit={handleInvoiceSubmit} noValidate className="mt-5 space-y-4">
              <TargetFields
                companyId={invoiceForm.companyId}
                projectId={invoiceForm.projectId}
                workstreamId={invoiceForm.workstreamId}
                companies={companies}
                projects={activeProjects}
                workstreams={activeWorkstreams}
                companySelectId="billing-invoice-company"
                companyError={invoiceErrors.companyId}
                onChange={(fields) =>
                  setInvoiceForm((current) => ({
                    ...current,
                    ...fields,
                    selectedTimeEntryIds: [],
                  }))
                }
              />
              {invoiceForm.companyId ? (
                <div className="rounded-lg border border-white/10 bg-black/15 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                      Open uren meenemen
                    </p>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {uninvoicedEntries.length} van{" "}
                      {openUninvoicedEntries.length} regels passen bij deze
                      context
                    </span>
                  </div>
                  {uninvoicedEntries.length > 0 ? (
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-300">
                      <input
                        type="checkbox"
                        checked={
                          uninvoicedEntries.length > 0 &&
                          uninvoicedEntries.every((entry) =>
                            invoiceForm.selectedTimeEntryIds.includes(entry.id),
                          )
                        }
                        onChange={(event) =>
                          setInvoiceForm((current) => ({
                            ...current,
                            selectedTimeEntryIds: event.target.checked
                              ? uninvoicedEntries.map((entry) => entry.id)
                              : [],
                          }))
                        }
                        className="h-4 w-4 rounded border-white/20 bg-black/20 text-amber-400"
                      />
                      Selecteer alles ({uninvoicedEntries.length} regels)
                    </label>
                  ) : null}
                  <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                    {uninvoicedEntries.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-xs leading-5 text-slate-500">
                        Geen open urenregels voor deze klant/project/opdracht.
                      </div>
                    ) : (
                      (showAllUninvoiced
                        ? uninvoicedEntries
                        : uninvoicedEntries.slice(0, 8)
                      ).map((entry) => {
                        const selected =
                          invoiceForm.selectedTimeEntryIds.includes(entry.id);
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
                                    ? [
                                        ...current.selectedTimeEntryIds,
                                        entry.id,
                                      ]
                                    : current.selectedTimeEntryIds.filter(
                                        (id) => id !== entry.id,
                                      ),
                                }))
                              }
                              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/20 text-amber-400"
                            />
                            <span className="min-w-0">
                              <span className="block font-semibold text-white">
                                {entry.description}
                              </span>
                              <span className="mt-0.5 block text-xs text-slate-500">
                                {formatDate(entry.entry_date)} -{" "}
                                {formatMinutes(entry.minutes)} -{" "}
                                {formatCents(
                                  Math.round(
                                    (entry.minutes * entry.hourly_rate_cents) /
                                      60,
                                  ),
                                )}
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  {uninvoicedEntries.length > 8 ? (
                    <button
                      type="button"
                      onClick={() => setShowAllUninvoiced((value) => !value)}
                      aria-expanded={showAllUninvoiced}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.02] py-1.5 text-[11px] font-semibold text-slate-400 transition hover:bg-white/[0.05]"
                    >
                      {showAllUninvoiced
                        ? "Toon minder"
                        : `Toon alle ${uninvoicedEntries.length} regels`}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-xs leading-5 text-slate-500">
                  Kies eerst een klant; daarna tonen we alleen open urenregels
                  die bij die klant en context horen.
                </div>
              )}
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                  Handmatige factuurregel{" "}
                  <span className="normal-case text-slate-600">
                    (verplicht als je geen uren selecteert)
                  </span>
                </span>
                <input
                  id="billing-invoice-description"
                  aria-invalid={Boolean(invoiceErrors.lines)}
                  value={invoiceForm.description}
                  disabled={invoiceForm.selectedTimeEntryIds.length > 0}
                  onChange={(event) =>
                    setInvoiceForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className={cn(
                    inputClass,
                    invoiceErrors.lines &&
                      "border-rose-400/60 focus:border-rose-400/60",
                  )}
                  placeholder="Bijv. Advies, implementatie of beheer"
                />
                {invoiceErrors.lines ? (
                  <p className="mt-1 text-xs font-semibold text-rose-300" role="alert">
                    {invoiceErrors.lines}
                  </p>
                ) : null}
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField
                  label="Minuten"
                  integer
                  value={invoiceForm.minutes}
                  disabled={invoiceForm.selectedTimeEntryIds.length > 0}
                  onChange={(minutes) =>
                    setInvoiceForm((current) => ({ ...current, minutes }))
                  }
                />
                <NumberField
                  label="Uurtarief"
                  hint="excl. 21% btw"
                  id="billing-invoice-rate"
                  error={invoiceErrors.rate}
                  value={invoiceForm.hourlyRate}
                  disabled={invoiceForm.selectedTimeEntryIds.length > 0}
                  onChange={(hourlyRate) =>
                    setInvoiceForm((current) => ({ ...current, hourlyRate }))
                  }
                />
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                    Vervaldatum
                  </span>
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(event) =>
                      setInvoiceForm((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                  Notitie
                </span>
                <input
                  value={invoiceForm.notes}
                  onChange={(event) =>
                    setInvoiceForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Bijv. bunq betaalverzoek volgt na akkoord"
                />
              </label>
              {invoiceSelectionPreview.exclCents > 0 ? (
                <div className="flex flex-col gap-1 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-amber-100">
                    Totaal van deze factuur
                    {invoiceSelectionPreview.count > 0
                      ? ` (${invoiceSelectionPreview.count} urenregel${invoiceSelectionPreview.count === 1 ? "" : "s"}, ${formatMinutes(invoiceSelectionPreview.minutes)})`
                      : ` (${formatMinutes(invoiceSelectionPreview.minutes)})`}
                  </span>
                  <span className="font-bold text-white">
                    {formatCents(invoiceSelectionPreview.exclCents)} excl. ·{" "}
                    {formatCents(invoiceSelectionPreview.inclCents)} incl. btw
                  </span>
                </div>
              ) : null}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingInvoice}
                  className="btn btn--primary justify-center sm:min-w-44"
                >
                  {creatingInvoice ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ReceiptText size={16} />
                  )}
                  Factuur maken
                </button>
              </div>
            </form>
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          <ProviderStatus billing={billing} />
          {/* FH7: ALLE offertes/facturen zijn benaderbaar — de panelen tonen de
              5 recentste en klappen uit naar de volledige lijst met dezelfde
              acties, zodat een oudere open factuur alsnog gemaild of op
              betaald gezet kan worden. */}
          <ListPanel
            title="Recente offertes"
            expandedTitle="Alle offertes"
            empty="Nog geen offertes"
            initialCount={5}
            expandNoun="offertes"
            searchPlaceholder="Zoek op nummer, titel of klant..."
            filterChips={[
              { key: "concept", label: "Concept" },
              { key: "verstuurd", label: "Verstuurd" },
              { key: "geaccepteerd", label: "Geaccepteerd" },
              { key: "verlopen", label: "Verlopen" },
            ]}
            items={quotes.map((quote) => {
              const linkedInvoice = invoicesByQuoteId.get(quote.id);
              // N9(d): valid_until zichtbaar + "Verlopen"-marker zodra de
              // geldigheid verstreken is terwijl de offerte nog openstaat.
              const expired =
                isPastDate(quote.valid_until) &&
                (quote.status === "concept" || quote.status === "verstuurd");
              const busy = updatingQuoteId === quote.id;
              const actions: Array<{ label: string; busy: boolean; onClick: () => void }> = [];
              if (quote.status === "concept") {
                actions.push({
                  label: "Verstuurd",
                  busy,
                  onClick: () => onUpdateQuoteStatus(quote.id, "verstuurd"),
                });
              } else if (quote.status === "verstuurd") {
                actions.push({
                  label: "Akkoord",
                  busy,
                  onClick: () => onUpdateQuoteStatus(quote.id, "geaccepteerd"),
                });
                // M-I: een verstuurde offerte kan nu ook expliciet worden
                // afgesloten als afgewezen of verlopen (backend accepteert
                // beide statussen vanuit "verstuurd").
                actions.push({
                  label: "Afgewezen",
                  busy,
                  onClick: () => onUpdateQuoteStatus(quote.id, "afgewezen"),
                });
                actions.push({
                  label: "Verlopen",
                  busy,
                  onClick: () => onUpdateQuoteStatus(quote.id, "verlopen"),
                });
              } else if (quote.status === "geaccepteerd" && !linkedInvoice) {
                actions.push({
                  label: "Factuur",
                  busy: creatingInvoiceFromQuoteId === quote.id,
                  onClick: () => onCreateInvoiceFromQuote(quote.id),
                });
              }
              return {
                id: quote.id,
                title: quote.titel,
                // M-G: excl./incl. btw naast elkaar i.p.v. alleen het
                // ongelabelde totaal.
                meta: [
                  quote.quote_number,
                  label(quote.status),
                  `${formatCents(quote.subtotal_cents)} excl. · ${formatCents(quote.total_cents)} incl. btw`,
                  quote.valid_until ? `geldig tot ${formatDate(quote.valid_until)}` : null,
                  linkedInvoice ? `gefactureerd via ${linkedInvoice.invoice_number}` : null,
                ]
                  .filter(Boolean)
                  .join(" - "),
                badge: expired ? { label: "Verlopen", tone: "rose" as const } : undefined,
                filterKeys: [quote.status, ...(expired ? ["verlopen"] : [])],
                searchText: `${quote.quote_number} ${quote.titel} ${quote.company_name ?? ""}`,
                actions: actions.length > 0 ? actions : undefined,
              };
            })}
          />
          <ListPanel
            title="Recente facturen"
            expandedTitle="Alle facturen"
            empty="Nog geen facturen"
            initialCount={5}
            expandNoun="facturen"
            searchPlaceholder="Zoek op nummer of klant..."
            filterChips={[
              { key: "concept", label: "Concept" },
              { key: "verstuurd", label: "Verstuurd" },
              { key: "betaald", label: "Betaald" },
              { key: "te_laat", label: "Te laat" },
            ]}
            items={sortedInvoices.map((invoice) => {
              const hasPaymentRequest = Boolean(
                invoice.provider_request_id || invoice.payment_url,
              );
              const providerLabel = hasPaymentRequest
                ? ` - ${invoice.payment_provider || "bunq"} gekoppeld`
                : invoice.payment_provider
                  ? ` - ${invoice.payment_provider}`
                  : "";
              const paymentStatusLabel = invoice.payment_status
                ? ` - status ${label(invoice.payment_status)}`
                : "";
              const documentLabel = invoice.document_generated_at
                ? " - document klaar"
                : "";
              const actions: Array<{
                label: string;
                busy: boolean;
                onClick: () => void;
              }> = [];
              actions.push({
                label: "Document",
                busy: generatingInvoiceDocumentId === invoice.id,
                onClick: () => onOpenInvoiceDocument(invoice.id),
              });
              actions.push({
                label: "UBL",
                busy: downloadingInvoiceUBLId === invoice.id,
                onClick: () => onDownloadInvoiceUBL(invoice.id),
              });
              if (
                invoice.status !== "betaald" &&
                invoice.status !== "geannuleerd"
              ) {
                if (!hasPaymentRequest) {
                  actions.push({
                    label: "Betaalverzoek",
                    busy: requestingPaymentInvoiceId === invoice.id,
                    onClick: () => onCreatePaymentRequest(invoice.id),
                  });
                } else {
                  actions.push({
                    label: "Check betaling",
                    busy: refreshingPaymentInvoiceId === invoice.id,
                    onClick: () => onRefreshInvoicePayment(invoice.id),
                  });
                }
                if (invoice.status === "concept") {
                  // M20: handmatig verstuurde facturen (buiten de bunq-flow om)
                  // kunnen zo alsnog naar "verstuurd" en daarna naar "betaald".
                  actions.push({
                    label: "Verstuurd",
                    busy: updatingInvoiceId === invoice.id,
                    onClick: () =>
                      onUpdateInvoiceStatus(invoice.id, "verstuurd"),
                  });
                }
                if (invoice.status === "verstuurd") {
                  actions.push({
                    label: "Betaald",
                    busy: updatingInvoiceId === invoice.id,
                    onClick: () => onUpdateInvoiceStatus(invoice.id, "betaald"),
                  });
                }
              }
              if (onOpenMailboxForInvoice) {
                actions.push({
                  label: "Mail",
                  busy: false,
                  onClick: () => onOpenMailboxForInvoice(invoice.id),
                });
              }
              // N9(a): vervaldatum in de meta + rode "X dagen te laat"-badge
              // zodra de vervaldatum (Amsterdam) verstreken is en de factuur
              // nog niet betaald/geannuleerd is.
              const overdueDays =
                invoice.status !== "betaald" && invoice.status !== "geannuleerd"
                  ? daysPastDue(invoice.due_date)
                  : 0;
              // R3-maandafsluiting: "Herinnering sturen" op te-late facturen —
              // prefilt een herinneringstemplate in de Mailbox met deze factuur.
              if (overdueDays > 0 && onSendInvoiceReminder) {
                actions.push({
                  label: "Herinnering",
                  busy: false,
                  onClick: () => onSendInvoiceReminder(invoice.id),
                });
              }
              // R3-H6: persistente, actionabele melding als er een betaalverzoek
              // op bevestiging wacht (i.p.v. een wegtikkende code-toast). Zodra
              // de factuur een gekoppeld betaalverzoek/betaal-URL heeft is de
              // bevestiging rond en verdwijnt de melding.
              const pending = hasPaymentRequest
                ? undefined
                : pendingPaymentActions?.[invoice.id];
              const notice = pending
                ? {
                    text: pending.message,
                    tone: "amber" as const,
                    link: settingsHref
                      ? { label: "Bevestig in Settings", href: settingsHref }
                      : undefined,
                    onDismiss: onDismissPendingPaymentAction
                      ? () => onDismissPendingPaymentAction(invoice.id)
                      : undefined,
                  }
                : undefined;
              return {
                id: invoice.id,
                title: invoice.invoice_number,
                meta: [
                  label(invoice.status),
                  // M-G: excl./incl. btw expliciet gelabeld.
                  `${formatCents(invoice.subtotal_cents)} excl. · ${formatCents(invoice.total_cents)} incl. btw`,
                  invoice.due_date ? `vervalt ${formatDate(invoice.due_date)}` : "geen vervaldatum",
                  invoice.company_name ?? "geen klant",
                ].join(" - ") + `${providerLabel}${paymentStatusLabel}${documentLabel}`,
                badge:
                  overdueDays > 0
                    ? {
                        label: `${overdueDays} ${overdueDays === 1 ? "dag" : "dagen"} te laat`,
                        tone: "rose" as const,
                      }
                    : undefined,
                filterKeys: [invoice.status, ...(overdueDays > 0 ? ["te_laat"] : [])],
                searchText: `${invoice.invoice_number} ${invoice.company_name ?? ""} ${invoice.notes ?? ""}`,
                notice,
                actions,
              };
            })}
          />
          {/* N10: zelfstandige urenlijst met bewerken, afschrijven en
              verwijderen — een typfout hoeft niet meer permanent in "Niet
              gefactureerd" te blijven staan. */}
          {onUpdateTimeEntry && onWriteOffTimeEntry && onDeleteTimeEntry ? (
            <TimeEntriesPanel
              timeEntries={timeEntries}
              busyId={updatingTimeEntryId ?? null}
              onUpdate={onUpdateTimeEntry}
              onWriteOff={onWriteOffTimeEntry}
              onReopen={onReopenTimeEntry}
              onDelete={onDeleteTimeEntry}
              onEditingChange={setTimeEntryEditing}
            />
          ) : null}
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
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            {metricLabel}
          </p>
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
            ready
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
              : "border-sky-500/25 bg-sky-500/10 text-sky-300",
          )}
        >
          <Banknote size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            Betaalprovider
          </p>
          <h4 className="mt-1 text-sm font-bold text-white">
            bunq{" "}
            {ready ? "klaar voor live koppeling" : "voorbereid in facturen"}
          </h4>
          <p className="mt-2 text-sm leading-5 text-slate-400">
            {ready
              ? "Facturen maken eerst een bevestigingsactie. Na akkoord wordt een bunq RequestInquiry gekoppeld en krijgt de factuur status verstuurd; mailen doe je daarna via Mailbox."
              : "De betaalprovider-configuratie op de server ontbreekt nog; die moet compleet zijn voordat live betaalverzoeken aangaan."}
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
  companySelectId,
  companyError,
}: {
  companyId: string;
  projectId: string;
  workstreamId: string;
  companies: CompanyItem[];
  projects: ProjectItem[];
  workstreams: WorkstreamItem[];
  onChange: (fields: {
    companyId?: string;
    projectId?: string;
    workstreamId?: string;
  }) => void;
  companySelectId?: string;
  companyError?: string;
}) {
  const filteredProjects = companyId
    ? projects.filter((project) => project.company_id === companyId)
    : projects;
  const filteredWorkstreams = companyId
    ? workstreams.filter((workstream) => workstream.company_id === companyId)
    : workstreams;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
          Klant <span className="text-rose-300">*</span>
        </span>
        <select
          id={companySelectId}
          required
          aria-invalid={Boolean(companyError)}
          value={companyId}
          onChange={(event) =>
            onChange({
              companyId: event.target.value,
              projectId: "",
              workstreamId: "",
            })
          }
          className={cn(
            selectClass,
            companyError && "border-rose-400/60 focus:border-rose-400/60",
          )}
        >
          <option value="">Kies klant</option>
          {companies.map((company) => (
            <option
              key={company._id ?? company.id}
              value={company._id ?? company.id}
            >
              {company.naam}
            </option>
          ))}
        </select>
        {companyError ? (
          <p className="mt-1 text-xs font-semibold text-rose-300" role="alert">
            {companyError}
          </p>
        ) : null}
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
          Project
        </span>
        <select
          value={projectId}
          onChange={(event) => onChange({ projectId: event.target.value })}
          className={selectClass}
        >
          <option value="">Geen project</option>
          {filteredProjects.map((project) => (
            <option
              key={project._id ?? project.id}
              value={project._id ?? project.id}
            >
              {project.naam}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
          Opdracht
        </span>
        <select
          value={workstreamId}
          onChange={(event) => onChange({ workstreamId: event.target.value })}
          className={selectClass}
        >
          <option value="">Geen opdracht</option>
          {filteredWorkstreams.map((workstream) => (
            <option
              key={workstream._id ?? workstream.id}
              value={workstream._id ?? workstream.id}
            >
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
  id,
  required,
  error,
  hint,
  integer,
}: {
  label: string;
  value: number | "";
  disabled?: boolean;
  onChange: (value: number | "") => void;
  id?: string;
  required?: boolean;
  error?: string;
  /** Kleine toelichting achter het label, bijv. "excl. 21% btw" (M-G). */
  hint?: string;
  /** M8: minuten/aantal worden backend-side als int gedecodeerd; forceer hele
   *  getallen (step=1 + afronden) zodat "90,5" geen decode-fail-toast geeft. */
  integer?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
        {fieldLabel}
        {required ? <span className="text-rose-300"> *</span> : null}
        {hint ? (
          <span className="ml-1 normal-case tracking-normal text-slate-600">({hint})</span>
        ) : null}
      </span>
      <input
        id={id}
        type="number"
        min={0}
        step={integer ? 1 : "0.01"}
        value={value}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        onChange={(event) => {
          if (event.target.value === "") {
            onChange("");
            return;
          }
          const parsed = Number(event.target.value);
          onChange(integer ? Math.round(parsed) : parsed);
        }}
        className={cn(
          inputClass,
          error && "border-rose-400/60 focus:border-rose-400/60",
        )}
      />
      {error ? (
        <p className="mt-1 text-xs font-semibold text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </label>
  );
}

type ListPanelItem = {
  id: string;
  title: string;
  meta: string;
  /** Klein statuslabel naast de titel, bijv. "12 dagen te laat" (N9). */
  badge?: { label: string; tone: "rose" | "amber" | "emerald" };
  /** Sleutels waarop de filterchips matchen (M-H). */
  filterKeys?: string[];
  /** Tekst waarop het zoekveld matcht (M-H); valt terug op titel + meta. */
  searchText?: string;
  /** R3-H6: persistente, actionabele melding onder de regel (bijv. een
   *  betaalverzoek dat nog bevestigd moet worden). */
  notice?: {
    text: string;
    tone?: "amber" | "rose";
    link?: { label: string; href: string };
    onDismiss?: () => void;
  };
  action?: { label: string; busy: boolean; onClick: () => void };
  actions?: Array<{ label: string; busy: boolean; onClick: () => void }>;
};

const listBadgeClasses = {
  rose: "border-rose-500/25 bg-rose-500/10 text-rose-300",
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-200",
  emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
} as const;

function ListPanel({
  title,
  expandedTitle,
  empty,
  items,
  initialCount,
  expandNoun = "regels",
  filterChips,
  searchPlaceholder,
}: {
  title: string;
  /** Paneltitel zodra de volledige lijst uitgeklapt is (diff L-8). */
  expandedTitle?: string;
  empty: string;
  items: ListPanelItem[];
  /** Show only the first N items with a "Toon alle X" expander (FH7). */
  initialCount?: number;
  expandNoun?: string;
  /** M-H: statuschips boven de volledige (uitgeklapte) lijst. */
  filterChips?: Array<{ key: string; label: string }>;
  searchPlaceholder?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const capped = typeof initialCount === "number" && items.length > initialCount;
  const needle = query.trim().toLowerCase();
  const filteredItems = expanded
    ? items.filter((item) => {
        if (activeChip && !(item.filterKeys ?? []).includes(activeChip)) return false;
        if (!needle) return true;
        return (item.searchText ?? `${item.title} ${item.meta}`)
          .toLowerCase()
          .includes(needle);
      })
    : items;
  const visibleItems = capped && !expanded ? filteredItems.slice(0, initialCount) : filteredItems;
  const isFiltering = expanded && (activeChip !== null || needle.length > 0);
  return (
    <div className="glass p-4">
      <h4 className="text-sm font-bold text-white">
        {expanded && expandedTitle ? expandedTitle : title}
      </h4>
      {expanded && (filterChips?.length || searchPlaceholder) ? (
        <div className="mt-2 space-y-2">
          {filterChips?.length ? (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveChip(null)}
                aria-pressed={activeChip === null}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-bold transition",
                  activeChip === null
                    ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]",
                )}
              >
                Alles
              </button>
              {filterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() =>
                    setActiveChip((current) => (current === chip.key ? null : chip.key))
                  }
                  aria-pressed={activeChip === chip.key}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-bold transition",
                    activeChip === chip.key
                      ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]",
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          ) : null}
          {searchPlaceholder ? (
            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="w-full rounded-lg border border-white/10 bg-black/20 py-1.5 pl-8 pr-3 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
              />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mt-3 space-y-2">
        {isFiltering && filteredItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-3 text-sm text-slate-500">
            Geen {expandNoun} voor deze filter.
          </p>
        ) : items.length > 0 ? (
          visibleItems.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-semibold text-white">
                    <span className="truncate">{item.title}</span>
                    {item.badge ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                          listBadgeClasses[item.badge.tone],
                        )}
                      >
                        {item.badge.label}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {item.meta}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                  {(item.actions ?? (item.action ? [item.action] : [])).map(
                    (action) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={action.onClick}
                        disabled={action.busy}
                        className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-60"
                      >
                        {action.busy ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : action.label === "Betaald" ||
                          action.label === "Akkoord" ? (
                          <CheckCircle2 size={13} />
                        ) : action.label === "Factuur" ? (
                          <ReceiptText size={13} />
                        ) : action.label === "Betaalverzoek" ? (
                          <Banknote size={13} />
                        ) : action.label === "Document" ? (
                          <FileText size={13} />
                        ) : action.label === "UBL" ? (
                          <Download size={13} />
                        ) : action.label === "Check betaling" ? (
                          <RefreshCw size={13} />
                        ) : action.label === "Afgewezen" ? (
                          <XCircle size={13} />
                        ) : action.label === "Verlopen" ? (
                          <Clock3 size={13} />
                        ) : (
                          <Send size={13} />
                        )}
                        {action.label}
                      </button>
                    ),
                  )}
                </div>
              </div>
              {item.notice ? (
                <div
                  className={cn(
                    "mt-3 flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
                    item.notice.tone === "rose"
                      ? "border-rose-500/25 bg-rose-500/10"
                      : "border-amber-500/25 bg-amber-500/10",
                  )}
                >
                  <p
                    className={cn(
                      "min-w-0 text-xs leading-5",
                      item.notice.tone === "rose" ? "text-rose-100" : "text-amber-100",
                    )}
                  >
                    {item.notice.text}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.notice.link ? (
                      <a
                        href={item.notice.link.href}
                        className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 text-xs font-bold text-white transition hover:bg-white/[0.12]"
                      >
                        {item.notice.link.label}
                      </a>
                    ) : null}
                    {item.notice.onDismiss ? (
                      <button
                        type="button"
                        onClick={item.notice.onDismiss}
                        aria-label="Melding sluiten"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                      >
                        <XCircle size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-3 text-sm text-slate-500">
            {empty}
          </p>
        )}
      </div>
      {capped ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.02] py-1.5 text-[11px] font-semibold text-slate-400 transition hover:bg-white/[0.05]"
        >
          {expanded
            ? "Toon minder"
            : `Toon alle ${items.length} ${expandNoun}`}
        </button>
      ) : null}
    </div>
  );
}

// ─── Urenregels-paneel (N10) ─────────────────────────────────────────────────
// Open urenregels zijn bewerkbaar (omschrijving/minuten), afschrijfbaar en
// verwijderbaar; afgeschreven regels zitten achter een toggle en kunnen terug
// naar open; gefactureerde regels zijn read-only (backend geeft 409).

type TimeEntryTab = "open" | "afgeschreven" | "gefactureerd";

const TIME_ENTRIES_INITIAL_COUNT = 6;

function TimeEntriesPanel({
  timeEntries,
  busyId,
  onUpdate,
  onWriteOff,
  onReopen,
  onDelete,
  onEditingChange,
}: {
  timeEntries: TimeEntryItem[];
  busyId: string | null;
  onUpdate: (id: string, data: { omschrijving?: string; minuten?: number }) => Promise<void>;
  onWriteOff: (entry: TimeEntryItem) => Promise<void>;
  onReopen?: (entry: TimeEntryItem) => Promise<void>;
  onDelete: (entry: TimeEntryItem) => Promise<void>;
  /** M6: meldt de bovenliggende view of de inline editor open staat. */
  onEditingChange?: (editing: boolean) => void;
}) {
  const [tab, setTab] = useState<TimeEntryTab>("open");
  const [showAll, setShowAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editMinutes, setEditMinutes] = useState<number | "">("");
  const [editError, setEditError] = useState("");
  // R3-maandafsluiting: klant-/tekstfilter op het urenpaneel.
  const [entryQuery, setEntryQuery] = useState("");

  // M6: lift de "editor open"-status zodat een tabwissel eerst om bevestiging
  // vraagt als er een urenregel in bewerking staat.
  useEffect(() => {
    onEditingChange?.(editingId !== null);
    return () => onEditingChange?.(false);
  }, [editingId, onEditingChange]);

  const openEntries = useMemo(
    () => timeEntries.filter((entry) => !entry.invoice_id && entry.status !== "afgeschreven"),
    [timeEntries],
  );
  const writtenOffEntries = useMemo(
    () => timeEntries.filter((entry) => !entry.invoice_id && entry.status === "afgeschreven"),
    [timeEntries],
  );
  const invoicedEntries = useMemo(
    () => timeEntries.filter((entry) => Boolean(entry.invoice_id)),
    [timeEntries],
  );

  const rawTabEntries =
    tab === "open" ? openEntries : tab === "afgeschreven" ? writtenOffEntries : invoicedEntries;
  const entryNeedle = entryQuery.trim().toLowerCase();
  const tabEntries = entryNeedle
    ? rawTabEntries.filter((entry) =>
        `${entry.description} ${entry.company_name ?? ""}`.toLowerCase().includes(entryNeedle),
      )
    : rawTabEntries;
  const visibleEntries = showAll ? tabEntries : tabEntries.slice(0, TIME_ENTRIES_INITIAL_COUNT);

  const startEdit = (entry: TimeEntryItem) => {
    setEditingId(entry.id);
    setEditDescription(entry.description);
    setEditMinutes(entry.minutes);
    setEditError("");
  };

  const saveEdit = async (entry: TimeEntryItem) => {
    const minutes = editMinutes === "" ? 0 : Number(editMinutes);
    if (!editDescription.trim()) {
      setEditError("Omschrijving is verplicht");
      return;
    }
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setEditError("Vul een aantal minuten groter dan 0 in");
      return;
    }
    setEditError("");
    try {
      await onUpdate(entry.id, {
        omschrijving: editDescription.trim(),
        minuten: Math.round(minutes),
      });
      setEditingId(null);
    } catch {
      // De pagina toont al een fout-toast; de invoer blijft staan.
    }
  };

  const switchTab = (next: TimeEntryTab) => {
    setTab(next);
    setShowAll(false);
    setEditingId(null);
    setEditError("");
    setEntryQuery("");
  };

  return (
    <div className="glass p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-white">Urenregels</h4>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { key: "open", label: `Open (${openEntries.length})` },
              { key: "afgeschreven", label: `Afgeschreven (${writtenOffEntries.length})` },
              { key: "gefactureerd", label: `Gefactureerd (${invoicedEntries.length})` },
            ] as Array<{ key: TimeEntryTab; label: string }>
          ).map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => switchTab(chip.key)}
              aria-pressed={tab === chip.key}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-bold transition",
                tab === chip.key
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
      {rawTabEntries.length > 0 ? (
        <div className="relative mt-3">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={entryQuery}
            onChange={(event) => setEntryQuery(event.target.value)}
            placeholder="Filter op omschrijving of klant..."
            aria-label="Urenregels filteren"
            className="w-full rounded-lg border border-white/10 bg-black/20 py-1.5 pl-8 pr-3 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/50"
          />
        </div>
      ) : null}
      <div className="mt-3 space-y-2">
        {tabEntries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-3 text-sm text-slate-500">
            {entryNeedle
              ? `Geen urenregels gevonden voor "${entryQuery}".`
              : tab === "open"
                ? "Geen open urenregels."
                : tab === "afgeschreven"
                  ? "Geen afgeschreven urenregels."
                  : "Nog geen gefactureerde urenregels."}
          </p>
        ) : (
          visibleEntries.map((entry) => {
            const busy = busyId === entry.id;
            const editing = editingId === entry.id;
            return (
              <div
                key={entry.id}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {entry.description}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {[
                        formatDate(entry.entry_date),
                        formatMinutes(entry.minutes),
                        `${formatCents(Math.round((entry.minutes * entry.hourly_rate_cents) / 60))} excl. btw`,
                        entry.company_name ?? null,
                        entry.billable ? null : "niet factureerbaar",
                        tab === "gefactureerd" ? "op factuur — alleen-lezen" : null,
                      ]
                        .filter(Boolean)
                        .join(" - ")}
                    </p>
                  </div>
                  {tab !== "gefactureerd" ? (
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {tab === "open" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => (editing ? setEditingId(null) : startEdit(entry))}
                            disabled={busy}
                            className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-60"
                          >
                            <Pencil size={13} />
                            {editing ? "Sluit" : "Bewerk"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void onWriteOff(entry)}
                            disabled={busy}
                            className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-60"
                          >
                            {busy ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                            Afschrijven
                          </button>
                        </>
                      ) : onReopen ? (
                        <button
                          type="button"
                          onClick={() => void onReopen(entry)}
                          disabled={busy}
                          className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-xs font-bold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-60"
                        >
                          {busy ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                          Heropenen
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void onDelete(entry)}
                        disabled={busy}
                        className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-60"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        Verwijder
                      </button>
                    </div>
                  ) : null}
                </div>
                {editing && tab === "open" ? (
                  <div className="mt-3 grid gap-2 border-t border-white/5 pt-3 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-normal text-slate-500">
                        Omschrijving
                      </span>
                      <input
                        value={editDescription}
                        onChange={(event) => setEditDescription(event.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-normal text-slate-500">
                        Minuten
                      </span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={editMinutes}
                        onChange={(event) =>
                          setEditMinutes(event.target.value === "" ? "" : Number(event.target.value))
                        }
                        className={inputClass}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void saveEdit(entry)}
                      disabled={busy}
                      className="btn btn--primary self-end justify-center"
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Opslaan
                    </button>
                    {editError ? (
                      <p className="text-xs font-semibold text-rose-300 sm:col-span-3" role="alert">
                        {editError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
      {tabEntries.length > TIME_ENTRIES_INITIAL_COUNT ? (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          aria-expanded={showAll}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.02] py-1.5 text-[11px] font-semibold text-slate-400 transition hover:bg-white/[0.05]"
        >
          {showAll ? "Toon minder" : `Toon alle ${tabEntries.length} regels`}
        </button>
      ) : null}
    </div>
  );
}

function emptyToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function entryMatchesInvoiceTarget(
  entry: TimeEntryItem,
  form: BillingInvoiceForm,
  projectScopeById: Map<string, { companyId: string | null }>,
  workstreamScopeById: Map<
    string,
    { companyId: string | null; projectId: string | null }
  >,
) {
  if (!form.companyId) return false;
  const workstreamScope = entry.workstream_id
    ? workstreamScopeById.get(entry.workstream_id)
    : undefined;
  const projectId = entry.project_id ?? workstreamScope?.projectId ?? null;
  const projectScope = projectId ? projectScopeById.get(projectId) : undefined;
  const companyId =
    entry.company_id ??
    workstreamScope?.companyId ??
    projectScope?.companyId ??
    null;
  if (companyId !== form.companyId) return false;
  if (form.projectId && projectId !== form.projectId) return false;
  if (form.workstreamId && entry.workstream_id !== form.workstreamId)
    return false;
  return true;
}

function asNumber(value: number | "") {
  return value === "" ? 0 : Number(value);
}

function euroToCents(value: number) {
  if (!Number.isFinite(value)) return 0;
  // toPrecision(15) strips binary-float noise (e.g. 1.005 * 100 = 100.4999…)
  // before rounding, so half-cent inputs round to the correct whole cents.
  return Math.round(Number((value * 100).toPrecision(15)));
}
