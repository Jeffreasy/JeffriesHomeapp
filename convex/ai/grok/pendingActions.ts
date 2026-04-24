/**
 * convex/ai/grok/pendingActions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side confirmation queue for Grok tool calls with side effects.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";

const DEFAULT_TTL_MINUTES = 10;

function nowIso(): string {
  return new Date().toISOString();
}

function expiresIn(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export const create = internalMutation({
  args: {
    userId:   v.string(),
    agentId:  v.string(),
    toolName: v.string(),
    argsJson: v.string(),
    summary:  v.string(),
    ttlMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("aiPendingActions", {
      userId:    args.userId,
      agentId:   args.agentId,
      toolName:  args.toolName,
      argsJson:  args.argsJson,
      summary:   args.summary,
      code:      "",
      status:    "pending",
      createdAt: nowIso(),
      expiresAt: expiresIn(args.ttlMinutes ?? DEFAULT_TTL_MINUTES),
    });

    const code = String(id).slice(-6).toUpperCase();
    await ctx.db.patch(id, { code });

    return { id, code };
  },
});

export const listPending = internalQuery({
  args: {
    userId:  v.string(),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, agentId }) => {
    const actions = await ctx.db
      .query("aiPendingActions")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "pending"))
      .collect();

    const now = nowIso();
    return actions
      .filter((a) => a.expiresAt > now)
      .filter((a) => !agentId || a.agentId === agentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

export const markStatus = internalMutation({
  args: {
    id:     v.id("aiPendingActions"),
    status: v.union(
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("expired"),
      v.literal("failed"),
    ),
    result: v.optional(v.string()),
    error:  v.optional(v.string()),
  },
  handler: async (ctx, { id, status, result, error }) => {
    await ctx.db.patch(id, {
      status,
      ...(status === "confirmed" ? { confirmedAt: nowIso() } : {}),
      ...(result ? { result } : {}),
      ...(error ? { error } : {}),
    });
    return { ok: true };
  },
});
