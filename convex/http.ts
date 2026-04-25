import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { JEFFREY_USER_ID } from "./lib/config";

const http = httpRouter();

// ─── Auth helper ───────────────────────────────────────────────────────────────
function checkAuth(req: Request): string | null {
  const expectedSecret = process.env.HOMEAPP_GAS_SECRET;
  const authHeader = req.headers.get("Authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!expectedSecret || provided !== expectedSecret) return null;
  return provided;
}

function checkLaventeCareIntakeAuth(req: Request): string | null {
  const expectedSecret = process.env.LAVENTECARE_INTAKE_SECRET || process.env.HOMEAPP_GAS_SECRET;
  const authHeader = req.headers.get("Authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!expectedSecret || provided !== expectedSecret) return null;
  return provided;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type DeviceStatePatch = {
  on?: boolean;
  brightness?: number;
  color_temp?: number;
  r?: number;
  g?: number;
  b?: number;
};

type DeviceUpdatePatch = {
  name?: string;
  roomId?: string | null;
  ipAddress?: string;
};

type DeviceCreateBody = {
  userId: string;
  name: string;
  ipAddress: string;
  deviceType: string;
  roomId?: string;
  manufacturer?: string;
  model?: string;
  currentState?: {
    on: boolean;
    brightness: number;
    color_temp: number;
    r: number;
    g: number;
    b: number;
  };
};

type EmailListItem = {
  gmailId: string;
  from: string;
  subject: string;
  snippet: string;
  datum: string;
  ontvangen: number;
  isGelezen: boolean;
  isSter: boolean;
  isVerwijderd: boolean;
  labelIds: string[];
  categorie?: string;
  heeftBijlagen: boolean;
  bijlagenCount: number;
  searchText: string;
};

type LaventeCareIntakeBody = {
  requestId?: string;
  source?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  website?: string;
  projectType?: string;
  budget?: string;
  timeline?: string;
  goal?: string;
  message?: string;
  pageUrl?: string;
  origin?: string;
  submittedAt?: string;
};

function getErrorMessage(err: unknown, fallback = "DB fout") {
  return err instanceof Error ? err.message : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function optionalString(value: unknown, max = 2000): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function parseLaventeCareIntake(body: Record<string, unknown>): LaventeCareIntakeBody {
  return {
    requestId:   optionalString(body.requestId, 128),
    source:      optionalString(body.source, 80),
    name:        optionalString(body.name, 120),
    email:       optionalString(body.email, 254),
    phone:       optionalString(body.phone ?? body.telefoon, 60),
    companyName: optionalString(body.companyName ?? body.bedrijf, 160),
    website:     optionalString(body.website, 300),
    projectType: optionalString(body.projectType ?? body.dienst, 160),
    budget:      optionalString(body.budget, 160),
    timeline:    optionalString(body.timeline ?? body.timing, 160),
    goal:        optionalString(body.goal, 2000),
    message:     optionalString(body.message, 2000),
    pageUrl:     optionalString(body.pageUrl, 500),
    origin:      optionalString(body.origin, 300),
    submittedAt: optionalString(body.submittedAt, 80),
  };
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


// ─── Python automation engine routes hieronder ────────────────────────────────
// Called by Python automation engine to fetch active automations.
// Query param: ?userId=xxx
http.route({
  path: "/automations",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return json({ ok: false, error: "userId verplicht" }, 400);

    const automations = await ctx.runQuery(internal.automations.listInternal, { userId });
    return json({ ok: true, automations });
  }),
});

// ─── GET /schedule/today ────────────────────────────────────────────────────
// Called by Python engine to check today's shift type for schedule-based triggers.
// Query param: ?userId=xxx&date=YYYY-MM-DD
http.route({
  path: "/schedule/today",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const date   = url.searchParams.get("date");   // "YYYY-MM-DD"
    if (!userId || !date) return json({ ok: false, error: "userId + date verplicht" }, 400);

    const diensten = await ctx.runQuery(internal.schedule.listByDateInternal, { userId, date });
    return json({ ok: true, diensten });
  }),
});

// ─── POST /mark-fired ───────────────────────────────────────────────────────
// Called by Python engine after executing an automation.
// Body: { automationId: string }
http.route({
  path: "/mark-fired",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);

    let body: unknown;
    try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

    const automationId = asRecord(body)?.automationId;
    if (!automationId) return json({ ok: false, error: "automationId verplicht" }, 400);

    try {
      await ctx.runMutation(internal.automations.markFiredInternal, { automationId: String(automationId) });
      return json({ ok: true });
    } catch (e: unknown) {
      return json({ ok: false, error: getErrorMessage(e) }, 500);
    }
  }),
});

