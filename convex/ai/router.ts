/**
 * convex/ai/router.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Agent Agency Router — Convex queries voor agent discovery en context.
 *
 * - listAgents: Alle beschikbare agents met capabilities
 * - internalGetAgentContext: Volledige context van één specifieke agent
 * - internalGetBriefing: Cross-domain daily briefing (Brain Agent)
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
    const brain = getAgent("brain");
    if (!brain) return { ok: false as const, error: "Brain agent niet gevonden" };

    const context = await brain.getContext(ctx, userId);

    return {
      ok:    true as const,
      type:  "daily-briefing",
      agent: toMeta(brain),
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
    instructie: "Gebruik standaard de brain agent voor vrije vragen. Gebruik specialist-agents alleen voor expliciete domeinroutes of diepe context.",
  }),
});
