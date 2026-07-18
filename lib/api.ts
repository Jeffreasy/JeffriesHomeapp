import { fetchAllPages } from "@/lib/pagination";
import { fetchWithTimeout, isRequestTimeoutError } from "@/lib/request-timeout";

// ─── Types ────────────────────────────────────────────────────────────────────


export interface Room {
  id: string;
  name: string;
  icon: string;
  floor_number: number;
  created_at: string;
}

export interface Device {
  id: string;
  name: string;
  device_type: string;
  room_id: string | null;
  ip_address: string | null;
  current_state: { on: boolean; brightness: number; color_temp: number; r: number; g: number; b: number };
  status: "online" | "offline" | "error";
  last_seen: string | null;
  commissioned_at: string;
  manufacturer: string | null;
  model: string | null;
}

export interface DeviceCommand {
  on?: boolean;
  brightness?: number;
  color_temp_mireds?: number;
  r?: number;
  g?: number;
  b?: number;
  /** WiZ native effect-ID (1–32) for built-in lamp animations */
  scene_id?: number;
}

// ─── API Client ───────────────────────────────────────────────────────────────

const API_BASE = "/api/backend";

export class ApiError extends Error {
  status: number;
  body?: unknown; // the parsed error response body, when available
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// ─── Session-expired signal ───────────────────────────────────────────────────
// A 401 (GET or mutation) no longer hard-redirects — that would unmount an open
// dirty form and destroy the user's input seconds after a "safe" toast (R3-H3).
// Instead we fire a one-shot event; providers.tsx renders a persistent, blocking
// overlay with an "Opnieuw inloggen"-button. The user chooses when to leave, so
// an open form survives. Deduped: only the first 401 triggers the overlay.
type SessionExpiredListener = () => void;

let sessionExpiredListener: SessionExpiredListener | null = null;
let sessionExpiredFired = false;

export function registerSessionExpiredHandler(listener: SessionExpiredListener) {
  sessionExpiredListener = listener;
  // A restored/background query can fail before the provider effect subscribes.
  // Replay the one-shot state so the blocking recovery UI can never be missed.
  if (sessionExpiredFired) listener();

  return () => {
    if (sessionExpiredListener === listener) sessionExpiredListener = null;
  };
}

function triggerSessionExpired() {
  if (sessionExpiredFired) return;
  sessionExpiredFired = true;
  if (typeof window !== "undefined") {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_ALL_CACHES" });
    }
  }
  sessionExpiredListener?.();
}

// apiFetchWithStatus returns the parsed body AND the real HTTP status so callers
// (e.g. the orval mutator) can discriminate responses instead of assuming 200.
export async function apiFetchWithStatus<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; status: number }> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}${path}`,
      {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
      },
      30_000,
    );

    if (!res.ok) {
      let errorBody: { detail?: string; message?: string; code?: string } = {
        detail: res.statusText,
      };
      try {
        errorBody = await res.json();
      } catch (error) {
        if (isRequestTimeoutError(error)) throw error;
      }

      if (
        res.status === 401 &&
        (errorBody.code === "UNAUTHORIZED" || errorBody.code === "SESSION_EXPIRED")
      ) {
        // Only the Homeapp auth boundary may trigger session recovery. An
        // upstream backend credential failure has a different stable code.
        triggerSessionExpired();
        throw new ApiError(
          "Je sessie is verlopen — log opnieuw in om verder te gaan.",
          401,
          errorBody,
        );
      }

      throw new ApiError(
        errorBody.detail ?? errorBody.message ?? `API error ${res.status}`,
        res.status,
        errorBody,
      );
    }

    if (res.status === 204) return { data: undefined as T, status: res.status };

    // Guard against HTML or another unexpected response after a redirect.
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      throw new ApiError(
        "Onverwacht antwoord van de server (geen JSON). Herlaad de pagina of log opnieuw in.",
        res.status,
      );
    }

    try {
      return { data: await res.json(), status: res.status };
    } catch (error) {
      if (isRequestTimeoutError(error)) throw error;
      throw new ApiError("De server gaf een ongeldig antwoord. Probeer het opnieuw.", 502);
    }
  } catch (error) {
    if (isRequestTimeoutError(error)) {
      throw new ApiError("De server reageert niet op tijd. Probeer het opnieuw.", 504);
    }
    throw error;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await apiFetchWithStatus<T>(path, init);
  return data;
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export const roomsApi = {
  list: () => apiFetch<Room[]>("/rooms"),
  get: (id: string) => apiFetch<Room>(`/rooms/${id}`),
  create: (data: { name: string; icon: string; floor_number: number }) =>
    apiFetch<Room>("/rooms", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; icon: string; floor_number: number }>) =>
    apiFetch<Room>(`/rooms/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ status: string }>(`/rooms/${id}`, { method: "DELETE" }),
};

// ─── Devices ──────────────────────────────────────────────────────────────────

export const devicesApi = {
  list: () => apiFetch<Device[]>("/devices"),
  get: (id: string, signal?: AbortSignal) =>
    apiFetch<Device>(`/devices/${id}`, { signal }),
  command: (id: string, cmd: DeviceCommand, signal?: AbortSignal) =>
    apiFetch<void>(`/devices/${id}/command`, {
      method: "POST",
      body: JSON.stringify(cmd),
      signal,
    }),
  register: (data: { ip_address: string; name: string; room_id?: string }) =>
    apiFetch<Device>("/devices/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { name?: string; room_id?: string; ip_address?: string }) =>
    apiFetch<Device>(`/devices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) => apiFetch<void>(`/devices/${id}`, { method: "DELETE" }),
};


export interface TransactionFilter {
  excludeIntern?:    boolean;
  onlyStorneringen?: boolean;
  codeFilter?:       string;
  ibanFilter?:       string;
  maandFilter?:      string; // "YYYY-MM"
  categorieFilter?:  string;
  richting?:         string;
  minBedrag?:        number;
  maxBedrag?:        number;
  datumVan?:         string;
  datumTot?:         string;
  zoekterm?:         string;
  jaarFilter?:       string;
  limit?:            number;
  offset?:           number;
}

export interface TransactionListResponse {
  page:       TransactionRow[];
  totalCount: number;
  isDone:     boolean;
}

export interface TransactionFullStats {
  totaalIn:       number;
  totaalUit:      number;
  nettoStroom:    number;
  gemiddeldIn:    number;
  gemiddeldUit:   number;
  huidigSaldo:    number;
  huidigSaldoPerIban:    Record<string, number>;
  saldoPeildatumPerIban: Record<string, string>;
  laatsteSaldoPeildatum: string | null;
  uitPerCategorie:   { categorie: string; bedrag: number; count: number; percentage: number }[];
  inPerCategorie:    { categorie: string; bedrag: number; count: number }[];
  aantalCategorieen: number;
  saldoPerMaand:     { maand: string; saldo: number }[];
  inUitPerMaand:     { maand: string; inkomsten: number; uitgaven: number; netto: number }[];
  topMerchants:      { naam: string; bedrag: number; count: number }[];
  storneringen:      number;
  aantalAlleTxs:     number;
  aantalTxs:         number;
  maanden:           string[];
  jaren:             string[];
  ibannen:           string[];
}

export const transactionsApi = {
  list: (userId: string, filter: TransactionFilter = {}) => {
    const params = new URLSearchParams({ userId });
    if (filter.excludeIntern)    params.set("excludeIntern", "true");
    if (filter.onlyStorneringen) params.set("onlyStorneringen", "true");
    if (filter.codeFilter)       params.set("codeFilter", filter.codeFilter);
    if (filter.ibanFilter)       params.set("ibanFilter", filter.ibanFilter);
    if (filter.categorieFilter)  params.set("categorieFilter", filter.categorieFilter);
    if (filter.richting)         params.set("richting", filter.richting);
    if (filter.minBedrag != null) params.set("minBedrag", String(filter.minBedrag));
    if (filter.maxBedrag != null) params.set("maxBedrag", String(filter.maxBedrag));
    if (filter.datumVan)         params.set("datumVan", filter.datumVan);
    if (filter.datumTot)         params.set("datumTot", filter.datumTot);
    if (filter.zoekterm)         params.set("zoekterm", filter.zoekterm);
    if (filter.jaarFilter)       params.set("jaarFilter", filter.jaarFilter);
    if (filter.limit != null)    params.set("limit", String(filter.limit));
    if (filter.offset != null)   params.set("offset", String(filter.offset));
    return apiFetch<TransactionListResponse>(`/transactions?${params}`);
  },
  stats: (
    userId: string,
    ibanFilter?: string,
    jaarFilter?: string,
    // Optioneel periodebereik: het stats-endpoint beperkt alle aggregaties tot
    // datumVan/datumTot zodra ze meegegeven worden (F1).
    datumVan?: string,
    datumTot?: string,
  ) => {
    const params = new URLSearchParams({ userId });
    if (ibanFilter) params.set("ibanFilter", ibanFilter);
    if (jaarFilter) params.set("jaarFilter", jaarFilter);
    if (datumVan) params.set("datumVan", datumVan);
    if (datumTot) params.set("datumTot", datumTot);
    return apiFetch<TransactionFullStats>(`/transactions/stats?${params}`);
  },
  import: (data: { userId: string; transactions: TransactionImportRow[] }) =>
    apiFetch<{ ok: boolean; inserted: number; total: number; skipped: number }>(
      "/transactions/import", { method: "POST", body: JSON.stringify(data) }
    ),
  updateCategorie: (id: string, categorie: string) =>
    apiFetch<{ ok: boolean }>(`/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ categorie }),
    }),
};

