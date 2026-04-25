import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type AuthCtx = QueryCtx | MutationCtx;

async function requireCurrentUserId(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Niet ingelogd");
  return identity.subject;
}

async function requireOwnedRoom(ctx: AuthCtx, id: Id<"rooms">, userId: string) {
  const room = await ctx.db.get(id);
  if (!room || room.userId !== userId) throw new Error("Kamer niet gevonden");
  return room;
}

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return ctx.db
      .query("rooms")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const createForUser = mutation({
  args: {
    name:        v.string(),
    icon:        v.optional(v.string()),
    floorNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireCurrentUserId(ctx);
    const now = new Date().toISOString();

    return ctx.db.insert("rooms", {
      userId,
      name: args.name.trim(),
      icon: args.icon ?? "room",
      floorNumber: args.floorNumber,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateForUser = mutation({
  args: {
    id:          v.id("rooms"),
    name:        v.optional(v.string()),
    icon:        v.optional(v.string()),
    floorNumber: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireCurrentUserId(ctx);
    await requireOwnedRoom(ctx, id, userId);

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (fields.name !== undefined) patch.name = fields.name.trim();
    if (fields.icon !== undefined) patch.icon = fields.icon;
    if (fields.floorNumber !== undefined) patch.floorNumber = fields.floorNumber;

    await ctx.db.patch(id, patch);
  },
});

export const removeForUser = mutation({
  args: { id: v.id("rooms") },
  handler: async (ctx, { id }) => {
    const userId = await requireCurrentUserId(ctx);
    await requireOwnedRoom(ctx, id, userId);
    const roomId = id as string;

    const devices = await ctx.db
      .query("devices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("roomId"), roomId))
      .collect();

    for (const device of devices) {
      await ctx.db.patch(device._id, { roomId: undefined });
    }

    await ctx.db.delete(id);
    return { detachedDevices: devices.length };
  },
});
