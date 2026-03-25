/**
 * convex/ai/router.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Agent Agency Router — Convex queries voor agent discovery en context.
 *
 * - listAgents: Alle beschikbare agents met capabilities
 * - getAgentContext: Volledige context van één specifieke agent
 * - getBriefing: Cross-domain daily briefing (Dashboard Agent)
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

/**
 * Lijst alle beschikbare agents — Grok discovery endpoint.
 * Retourneert metadata van alle agents zonder context data.
 */
export const listAgents = query({
  args: {},
  handler: async () => ({
    agentCount: AGENT_REGISTRY.length,
    agents: AGENT_REGISTRY.map(toMeta),
    instructie: "Gebruik getAgentContext met een agentId om de volledige context van een agent op te halen. " +
                "Kies de agent die het beste past bij de vraag van de gebruiker.",
  }),
});

/**
 * Haal de volledige context op van één specifieke agent.
 * Dit is de hoofd-query die Grok gebruikt om domein-specifieke data te krijgen.
 */
export const getAgentContext = query({
  args: {
    agentId: v.string(),
    userId:  v.string(),
  },
  handler: async (ctx, { agentId, userId }) => {
    const agent = getAgent(agentId);
    if (!agent) {
      return {
        ok: false,
        error: `Agent "${agentId}" niet gevonden`,
        beschikbareAgents: AGENT_REGISTRY.map((a) => a.id),
      };
    }

    const context = await agent.getContext(ctx, userId);

    return {
      ok: true,
      agent: toMeta(agent),
      context,
    };
  },
});

/**
 * Daily briefing — shortcut voor de Dashboard Agent context.
 * Grok kan deze query gebruiken voor een snel volledig overzicht.
 */
export const getBriefing = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const dashboard = getAgent("dashboard");
    if (!dashboard) return { ok: false, error: "Dashboard agent niet gevonden" };

    const context = await dashboard.getContext(ctx, userId);

    return {
      ok:    true,
      type:  "daily-briefing",
      agent: toMeta(dashboard),
      briefing: context,
    };
  },
});
