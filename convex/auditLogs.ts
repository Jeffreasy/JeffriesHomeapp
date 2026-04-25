import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

const auditArgs = {
  userId:   v.optional(v.string()),
  actor:    v.string(),
  source:   v.string(),
  action:   v.string(),
  entity:   v.string(),
  entityId: v.optional(v.string()),
  status:   v.string(),
  summary:  v.string(),
  metadata: v.optional(v.string()),
};

function nowIso() {
  return new Date().toISOString();
}

async function currentUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Niet ingelogd");
  return identity.subject;
}

export const recordInternal = internalMutation({
  args: auditArgs,
  handler: async (ctx, args) => {
    return ctx.db.insert("auditLogs", {
      ...args,
      createdAt: nowIso(),
    });
  },
});

export const recordForUser = mutation({
  args: {
    source:   v.string(),
    action:   v.string(),
    entity:   v.string(),
    entityId: v.optional(v.string()),
    status:   v.string(),
    summary:  v.string(),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await currentUserId(ctx);
    return ctx.db.insert("auditLogs", {
      userId,
      actor: "user",
      ...args,
      createdAt: nowIso(),
    });
  },
});

export const listForUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await currentUserId(ctx);
    const rows = await ctx.db
      .query("auditLogs")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .collect();

    return rows
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit ?? 40);
  },
});
