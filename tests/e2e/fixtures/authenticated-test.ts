import { expect, test as base, type Route } from "@playwright/test";

type SafeErrorType =
  | "Error"
  | "TypeError"
  | "ReferenceError"
  | "RangeError"
  | "SyntaxError";

type RuntimeIssue =
  | { kind: "application-console" }
  | { kind: "page-error"; errorType: SafeErrorType }
  | { kind: "first-party-5xx"; method: string; status: number; resourceType: string }
  | { kind: "first-party-request-failed"; method: string; resourceType: string }
  | { kind: "backend-get-unmocked" }
  | { kind: "backend-mutation-blocked"; method: string };

const unmockedBackendResponse = Symbol("unmocked-backend-response");

const now = "2026-07-18T08:00:00.000Z";

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

function jsonResponseFor(pathname: string): unknown | typeof unmockedBackendResponse {
  if (pathname === "/api/backend/devices") return [lampFixture];
  if (pathname === "/api/backend/rooms") {
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
  if (pathname === "/api/backend/privacy") {
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
  if (pathname === "/api/backend/transactions") {
    return { page: [], totalCount: 0, isDone: true };
  }
  if (pathname === "/api/backend/transactions/stats") return emptyTransactionStats;
  if (pathname === "/api/backend/habits/for-date") return { habits: [] };
  if (pathname === "/api/backend/habits/stats") return {};
  if (pathname === "/api/backend/habits/heatmap") return { days: [] };
  if (pathname === "/api/backend/settings/overview") {
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
  if (pathname === "/api/backend/laventecare/cockpit") return emptyCockpit;
  if (pathname === "/api/backend/laventecare/billing") {
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
  if (pathname === "/api/backend/laventecare/mailbox") {
    return { inbox: [], outbox: [], templates: [], summary: {} };
  }

  const arrayEndpoints = [
    "/api/backend/automations",
    "/api/backend/contacts",
    "/api/backend/contacts/labels",
    "/api/backend/emails",
    "/api/backend/emails/search",
    "/api/backend/habits",
    "/api/backend/habits/badges",
    "/api/backend/laventecare/access-credentials",
    "/api/backend/laventecare/actions",
    "/api/backend/laventecare/activity",
    "/api/backend/laventecare/companies",
    "/api/backend/laventecare/contacts",
    "/api/backend/laventecare/documents",
    "/api/backend/laventecare/dossier-documents",
    "/api/backend/laventecare/leads",
    "/api/backend/laventecare/projects",
    "/api/backend/laventecare/workstreams",
    "/api/backend/loonstroken",
    "/api/backend/notes",
    "/api/backend/notes/search",
    "/api/backend/notes/tags",
    "/api/backend/personal-events",
    "/api/backend/personal-events/upcoming",
    "/api/backend/salary",
    "/api/backend/scenes",
    "/api/backend/schedule",
  ];

  if (
    arrayEndpoints.includes(pathname) ||
    pathname.startsWith("/api/backend/personal-events/date/") ||
    pathname.startsWith("/api/backend/schedule/date/")
  ) {
    return [];
  }

  if (pathname === "/api/backend/schedule/meta") return {};
  if (pathname === "/api/backend/sync/status") return {};
  if (pathname === "/api/backend/settings/telegram/status") return {};
  if (pathname === "/api/backend/settings/ai/diagnostics") return {};
  if (pathname === "/api/backend/ai/pending") return [];
  if (pathname === "/api/backend/emails/stats") return { total: 0, unread: 0 };
  if (pathname === "/api/backend/health") return { status: "ok" };

  // Unknown GETs remain deterministic and isolated from production. Tests that
  // need a richer contract must add an explicit fixture above; the test fails
  // closed without recording the endpoint path in runtime evidence.
  return unmockedBackendResponse;
}

async function fulfillReadOnlyBackend(route: Route, issues: RuntimeIssue[]) {
  const request = route.request();
  const method = request.method().toUpperCase();

  if (method === "OPTIONS") {
    await route.fulfill({ status: 204, body: "" });
    return;
  }

  if (method !== "GET" && method !== "HEAD") {
    issues.push({ kind: "backend-mutation-blocked", method });
    await route.fulfill({
      status: 405,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Read-only E2E blocked a backend mutation." }),
    });
    return;
  }

  if (method === "HEAD") {
    await route.fulfill({ status: 200, body: "" });
    return;
  }

  const pathname = new URL(request.url()).pathname;
  const responseBody = jsonResponseFor(pathname);
  if (responseBody === unmockedBackendResponse) {
    issues.push({ kind: "backend-get-unmocked" });
  }
  await route.fulfill({
    status: 200,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-e2e-data-mode": "read-only",
    },
    body: JSON.stringify(
      responseBody === unmockedBackendResponse ? {} : responseBody,
    ),
  });
}

function safeErrorType(name: string): SafeErrorType {
  if (
    name === "TypeError" ||
    name === "ReferenceError" ||
    name === "RangeError" ||
    name === "SyntaxError"
  ) {
    return name;
  }
  return "Error";
}

export const test = base.extend({
  page: async ({ page }, providePage, testInfo) => {
    const issues: RuntimeIssue[] = [];
    const firstPartyOrigin = new URL(
      process.env.E2E_BASE_URL ?? "http://localhost:3000",
    ).origin;

    await page.route("**/api/backend/**", (route) =>
      fulfillReadOnlyBackend(route, issues),
    );

    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const location = message.location().url;
      if (location) {
        try {
          if (new URL(location).origin !== firstPartyOrigin) return;
        } catch {
          return;
        }
      }
      issues.push({ kind: "application-console" });
    });

    page.on("pageerror", (error) => {
      issues.push({ kind: "page-error", errorType: safeErrorType(error.name) });
    });

    page.on("response", (response) => {
      if (response.status() < 500) return;
      try {
        if (new URL(response.url()).origin !== firstPartyOrigin) return;
      } catch {
        return;
      }
      issues.push({
        kind: "first-party-5xx",
        method: response.request().method(),
        status: response.status(),
        resourceType: response.request().resourceType(),
      });
    });

    page.on("requestfailed", (request) => {
      try {
        if (new URL(request.url()).origin !== firstPartyOrigin) return;
      } catch {
        return;
      }
      if (request.failure()?.errorText.includes("ERR_ABORTED")) return;
      issues.push({
        kind: "first-party-request-failed",
        method: request.method(),
        resourceType: request.resourceType(),
      });
    });

    await providePage(page);

    if (issues.length > 0 || testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach("sanitized-runtime-evidence", {
        body: Buffer.from(
          JSON.stringify({ schemaVersion: 1, issueCount: issues.length, issues }),
          "utf8",
        ),
        contentType: "application/json",
      });
    }

    expect(
      issues,
      "Authenticated E2E must stay read-only and free of first-party runtime errors.",
    ).toEqual([]);
  },
});

export { expect };
