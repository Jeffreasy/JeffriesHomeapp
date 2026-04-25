/**
 * 🧠 Brain Agent — "De centrale regiekamer"
 *
 * Orchestrator bovenop alle specialistische agents. De specialisten blijven
 * bron van domeincontext; Brain bepaalt welke signalen samen belangrijk zijn.
 */

import type { AgentDefinition } from "../registry";
import { internal } from "../../_generated/api";
import { lampenAgent }      from "./lampen";
import { roosterAgent }     from "./rooster";
import { agendaAgent }      from "./agenda";
import { financeAgent }     from "./finance";
import { emailAgent }       from "./email";
import { automationsAgent } from "./automations";
import { notesAgent }       from "./notes";
import { habitsAgent }      from "./habits";
import { laventecareAgent } from "./laventecare";

function amsterdamDate(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86400000);
  return date.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

function amsterdamLabel(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 86400000);
  return date.toLocaleDateString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export const brainAgent: AgentDefinition = {
  id:           "brain",
  naam:         "Jeffries Brain",
  emoji:        "🧠",
  beschrijving: "Centrale AI-regiekamer voor Jeffrey. Combineert rooster, agenda, lampen, finance, email, notities, habits, LaventeCare en systeemstatus tot één samenhangend beeld. Beslist welke specialistische context en tools nodig zijn, bewaakt risico's, en vertaalt losse signalen naar concrete acties.",
  domein:       [
    "schedule", "personalEvents", "devices", "rooms", "automations",
    "salary", "transactions", "emails", "notes", "habits",
    "habitLogs", "habitBadges", "laventecareLeads", "laventecareProjects",
    "laventecareDocuments", "laventecareSlaIncidents", "syncStatus", "bridgeHealth", "aiPendingActions",
  ],
  capabilities: [
    "Cross-domain dagbeeld en planning maken",
    "Signalen uit rooster, agenda, notities, habits, email en LaventeCare combineren",
    "Open acties, risico's, conflicten en follow-ups prioriteren",
    "Zakelijke leads, projecten, discovery, scope en SLA context meenemen",
    "Specialistische tools kiezen zonder de gebruiker door te verwijzen",
    "Lezen en analyseren over alle domeinen heen",
    "Wijzigingen veilig voorbereiden met server-side bevestiging",
    "Proactieve suggesties doen op basis van live context",
  ],
  tools: [
    {
      naam: "all-read-tools", type: "query",
      beschrijving: "Mag alle lees-tools gebruiken voor planning, finance, email, notes, habits en systeemcontext",
      parameters: [],
    },
    {
      naam: "confirmed-write-tools", type: "mutation",
      beschrijving: "Mag wijzigende tools voorbereiden; risicovolle acties lopen via server-side bevestiging",
      parameters: [],
    },
  ],

  getContext: async (ctx, userId) => {
    const today = amsterdamDate();
    const tomorrow = amsterdamDate(1);
    const time = new Date().toLocaleTimeString("nl-NL", {
      timeZone: "Europe/Amsterdam",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const [
      lampen,
      rooster,
      agenda,
      finance,
      email,
      automations,
      notes,
      habits,
      laventecare,
      syncStatus,
      bridgeHealth,
      pendingActions,
      preferences,
    ] = await Promise.all([
      lampenAgent.getContext(ctx, userId, { lite: true }),
      roosterAgent.getContext(ctx, userId, { lite: true }),
      agendaAgent.getContext(ctx, userId, { lite: true }),
      financeAgent.getContext(ctx, userId, { lite: true }),
      emailAgent.getContext(ctx, userId, { lite: true }),
      automationsAgent.getContext(ctx, userId, { lite: true }),
      notesAgent.getContext(ctx, userId, { lite: true }),
      habitsAgent.getContext(ctx, userId, { lite: true }),
      laventecareAgent.getContext(ctx, userId, { lite: true }),
      ctx.db.query("syncStatus").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("bridgeHealth").withIndex("by_updated").order("desc").take(3),
      ctx.db.query("aiPendingActions").withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "pending")).collect(),
      ctx.runQuery(internal.brainPreferences.getInternal, { userId }),
    ]);

    const activePending = pendingActions
      .filter((action) => action.expiresAt > new Date().toISOString())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map((action) => ({
        code: action.code,
        agentId: action.agentId,
        toolName: action.toolName,
        summary: action.summary,
        expiresAt: action.expiresAt,
      }));

    return {
      identiteit: {
        rol: "centrale_orchestrator",
        gebruiker: "Jeffrey",
        taal: "nl-NL",
        tijdzone: "Europe/Amsterdam",
      },
      voorkeuren: preferences,
      tijd: {
        vandaag: today,
        morgen: tomorrow,
        vandaagLabel: amsterdamLabel(),
        morgenLabel: amsterdamLabel(1),
        klok: time,
      },
      contextModel: {
        doel: "Gebruik dit compacte totaalbeeld om vragen standaard cross-domain te beantwoorden. Gebruik specialistische tools wanneer detail, recente data of exacte IDs nodig zijn.",
        domeinen: {
          rooster,
          agenda,
          finance,
          email,
          lampen,
          automations,
          notities: notes,
          habits,
          laventecare,
        },
      },
      operationeel: {
        syncStatus: syncStatus.map((status) => ({
          source: status.source,
          status: status.status,
          lastSuccessAt: status.lastSuccessAt,
          lastErrorAt: status.lastErrorAt,
          lastError: status.lastError,
        })),
        bridgeHealth: bridgeHealth.map((bridge) => ({
          bridgeId: bridge.bridgeId,
          status: bridge.status,
          lastSeenAt: bridge.lastSeenAt,
          lastError: bridge.lastError,
        })),
      },
      openActies: activePending,
      beslisregels: [
        "Beantwoord algemene vragen vanuit Brain, niet vanuit een losse specialist.",
        "Combineer domeinen wanneer dat nuttig is: rooster + notities + habits + email + lampen + LaventeCare.",
        "Beschouw zakelijke vragen over klanten, leads, discovery, voorstellen, scope en SLA als LaventeCare-context.",
        "Gebruik read-tools voor exacte details buiten de compacte context.",
        "Bereid maximaal één wijzigende actie per beurt voor.",
        "Claim nooit dat een risicovolle wijziging is uitgevoerd voordat de bevestigingsqueue dit teruggeeft.",
        "Vraag alleen om verduidelijking als uitvoering anders onveilig of dubbelzinnig is.",
      ],
    };
  },
};
