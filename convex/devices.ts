import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// ─── Default state helper ─────────────────────────────────────────────────────
const DEFAULT_STATE = { on: false, brightness: 100, color_temp: 4000, r: 0, g: 0, b: 0 };

// ─── List all devices for a user ──────────────────────────────────────────────
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) =>
    ctx.db.query("devices").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
});

// ─── Get single device ────────────────────────────────────────────────────────
export const get = query({
  args: { id: v.id("devices") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

// ─── Create a new device ──────────────────────────────────────────────────────
export const create = mutation({
  args: {
    userId:       v.string(),
    name:         v.string(),
    ipAddress:    v.string(),
    deviceType:   v.string(),
    roomId:       v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    model:        v.optional(v.string()),
    currentState: v.optional(v.object({
      on: v.boolean(), brightness: v.number(),
      color_temp: v.number(), r: v.number(), g: v.number(), b: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Prevent duplicate IPs per user
    const existing = await ctx.db
      .query("devices")
      .withIndex("by_user_ip", (q) => q.eq("userId", args.userId).eq("ipAddress", args.ipAddress))
      .first();
    if (existing) throw new Error(`IP ${args.ipAddress} al in gebruik door '${existing.name}'`);

    return ctx.db.insert("devices", {
      userId:         args.userId,
      name:           args.name,
      ipAddress:      args.ipAddress,
      deviceType:     args.deviceType,
      roomId:         args.roomId,
      manufacturer:   args.manufacturer,
      model:          args.model,
      status:         "online",
      currentState:   args.currentState ?? DEFAULT_STATE,
      commissionedAt: new Date().toISOString(),
    });
  },
});

// ─── Update name / room / ip ──────────────────────────────────────────────────
export const update = mutation({
  args: {
    id:        v.id("devices"),
    name:      v.optional(v.string()),
    roomId:    v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const device = await ctx.db.get(id);
    if (!device) throw new Error("Device niet gevonden");
    const updates: Record<string, unknown> = {};
    if (patch.name !== undefined)      updates.name      = patch.name;
    if (patch.roomId !== undefined)    updates.roomId    = patch.roomId;
    if (patch.ipAddress !== undefined) updates.ipAddress = patch.ipAddress;
    await ctx.db.patch(id, updates);
  },
});

// ─── Delete device ────────────────────────────────────────────────────────────
export const remove = mutation({
  args: { id: v.id("devices") },
  handler: async (ctx, { id }) => {
    const device = await ctx.db.get(id);
    if (!device) throw new Error("Device niet gevonden");
    await ctx.db.delete(id);
  },
});

// ─── Internal: update live state (called by FastAPI after UDP command) ────────
export const updateStateInternal = internalMutation({
  args: {
    deviceId: v.string(),
    state:    v.object({
      on: v.optional(v.boolean()), brightness: v.optional(v.number()),
      color_temp: v.optional(v.number()), r: v.optional(v.number()),
      g: v.optional(v.number()), b: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { deviceId, state }) => {
    const id = ctx.db.normalizeId("devices", deviceId);
    if (!id) throw new Error("Ongeldig device ID");
    const device = await ctx.db.get(id);
    if (!device) throw new Error("Device niet gevonden");
    await ctx.db.patch(id, {
      currentState: { ...device.currentState, ...state },
      lastSeen:     new Date().toISOString(),
    });
  },
});

// ─── Internal: set online/offline status (called by automation engine) ────────
export const setStatusInternal = internalMutation({
  args: { deviceId: v.string(), status: v.string() },
  handler: async (ctx, { deviceId, status }) => {
    const id = ctx.db.normalizeId("devices", deviceId);
    if (!id) throw new Error("Ongeldig device ID");
    await ctx.db.patch(id, { status, lastSeen: new Date().toISOString() });
  },
});
