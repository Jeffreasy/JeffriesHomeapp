/**
 * 📊 Dashboard Agent — "De manager die alles overziet"
 *
 * Cross-domain specialist: delegeert naar sub-agents met lite: true
 * om een compact overzicht te bouwen zonder code duplicatie.
 */

import type { AgentDefinition } from "../registry";
import { lampenAgent }      from "./lampen";
import { roosterAgent }     from "./rooster";
import { financeAgent }     from "./finance";
import { emailAgent }       from "./email";
import { automationsAgent } from "./automations";

export const dashboardAgent: AgentDefinition = {
  id:           "dashboard",
  naam:         "Dashboard Agent",
  emoji:        "📊",
  beschrijving: "Cross-domain overzicht specialist. Delegeert naar sub-agents voor " +
                "compacte samenvattingen en bouwt één unified daily briefing.",
  domein:       ["schedule", "personalEvents", "devices", "emails", "salary", "automations"],
  capabilities: [
    "Dagelijkse briefing genereren (cross-domain)",
    "Volgende dienst + type tonen",
    "Ongelezen emails samenvatten",
    "Lamp status overview",
    "Financieel snapshot (maand prognose)",
    "Systeem gezondheid status",
  ],
  tools: [
    {
      naam: "ai.router.getBriefing", type: "query",
      beschrijving: "Volledige daily briefing ophalen",
      endpoint: "GET /ai/briefing",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
      ],
    },
    {
      naam: "ai.router.getAgentContext", type: "query",
      beschrijving: "Context ophalen van een specifieke sub-agent",
      endpoint: "GET /ai/agent/:id",
      parameters: [
        { naam: "agentId", type: "string", beschrijving: "Agent ID", verplicht: true, enum: ["lampen", "rooster", "finance", "email", "automations"] },
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
      ],
    },
  ],

  getContext: async (ctx, userId) => {
    const now = new Date();
    // CET/CEST-aware date formatting
    const cetDate = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
    const cetDay = now.toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam", weekday: "long" });
    const cetTime = now.toLocaleTimeString("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit", hour12: false });

    // ── Inter-agent delegation: lite mode ─────────────────────────────────
    // Elke sub-agent geeft een compacte samenvatting terug.
    const [lampen, rooster, finance, email, automations] = await Promise.all([
      lampenAgent.getContext(ctx, userId, { lite: true }),
      roosterAgent.getContext(ctx, userId, { lite: true }),
      financeAgent.getContext(ctx, userId, { lite: true }),
      emailAgent.getContext(ctx, userId, { lite: true }),
      automationsAgent.getContext(ctx, userId, { lite: true }),
    ]);

    return {
      datum:    cetDate,
      dag:      cetDay,
      tijdstip: cetTime,

      lampen,
      rooster,
      finance,
      email,
      automations,

      instructie: "Dit is een compact overzicht van alle domeinen. " +
                  "Gebruik getAgentContext met het specifieke agentId voor gedetailleerde informatie.",
    };
  },
};
