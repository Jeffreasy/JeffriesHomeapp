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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
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
  get: (id: string) => apiFetch<Device>(`/devices/${id}`),
  command: (id: string, cmd: DeviceCommand) =>
    apiFetch<void>(`/devices/${id}/command`, {
      method: "POST",
      body: JSON.stringify(cmd),
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
  stats: (userId: string, ibanFilter?: string, jaarFilter?: string) => {
    const params = new URLSearchParams({ userId });
    if (ibanFilter) params.set("ibanFilter", ibanFilter);
    if (jaarFilter) params.set("jaarFilter", jaarFilter);
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

// ─── Personal Events ──────────────────────────────────────────────────────────

export const personalEventsApi = {
  list: (userId: string) =>
    apiFetch<PersonalEventRow[]>(`/personal-events?userId=${userId}`),
  listUpcoming: (userId: string) =>
    apiFetch<PersonalEventRow[]>(`/personal-events/upcoming?userId=${userId}`),
  listByDate: (userId: string, date: string) =>
    apiFetch<PersonalEventRow[]>(`/personal-events/date/${date}?userId=${userId}`),
  upsert: (data: PersonalEventRow) =>
    apiFetch<{ ok: boolean }>("/personal-events", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateStatus: (userId: string, eventId: string, status: string) =>
    apiFetch<{ ok: boolean }>(`/personal-events/${encodeURIComponent(eventId)}/status?userId=${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

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
  linked_lead_id: string | null;
  linked_project_id: string | null;
  created_at: string;
  updated_at: string;
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
    leads: number;
    activeLeads: number;
    projects: number;
    activeProjects: number;
    documents: number;
    openIncidents: number;
    openChanges: number;
    decisions: number;
    actionItems: number;
    documentsSeeded: boolean;
    businessSignals: number;
    followUps: number;
  };
  activeLeads: LCLead[];
  activeProjects: LCProject[];
  actionItems: LCActionItem[];
  openIncidents: LCSlaIncident[];
  openChanges: LCChangeRequest[];
  recentDecisions: LCDecision[];
  documentCatalog: LCDocument[];
  businessSignals: LCBusinessSignal[];
  followUps: LCFollowUpSignal[];
}

export const laventecareApi = {
  cockpit: () =>
    apiFetch<LCCockpit>("/laventecare/cockpit"),
  listDocuments: () =>
    apiFetch<LCDocument[]>("/laventecare/documents"),
  searchDocuments: (query: string) =>
    apiFetch<LCDocument[]>(`/laventecare/documents?q=${encodeURIComponent(query)}`),
  createLead: (data: {
    titel: string;
    company_name?: string;
    website?: string;
    pijnpunt?: string;
    volgende_stap?: string;
    prioriteit?: string;
    bron?: string;
  }) =>
    apiFetch<LCLead>("/laventecare/leads", { method: "POST", body: JSON.stringify(data) }),
  updateLead: (id: string, data: { status?: string; fit_score?: number; pijnpunt?: string; prioriteit?: string }) =>
    apiFetch<{ status: string }>(`/laventecare/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  convertLeadToProject: (id: string, data: { naam: string; fase?: string; status?: string; samenvatting?: string }) =>
    apiFetch<LCProject>(`/laventecare/leads/${id}/convert`, { method: "POST", body: JSON.stringify(data) }),
  listProjects: () =>
    apiFetch<LCProject[]>("/laventecare/projects"),
  updateProject: (id: string, data: { fase?: string; status?: string }) =>
    apiFetch<{ status: string }>(`/laventecare/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
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

export const settingsApi = {
	overview: () => apiFetch<any>("/settings/overview"),
	telegramStatus: () => apiFetch<any>("/settings/telegram/status"),
	// Backup returns a Blob, so we can't use apiFetch which assumes JSON if it's not a download.
	// But apiFetch doesn't handle Blobs yet. For now, we will handle download separately in component or just get JSON.
	backup: (userId: string) => apiFetch<any>(`/settings/backup?userId=${userId}`),
};

export const syncApi = {
	status: () => apiFetch<any>("/sync/status"),
	calendar: (userId: string) => apiFetch<any>(`/sync/calendar?userId=${userId}`, { method: "POST" }),
	gmail: (userId: string) => apiFetch<any>(`/sync/gmail?userId=${userId}`, { method: "POST" }),
};
