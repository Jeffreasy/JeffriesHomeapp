/**
 * convex/ai/router.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Agent Agency Router — Convex queries voor agent discovery en context.
 *
 * - listAgents: Alle beschikbare agents met capabilities
 * - internalGetAgentContext: Volledige context van één specifieke agent
 * - internalGetBriefing: Cross-domain daily briefing (Dashboard Agent)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { AGENT_REGISTRY, getAgent, toMeta } from "./registry";

/**
 * Internal versie van getAgentContext — callable vanuit actions (grok.ts).
 */
export const internalGetAgentContext = internalQuery({
  args: { agentId: v.string(), userId: v.string() },
  handler: async (ctx, { agentId, userId }) => {
    const agent = getAgent(agentId);
    if (!agent) return { ok: false as const, error: `Agent "${agentId}" niet gevonden` };
    const context = await agent.getContext(ctx, userId);
    return { ok: true as const, agent: toMeta(agent), context };
  },
});

export const internalGetBriefing = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const dashboard = getAgent("dashboard");
    if (!dashboard) return { ok: false as const, error: "Dashboard agent niet gevonden" };

    const context = await dashboard.getContext(ctx, userId);

    return {
      ok:    true as const,
      type:  "daily-briefing",
      agent: toMeta(dashboard),
      briefing: context,
    };
  },
});

/**
 * Lijst alle beschikbare agents — Grok discovery endpoint.
 * Retourneert metadata van alle agents zonder context data.
 */
export const listAgents = query({
  args: {},
  handler: async () => ({
    agentCount: AGENT_REGISTRY.length,
    agents: AGENT_REGISTRY.map(toMeta),
    instructie: "Gebruik de beveiligde HTTP route /ai/agent/{agentId} om context van een agent op te halen. " +
                "Kies de agent die het beste past bij de vraag van de gebruiker.",
  }),
});
