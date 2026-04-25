import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

function nowIso() {
  return new Date().toISOString();
}

async function upsertStatus(ctx: MutationCtx, args: {
  userId: string;
  source: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  result?: string;
}) {
  const existing = await ctx.db
    .query("syncStatus")
    .withIndex("by_user_source", (q) => q.eq("userId", args.userId).eq("source", args.source))
    .first();
  const updatedAt = nowIso();
  const patch = { ...args, updatedAt };
  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return existing._id;
  }
  return ctx.db.insert("syncStatus", patch);
}

export const markRunning = internalMutation({
  args: {
    userId: v.string(),
    source: v.string(),
  },
  handler: async (ctx, { userId, source }) => {
    const now = nowIso();
    return upsertStatus(ctx, {
      userId,
      source,
      status: "running",
      startedAt: now,
    });
  },
});

export const markSuccess = internalMutation({
  args: {
    userId: v.string(),
    source: v.string(),
    result: v.optional(v.string()),
  },
  handler: async (ctx, { userId, source, result }) => {
    const now = nowIso();
    return upsertStatus(ctx, {
      userId,
      source,
      status: "success",
      finishedAt: now,
      lastSuccessAt: now,
      result,
    });
  },
});

export const markFailed = internalMutation({
  args: {
    userId: v.string(),
    source: v.string(),
    error:  v.string(),
  },
  handler: async (ctx, { userId, source, error }) => {
    const now = nowIso();
    return upsertStatus(ctx, {
      userId,
      source,
      status: "failed",
      finishedAt: now,
      lastErrorAt: now,
      lastError: error.slice(0, 500),
    });
  },
});

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db
      .query("syncStatus")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});
