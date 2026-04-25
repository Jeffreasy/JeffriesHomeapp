/**
 * convex/ai/grok/pendingActions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side confirmation queue for Grok tool calls with side effects.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { executeTool } from "./tools/executor";
import { isToolAllowed } from "./tools/policy";
import { safeJsonParse } from "./types";

const DEFAULT_TTL_MINUTES = 10;

function nowIso(): string {
  return new Date().toISOString();
}

function expiresIn(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Niet ingelogd");
  return identity.subject;
}

function toolResultSummary(result: string): string {
  const parsed = safeJsonParse(result);
  if (parsed?.error) return `Fout: ${String(parsed.error)}`;
  if (parsed?.beschrijving) return String(parsed.beschrijving);
  if (parsed?.ok === true) return "Actie uitgevoerd.";
  return result.slice(0, 500);
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

export const listForUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await requireUserId(ctx);
    const now = nowIso();
    const actions = await ctx.db
      .query("aiPendingActions")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "pending"))
      .collect();
    return actions
      .filter((action) => action.expiresAt > now)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit ?? 20);
  },
});

export const getPendingById = internalQuery({
  args: {
    id:     v.id("aiPendingActions"),
    userId: v.string(),
  },
  handler: async (ctx, { id, userId }) => {
    const action = await ctx.db.get(id);
    if (!action || action.userId !== userId || action.status !== "pending" || action.expiresAt <= nowIso()) return null;
    return action;
  },
});

export const claimForUser = internalMutation({
  args: {
    id:     v.id("aiPendingActions"),
    userId: v.string(),
  },
  handler: async (ctx, { id, userId }) => {
    const action = await ctx.db.get(id);
    if (!action || action.userId !== userId || action.status !== "pending" || action.expiresAt <= nowIso()) return null;
    await ctx.db.patch(id, { status: "executing" });
    return action;
  },
});

export const cancelForUser = mutation({
  args: { id: v.id("aiPendingActions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const action = await ctx.db.get(id);
    if (!action || action.userId !== userId || action.status !== "pending") throw new Error("Actie niet gevonden");
    await ctx.db.patch(id, { status: "cancelled" });
    await ctx.db.insert("auditLogs", {
      userId,
      actor: "user",
      source: "settings.confirmations",
      action: "cancel",
      entity: "aiPendingActions",
      entityId: id,
      status: "cancelled",
      summary: action.summary,
      createdAt: nowIso(),
    });
    return { ok: true };
  },
});

export const confirmForUser = action({
  args: { id: v.id("aiPendingActions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const actionToRun = await ctx.runMutation(internal.ai.grok.pendingActions.claimForUser, { id, userId });
    if (!actionToRun) throw new Error("Actie niet gevonden, verlopen of al in uitvoering");
    if (!isToolAllowed(actionToRun.agentId, actionToRun.toolName)) {
      await ctx.runMutation(internal.ai.grok.pendingActions.markStatus, {
        id,
        status: "failed",
        error: "Tool is niet toegestaan voor deze agent.",
      });
      throw new Error("Deze tool is niet toegestaan voor deze agent");
    }

    const args = safeJsonParse(actionToRun.argsJson);
    if (!args) {
      await ctx.runMutation(internal.ai.grok.pendingActions.markStatus, {
        id,
        status: "failed",
        error: "Ongeldige opgeslagen arguments.",
      });
      throw new Error("De opgeslagen actie is ongeldig");
    }

    try {
      const result = await executeTool(ctx, actionToRun.toolName, args, userId);
      const parsed = safeJsonParse(result);
      const status = parsed?.error ? "failed" : "confirmed";
      await ctx.runMutation(internal.ai.grok.pendingActions.markStatus, {
        id,
        status,
        ...(status === "confirmed" ? { result } : { error: String(parsed?.error ?? result) }),
      });
      await ctx.runMutation(internal.auditLogs.recordInternal, {
        userId,
        actor: "user",
        source: "settings.confirmations",
        action: "confirm",
        entity: "aiPendingActions",
        entityId: id,
        status,
        summary: actionToRun.summary,
        metadata: JSON.stringify({ toolName: actionToRun.toolName, agentId: actionToRun.agentId }),
      });
      if (status === "failed") throw new Error(toolResultSummary(result));
      return { ok: true, summary: toolResultSummary(result) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.ai.grok.pendingActions.markStatus, {
        id,
        status: "failed",
        error: message,
      });
      await ctx.runMutation(internal.auditLogs.recordInternal, {
        userId,
        actor: "user",
        source: "settings.confirmations",
        action: "confirm",
        entity: "aiPendingActions",
        entityId: id,
        status: "failed",
        summary: actionToRun.summary,
        metadata: JSON.stringify({ error: message, toolName: actionToRun.toolName, agentId: actionToRun.agentId }),
      });
      throw err;
    }
  },
});

export const markStatus = internalMutation({
  args: {
    id:     v.id("aiPendingActions"),
    status: v.union(
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("expired"),
      v.literal("executing"),
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
