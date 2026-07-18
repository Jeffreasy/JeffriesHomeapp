import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

export const READ_ONLY_BACKEND_HOST = "127.0.0.1";
export const READ_ONLY_BACKEND_PORT = 18080;
export const READ_ONLY_BACKEND_ORIGIN = `http://${READ_ONLY_BACKEND_HOST}:${READ_ONLY_BACKEND_PORT}`;
export const READ_ONLY_BACKEND_BASE_URL = `${READ_ONLY_BACKEND_ORIGIN}/api/v1`;
export const READ_ONLY_BACKEND_API_KEY = "authenticated-e2e-read-only";
export const READ_ONLY_BACKEND_READY_PATH = "/_e2e/ready";

const now = "2026-07-18T08:00:00.000Z";
const unmockedBackendGet = Symbol("unmocked-backend-get");

const lampFixture = {
  id: "e2e-lamp-living-room",
  name: "Woonkamer testlamp",
  device_type: "wiz_color",
  room_id: "e2e-room-living-room",
  ip_address: null,
  current_state: {
    on: true,
    brightness: 68,
    color_temp: 333,
    r: 255,
    g: 126,
    b: 48,
  },
  status: "online",
  last_seen: now,
  commissioned_at: now,
  manufacturer: "E2E fixture",
  model: "Read-only color lamp",
};

const emptyCockpit = {
  summary: {
    companies: 0,
    contacts: 0,
    accessCredentials: 0,
    leads: 0,
    activeLeads: 0,
    workstreams: 0,
    activeWorkstreams: 0,
    projects: 0,
    activeProjects: 0,
    documents: 0,
    openIncidents: 0,
    openChanges: 0,
    decisions: 0,
    actionItems: 0,
    dossierDocuments: 0,
    activityEvents: 0,
    mailTemplates: 0,
    mailOutbox: 0,
    mailConfigured: false,
    documentsSeeded: false,
    businessSignals: 0,
    followUps: 0,
  },
  companies: [],
  contacts: [],
  accessCredentials: [],
  activeLeads: [],
  activeWorkstreams: [],
  activeProjects: [],
  actionItems: [],
  openIncidents: [],
  openChanges: [],
  recentDecisions: [],
  documentCatalog: [],
  dossierDocuments: [],
  activityEvents: [],
  businessSignals: [],
  followUps: [],
};

const emptyTransactionStats = {
  totaalIn: 0,
  totaalUit: 0,
  nettoStroom: 0,
  gemiddeldIn: 0,
  gemiddeldUit: 0,
  huidigSaldo: 0,
  huidigSaldoPerIban: {},
  saldoPeildatumPerIban: {},
  laatsteSaldoPeildatum: null,
  uitPerCategorie: [],
  inPerCategorie: [],
  aantalCategorieen: 0,
  saldoPerMaand: [],
  inUitPerMaand: [],
  topMerchants: [],
  storneringen: 0,
  aantalAlleTxs: 0,
  aantalTxs: 0,
  maanden: [],
  jaren: [],
  ibannen: [],
};

const arrayEndpoints = new Set([
  "/automations",
  "/contacts",
  "/contacts/labels",
  "/emails",
  "/emails/search",
  "/habits",
  "/habits/badges",
  "/laventecare/access-credentials",
  "/laventecare/actions",
  "/laventecare/activity",
  "/laventecare/companies",
  "/laventecare/contacts",
  "/laventecare/documents",
  "/laventecare/dossier-documents",
  "/laventecare/leads",
  "/laventecare/projects",
  "/laventecare/workstreams",
  "/loonstroken",
  "/notes",
  "/notes/search",
  "/notes/tags",
  "/personal-events",
  "/personal-events/upcoming",
  "/salary",
  "/scenes",
  "/schedule",
]);

function backendPath(pathname) {
  if (pathname === "/api/v1") return "/";
  if (!pathname.startsWith("/api/v1/")) return null;
  return pathname.slice("/api/v1".length);
}

