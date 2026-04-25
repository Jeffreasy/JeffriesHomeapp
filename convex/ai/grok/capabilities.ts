import { query } from "../../_generated/server";
import { AGENT_REGISTRY } from "../registry";
import { listToolPolicies } from "./tools/policy";

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const policies = listToolPolicies();
    return {
      agents: AGENT_REGISTRY.map((agent) => {
        const tools = policies.filter((policy) => policy.agents.includes(agent.id));
        return {
          id: agent.id,
          naam: agent.naam,
          emoji: agent.emoji,
          tools: tools.length,
          mutatingTools: tools.filter((tool) => tool.mutates).length,
          confirmationTools: tools.filter((tool) => tool.requiresConfirmation).length,
        };
      }),
      tools: policies,
    };
  },
});
