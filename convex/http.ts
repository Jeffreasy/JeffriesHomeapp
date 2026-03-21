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
        await ctx.runMutation(api.devices.update, { id: deviceId as any, ...body });
        const device = await ctx.runQuery(api.devices.getByStringId, { id: deviceId });
        return json({ ok: true, device });
      }
    } catch (e: any) {
      return json({ ok: false, error: e.message ?? "DB fout" }, 500);
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
      await ctx.runMutation(api.devices.remove, { id: deviceId as any });
      return json({ ok: true });
    } catch (e: any) {
      return json({ ok: false, error: e.message ?? "DB fout" }, 500);
    }
  }),
});

export default http;