// ─── GET /devices ────────────────────────────────────────────────────────────
// Called by engine + FastAPI to list all devices for a user.
http.route({
  path: "/devices",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return json({ ok: false, error: "userId verplicht" }, 400);
    const devices = await ctx.runQuery(internal.devices.list, { userId });
    return json({ ok: true, devices });
  }),
});

// ─── POST /devices/create ─────────────────────────────────────────────────────
// Called by FastAPI register endpoint after UDP ping verification.
http.route({
  path: "/devices/create",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);
    let body: unknown;
    try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
    try {
      const id = await ctx.runMutation(internal.devices.createInternal, body as DeviceCreateBody);
      const device = await ctx.runQuery(internal.devices.getByStringId, { id });
      return json({ ok: true, device }, 201);
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      const status = msg.includes("al in gebruik") ? 409 : 500;
      return json({ ok: false, error: msg }, status);
    }
  }),
});

// ─── GET /devices/* (single device lookup) ───────────────────────────────────
// Convex HTTP router does NOT support {id} path params — use pathPrefix instead.
// Called by FastAPI command endpoint to get the device IP.
http.route({
  pathPrefix: "/devices/",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);
    const url = new URL(req.url);
    const rawId = url.pathname.replace(/^\/devices\//, "").split("/")[0];
    if (!rawId) return json({ ok: false, error: "ID ontbreekt" }, 400);
    const device = await ctx.runQuery(internal.devices.getByStringId, { id: rawId });
    if (!device) return json({ ok: false, error: "Niet gevonden" }, 404);
    return json({ ok: true, device });
  }),
});

// ─── PATCH /devices/* (update / state / status) ───────────────────────────────
// Dispatches internally based on the sub-path:
//   PATCH /devices/{id}         → update name/room/ip
//   PATCH /devices/{id}/state   → sync state after UDP command
//   PATCH /devices/{id}/status  → set online/offline
http.route({
  pathPrefix: "/devices/",
  method: "PATCH",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);
    const url = new URL(req.url);
    const parts = url.pathname.replace(/^\/devices\//, "").split("/").filter(Boolean);
    // parts[0] = deviceId, parts[1] = "state" | "status" | undefined
    const deviceId = parts[0];
    const sub      = parts[1]; // "state" | "status" | undefined
    if (!deviceId) return json({ ok: false, error: "ID ontbreekt" }, 400);

    let body: unknown;
    try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

    try {
      if (sub === "state") {
        // Update lamp state after UDP command executed by FastAPI
        await ctx.runMutation(internal.devices.updateStateInternal, { deviceId, state: body as DeviceStatePatch });
        return json({ ok: true });

      } else if (sub === "status") {
        // Set online/offline status from engine poll
        const status = asRecord(body)?.status;
        if (!status) return json({ ok: false, error: "status verplicht" }, 400);
        if (status !== "online" && status !== "offline") {
          return json({ ok: false, error: "status ongeldig" }, 400);
        }
        await ctx.runMutation(internal.devices.setStatusInternal, { deviceId, status });
        return json({ ok: true });

      } else {
        // General update: name, room, ip
        const device = await ctx.runQuery(internal.devices.getByStringId, { id: deviceId });
        if (!device) return json({ ok: false, error: "Ongeldig device ID" }, 400);
        await ctx.runMutation(internal.devices.updateInternal, { id: device._id, ...(body as DeviceUpdatePatch) });
        return json({ ok: true, device });
      }
    } catch (e: unknown) {
      return json({ ok: false, error: getErrorMessage(e) }, 500);
    }
  }),
});

