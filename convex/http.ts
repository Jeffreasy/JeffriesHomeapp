import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

const http = httpRouter();

// ─── Auth helper ───────────────────────────────────────────────────────────────
function checkAuth(req: Request): string | null {
  const expectedSecret = process.env.HOMEAPP_GAS_SECRET;
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

    const automations = await ctx.runQuery(api.automations.list, { userId });
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

    const diensten = await ctx.runQuery(api.schedule.listByDate, { userId, date });
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

    let body: any;
    try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

    const { automationId } = body;
    if (!automationId) return json({ ok: false, error: "automationId verplicht" }, 400);

    try {
      await ctx.runMutation(internal.automations.markFiredInternal, { automationId });
      return json({ ok: true });
    } catch (e: any) {
      return json({ ok: false, error: e.message ?? "DB fout" }, 500);
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
    const devices = await ctx.runQuery(api.devices.list, { userId });
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
    let body: any;
    try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
    try {
      const id = await ctx.runMutation(api.devices.create, body);
      const device = await ctx.runQuery(api.devices.get, { id });
      return json({ ok: true, device }, 201);
    } catch (e: any) {
      const status = e.message?.includes("al in gebruik") ? 409 : 500;
      return json({ ok: false, error: e.message ?? "DB fout" }, status);
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
    const device = await ctx.runQuery(api.devices.getByStringId, { id: rawId });
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

    let body: any;
    try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

    try {
      if (sub === "state") {
        // Update lamp state after UDP command executed by FastAPI
        await ctx.runMutation(internal.devices.updateStateInternal, { deviceId, state: body });
        return json({ ok: true });

      } else if (sub === "status") {
        // Set online/offline status from engine poll
        const { status } = body;
        if (!status) return json({ ok: false, error: "status verplicht" }, 400);
        await ctx.runMutation(internal.devices.setStatusInternal, { deviceId, status });
        return json({ ok: true });

      } else {
        // General update: name, room, ip
        const device = await ctx.runQuery(api.devices.getByStringId, { id: deviceId });
        if (!device) return json({ ok: false, error: "Ongeldig device ID" }, 400);
        await ctx.runMutation(api.devices.update, { id: device._id, ...body });
        return json({ ok: true, device });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "DB fout";
      return json({ ok: false, error: msg }, 500);
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
      const device = await ctx.runQuery(api.devices.getByStringId, { id: deviceId });
      if (!device) return json({ ok: false, error: "Ongeldig device ID" }, 400);
      await ctx.runMutation(api.devices.remove, { id: device._id });
      return json({ ok: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "DB fout";
      return json({ ok: false, error: msg }, 500);
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
 * Query params: userId
 */
http.route({
  path: "/ai/briefing",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return json({ ok: false, error: "userId verplicht" }, 400);

    const result = await ctx.runQuery(api.ai.router.getBriefing, { userId });
    return json(result);
  }),
});

/**
 * GET /ai/agent/* — Haal context op van een specifieke agent.
 * URL: /ai/agent/lampen?userId=xxx
 */
http.route({
  pathPrefix: "/ai/agent/",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);
    const url = new URL(req.url);
    const agentId = url.pathname.replace(/^\/ai\/agent\//, "").split("/")[0];
    const userId  = url.searchParams.get("userId");
    if (!agentId) return json({ ok: false, error: "agentId ontbreekt in URL" }, 400);
    if (!userId)  return json({ ok: false, error: "userId verplicht" }, 400);

    const result = await ctx.runQuery(api.ai.router.getAgentContext, { agentId, userId });
    return json(result);
  }),
});

/**
 * POST /ai/chat — Chat met een agent via Grok AI.
 * Body: { userId, vraag, agentId?, history? }
 */
http.route({
  path: "/ai/chat",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);

    let body: { userId?: string; vraag?: string; agentId?: string; history?: Array<{ role: "user" | "assistant"; content: string }> };
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    if (!body.userId) return json({ ok: false, error: "userId verplicht" }, 400);
    if (!body.vraag)  return json({ ok: false, error: "vraag verplicht" }, 400);

    const result = await ctx.runAction(api.ai.grok.chat.chat, {
      userId:  body.userId,
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

    const summary = await ctx.runQuery(api.emails.aiSummary, { userId });
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

    const results = await ctx.runQuery(api.emails.search, { userId, zoekterm });
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

    const senders = await ctx.runQuery(api.emails.senderAnalysis, { userId });
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

    const emails = await ctx.runQuery(api.emails.list, { userId, label, onlyOngelezen });
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
          "sendGmail.sendEmail — Nieuw email versturen",
          "sendGmail.replyToEmail — Reply op thread",
          "sendGmail.trashEmail — Verplaats naar prullenbak",
          "sendGmail.markGelezen — Markeer gelezen/ongelezen",
          "sendGmail.markSter — Ster toevoegen/verwijderen",
          "sendGmail.modifyLabels — Labels wijzigen",
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
    if (secret) {
      const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
      if (headerSecret !== secret) {
        console.warn("[Webhook] ❌ Ongeautoriseerd: ongeldige secret token");
        return new Response("Unauthorized", { status: 401 });
      }
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