export function resolveReadOnlyBackendGet(pathname) {
  const path = backendPath(pathname);
  if (path === null) return unmockedBackendGet;

  if (path === "/devices") return [lampFixture];
  if (path === "/rooms") {
    return [
      {
        id: "e2e-room-living-room",
        name: "Woonkamer",
        icon: "living-room",
        floor_number: 0,
        created_at: now,
      },
    ];
  }
  if (path === "/privacy") {
    return {
      id: "e2e-privacy",
      user_id: "owner",
      finance: false,
      habits: false,
      notes: false,
      email: false,
      account: false,
      updated_at: now,
    };
  }
  if (path === "/transactions") return { page: [], totalCount: 0, isDone: true };
  if (path === "/transactions/stats") return emptyTransactionStats;
  if (path === "/habits/for-date") return { habits: [] };
  if (path === "/habits/stats") return {};
  if (path === "/habits/heatmap") return { days: [] };
  if (path === "/settings/overview") {
    return {
      account: { name: "E2E owner", email: "owner@example.invalid" },
      devices: { total: 1, online: 1, offline: 0, on: 1 },
      rooms: { total: 1, unassignedDevices: 0 },
      integrations: {},
      automations: { active: 0, total: 0 },
      commands: { pending: 0, processing: 0, failed: 0 },
      bridge: { online: true, status: "online" },
      schedule: { total: 0, upcoming: 0, importedAt: null },
      personalEvents: { upcoming: 0 },
      email: { total: 0, unread: 0, lastFullSync: null },
      data: { activeHabits: 0, notes: 0 },
    };
  }
  if (path === "/laventecare/cockpit") return emptyCockpit;
  if (path === "/laventecare/billing") {
    return {
      summary: {
        quotes: 0,
        openQuotes: 0,
        invoices: 0,
        openInvoices: 0,
        overdueInvoices: 0,
        timeEntries: 0,
        uninvoicedMinutes: 0,
      },
      quotes: [],
      invoices: [],
      timeEntries: [],
    };
  }
  if (path === "/laventecare/mailbox") {
    return { inbox: [], outbox: [], templates: [], summary: {} };
  }
  if (
    arrayEndpoints.has(path) ||
    path.startsWith("/personal-events/date/") ||
    path.startsWith("/schedule/date/")
  ) {
    return [];
  }
  if (path === "/schedule/meta") return {};
  if (path === "/sync/status") return {};
  if (path === "/settings/telegram/status") return {};
  if (path === "/settings/ai/diagnostics") return {};
  if (path === "/ai/pending") return [];
  if (path === "/emails/stats") return { total: 0, unread: 0 };
  if (path === "/health") return { status: "ok" };

  return unmockedBackendGet;
}

export function evaluateReadOnlyBackendRequest({
  method,
  pathname,
  apiKey,
  requestId,
  ownerUserId,
  hasLegacyOwnerQuery = false,
  expectedApiKey,
  expectedOwnerUserId,
}) {
  const normalizedMethod = method.toUpperCase();

  if (apiKey !== expectedApiKey) {
    return { status: 401, body: { detail: "Invalid test backend credential." } };
  }
  if (!requestId) {
    return { status: 400, body: { detail: "Missing request correlation." } };
  }
  if (
    !expectedOwnerUserId ||
    ownerUserId !== expectedOwnerUserId ||
    hasLegacyOwnerQuery
  ) {
    return { status: 403, body: { detail: "Invalid owner boundary." } };
  }
  if (normalizedMethod === "OPTIONS") return { status: 204, body: undefined };
  if (normalizedMethod !== "GET" && normalizedMethod !== "HEAD") {
    return { status: 405, body: { detail: "Read-only backend rejects mutations." } };
  }

  const body = resolveReadOnlyBackendGet(pathname);
  if (body === unmockedBackendGet) {
    return { status: 501, body: { detail: "No synthetic contract for this GET." } };
  }
  return {
    status: 200,
    body: normalizedMethod === "HEAD" ? undefined : body,
  };
}

function firstHeader(value) {
  return Array.isArray(value) ? value[0] : value;
}

function writeResponse(response, result) {
  response.statusCode = result.status;
  response.setHeader("cache-control", "no-store");

  if (result.body === undefined) {
    response.end();
    return;
  }

  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(result.body));
}

export function createReadOnlyBackendServer({ expectedApiKey, expectedOwnerUserId }) {
  if (!expectedApiKey) throw new Error("E2E_BACKEND_API_KEY is required.");
  if (!expectedOwnerUserId) throw new Error("HOMEAPP_OWNER_USER_ID is required.");

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", READ_ONLY_BACKEND_ORIGIN);
    if (url.pathname === READ_ONLY_BACKEND_READY_PATH) {
      response.statusCode = 200;
      response.setHeader("cache-control", "no-store");
      response.end("ready");
      return;
    }

    const result = evaluateReadOnlyBackendRequest({
      method: request.method ?? "GET",
      pathname: url.pathname,
      apiKey: firstHeader(request.headers["x-api-key"]),
      requestId: firstHeader(request.headers["x-request-id"]),
      ownerUserId: url.searchParams.get("userId"),
      hasLegacyOwnerQuery: url.searchParams.has("user_id"),
      expectedApiKey,
      expectedOwnerUserId,
    });
    writeResponse(response, result);
  });

  server.on("clientError", (_error, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });

  return server;
}

export function startReadOnlyBackendServer(options) {
  const server = createReadOnlyBackendServer(options);
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(READ_ONLY_BACKEND_PORT, READ_ONLY_BACKEND_HOST, () => {
      server.off("error", reject);
      resolve(server);
    });
  });
}

const isEntrypoint = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isEntrypoint) {
  const server = await startReadOnlyBackendServer({
    expectedApiKey: process.env.E2E_BACKEND_API_KEY,
    expectedOwnerUserId: process.env.HOMEAPP_OWNER_USER_ID,
  });
  const close = () => server.close(() => process.exit(0));
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}
