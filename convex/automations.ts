import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";

async function currentUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Niet ingelogd");
  return identity.subject;
}

async function resolveUserId(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } },
  requestedUserId?: string,
) {
  const userId = await currentUserId(ctx);
  if (requestedUserId && requestedUserId !== userId) throw new Error("Unauthorized");
  return userId;
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

// ─── List all automations for the current user ────────────────────────────────
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const owner = await resolveUserId(ctx, userId);
    return ctx.db
      .query("automations")
      .withIndex("by_user", (q) => q.eq("userId", owner))
      .collect();
  },
});

export const listInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) =>
    ctx.db
      .query("automations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
});

// ─── Create a new automation ──────────────────────────────────────────────────
export const create = mutation({
  args: {
    userId:    v.string(),
    name:      v.string(),
    enabled:   v.boolean(),
    createdAt: v.string(),
    group:     v.optional(v.string()),
    trigger: v.object({
      time:        v.string(),
      days:        v.optional(v.array(v.number())),
      triggerType: v.optional(v.string()),
      shiftType:   v.optional(v.string()),
    }),
    action: v.object({
      type:            v.string(),
      sceneId:         v.optional(v.string()),
      brightness:      v.optional(v.number()),
      colorTempMireds: v.optional(v.number()),
      colorHex:        v.optional(v.string()),
      deviceIds:       v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.userId);
    return ctx.db.insert("automations", withoutUndefined({ ...args, userId }));
  },
});

// ─── Toggle enabled state ─────────────────────────────────────────────────────
export const toggle = mutation({
  args: { id: v.id("automations") },
  handler: async (ctx, { id }) => {
    const userId = await currentUserId(ctx);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Automation niet gevonden");
    if (existing.userId !== userId) throw new Error("Unauthorized");
    await ctx.db.patch(id, { enabled: !existing.enabled });
  },
});

// ─── Remove an automation ─────────────────────────────────────────────────────
export const remove = mutation({
  args: { id: v.id("automations") },
  handler: async (ctx, { id }) => {
    const userId = await currentUserId(ctx);
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) throw new Error("Automation niet gevonden");
    await ctx.db.delete(id);
  },
});

// ─── Mark as fired (update lastFiredAt) ──────────────────────────────────────
export const markFired = mutation({
  args: { id: v.id("automations"), firedAt: v.string() },
  handler: async (ctx, { id, firedAt }) => {
    const userId = await currentUserId(ctx);
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) throw new Error("Automation niet gevonden");
    await ctx.db.patch(id, { lastFiredAt: firedAt });
  },
});

// ─── Remove all automations in a group (for pack reinstall) ──────────────────
export const removeByGroup = mutation({
  args: { userId: v.string(), group: v.string() },
  handler: async (ctx, { userId, group }) => {
    const owner = await resolveUserId(ctx, userId);
    const rows = await ctx.db
      .query("automations")
      .withIndex("by_user", (q) => q.eq("userId", owner))
      .filter((q) => q.eq(q.field("group"), group))
      .collect();
    await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
    return rows.length;
  },
});

// ─── Internal markFired (called from HTTP action) ──────────────────────────
export const markFiredInternal = internalMutation({
  args: { automationId: v.string() },
  handler: async (ctx, { automationId }) => {
    // automationId is a Convex document ID string
    const id = ctx.db.normalizeId("automations", automationId);
    if (!id) throw new Error("Ongeldig automation ID");
    await ctx.db.patch(id, { lastFiredAt: new Date().toISOString() });
  },
});