export interface TransactionRow {
  id: string;
  /** Alias for backward compat with components expecting _id */
  _id?: string;
  user_id: string;
  rekening_iban: string;
  volgnr: string;
  datum: string;
  bedrag: number;
  saldo_na_trn: number;
  code: string;
  tegenrekening_iban: string | null;
  tegenpartij_naam: string | null;
  omschrijving: string;
  referentie: string | null;
  is_interne_overboeking: boolean;
  categorie: string | null;
}

export interface TransactionImportRow {
  rekeningIban: string;
  volgnr: string;
  datum: string;
  bedrag: number;
  saldoNaTrn: number;
  code: string;
  tegenrekeningIban?: string;
  tegenpartijNaam?: string;
  omschrijving: string;
  referentie?: string;
  isInterneOverboeking: boolean;
  categorie?: string;
}


// ─── Habits (incidenten) ─────────────────────────────────────────────────────
// The generated orval client covers the habits CRUD + POST incident; the DELETE
// incident endpoint is newer and lives here. Mirrors the generated path
// conventions (/habits/{id}/incident?userId=…).

export const habitsApi = {
  /**
   * Removes the incident log for a habit on the given day.
   * `datum` is "YYYY-MM-DD" (Amsterdam); omitted = today. Backend returns 204,
   * or 404 when there is no incident on that day.
   */
  deleteIncident: (habitId: string, userId: string, datum?: string) => {
    const params = new URLSearchParams({ userId });
    if (datum) params.set("datum", datum);
    return apiFetch<void>(`/habits/${encodeURIComponent(habitId)}/incident?${params}`, {
      method: "DELETE",
    });
  },
};

// ─── Loonstroken ──────────────────────────────────────────────────────────────

export const loonstrokenApi = {
  list: (userId: string) => apiFetch<LoonstrookRow[]>(`/loonstroken?userId=${userId}`),
  import: (data: { userId: string; items: Record<string, unknown>[] }) =>
    apiFetch<{ ok: boolean; inserted: number; total: number }>(
      "/loonstroken/import", { method: "POST", body: JSON.stringify(data) }
    ),
};

export interface LoonstrookRow {
  id: string;
  user_id: string;
  jaar: number;
  periode: number;
  periode_label: string;
  type: string;
  netto: number;
  bruto_betaling: number;
  bruto_inhouding: number;
  salaris_basis: number;
  ort_totaal: number;
  ort_detail: string;
  amt_zeerintensief: number | null;
  pensioenpremie: number | null;
  loonheffing: number | null;
  reiskosten: number | null;
  vakantietoeslag: number | null;
  eju_bedrag: number | null;
  toeslag_balansvlf: number | null;
  extra_uren_bedrag: number | null;
  schaalnummer: string;
  trede: string;
  parttime_factor: number;
  uurloon: number | null;
  componenten: string;
  geimporteerd_op: string;
}

// ─── Schedule (manual aanvulling op de generated hooks) ──────────────────────

export const scheduleApi = {
  /** Wist alle diensten van de gebruiker — DELETE /schedule?userId=… → 204. */
  clear: (userId: string) =>
    apiFetch<void>(`/schedule?userId=${encodeURIComponent(userId)}`, { method: "DELETE" }),
};

// ─── Personal Events ──────────────────────────────────────────────────────────