// ─── DELETE /devices/* ────────────────────────────────────────────────────────
// Called by FastAPI to remove a device.
http.route({
  pathPrefix: "/devices/",
  method: "DELETE",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);
    const url = new URL(req.url);
    const deviceId = url.pathname.replace(/^\/devices\//, "").split("/")[0];
    if (!deviceId) return json({ ok: false, error: "ID ontbreekt" }, 400);
    try {
      const device = await ctx.runQuery(internal.devices.getByStringId, { id: deviceId });
      if (!device) return json({ ok: false, error: "Ongeldig device ID" }, 400);
      await ctx.runMutation(internal.devices.removeInternal, { id: device._id });
      return json({ ok: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "DB fout";
      return json({ ok: false, error: msg }, 500);
    }
  }),
});

// ─── LaventeCare Website Intake Bridge ──────────────────────────────────────
// Called by LaventeCareAuthSystems after a public website intake/contact request.
// Body: structured contact/intake details; response contains lead/action ids.
http.route({
  path: "/laventecare/intake",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!checkLaventeCareIntakeAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }

    const record = asRecord(rawBody);
    if (!record) return json({ ok: false, error: "JSON object verplicht" }, 400);

    const intake = parseLaventeCareIntake(record);
    if (!intake.name || intake.name.length < 2) return json({ ok: false, error: "name verplicht" }, 400);
    if (!intake.email || !validEmail(intake.email)) return json({ ok: false, error: "email ongeldig" }, 400);
    if (!intake.goal && !intake.message && !intake.projectType) {
      return json({ ok: false, error: "goal, message of projectType verplicht" }, 400);
    }

    try {
      const result = await ctx.runMutation(internal.laventecare.ingestWebsiteIntakeInternal, {
        userId:      JEFFREY_USER_ID,
        requestId:   intake.requestId,
        source:      intake.source,
        name:        intake.name,
        email:       intake.email,
        phone:       intake.phone,
        companyName: intake.companyName,
        website:     intake.website,
        projectType: intake.projectType,
        budget:      intake.budget,
        timeline:    intake.timeline,
        goal:        intake.goal,
        message:     intake.message,
        pageUrl:     intake.pageUrl,
        origin:      intake.origin,
        submittedAt: intake.submittedAt,
      });
      return json({ ok: true, ...result }, result.reused ? 200 : 201);
    } catch (e: unknown) {
      return json({ ok: false, error: getErrorMessage(e, "LaventeCare intake fout") }, 500);
    }
  }),
});

// ─── 🤖 Grok Agent Agency ────────────────────────────────────────────────────

/**
 * GET /ai/agents — Agent discovery endpoint.
 * Grok ontdekt alle beschikbare agents en hun capabilities.
 */
http.route({
  path: "/ai/agents",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);
    const result = await ctx.runQuery(api.ai.router.listAgents, {});
    return json({ ok: true, ...result });
  }),
});

/**
 * GET /ai/briefing — Daily briefing (Dashboard Agent shortcut).
 */
http.route({
  path: "/ai/briefing",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);

    const result = await ctx.runQuery(internal.ai.router.internalGetBriefing, {
      userId: JEFFREY_USER_ID,
    });
    return json(result);
  }),
});

/**
 * GET /ai/agent/* — Haal context op van een specifieke agent.
 * URL: /ai/agent/lampen
 */
http.route({
  pathPrefix: "/ai/agent/",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);
    const url = new URL(req.url);
    const agentId = url.pathname.replace(/^\/ai\/agent\//, "").split("/")[0];
    if (!agentId) return json({ ok: false, error: "agentId ontbreekt in URL" }, 400);

    const result = await ctx.runQuery(internal.ai.router.internalGetAgentContext, {
      agentId,
      userId: JEFFREY_USER_ID,
    });
    return json(result);
  }),
});

