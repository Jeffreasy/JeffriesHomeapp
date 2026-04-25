import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const DEFAULTS = {
  finance: true,
  habits: true,
  notes: true,
  email: true,
  account: true,
};

function nowIso() {
  return new Date().toISOString();
}

async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Niet ingelogd");
  return identity.subject;
}

export const getForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const settings = await ctx.db
      .query("privacySettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .first();
    return settings ?? { userId: identity.subject, ...DEFAULTS, updatedAt: nowIso() };
  },
});

export const updateForUser = mutation({
  args: {
    finance: v.optional(v.boolean()),
    habits:  v.optional(v.boolean()),
    notes:   v.optional(v.boolean()),
    email:   v.optional(v.boolean()),
    account: v.optional(v.boolean()),
  },
  handler: async (ctx, patch) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("privacySettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const current = existing
      ? {
          finance: existing.finance,
          habits: existing.habits,
          notes: existing.notes,
          email: existing.email,
          account: existing.account,
        }
      : DEFAULTS;
    const next = {
      ...current,
      ...patch,
      userId,
      updatedAt: nowIso(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, next);
      return existing._id;
    }
    return ctx.db.insert("privacySettings", next);
  },
});
