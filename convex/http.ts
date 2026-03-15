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

// ─── POST /sync-schedule ────────────────────────────────────────────────────
// Called by Google Apps Script after each "Sync Rooster" run.
http.route({
  path: "/sync-schedule",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!checkAuth(req)) return json({ ok: false, error: "Unauthorized" }, 401);

    let body: any;
    try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

    const { userId, diensten } = body;
    if (!userId || !Array.isArray(diensten)) return json({ ok: false, error: "userId + diensten verplicht" }, 400);

    try {
      const result = await ctx.runMutation(internal.schedule.bulkImportInternal, {
        userId, diensten,
        importedAt: new Date().toISOString(),
        fileName: "Google Apps Script (auto-sync)",
      });
      return json({ ok: true, count: result.count });
    } catch (e: any) {
      return json({ ok: false, error: e.message ?? "DB fout" }, 500);
    }
  }),
});

// ─── GET /automations ───────────────────────────────────────────────────────
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

export default http;