/**
 * POST /ai/chat — Chat met een agent via Grok AI.
 * Body: { vraag, agentId?, history? }
 */
http.route({
  path: "/ai/chat",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);

    let body: { vraag?: string; agentId?: string; history?: Array<{ role: "user" | "assistant"; content: string }> };
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    if (!body.vraag)  return json({ ok: false, error: "vraag verplicht" }, 400);

    const result = await ctx.runAction(internal.ai.grok.chat.chat, {
      vraag:   body.vraag,
      agentId: body.agentId,
      history: body.history,
    });
    return json(result);
  }),
});

// ─── Grok AI Email Endpoints ──────────────────────────────────────────────────

/**
 * GET /emails/ai-summary — Compact inbox digest voor Grok.
 * Eén call = volledig inbox overzicht (stats, afzenders, ongelezen, categorieën).
 */
http.route({
  path: "/emails/ai-summary",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return json({ ok: false, error: "userId verplicht" }, 400);

    const all = await ctx.runQuery(internal.emails.listInternal, { userId }) as EmailListItem[];
    const syncMeta = await ctx.runQuery(internal.emails.getSyncMeta, { userId });
    const active = all.filter((email) => !email.isVerwijderd);
    const inbox = active.filter((email) => email.labelIds.includes("INBOX"));
    const ongelezen = inbox.filter((email) => !email.isGelezen);
    const senderCount = new Map<string, number>();
    const categorien: Record<string, number> = {};
    const dagVerdeling: Record<string, number> = {};
    const now = Date.now();
    for (const email of active) {
      const sender = email.from.replace(/<.*>/, "").trim() || email.from;
      senderCount.set(sender, (senderCount.get(sender) ?? 0) + 1);
      const cat = email.categorie ?? "overig";
      categorien[cat] = (categorien[cat] ?? 0) + 1;
      if (now - email.ontvangen < 7 * 24 * 60 * 60 * 1000) {
        dagVerdeling[email.datum] = (dagVerdeling[email.datum] ?? 0) + 1;
      }
    }
    const summary = {
      stats: {
        totaal: active.length,
        inbox: inbox.length,
        ongelezen: ongelezen.length,
        verzonden: active.filter((email) => email.labelIds.includes("SENT")).length,
        metBijlagen: active.filter((email) => email.heeftBijlagen).length,
        ster: active.filter((email) => email.isSter).length,
      },
      topAfzenders: [...senderCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([naam, aantal]) => ({ naam, aantal })),
      categorien,
      recenteOngelezen: ongelezen
        .sort((a, b) => b.ontvangen - a.ontvangen)
        .slice(0, 15)
        .map((email) => ({
          gmailId: email.gmailId,
          van: email.from.replace(/<.*>/, "").trim() || email.from,
          onderwerp: email.subject,
          snippet: email.snippet,
          datum: email.datum,
          bijlagen: email.bijlagenCount,
          labels: email.labelIds.filter((label) => !["INBOX", "UNREAD", "CATEGORY_PERSONAL"].includes(label)),
        })),
      dagVerdeling,
      syncInfo: syncMeta ? { laatsteSync: syncMeta.lastFullSync, totaalGesynct: syncMeta.totalSynced } : null,
    };
    return json({ ok: true, ...summary });
  }),
});

/**
 * GET /emails/search — Full-text search over alle emails.
 * Query params: userId, q (zoekterm)
 */
http.route({
  path: "/emails/search",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);
    const url = new URL(req.url);
    const userId   = url.searchParams.get("userId");
    const zoekterm = url.searchParams.get("q") ?? "";
    if (!userId)   return json({ ok: false, error: "userId verplicht" }, 400);
    if (!zoekterm)  return json({ ok: false, error: "q (zoekterm) verplicht" }, 400);

    const needle = zoekterm.toLowerCase();
    const all = await ctx.runQuery(internal.emails.listInternal, { userId }) as EmailListItem[];
    const results = all
      .filter((email) => !email.isVerwijderd)
      .filter((email) =>
        email.searchText.toLowerCase().includes(needle) ||
        email.subject.toLowerCase().includes(needle) ||
        email.from.toLowerCase().includes(needle)
      )
      .slice(0, 50);
    return json({ ok: true, count: results.length, results });
  }),
});

