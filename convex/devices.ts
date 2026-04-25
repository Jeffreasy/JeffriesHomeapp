import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ─── Default state helper ─────────────────────────────────────────────────────
const DEFAULT_STATE = { on: false, brightness: 100, color_temp: 4000, r: 0, g: 0, b: 0 };
const stateShape = {
  on: v.boolean(), brightness: v.number(),
  color_temp: v.number(), r: v.number(), g: v.number(), b: v.number(),
};

type AuthCtx = QueryCtx | MutationCtx;

async function requireCurrentUserId(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Niet ingelogd");
  return identity.subject;
}

async function requireOwnedDevice(ctx: AuthCtx, id: Id<"devices">, userId: string) {
  const device = await ctx.db.get(id);
  if (!device || device.userId !== userId) throw new Error("Device niet gevonden");
  return device;
}

async function validateRoom(ctx: AuthCtx, userId: string, roomId: string | null | undefined) {
  if (!roomId) return;
  const normalized = ctx.db.normalizeId("rooms", roomId);
  if (!normalized) throw new Error("Kamer niet gevonden");
  const room = await ctx.db.get(normalized);
  if (!room || room.userId !== userId) throw new Error("Kamer niet gevonden");
}

async function assertUniqueIp(ctx: AuthCtx, userId: string, ipAddress: string, currentId?: Id<"devices">) {
  const existing = await ctx.db
    .query("devices")
    .withIndex("by_user_ip", (q) => q.eq("userId", userId).eq("ipAddress", ipAddress))
    .first();
  if (existing && existing._id !== currentId) {
    throw new Error(`IP ${ipAddress} al in gebruik door '${existing.name}'`);
  }
}

// ─── List all devices for a user (internal/legacy — takes explicit userId) ────
export const list = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) =>
    ctx.db.query("devices").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
});

// ─── List devices for authenticated user (frontend) ──────────────────────────
export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db
      .query("devices")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

// ─── Get single device by v.id ───────────────────────────────────────────────
export const get = query({
  args: { id: v.id("devices") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const device = await ctx.db.get(id);
    return device?.userId === identity.subject ? device : null;
  },
});

// ─── Get single device by raw string ID (for HTTP actions) ───────────────────
export const getByStringId = internalQuery({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const normalId = ctx.db.normalizeId("devices", id);
    if (!normalId) return null;
    return ctx.db.get(normalId);
  },
});

// ─── Create a new device ──────────────────────────────────────────────────────
export const create = mutation({
  args: {
    name:         v.string(),
    ipAddress:    v.string(),
    deviceType:   v.optional(v.string()),
    roomId:       v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    model:        v.optional(v.string()),
    currentState: v.optional(v.object(stateShape)),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    await validateRoom(ctx, userId, args.roomId);
    await assertUniqueIp(ctx, userId, args.ipAddress);

    return ctx.db.insert("devices", {
      userId,
      name:           args.name,
      ipAddress:      args.ipAddress,
      deviceType:     args.deviceType ?? "color_light",
      roomId:         args.roomId,
      manufacturer:   args.manufacturer,
      model:          args.model,
      status:         "online",
      currentState:   args.currentState ?? DEFAULT_STATE,
      commissionedAt: new Date().toISOString(),
    });
  },
});

export const createInternal = internalMutation({
  args: {
    userId:       v.string(),
    name:         v.string(),
    ipAddress:    v.string(),
    deviceType:   v.string(),
    roomId:       v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    model:        v.optional(v.string()),
    currentState: v.optional(v.object(stateShape)),
  },
  handler: async (ctx, args) => {
    // Prevent duplicate IPs per user
    await assertUniqueIp(ctx, args.userId, args.ipAddress);

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
    roomId:    v.optional(v.union(v.string(), v.null())),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireCurrentUserId(ctx);
    await requireOwnedDevice(ctx, id, userId);
    if (patch.roomId !== undefined) await validateRoom(ctx, userId, patch.roomId);
    if (patch.ipAddress !== undefined) await assertUniqueIp(ctx, userId, patch.ipAddress, id);

    const updates: Record<string, unknown> = {};
    if (patch.name !== undefined)      updates.name      = patch.name;
    if (patch.roomId !== undefined)    updates.roomId    = patch.roomId ?? undefined;
    if (patch.ipAddress !== undefined) updates.ipAddress = patch.ipAddress;
    await ctx.db.patch(id, updates);
  },
});

export const updateInternal = internalMutation({
  args: {
    id:        v.id("devices"),
    name:      v.optional(v.string()),
    roomId:    v.optional(v.union(v.string(), v.null())),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const device = await ctx.db.get(id);
    if (!device) throw new Error("Device niet gevonden");
    if (patch.ipAddress !== undefined) await assertUniqueIp(ctx, device.userId, patch.ipAddress, id);

    const updates: Record<string, unknown> = {};
    if (patch.name !== undefined)      updates.name      = patch.name;
    if (patch.roomId !== undefined)    updates.roomId    = patch.roomId ?? undefined;
    if (patch.ipAddress !== undefined) updates.ipAddress = patch.ipAddress;
    await ctx.db.patch(id, updates);
  },
});

// ─── Delete device ────────────────────────────────────────────────────────────
export const remove = mutation({
  args: { id: v.id("devices") },
  handler: async (ctx, { id }) => {
    const userId = await requireCurrentUserId(ctx);
    await requireOwnedDevice(ctx, id, userId);
    await ctx.db.delete(id);
  },
});

export const removeInternal = internalMutation({
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
  args: { deviceId: v.string(), status: v.union(v.literal("online"), v.literal("offline")) },
  handler: async (ctx, { deviceId, status }) => {
    const id = ctx.db.normalizeId("devices", deviceId);
    if (!id) throw new Error("Ongeldig device ID");
    await ctx.db.patch(id, { status, lastSeen: new Date().toISOString() });
  },
});

