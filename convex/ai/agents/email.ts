/**
 * 📧 Email Director — delegeert naar 4 email sub-agents
 *
 * Email Director is een hub die Grok helpt de juiste email specialist te kiezen.
 * Geeft compact overzicht + verwijzingen naar sub-agents.
 */

import type { AgentDefinition, ContextOptions } from "../registry";
import { emailAnalystAgent }  from "./emailAnalyst";
import { emailComposerAgent } from "./emailComposer";
import { emailManagerAgent }  from "./emailManager";
import { emailReaderAgent }   from "./emailReader";

export const emailAgent: AgentDefinition = {
  id:           "email",
  naam:         "Email Director",
  emoji:        "📧",
  beschrijving: "Email hub — routeert naar gespecialiseerde email sub-agents. " +
                "Gebruik voor een snel inbox overzicht, of vraag een specifieke " +
                "sub-agent voor gedetailleerde taken.",
  domein:       ["emails", "emailSyncMeta"],
  capabilities: [
    "Snel inbox overzicht geven",
    "Routeren naar Email Analyst (📊) voor trends en patronen",
    "Routeren naar Email Composer (✍️) voor versturen en reply",
    "Routeren naar Email Manager (🗂️) voor organiseren en opruimen",
    "Routeren naar Email Reader (🔍) voor zoeken en lezen",
  ],
  tools: [
    {
      naam: "ai.router.getAgentContext",
      type: "query",
      beschrijving: "Sub-agent context ophalen",
      endpoint: "GET /ai/agent/:id",
      parameters: [
        { naam: "agentId", type: "string", beschrijving: "Sub-agent ID", verplicht: true, enum: ["email-analyst", "email-composer", "email-manager", "email-reader"] },
        { naam: "userId",  type: "string", beschrijving: "Gebruiker ID", verplicht: true },
      ],
    },
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    // ── Delegation naar sub-agents (lite) ─────────────────────────────────
    const [analyst, composer, manager, reader] = await Promise.all([
      emailAnalystAgent.getContext(ctx, userId, { lite: true }),
      emailComposerAgent.getContext(ctx, userId, { lite: true }),
      emailManagerAgent.getContext(ctx, userId, { lite: true }),
      emailReaderAgent.getContext(ctx, userId, { lite: true }),
    ]);

    if (opts?.lite) {
      return { analyst, manager };
    }

    return {
      overzicht: { analyst, composer, manager, reader },
      subAgents: [
        { id: "email-analyst",  naam: "📊 Email Analyst",  doel: "Trends, patronen, statistieken" },
        { id: "email-composer", naam: "✍️ Email Composer", doel: "Versturen, beantwoorden" },
        { id: "email-manager",  naam: "🗂️ Email Manager",  doel: "Organiseren, triage, opruimen" },
        { id: "email-reader",   naam: "🔍 Email Reader",   doel: "Zoeken, lezen, bijlagen" },
      ],
      instructie: "Gebruik de specifieke sub-agent voor gedetailleerde taken. " +
                  "Bijv. getAgentContext('email-analyst') voor inbox analyse.",
    };
  },
};