export const personalEventsApi = {
  list: (userId: string) =>
    apiFetch<PersonalEventRow[]>(`/personal-events?userId=${userId}`),
  listUpcoming: (userId: string) =>
    apiFetch<PersonalEventRow[]>(`/personal-events/upcoming?userId=${userId}`),
  listByDate: (userId: string, date: string) =>
    apiFetch<PersonalEventRow[]>(`/personal-events/date/${date}?userId=${userId}`),
  upsert: (data: PersonalEventRow) =>
    apiFetch<PersonalEventMutationResult>("/personal-events", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateStatus: (userId: string, eventId: string, status: string) =>
    apiFetch<PersonalEventMutationResult>(`/personal-events/${encodeURIComponent(eventId)}/status?userId=${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

export interface PersonalEventMutationResult {
  ok: boolean;
  instantSync?: boolean;
  pending?: boolean;
  pendingProcessed?: number;
  syncError?: string;
  syncMessage?: string;
  /** True when syncError can never succeed on retry (e.g. editing a Google-generated birthday event). */
  permanent?: boolean;
}

export interface PersonalEventRow {
  id?: string;
  user_id: string;
  event_id: string;
  titel: string;
  start_datum: string;
  start_tijd: string | null;
  eind_datum: string;
  eind_tijd: string | null;
  heledag: boolean;
  locatie: string | null;
  beschrijving: string | null;
  conflict_met_dienst: string | null;
  symbol?: string | null;
  business_context_type?: string | null;
  business_context_id?: string | null;
  business_context_title?: string | null;
  status: string;
  kalender: string;
}

// ─── Emails ───────────────────────────────────────────────────────────────────

export interface EmailRow {
  id: string;
  user_id: string;
  gmail_id: string;
  thread_id: string;
  from_addr: string;
  to_addr: string;
  cc: string | null;
  bcc: string | null;
  subject: string;
  snippet: string;
  datum: string;
  ontvangen: number;
  is_gelezen: boolean;
  is_ster: boolean;
  is_verwijderd: boolean;
  is_draft: boolean;
  label_ids: string[];
  categorie: string | null;
  heeft_bijlagen: boolean;
  bijlagen_count: number;
  search_text: string;
  synced_at: string;
  created_at: string;
}

export interface EmailStats {
  total: number;
  unread: number;
}

export const emailsApi = {
  list: (userId: string, limit = 50, offset = 0, categorie?: string) => {
    const params = new URLSearchParams({ user_id: userId, limit: String(limit), offset: String(offset) });
    if (categorie) params.set("categorie", categorie);
    return apiFetch<EmailRow[]>(`/emails?${params}`);
  },
  search: (userId: string, query: string, limit = 20) =>
    apiFetch<EmailRow[]>(`/emails/search?user_id=${userId}&q=${encodeURIComponent(query)}&limit=${limit}`),
  stats: (userId: string) =>
    apiFetch<EmailStats>(`/emails/stats?user_id=${userId}`),
  markRead: (userId: string, gmailId: string, read: boolean) =>
    apiFetch<{ status: string }>("/emails/read", {
      method: "PATCH",
      body: JSON.stringify({ user_id: userId, gmail_id: gmailId, read }),
    }),
  delete: (userId: string, gmailId: string) =>
    apiFetch<{ status: string }>("/emails/delete", {
      method: "PATCH",
      body: JSON.stringify({ user_id: userId, gmail_id: gmailId }),
    }),
};

// ─── Privacy ──────────────────────────────────────────────────────────────────

export interface PrivacySettings {
  id: string;
  user_id: string;
  finance: boolean;
  habits: boolean;
  notes: boolean;
  email: boolean;
  account: boolean;
  updated_at: string;
}

export const privacyApi = {
  get: (userId: string) =>
    apiFetch<PrivacySettings>(`/privacy?userId=${userId}`),
  update: (userId: string, settings: Partial<PrivacySettings>) =>
    apiFetch<{ status: string }>(`/privacy?userId=${userId}`, {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
};


// ─── Automations ──────────────────────────────────────────────────────────────

export interface AutomationRow {
  id: string;
  user_id: string;
  name: string;
  enabled: boolean;
  created_at: string;
  last_fired_at: string | null;
  group_name: string | null;
  trigger_config: Record<string, unknown>;
  action_config: Record<string, unknown>;
}

export const automationsApi = {
  list: (userId: string) =>
    apiFetch<AutomationRow[]>(`/automations?userId=${userId}`),
  create: (userId: string, data: Omit<AutomationRow, "id" | "user_id" | "last_fired_at">) =>
    apiFetch<AutomationRow>(`/automations?userId=${userId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<AutomationRow>) =>
    apiFetch<AutomationRow>(`/automations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  toggle: (id: string) =>
    apiFetch<{ status: string }>(`/automations/${id}/toggle`, { method: "POST" }),
  delete: (id: string) =>
    apiFetch<{ status: string }>(`/automations/${id}`, { method: "DELETE" }),
  deleteByGroup: (userId: string, group: string) =>
    apiFetch<{ status: string }>(`/automations/group?userId=${userId}&group=${encodeURIComponent(group)}`, {
      method: "DELETE",
    }),
};

// ─── LaventeCare CRM ─────────────────────────────────────────────────────────

export interface LCCompany {
  id: string;
  user_id: string;
  naam: string;
  website: string | null;
  sector: string | null;
  status: string;
  relatie_type: string;
  notities: string | null;
  laatste_contact: string | null;
  volgende_actie: string | null;
  kvk_number: string | null;
  vat_number: string | null;
  billing_email: string | null;
  billing_address: string | null;
  billing_reference: string | null;
  payment_terms_days: number;
  contract_status: string;
  service_level: string;
  preferred_channel: string | null;
  portal_url: string | null;
  default_login_url: string | null;
  onboarding_status: string;
  data_processing_status: string;
  created_at: string;
  updated_at: string;
  contacts: number;
  leads: number;
  workstreams: number;
  projects: number;
  actionItems: number;
  dossierDocuments: number;
}

export interface LCContact {
  id: string;
  user_id: string;
  company_id: string | null;
  naam: string;
  email: string | null;
  telefoon: string | null;
  rol: string | null;
  is_primary: boolean;
  notities: string | null;
  preferred_channel: string | null;
  decision_role: string | null;
  created_at: string;
  updated_at: string;
}

export interface LCAccessCredential {
  id: string;
  user_id: string;
  company_id: string;
  contact_id: string | null;
  project_id: string | null;
  workstream_id: string | null;
  title: string;
  login_url: string | null;
  username: string | null;
  role: string | null;
  environment: string;
  status: string;
  owner_contact: string | null;
  secret_label: string;
  secret_configured: boolean;
  secret_hint: string | null;
  sharing_policy: string;
  last_checked_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company_name?: string | null;
  contact_name?: string | null;
  project_name?: string | null;
  workstream_title?: string | null;
}

export interface LCLead {
  id: string;
  user_id: string;
  company_id: string | null;
  contact_id: string | null;
  titel: string;
  bron: string;
  source_id: string | null;
  status: string;
  fit_score: number | null;
  pijnpunt: string | null;
  prioriteit: string | null;
  volgende_stap: string | null;
  volgende_actie_datum: string | null;
  created_at: string;
  updated_at: string;
}

export interface LCProject {
  id: string;
  user_id: string;
  company_id: string | null;
  lead_id: string | null;
  naam: string;
  fase: string;
  status: string;
  waarde_indicatie: number | null;
  start_datum: string | null;
  deadline: string | null;
  samenvatting: string | null;
  created_at: string;
  updated_at: string;
}

export interface LCWorkstream {
  id: string;
  user_id: string;
  company_id: string | null;
  lead_id: string | null;
  project_id: string | null;
  titel: string;
  type: string;
  status: string;
  prioriteit: string;
  klant_naam: string | null;
  bron: string;
  source_id: string | null;
  doel: string | null;
  scope: string | null;
  deliverable: string | null;
  bevindingen: string | null;
  volgende_stap: string | null;
  deadline: string | null;
  geschatte_minuten: number | null;
  waarde_indicatie: number | null;
  stack_tags: string[];
  tags: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LCActionItem {
  id: string;
  user_id: string;
  source: string;
  source_id: string | null;
  title: string;
  summary: string | null;
  action_type: string;
  status: string;
  priority: string;
  due_date: string | null;
  due_time: string | null;
  linked_lead_id: string | null;
  linked_project_id: string | null;
  linked_workstream_id: string | null;
  linked_company_id: string | null;
  created_at: string;
  updated_at: string;
  company_name?: string | null;
  project_name?: string | null;
  workstream_title?: string | null;
  lead_title?: string | null;
  source_activity_id?: string | null;
  source_activity_title?: string | null;
  source_activity_at?: string | null;
}

export interface LCDocument {
  id: string;
  document_key: string;
  titel: string;
  categorie: string;
  fase: string | null;
  versie: string;
  source_path: string | null;
  samenvatting: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface LCDossierDocument {
  id: string;
  user_id: string;
  document_key: string;
  titel: string;
  template_label: string | null;
  context_type: string;
  context_id: string | null;
  context_title: string | null;
  lead_id: string | null;
  project_id: string | null;
  workstream_id: string | null;
  company_id: string | null;
  pdf_url: string;
  theme: string;
  delivery: string;
  notes: string | null;
  generated_at: string;
  created_at: string;
}

export interface LCDossierAdviceTarget {
  kind: string;
  id?: string | null;
  title: string;
  subtitle?: string;
  company_id?: string | null;
  company_name?: string;
  phase?: string;
  status?: string;
  priority?: string;
  query?: string;
}

export interface LCDocumentRecommendation {
  document: LCDocument;
  score: number;
  priority: string;
  usage: string;
  reasons: string[];
  alreadyInDossier: boolean;
  dossierDocumentId?: string | null;
  dossierCreatedAt?: string | null;
}

export interface LCDossierRequirement {
  key: string;
  label: string;
  status: "ok" | "attention" | "missing" | string;
  reason: string;
  recommendedDocumentKeys: string[];
}

export interface LCDossierAdvice {
  generatedAt: string;
  target: LCDossierAdviceTarget;
  status: string;
  coverage: number;
  requirements: LCDossierRequirement[];
  recommendations: LCDocumentRecommendation[];
  presentDocuments: LCDossierDocument[];
  totalDossierDocuments?: number;
  matchedDossierDocuments?: number;
  nextActions: string[];
  evidence: string[];
}

export interface LCActivityEvent {
  id: string;
  user_id: string;
  company_id: string;
  contact_id: string | null;
  lead_id: string | null;
  project_id: string | null;
  workstream_id: string | null;
  action_item_id: string | null;
  event_type: string;
  channel: string;
  title: string;
  body: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string;
  company_name?: string | null;
  contact_name?: string | null;
  project_name?: string | null;
  workstream_name?: string | null;
  linked_action_title?: string | null;
  linked_action_status?: string | null;
}

export type LCActivityEventCreate = {
  company_id: string;
  contact_id?: string;
  lead_id?: string;
  project_id?: string;
  workstream_id?: string;
  action_item_id?: string;
  event_type: string;
  channel: string;
  title: string;
  body?: string;
  occurred_at?: string;
};

export type LCDossierDocumentCreate = {
  document_key: string;
  titel: string;
  template_label?: string;
  context_type: string;
  context_id?: string;
  context_title?: string;
  lead_id?: string;
  project_id?: string;
  workstream_id?: string;
  company_id?: string;
  pdf_url: string;
  theme: string;
  delivery: string;
  notes?: string;
};

export interface LCSlaIncident {
  id: string;
  titel: string;
  prioriteit: string;
  status: string;
  kanaal: string;
  gemeld_op: string;
  reactie_deadline: string | null;
  samenvatting: string | null;
}

export interface LCChangeRequest {
  id: string;
  titel: string;
  impact: string;
  planning_impact: string | null;
  budget_impact: string | null;
  status: string;
}

export interface LCDecision {
  id: string;
  titel: string;
  besluit: string;
  reden: string;
  impact: string | null;
  status: string;
  datum: string;
}

export interface LCBusinessSignal {
  source: string;
  id: string;
  title: string;
  subtitle: string;
  date: string;
  matched_term: string;
  urgency: string;
  action_hint: string;
}

export interface LCFollowUpSignal {
  source: string;
  id: string;
  title: string;
  date: string;
  status: string;
  priority: string;
  action_hint: string;
}

export interface LCCockpit {
  summary: {
    companies: number;
    contacts: number;
    accessCredentials: number;
    leads: number;
    activeLeads: number;
    workstreams: number;
    activeWorkstreams: number;
    projects: number;
    activeProjects: number;
    documents: number;
    openIncidents: number;
    openChanges: number;
    decisions: number;
    actionItems: number;
    dossierDocuments: number;
    activityEvents: number;
    mailTemplates: number;
    mailOutbox: number;
    mailConfigured: boolean;
    documentsSeeded: boolean;
    businessSignals: number;
    followUps: number;
  };
  companies: LCCompany[];
  contacts: LCContact[];
  accessCredentials: LCAccessCredential[];
  activeLeads: LCLead[];
  activeWorkstreams: LCWorkstream[];
  activeProjects: LCProject[];
  actionItems: LCActionItem[];
  openIncidents: LCSlaIncident[];
  openChanges: LCChangeRequest[];
  recentDecisions: LCDecision[];
  documentCatalog: LCDocument[];
  dossierDocuments: LCDossierDocument[];
  activityEvents: LCActivityEvent[];
  mailbox?: LCMailboxSummary;
  businessSignals: LCBusinessSignal[];
  followUps: LCFollowUpSignal[];
}

export interface LCBillingSummary {
  quotes: number;
  openQuotes: number;
  timeEntries: number;
  billableMinutes: number;
  uninvoicedMinutes: number;
  invoices: number;
  openInvoices: number;
  outstandingCents: number;
  paidCents: number;
  defaultProvider: string;
  bunqReady: boolean;
  nextStepDescription: string;
}

export interface LCQuote {
  id: string;
  user_id: string;
  company_id: string | null;
  project_id: string | null;
  workstream_id: string | null;
  quote_number: string;
  titel: string;
  status: string;
  issue_date: string;
  valid_until: string | null;
  currency: string;
  subtotal_cents: number;
  vat_rate_bps: number;
  vat_cents: number;
  total_cents: number;
  accepted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company_name?: string | null;
  project_name?: string | null;
  workstream_title?: string | null;
}

export interface LCQuoteLine {
  id: string;
  quote_id: string;
  user_id: string;
  description: string;
  quantity: number;
  unit_amount_cents: number;
  total_cents: number;
  sort_order: number;
}

export interface LCTimeEntry {
  id: string;
  user_id: string;
  company_id: string | null;
  project_id: string | null;
  workstream_id: string | null;
  activity_event_id: string | null;
  invoice_id: string | null;
  source_type: string;
  source_id: string | null;
  description: string;
  entry_date: string;
  minutes: number;
  hourly_rate_cents: number;
  billable: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  company_name?: string | null;
  project_name?: string | null;
  workstream_title?: string | null;
}

export interface LCInvoice {
  id: string;
  user_id: string;
  company_id: string | null;
  project_id: string | null;
  workstream_id: string | null;
  quote_id: string | null;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  subtotal_cents: number;
  vat_rate_bps: number;
  vat_cents: number;
  total_cents: number;
  paid_cents: number;
  payment_provider: string;
  provider_request_id: string | null;
  merchant_reference: string | null;
  payment_url: string | null;
  document_url: string | null;
  document_generated_at: string | null;
  ubl_generated_at: string | null;
  payment_checked_at: string | null;
  payment_status: string | null;
  payment_last_error: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  sent_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company_name?: string | null;
  project_name?: string | null;
  workstream_title?: string | null;
}

export interface LCInvoiceLine {
  id: string;
  invoice_id: string;
  user_id: string;
  source_time_entry_id: string | null;
  description: string;
  quantity_minutes: number;
  unit_amount_cents: number;
  vat_rate_bps: number;
  total_cents: number;
  sort_order: number;
}

export interface LCPaymentRequestAction {
  confirmationRequired: boolean;
  alreadyCreated?: boolean;
  pendingActionId?: string;
  code?: string;
  toolName?: string;
  summary?: string;
  expiresAt?: string;
  invoice?: LCInvoice;
  message: string;
}

export interface LCInvoiceDocument {
  invoice: LCInvoice;
  lines: LCInvoiceLine[];
  company?: LCCompany | null;
  html: string;
  text: string;
  ubl_xml: string;
  download_name: string;
  generated_at: string;
}

export interface LCInvoicePaymentRefresh {
  invoice: LCInvoice;
  provider_status: string;
  changed: boolean;
  message: string;
  checked_at: string;
}

export interface LCBilling {
  summary: LCBillingSummary;
  quotes: LCQuote[];
  quoteLines: LCQuoteLine[];
  timeEntries: LCTimeEntry[];
  invoices: LCInvoice[];
  invoiceLines: LCInvoiceLine[];
}

export interface LCMailboxSummary {
  templates: number;
  activeTemplates: number;
  outbox: number;
  drafts: number;
  sent: number;
  failed: number;
  provider: string;
  senderEmail: string;
  configured: boolean;
  nextStep: string;
}

export interface LCMailTemplate {
  id: string;
  user_id: string;
  template_key: string;
  name: string;
  category: string;
  status: string;
  subject_template: string;
  body_html: string;
  body_text: string | null;
  default_cc: string[];
  default_bcc: string[];
  created_at: string;
  updated_at: string;
}

export interface LCMailOutboxItem {
  id: string;
  user_id: string;
  template_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  project_id: string | null;
  workstream_id: string | null;
  quote_id: string | null;
  invoice_id: string | null;
  to_email: string;
  to_name: string | null;
  cc: string[];
  bcc: string[];
  subject: string;
  body_html: string;
  body_text: string | null;
  status: string;
  provider: string;
  provider_message_id: string | null;
  conversation_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  template_name?: string | null;
  company_name?: string | null;
  contact_name?: string | null;
}

export interface LCMailInboxItem {
  id: string;
  user_id: string;
  message_id: string;
  conversation_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_preview: string | null;
  web_link: string | null;
  has_attachments: boolean;
  is_read: boolean;
  received_at: string;
  created_at: string;
  updated_at: string;
  company_name?: string | null;
}

export interface LCMailbox {
  summary: LCMailboxSummary;
  templates: LCMailTemplate[];
  outbox: LCMailOutboxItem[];
  inbox: LCMailInboxItem[];
  /** Optionele fout van de laatste inbox-sync (bijv. ontbrekende Graph-machtiging). */
  inboxError?: string | null;
}

export interface LCMailAISource {
  type: string;
  title: string;
  date?: string;
  summary?: string;
}

export interface LCMailAISuggestion {
  variables: Record<string, string>;
  subject_hint?: string | null;
  briefing: string;
  sources: LCMailAISource[];
  confidence: "hoog" | "normaal" | "laag" | string;
  generated_at: string;
}

export const laventecareApi = {
  cockpit: () =>
    apiFetch<LCCockpit>("/laventecare/cockpit"),
  billing: (params?: { companyId?: string; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.companyId) search.set("companyId", params.companyId);
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiFetch<LCBilling>(`/laventecare/billing${query ? `?${query}` : ""}`);
  },
  mailbox: (params?: { limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiFetch<LCMailbox>(`/laventecare/mailbox${query ? `?${query}` : ""}`);
  },
  syncInbox: () =>
    apiFetch<{ synced: number; ok: boolean; reason?: string }>("/laventecare/mailbox/inbox-sync", { method: "POST" }),
  markInboxRead: (id: string) =>
    apiFetch<{ ok: boolean }>(`/laventecare/mailbox/inbox/${encodeURIComponent(id)}/read`, { method: "PATCH" }),
  createMailTemplate: (data: {
    template_key?: string;
    name: string;
    category?: string;
    status?: string;
    subject_template: string;
    body_html: string;
    body_text?: string;
    default_cc?: string[];
    default_bcc?: string[];
  }) =>
    apiFetch<LCMailTemplate>("/laventecare/mailbox/templates", { method: "POST", body: JSON.stringify(data) }),
  updateMailTemplate: (id: string, data: Partial<LCMailTemplate>) =>
    apiFetch<{ status: string }>(`/laventecare/mailbox/templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  suggestMailContent: (data: {
    template_id: string;
    company_id?: string;
    contact_id?: string;
    project_id?: string;
    workstream_id?: string;
    quote_id?: string;
    invoice_id?: string;
    to_email?: string;
    to_name?: string;
    intent?: string;
    tone?: string;
    variables?: Record<string, string>;
    attachments?: Array<{
      name: string;
      content_type: string;
      size: number;
      pages: number;
      extracted_text: string;
      summary: string;
      extraction_status: "ok" | "partial" | "failed";
    }>;
  }) =>
    apiFetch<LCMailAISuggestion>("/laventecare/mailbox/ai-suggest", { method: "POST", body: JSON.stringify(data) }),
  sendTemplatedMail: (data: {
    template_id: string;
    company_id?: string;
    contact_id?: string;
    project_id?: string;
    workstream_id?: string;
    quote_id?: string;
    invoice_id?: string;
    to_email?: string;
    to_name?: string;
    cc?: string[];
    bcc?: string[];
    /** Optionele onderwerp-override (bijv. "Re: <origineel>" bij een reply). */
    subject?: string;
    /** Conversation-id van de thread waarop dit een antwoord is. */
    conversation_id?: string;
    variables?: Record<string, string>;
    send?: boolean;
    attachments?: Array<{
      name: string;
      content_type: string;
      content_bytes: string;
      size?: number;
    }>;
  }) =>
    apiFetch<LCMailOutboxItem>("/laventecare/mailbox/send-template", { method: "POST", body: JSON.stringify(data) }),
  listCompanies: (params?: { q?: string; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.q) search.set("q", params.q);
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiFetch<LCCompany[]>(`/laventecare/companies${query ? `?${query}` : ""}`);
  },
  createCompany: (data: {
    naam: string;
    website?: string;
    sector?: string;
    status?: string;
    relatie_type?: string;
    notities?: string;
    laatste_contact?: string;
    volgende_actie?: string;
    kvk_number?: string;
    vat_number?: string;
    billing_email?: string;
    billing_address?: string;
    billing_reference?: string;
    payment_terms_days?: number;
    contract_status?: string;
    service_level?: string;
    preferred_channel?: string;
    portal_url?: string;
    default_login_url?: string;
    onboarding_status?: string;
    data_processing_status?: string;
  }) =>
    apiFetch<LCCompany>("/laventecare/companies", { method: "POST", body: JSON.stringify(data) }),
  updateCompany: (id: string, data: Partial<LCCompany>) =>
    apiFetch<{ status: string }>(`/laventecare/companies/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  listContacts: (params?: { companyId?: string; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.companyId) search.set("companyId", params.companyId);
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiFetch<LCContact[]>(`/laventecare/contacts${query ? `?${query}` : ""}`);
  },
  createContact: (data: {
    company_id?: string;
    naam: string;
    email?: string;
    telefoon?: string;
    rol?: string;
    is_primary?: boolean;
    notities?: string;
    preferred_channel?: string;
    decision_role?: string;
  }) =>
    apiFetch<LCContact>("/laventecare/contacts", { method: "POST", body: JSON.stringify(data) }),
  updateContact: (id: string, data: Partial<LCContact>) =>
    apiFetch<{ status: string }>(`/laventecare/contacts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  listAccessCredentials: (params?: { companyId?: string; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.companyId) search.set("companyId", params.companyId);
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiFetch<LCAccessCredential[]>(`/laventecare/access-credentials${query ? `?${query}` : ""}`);
  },
  createAccessCredential: (data: {
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
  }) =>
    apiFetch<LCAccessCredential>("/laventecare/access-credentials", { method: "POST", body: JSON.stringify(data) }),
  updateAccessCredential: (id: string, data: Partial<LCAccessCredential> & { secret_value?: string }) =>
    apiFetch<{ status: string }>(`/laventecare/access-credentials/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  createQuote: (data: {
    company_id?: string;
    project_id?: string;
    workstream_id?: string;
    titel: string;
    status?: string;
    issue_date?: string;
    valid_until?: string;
    currency?: string;
    vat_rate_bps?: number;
    notes?: string;
    lines: Array<{ description: string; quantity: number; unit_amount_cents: number; sort_order?: number }>;
  }) =>
    apiFetch<LCQuote>("/laventecare/quotes", { method: "POST", body: JSON.stringify(data) }),
  updateQuoteStatus: (id: string, status: string) =>
    apiFetch<{ status: string }>(`/laventecare/quotes/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  createTimeEntry: (data: {
    company_id?: string;
    project_id?: string;
    workstream_id?: string;
    activity_event_id?: string;
    source_type?: string;
    source_id?: string;
    description: string;
    entry_date?: string;
    minutes: number;
    hourly_rate_cents?: number;
    billable?: boolean;
    status?: string;
  }) =>
    apiFetch<LCTimeEntry>("/laventecare/time-entries", { method: "POST", body: JSON.stringify(data) }),
  // N10: urenregels zijn bewerkbaar/verwijderbaar zolang ze niet op een
  // factuur staan (backend antwoordt 409 zodra invoice_id gezet is).
  updateTimeEntry: (id: string, data: { omschrijving?: string; minuten?: number; status?: "open" | "afgeschreven" }) =>
    apiFetch<LCTimeEntry>(`/laventecare/time-entries/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteTimeEntry: (id: string) =>
    apiFetch<void>(`/laventecare/time-entries/${encodeURIComponent(id)}`, { method: "DELETE" }),
  createInvoice: (data: {
    company_id?: string;
    project_id?: string;
    workstream_id?: string;
    quote_id?: string;
    status?: string;
    issue_date?: string;
    due_date?: string;
    currency?: string;
    vat_rate_bps?: number;
    notes?: string;
    time_entry_ids?: string[];
    lines?: Array<{
      description: string;
      quantity_minutes: number;
      unit_amount_cents: number;
      vat_rate_bps?: number;
      sort_order?: number;
    }>;
  }) =>
    apiFetch<LCInvoice>("/laventecare/invoices", { method: "POST", body: JSON.stringify(data) }),
  createInvoiceFromQuote: (id: string) =>
    apiFetch<LCInvoice>(`/laventecare/quotes/${id}/invoice`, { method: "POST" }),
  updateInvoiceStatus: (id: string, data: {
    status: string;
    paid_cents?: number;
    payment_provider?: string;
    provider_request_id?: string;
    merchant_reference?: string;
    payment_url?: string;
    paid_at?: string;
    sent_at?: string;
  }) =>
    apiFetch<{ status: string }>(`/laventecare/invoices/${id}/status`, { method: "PATCH", body: JSON.stringify(data) }),
  createInvoicePaymentRequest: (id: string) =>
    apiFetch<LCPaymentRequestAction>(`/laventecare/invoices/${id}/payment-request`, { method: "POST" }),
  invoiceDocument: (id: string) =>
    apiFetch<LCInvoiceDocument>(`/laventecare/invoices/${id}/document`),
  refreshInvoicePayment: (id: string) =>
    apiFetch<LCInvoicePaymentRefresh>(`/laventecare/invoices/${id}/payment-refresh`, { method: "POST" }),
  listDocuments: () =>
    apiFetch<LCDocument[]>("/laventecare/documents"),
  searchDocuments: (query: string) =>
    apiFetch<LCDocument[]>(`/laventecare/documents?q=${encodeURIComponent(query)}`),
  listDossierDocuments: (params?: { leadId?: string; projectId?: string; workstreamId?: string; companyId?: string; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.leadId) search.set("leadId", params.leadId);
    if (params?.projectId) search.set("projectId", params.projectId);
    if (params?.workstreamId) search.set("workstreamId", params.workstreamId);
    if (params?.companyId) search.set("companyId", params.companyId);
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiFetch<LCDossierDocument[]>(`/laventecare/dossier-documents${query ? `?${query}` : ""}`);
  },
  dossierAdvice: (params?: { leadId?: string; projectId?: string; workstreamId?: string; companyId?: string; query?: string; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.leadId) search.set("leadId", params.leadId);
    if (params?.projectId) search.set("projectId", params.projectId);
    if (params?.workstreamId) search.set("workstreamId", params.workstreamId);
    if (params?.companyId) search.set("companyId", params.companyId);
    if (params?.query) search.set("query", params.query);
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiFetch<LCDossierAdvice>(`/laventecare/ai/dossier-advice${query ? `?${query}` : ""}`);
  },
  createDossierDocument: (data: LCDossierDocumentCreate) =>
    apiFetch<LCDossierDocument>("/laventecare/dossier-documents", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listActivityEvents: (params?: { companyId?: string; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.companyId) search.set("companyId", params.companyId);
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiFetch<LCActivityEvent[]>(`/laventecare/activity${query ? `?${query}` : ""}`);
  },
  createActivityEvent: (data: LCActivityEventCreate) =>
    apiFetch<LCActivityEvent>("/laventecare/activity", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createDecision: (data: {
    project_id?: string;
    titel: string;
    besluit: string;
    reden?: string;
    impact?: string;
    status?: string;
    datum?: string;
  }) =>
    apiFetch<LCDecision>("/laventecare/decisions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateDecisionStatus: (id: string, status: string) =>
    apiFetch<{ status: string }>(`/laventecare/decisions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  createChangeRequest: (data: {
    project_id?: string;
    titel: string;
    impact: string;
    planning_impact?: string;
    budget_impact?: string;
    status?: string;
  }) =>
    apiFetch<LCChangeRequest>("/laventecare/changes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateChangeRequestStatus: (id: string, status: string) =>
    apiFetch<{ status: string }>(`/laventecare/changes/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  createSlaIncident: (data: {
    project_id?: string;
    titel: string;
    prioriteit?: string;
    status?: string;
    kanaal?: string;
    gemeld_op?: string;
    reactie_deadline?: string;
    samenvatting?: string;
  }) =>
    apiFetch<LCSlaIncident>("/laventecare/sla-incidents", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateSlaIncidentStatus: (id: string, status: string) =>
    apiFetch<{ status: string }>(`/laventecare/sla-incidents/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  createLead: (data: {
    titel: string;
    company_id?: string;
    contact_id?: string;
    company_name?: string;
    website?: string;
    pijnpunt?: string;
    volgende_stap?: string;
    prioriteit?: string;
    bron?: string;
  }) =>
    apiFetch<LCLead>("/laventecare/leads", { method: "POST", body: JSON.stringify(data) }),
  updateLead: (id: string, data: { status?: string; fit_score?: number; pijnpunt?: string; prioriteit?: string; bron?: string }) =>
    apiFetch<{ status: string }>(`/laventecare/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  convertLeadToProject: (id: string, data: { naam: string; fase?: string; status?: string; samenvatting?: string }) =>
    apiFetch<LCProject>(`/laventecare/leads/${id}/convert`, { method: "POST", body: JSON.stringify(data) }),
  listLeads: (params?: { limit?: number; companyId?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.companyId) search.set("companyId", params.companyId);
    const query = search.toString();
    return apiFetch<LCLead[]>(`/laventecare/leads${query ? `?${query}` : ""}`);
  },
  listProjects: (params?: { limit?: number; companyId?: string }) => {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.companyId) search.set("companyId", params.companyId);
    const query = search.toString();
    return apiFetch<LCProject[]>(`/laventecare/projects${query ? `?${query}` : ""}`);
  },
  createProject: (data: Partial<LCProject> & { company_name?: string; website?: string }) =>
    apiFetch<LCProject>("/laventecare/projects", { method: "POST", body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<LCProject>) =>
    apiFetch<{ status: string }>(`/laventecare/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  listWorkstreams: (params?: { includeClosed?: boolean; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.includeClosed) search.set("includeClosed", "true");
    if (params?.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return apiFetch<LCWorkstream[]>(`/laventecare/workstreams${query ? `?${query}` : ""}`);
  },
  createWorkstream: (data: Partial<LCWorkstream>) =>
    apiFetch<LCWorkstream>("/laventecare/workstreams", { method: "POST", body: JSON.stringify(data) }),
  updateWorkstream: (id: string, data: Partial<LCWorkstream>) =>
    apiFetch<{ status: string }>(`/laventecare/workstreams/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  convertWorkstreamToProject: (id: string, data: { project_id?: string; naam?: string; fase?: string; status?: string; samenvatting?: string }) =>
    apiFetch<LCProject>(`/laventecare/workstreams/${id}/convert-project`, { method: "POST", body: JSON.stringify(data) }),
  listActions: () =>
    apiFetch<LCActionItem[]>("/laventecare/actions"),
  createAction: (data: {
    source: string;
    source_id?: string;
    title: string;
    summary?: string;
    action_type: string;
    priority: string;
    due_date?: string;
    due_time?: string;
    linked_lead_id?: string;
    linked_project_id?: string;
    linked_workstream_id?: string;
    linked_company_id?: string;
  }) =>
    apiFetch<LCActionItem>("/laventecare/actions", { method: "POST", body: JSON.stringify(data) }),
  updateActionStatus: (id: string, status: string) =>
    apiFetch<{ status: string }>(`/laventecare/actions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  convertSignalToLead: (data: {
    source: string;
    source_id: string;
    title: string;
    subtitle: string;
    date: string;
    matched_term: string;
    urgency: string;
    action_hint: string;
  }) =>
    apiFetch<{ lead: LCLead; reused: boolean }>("/laventecare/signals/convert-lead", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  seedDocuments: (docs: Array<{
    document_key: string;
    titel: string;
    categorie: string;
    fase: string | null;
    versie: string;
    source_path: string | null;
    samenvatting: string;
    tags: string[];
  }>) =>
    apiFetch<{ total: number; inserted: number; updated: number }>("/laventecare/documents/seed", {
      method: "POST",
      body: JSON.stringify(docs),
    }),
};

// ─── Settings & Sync ──────────────────────────────────────────────────────────

export interface FocusSummary {
  userId: string;
  generatedAt: string;
  timezone: string;
  date: string;
  time: string;
  period: string;
  health: FocusHealth;
  sync: FocusSyncSummary;
  counts: FocusCounts;
  business: FocusBusinessStatus;
  attention: FocusAttention[];
  errors?: string[];
}

export interface FocusHealth {
  devicesTotal: number;
  devicesOnline: number;
  devicesOn: number;
  devicesOffline: number;
  bridgeOnline: boolean;
  bridgeStatus: string;
  bridgeLastSeenAt?: string | null;
  commandsPending: number;
  commandsProcessing: number;
  commandsFailed: number;
}

export interface FocusSyncSummary {
  schedule: FocusSyncTarget;
  personal: FocusSyncTarget;
  gmail: FocusSyncTarget;
}

export interface FocusSyncTarget {
  status: string;
  enabled: boolean;
  configured: boolean;
  lastSuccessAt?: string | null;
  total?: number;
  pending?: number;
}

export interface FocusCounts {
  scheduleTotal: number;
  scheduleUpcoming: number;
  personalUpcoming: number;
  personalPending: number;
  notesActive: number;
  notesPinned: number;
  notesOverdue: number;
  notesDueToday: number;
  notesTriage: number;
  habitsActive: number;
  habitsTodayDue: number;
  habitsCompleted: number;
  unreadEmails: number;
}

export interface FocusBusinessStatus {
  activeLeads: number;
  activeWorkstreams: number;
  activeProjects: number;
  openActions: number;
  overdueActions: number;
  openQuotes: number;
  openInvoices: number;
  outstandingCents: number;
}

export interface FocusAttention {
  id: string;
  domain: string;
  severity: "high" | "medium" | "low" | string;
  title: string;
  detail: string;
  href?: string;
}

export const focusApi = {
  summary: (userId?: string) =>
    apiFetch<FocusSummary>(userId ? `/focus/summary?userId=${encodeURIComponent(userId)}` : "/focus/summary"),
};

export interface PendingAIAction {
  id: string;
  userId: string;
  agentId: string;
  toolName: string;
  args: Record<string, unknown>;
  summary: string;
  code: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface PendingAIActionResult {
  ok: boolean;
  id: string;
  agentId: string;
  toolName: string;
  summary: string;
  code: string;
  status: string;
  expiresAt: string;
  result?: string | null;
  error?: string | null;
}

export interface SettingsOverviewDevices {
  total: number;
  online: number;
  offline: number;
  on: number;
}

export interface SettingsOverview {
  account?: { name?: string; email?: string };
  devices: SettingsOverviewDevices;
  rooms: { total: number; unassignedDevices: number };
  integrations: Record<string, boolean | string | undefined>;
  automations: { active: number; total: number };
  commands: { pending: number; processing: number; failed: number };
  bridge?: {
    online: boolean;
    status: string;
    lastSeenAt?: string | null;
    commandsPending?: number;
    commandsProcessing?: number;
    commandsFailed?: number;
    lastError?: string | null;
  };
  schedule: { total: number; upcoming: number; importedAt?: string | null };
  personalEvents?: { upcoming: number };
  email: { total: number; unread: number; lastFullSync?: string | null };
  data: { activeHabits: number; notes: number };
}

export const settingsApi = {
	overview: () => apiFetch<SettingsOverview>("/settings/overview"),
	telegramStatus: () => apiFetch<Record<string, unknown>>("/settings/telegram/status"),
	aiDiagnostics: () => apiFetch<unknown>("/settings/ai/diagnostics"),
	pendingActions: (userId: string) =>
		apiFetch<PendingAIAction[]>(`/ai/pending?userId=${encodeURIComponent(userId)}`),
	confirmPendingAction: (userId: string, id: string) =>
		apiFetch<PendingAIActionResult>(`/ai/pending/${encodeURIComponent(id)}/confirm?userId=${encodeURIComponent(userId)}`, {
			method: "POST",
		}),
	cancelPendingAction: (userId: string, id: string) =>
		apiFetch<PendingAIActionResult>(`/ai/pending/${encodeURIComponent(id)}/cancel?userId=${encodeURIComponent(userId)}`, {
			method: "POST",
		}),
	// Backup returns a Blob, so we can't use apiFetch which assumes JSON if it's not a download.
	// But apiFetch doesn't handle Blobs yet. For now, we will handle download separately in component or just get JSON.
	backup: (userId: string) => apiFetch<Record<string, unknown>>(`/settings/backup?userId=${userId}`),
};

export const syncApi = {
	status: (userId?: string) =>
		apiFetch<SyncStatusResult>(userId ? `/sync/status?userId=${encodeURIComponent(userId)}` : "/sync/status"),
	calendar: (userId: string) => apiFetch<SyncCalendarResult>(`/sync/calendar?userId=${userId}`, { method: "POST" }),
	gmail: (userId: string) => apiFetch<Record<string, unknown>>(`/sync/gmail?userId=${userId}`, { method: "POST" }),
};

export type SyncStatusResult = Record<string, SyncStatusTarget>;

export interface SyncStatusTarget {
  source?: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  updatedAt?: string;
}

export interface SyncCalendarResult {
  ok: boolean;
  scheduleCount?: number;
  personalCount?: number;
  pendingProcessed?: number;
  pendingError?: string;
  /** Set when the schedule write half of the sync failed (sync.go): the calendar
   *  fetch may have succeeded while diensten weren't persisted, so the UI must
   *  not claim a clean "gesynchroniseerd". */
  scheduleWriteError?: string;
  message?: string;
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export interface NoteRow {
  id: string;
  user_id: string;
  titel: string | null;
  inhoud: string;
  tags: string[];
  kleur: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  is_completed?: boolean;
  deadline: string | null;
  linked_event_id: string | null;
  prioriteit: string | null;
  symbol?: string | null;
  business_context_type?: string | null;
  business_context_id?: string | null;
  business_context_title?: string | null;
  triage_flag: boolean | null;
  aangemaakt: string;
  gewijzigd: string;
}

export const notesApi = {
  list: (userId: string) =>
    apiFetch<NoteRow[]>(`/notes?userId=${userId}`),
  listByContext: (userId: string, contextType: string, contextId: string) => {
    const params = new URLSearchParams({ userId, contextType, contextId });
    return apiFetch<NoteRow[]>(`/notes?${params.toString()}`);
  },
  /**
   * Lichtgewicht lijst voor de focus-kiosk: `fields=summary` laat de backend
   * de volledige inhoud weg en `limit` begrenst het aantal rijen, zodat de
   * 2-minuten-poll niet telkens het hele notitiecorpus hertrekt (M-G).
   */
  listSummary: (userId: string, limit = 100) =>
    apiFetch<NoteRow[]>(
      `/notes?userId=${encodeURIComponent(userId)}&limit=${limit}&fields=summary`,
    ),
  search: (userId: string, query: string) =>
    apiFetch<NoteRow[]>(`/notes/search?userId=${userId}&q=${encodeURIComponent(query)}`),
  tags: (userId: string) =>
    apiFetch<string[]>(`/notes/tags?userId=${userId}`),
  get: (id: string) =>
    apiFetch<NoteRow>(`/notes/${id}`),
  create: (userId: string, data: Partial<NoteRow>) =>
    apiFetch<NoteRow>(`/notes?userId=${userId}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<NoteRow>) =>
    apiFetch<NoteRow>(`/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<{ status: string }>(`/notes/${id}`, { method: "DELETE" }),
};

// ─── Contacts / Relationships (unified module) ───────────────────────────────

export interface ContactImportantDate {
  id: string;
  contact_id: string;
  kind: string;
  label: string | null;
  month: number;
  day: number;
  year: number | null;
  recurring: boolean;
  created_at: string;
}

export interface ContactFact {
  id: string;
  contact_id: string;
  fact: string;
  source: string;
  occurred_at: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  display_name: string;
  relationship_types: string[];
  notes: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  organization_id: string | null;
  business_role: string | null;
  last_contacted_at: string | null;
  archived: boolean;
  source: string; // "manual" | "laventecare" — laventecare rows are mirrored & managed in LaventeCare
  created_at: string;
  updated_at: string;
  important_dates?: ContactImportantDate[];
  facts?: ContactFact[];
  labels?: ContactLabel[];
  channels?: ContactChannel[];
  interactions?: ContactInteraction[];
  organizations?: ContactOrganization[];
}

export interface ContactOrganization {
  id: string;
  user_id: string;
  contact_id: string;
  organization_id: string | null;
  organization_name: string | null;
  role: string | null;
  source: string;
  created_at: string;
}

export interface ContactLabel {
  id: string;
  user_id: string;
  name: string;
  color: string; // palette key: slate | amber | sky | emerald | rose | violet | orange | teal | blue | pink | lime | cyan | red | indigo | fuchsia
  created_at: string;
  updated_at: string;
  contact_count?: number; // only from the catalog list
}

export interface ContactChannel {
  id: string;
  user_id: string;
  contact_id: string;
  kind: string; // email | phone | other
  value: string;
  label: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface ContactInteraction {
  id: string;
  user_id: string;
  contact_id: string;
  kind: string; // call | meeting | message | email | note | other
  summary: string | null;
  occurred_at: string;
  created_at: string;
}

export interface ContactCreate {
  display_name: string;
  relationship_types?: string[];
  notes?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  organization_id?: string | null;
  business_role?: string | null;
  force?: boolean; // create even if a possible duplicate exists
}

export interface ContactUpdate extends Partial<ContactCreate> {
  archived?: boolean;
  touch_last_contact?: boolean;
}

// Thrown by contactenApi.create when the backend reports a possible duplicate (409).
export class DuplicateContactError extends Error {
  duplicate: Contact;
  constructor(duplicate: Contact) {
    super("possible_duplicate");
    this.name = "DuplicateContactError";
    this.duplicate = duplicate;
  }
}

export type ContactListOptions = {
  q?: string;
  type?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
};

function listContactPage(userId: string, opts?: ContactListOptions) {
  const params = new URLSearchParams({ userId });
  if (opts?.q) params.set("q", opts.q);
  if (opts?.type) params.set("type", opts.type);
  if (opts?.includeArchived) params.set("includeArchived", "true");
  if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts?.offset !== undefined) params.set("offset", String(opts.offset));
  return apiFetch<Contact[]>(`/contacts?${params.toString()}`, { signal: opts?.signal });
}

export const contactenApi = {
  list: listContactPage,
  listAll: (userId: string, opts?: Omit<ContactListOptions, "limit" | "offset">) =>
    fetchAllPages(
      (limit, offset) => listContactPage(userId, { ...opts, limit, offset }),
      { pageSize: 200, maxPages: 100, getKey: (contact) => contact.id },
    ),
  get: (userId: string, id: string) =>
    apiFetch<Contact>(`/contacts/${id}?userId=${encodeURIComponent(userId)}`),
  create: async (userId: string, data: ContactCreate) => {
    try {
      return await apiFetch<Contact>(`/contacts?userId=${encodeURIComponent(userId)}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (e) {
      const body = e instanceof ApiError ? (e.body as { error?: string; possible_duplicate?: Contact } | undefined) : undefined;
      if (e instanceof ApiError && e.status === 409 && body?.error === "possible_duplicate" && body.possible_duplicate) {
        throw new DuplicateContactError(body.possible_duplicate);
      }
      throw e;
    }
  },
  update: (userId: string, id: string, data: ContactUpdate) =>
    apiFetch<Contact>(`/contacts/${id}?userId=${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (userId: string, id: string) =>
    apiFetch<{ status: string }>(`/contacts/${id}?userId=${encodeURIComponent(userId)}`, { method: "DELETE" }),
  merge: (userId: string, id: string, into: string) =>
    apiFetch<Contact>(`/contacts/${id}/merge?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify({ into }),
    }),
  addOrganization: (userId: string, contactId: string, data: { organization_id?: string | null; role?: string }) =>
    apiFetch<ContactOrganization>(`/contacts/${contactId}/organizations?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removeOrganization: (userId: string, contactId: string, orgId: string) =>
    apiFetch<{ status: string }>(
      `/contacts/${contactId}/organizations/${orgId}?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    ),
  updateChannel: (
    userId: string,
    contactId: string,
    channelId: string,
    data: { kind?: string; value?: string; label?: string | null; is_primary?: boolean },
  ) =>
    apiFetch<ContactChannel>(`/contacts/${contactId}/channels/${channelId}?userId=${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  addDate: (
    userId: string,
    contactId: string,
    data: { kind: string; label?: string | null; month: number; day: number; year?: number | null; recurring?: boolean },
  ) =>
    apiFetch<ContactImportantDate>(`/contacts/${contactId}/dates?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteDate: (userId: string, contactId: string, dateId: string) =>
    apiFetch<{ status: string }>(`/contacts/${contactId}/dates/${dateId}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
  addFact: (userId: string, contactId: string, data: { fact: string; source?: string }) =>
    apiFetch<ContactFact>(`/contacts/${contactId}/facts?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteFact: (userId: string, contactId: string, factId: string) =>
    apiFetch<{ status: string }>(`/contacts/${contactId}/facts/${factId}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
  whatsappImport: (
    userId: string,
    contactId: string,
    data: { chat_name?: string; source_filename?: string; is_group?: boolean; text: string },
  ) =>
    apiFetch<{ conversation: WhatsAppConversation; summary: WhatsAppSummary; participants: string[]; imported: number }>(
      `/contacts/${contactId}/whatsapp/import?userId=${encodeURIComponent(userId)}`,
      { method: "POST", body: JSON.stringify(data) },
    ),
  whatsappList: (userId: string, contactId: string) =>
    apiFetch<{ conversations: WhatsAppConversation[]; summaries: WhatsAppSummary[] }>(
      `/contacts/${contactId}/whatsapp?userId=${encodeURIComponent(userId)}`,
    ),

  // ── Label catalog ──
  labelsList: (userId: string) =>
    apiFetch<ContactLabel[]>(`/contacts/labels?userId=${encodeURIComponent(userId)}`),
  labelCreate: (userId: string, data: { name: string; color?: string }) =>
    apiFetch<ContactLabel>(`/contacts/labels?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  labelUpdate: (userId: string, labelId: string, data: { name?: string; color?: string }) =>
    apiFetch<ContactLabel>(`/contacts/labels/${labelId}?userId=${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  labelDelete: (userId: string, labelId: string) =>
    apiFetch<{ status: string }>(`/contacts/labels/${labelId}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
  labelMerge: (userId: string, labelId: string, into: string) =>
    apiFetch<{ status: string }>(`/contacts/labels/${labelId}/merge?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify({ into }),
    }),
  labelBulk: (userId: string, labelId: string, data: { contact_ids: string[]; remove?: boolean }) =>
    apiFetch<{ status: string; affected: number }>(`/contacts/labels/${labelId}/bulk?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ── Per-contact label assignment ──
  assignLabel: (userId: string, contactId: string, data: { label_id?: string; name?: string; color?: string }) =>
    apiFetch<ContactLabel | { status: string }>(`/contacts/${contactId}/labels?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removeLabel: (userId: string, contactId: string, labelId: string) =>
    apiFetch<{ status: string }>(`/contacts/${contactId}/labels/${labelId}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
  setLabels: (userId: string, contactId: string, labelIds: string[]) =>
    apiFetch<{ status: string }>(`/contacts/${contactId}/labels?userId=${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: JSON.stringify({ label_ids: labelIds }),
    }),

  // ── Channels (extra emails/phones) ──
  addChannel: (
    userId: string,
    contactId: string,
    data: { kind: string; value: string; label?: string | null; is_primary?: boolean },
  ) =>
    apiFetch<ContactChannel>(`/contacts/${contactId}/channels?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteChannel: (userId: string, contactId: string, channelId: string) =>
    apiFetch<{ status: string }>(`/contacts/${contactId}/channels/${channelId}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),

  // ── Interactions (touchpoint timeline) ──
  interactionsList: (userId: string, contactId: string, limit?: number) => {
    const params = new URLSearchParams({ userId });
    if (limit) params.set("limit", String(limit));
    return apiFetch<ContactInteraction[]>(`/contacts/${contactId}/interactions?${params.toString()}`);
  },
  addInteraction: (
    userId: string,
    contactId: string,
    data: { kind: string; summary?: string | null; occurred_at?: string },
  ) =>
    apiFetch<ContactInteraction>(`/contacts/${contactId}/interactions?userId=${encodeURIComponent(userId)}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteInteraction: (userId: string, contactId: string, interactionId: string) =>
    apiFetch<{ status: string }>(
      `/contacts/${contactId}/interactions/${interactionId}?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    ),
};

export interface WhatsAppConversation {
  id: string;
  contact_id: string | null;
  chat_name: string;
  is_group: boolean;
  message_count: number;
  first_message_at: string | null;
  last_message_at: string | null;
  source_filename: string | null;
  imported_at: string;
}

export interface WhatsAppSummary {
  id: string;
  contact_id: string | null;
  conversation_id: string | null;
  summary: string;
  message_count: number;
  generated_at: string;
}