/**
 * GET /emails/senders — Afzender analyse (top 25 met frequentie + categorieën).
 */
http.route({
  path: "/emails/senders",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return json({ ok: false, error: "userId verplicht" }, 400);

    const all = await ctx.runQuery(internal.emails.listInternal, { userId }) as EmailListItem[];
    const sendersMap = new Map<string, {
      email: string;
      naam: string;
      totaal: number;
      ongelezen: number;
      categorieen: Record<string, number>;
      laatsteEmail: string;
      heeftBijlagen: number;
    }>();
    for (const email of all.filter((item) => !item.isVerwijderd)) {
      const emailMatch = email.from.match(/<(.+?)>/);
      const address = emailMatch?.[1] ?? email.from;
      const naam = email.from.replace(/<.*>/, "").trim() || address;
      const existing: {
        email: string;
        naam: string;
        totaal: number;
        ongelezen: number;
        categorieen: Record<string, number>;
        laatsteEmail: string;
        heeftBijlagen: number;
      } = sendersMap.get(address) ?? {
        email: address,
        naam,
        totaal: 0,
        ongelezen: 0,
        categorieen: {},
        laatsteEmail: email.datum,
        heeftBijlagen: 0,
      };
      existing.totaal++;
      if (!email.isGelezen) existing.ongelezen++;
      if (email.heeftBijlagen) existing.heeftBijlagen++;
      const cat = email.categorie ?? "overig";
      existing.categorieen[cat] = (existing.categorieen[cat] ?? 0) + 1;
      if (email.datum > existing.laatsteEmail) existing.laatsteEmail = email.datum;
      sendersMap.set(address, existing);
    }
    const senders = [...sendersMap.values()].sort((a, b) => b.totaal - a.totaal).slice(0, 25);
    return json({ ok: true, count: senders.length, senders });
  }),
});

/**
 * GET /emails — Email listing met optionele filters.
 * Query params: userId, label? (INBOX|SENT|TRASH), ongelezen? (true/false)
 */
http.route({
  path: "/emails",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return json({ ok: false, error: "userId verplicht" }, 400);

    const label = url.searchParams.get("label") ?? undefined;
    const onlyOngelezen = url.searchParams.get("ongelezen") === "true" ? true : undefined;

    const emails = await ctx.runQuery(internal.emails.listInternal, { userId, label, onlyOngelezen }) as EmailListItem[];
    return json({ ok: true, count: emails.length, emails });
  }),
});

