/**
 * convex/deviceCommands.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Command queue voor device control vanuit Telegram/Grok.
 *
 * Flow:
 *   Telegram/Grok → queueCommand() → "pending" in DB
 *   Lokale bridge → listPending() → voert uit → markDone()
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

const commandShape = {
  on:               v.optional(v.boolean()),
  brightness:       v.optional(v.number()),
  color_temp_mireds: v.optional(v.number()),
  r:                v.optional(v.number()),
  g:                v.optional(v.number()),
  b:                v.optional(v.number()),
  scene_id:         v.optional(v.number()),
};

function requireBridgeSecret(provided: string) {
  const expected = process.env.TELEGRAM_BRIDGE_SECRET;
  if (!expected) throw new Error("TELEGRAM_BRIDGE_SECRET niet geconfigureerd");
  if (provided !== expected) throw new Error("Unauthorized");
}

/** Zet een nieuw commando in de queue vanuit trusted Convex code. */
export const queueCommand = internalMutation({
  args: {
    userId:   v.string(),
    deviceId: v.optional(v.string()),    // undefined = alle devices
    command:  v.object(commandShape),
    bron:     v.string(),                // "telegram", "grok", "automation"
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("deviceCommands", {
      userId:    args.userId,
      deviceId:  args.deviceId,
      command:   args.command,
      status:    "pending",
      bron:      args.bron,
      createdAt: new Date().toISOString(),
    });
  },
});

/** Auth-aware: queue commando vanuit de web-UI. */
export const queueForUser = mutation({
  args: {
    deviceId: v.optional(v.string()),
    command:  v.object(commandShape),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Niet ingelogd");
    return ctx.db.insert("deviceCommands", {
      userId:    identity.subject,
      deviceId:  args.deviceId,
      command:   args.command,
      status:    "pending",
      bron:      "web-ui",
      createdAt: new Date().toISOString(),
    });
  },
});

/** Haal pending commands op (voor lokale bridge polling). */
export const listPending = query({
  args: { bridgeSecret: v.string() },
  handler: async (ctx, { bridgeSecret }) => {
    requireBridgeSecret(bridgeSecret);
    return ctx.db
      .query("deviceCommands")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
  },
});

/** Markeer een commando als uitgevoerd of gefaald. */
export const markDone = mutation({
  args: {
    id:     v.id("deviceCommands"),
    status: v.union(v.literal("done"), v.literal("failed")),
    error:  v.optional(v.string()),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, { id, status, error, bridgeSecret }) => {
    requireBridgeSecret(bridgeSecret);
    await ctx.db.patch(id, {
      status,
      doneAt: new Date().toISOString(),
      error,
    });
  },
});

/** Cleanup: verwijder commands ouder dan 24 uur. */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const old = await ctx.db
      .query("deviceCommands")
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .collect();
    for (const cmd of old) {
      await ctx.db.delete(cmd._id);
    }
    return { deleted: old.length };
  },
});
