import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function requireBridgeSecret(provided: string) {
  const expected = process.env.TELEGRAM_BRIDGE_SECRET;
  if (!expected) throw new Error("TELEGRAM_BRIDGE_SECRET niet geconfigureerd");
  if (provided !== expected) throw new Error("Unauthorized");
}

function nowIso() {
  return new Date().toISOString();
}

export const heartbeat = mutation({
  args: {
    bridgeSecret: v.string(),
    bridgeId:     v.optional(v.string()),
    status:       v.optional(v.string()),
    apiBase:      v.optional(v.string()),
    version:      v.optional(v.string()),
    lastPollAt:   v.optional(v.string()),
    lastSuccessAt: v.optional(v.string()),
    lastErrorAt:  v.optional(v.string()),
    lastError:    v.optional(v.string()),
    commandsSeen: v.optional(v.number()),
    commandsDone: v.optional(v.number()),
    commandsFailed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret);
    const bridgeId = args.bridgeId ?? "default";
    const existing = await ctx.db
      .query("bridgeHealth")
      .withIndex("by_bridge", (q) => q.eq("bridgeId", bridgeId))
      .first();
    const now = nowIso();
    const patch = {
      bridgeId,
      status: args.status ?? (args.lastError ? "error" : "online"),
      apiBase: args.apiBase,
      version: args.version,
      lastSeenAt: now,
      lastPollAt: args.lastPollAt,
      lastSuccessAt: args.lastSuccessAt,
      lastErrorAt: args.lastErrorAt,
      lastError: args.lastError?.slice(0, 500),
      commandsSeen: args.commandsSeen ?? existing?.commandsSeen ?? 0,
      commandsDone: args.commandsDone ?? existing?.commandsDone ?? 0,
      commandsFailed: args.commandsFailed ?? existing?.commandsFailed ?? 0,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return ctx.db.insert("bridgeHealth", patch);
  },
});

export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const rows = await ctx.db.query("bridgeHealth").withIndex("by_updated").collect();
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
  },
});