// ─── GET /schema (AI Introspectie) ────────────────────────────────────────────
// Self-documenting endpoint: retourneert tabel-definities, indices, en API surface
// zodat Grok AI de volledige database structuur kan begrijpen.
http.route({
  path: "/schema",
  method: "GET",
  handler: httpAction(async (_ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);

    const schema = {
      version: "1.0",
      tables: {
        devices: {
          description: "WiZ smart lampen — status, IP, state (on/brightness/color)",
          fields: [
            "userId", "name", "ipAddress", "deviceType", "roomId?", "manufacturer?",
            "model?", "status (online|offline)", "lastSeen?", "currentState {on,brightness,color_temp,r,g,b}",
            "commissionedAt",
          ],
          indices: ["by_user [userId]", "by_user_ip [userId, ipAddress]"],
        },
        automations: {
          description: "Tijdgestuurde automatiseringen voor lampen (scènes, triggers)",
          fields: [
            "userId", "name", "enabled", "createdAt", "lastFiredAt?", "group?",
            "trigger {time, days?, triggerType?, shiftType?}",
            "action {type, sceneId?, brightness?, colorTempMireds?, colorHex?, deviceIds?}",
          ],
          indices: ["by_user [userId]"],
        },
        schedule: {
          description: "Werkdiensten (SDB Planning) — gesynct vanuit Google Calendar",
          fields: [
            "userId", "eventId", "titel", "startDatum (YYYY-MM-DD)", "startTijd (HH:MM)",
            "eindDatum", "eindTijd", "werktijd", "locatie", "team", "shiftType (Vroeg|Laat|Dienst)",
            "prioriteit", "duur (uren)", "weeknr (2026-W13)", "dag (Maandag..Zondag)",
            "status (Opkomend|Bezig|Gedraaid|VERWIJDERD)", "beschrijving", "heledag",
          ],
          indices: ["by_user [userId]", "by_user_date [userId, startDatum]", "by_user_eventId [userId, eventId]"],
        },
        scheduleMeta: {
          description: "Metadata van de laatste schedule import/sync",
          fields: ["userId", "importedAt", "fileName", "totalRows"],
          indices: ["by_user [userId]"],
        },
        salary: {
          description: "Salarisberekening per maand — bruto, ORT, netto prognose",
          fields: [
            "userId", "periode (2026-03)", "jaar", "maand", "aantalDiensten",
            "uurloonORT", "basisLoon", "ortTotaal", "brutoBetaling", "nettoPrognose",
            "ortDetail? (JSON)", "eenmaligDetail? (JSON)", "berekendOp",
          ],
          indices: ["by_user [userId]", "by_user_periode [userId, periode]"],
        },
        transactions: {
          description: "Rabobank afschriften — CSV import met deduplicatie",
          fields: [
            "userId", "rekeningIban", "volgnr", "datum (YYYY-MM-DD)", "bedrag",
            "saldoNaTrn", "code", "tegenrekeningIban?", "tegenpartijNaam?",
            "omschrijving", "referentie?", "isInterneOverboeking", "categorie?",
          ],
          indices: [
            "by_user [userId]", "by_user_datum [userId, datum]",
            "by_user_categorie [userId, categorie]", "by_rekening_volgnr [rekeningIban, volgnr]",
          ],
        },
        personalEvents: {
          description: "Persoonlijke Google Agenda afspraken — CRUD + conflict detectie met diensten",
          fields: [
            "userId", "eventId (Titel::startISO)", "titel", "startDatum (YYYY-MM-DD)",
            "startTijd? (HH:MM)", "eindDatum", "eindTijd?", "heledag", "locatie?",
            "beschrijving?", "status (Aankomend|Voorbij|PendingCreate|VERWIJDERD)",
            "kalender (Main)",
          ],
          indices: [
            "by_user [userId]", "by_user_date [userId, startDatum]",
            "by_user_status [userId, status]", "by_user_eventId [userId, eventId]",
          ],
        },
        emails: {
          description: "Gmail metadata + snippet — hybrid model (body on-demand via API)",
          fields: [
            "userId", "gmailId", "threadId", "from", "to", "cc?", "bcc?",
            "subject", "snippet", "datum (YYYY-MM-DD)", "ontvangen (unix ms)",
            "isGelezen", "isSter", "isVerwijderd", "isDraft",
            "labelIds [INBOX, SENT, TRASH, ...]", "categorie? (primary|social|promotions|updates)",
            "heeftBijlagen", "bijlagenCount", "searchText", "syncedAt",
          ],
          indices: [
            "by_user [userId]", "by_user_datum [userId, datum]",
            "by_user_thread [userId, threadId]", "by_user_gmailId [userId, gmailId]",
            "by_user_gelezen [userId, isGelezen]",
            "SEARCH: search_emails [searchText] filter [userId, isVerwijderd]",
          ],
        },
        emailSyncMeta: {
          description: "Gmail sync cursor — history ID voor incremental sync",
          fields: ["userId", "historyId", "lastFullSync", "totalSynced"],
          indices: ["by_user [userId]"],
        },
      },
      endpoints: {
        queries: [
          "devices.list", "devices.get", "devices.getByStringId",
          "automations.list",
          "schedule.list", "schedule.getMeta", "schedule.listByDate",
          "salary.computeFromSchedule", "salary.currentMonthPrognose", "salary.list", "salary.getByPeriode",
          "transactions.listPaginated", "transactions.getStats",
          "personalEvents.list", "personalEvents.listUpcoming", "personalEvents.listByDate",
          "emails.list", "emails.getThread", "emails.search", "emails.getStats",
          "emails.aiSummary — AI inbox digest (stats + top afzenders + ongelezen + categorieën)",
          "emails.senderAnalysis — Top 25 afzenders met frequentie en detail",
          "emails.recentByCategory — Filter emails per categorie (primary/social/promotions)",
        ],
        httpRoutes: [
          "GET /automations — Automation regels ophalen",
          "GET /schedule/today — Vandaag's dienst ophalen",
          "GET /devices — Alle lampen ophalen",
          "PATCH /devices/* — Lamp state updaten",
          "DELETE /devices/* — Lamp verwijderen",
          "GET /emails — Email listing met label/ongelezen filter",
          "GET /emails/ai-summary — 🤖 Grok: Compact inbox digest (één call = vol overzicht)",
          "GET /emails/search — 🤖 Grok: Full-text search (?q=zoekterm)",
          "GET /emails/senders — 🤖 Grok: Afzender analyse (top 25)",
          "GET /schema — 🤖 Grok: Self-documenting API schema",
        ],
        mutations: [
          "devices.create", "devices.update", "devices.remove",
          "automations.create", "automations.toggle", "automations.remove", "automations.markFired",
          "schedule.bulkImport",
          "transactions.importBatch", "transactions.updateCategorie",
          "personalEvents.create", "personalEvents.updateStatus",
        ],
        actions: [
          "syncSchedule.syncNow — Sync diensten vanuit Google Calendar",
          "syncPersonalEvents.syncNow — Sync persoonlijke agenda",
          "syncTodoist.syncTodoistNow — Sync diensten naar Todoist taken",
          "deletePersonalEvent.deleteEvent — Verwijder event uit Google Calendar + DB",
          "updatePersonalEvent.updateEvent — Update event in Google Calendar + DB",
          "syncGmail.syncNow — Sync Gmail metadata (incremental/full)",
          "sendGmail.* — intern-only Gmail mutaties via bevestigde Grok acties",
          "getGmailBody.getBody — Volledige email body ophalen (on-demand)",
          "getGmailBody.getAttachment — Bijlage downloaden",
        ],
        crons: [
          "sync-schedule-daily (06:00 UTC)",
          "sync-personal-events-interval (elk uur)",
          "sync-todoist-daily (07:00 UTC)",
          "process-pending-calendar (elk uur)",
          "sync-gmail (elke 5 min)",
        ],
      },
    };

    return json({ ok: true, schema });
  }),
});

// ─── 🤖 Telegram Bot Webhook ─────────────────────────────────────────────────

/**
 * POST /telegram/webhook — Ontvangt updates van Telegram.
 * Fire-and-forget: stuurt meteen 200 OK terug en verwerkt async.
 */
http.route({
  path: "/telegram/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    // ── Security: valideer Telegram webhook secret ────────────────────────
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[Webhook] TELEGRAM_WEBHOOK_SECRET ontbreekt; webhook verwerkt geen updates");
      return new Response("Webhook secret not configured", { status: 503 });
    }
    const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (headerSecret !== secret) {
      console.warn("[Webhook] ❌ Ongeautoriseerd: ongeldige secret token");
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const update = await req.json();
      // Fire-and-forget — Telegram vereist snelle 200 response
      await ctx.runAction(internal.telegram.bot.handleUpdate, { update });
    } catch {
      // Nooit falen richting Telegram, anders retry storm
    }
    return new Response("OK", { status: 200 });
  }),
});

export default http;

