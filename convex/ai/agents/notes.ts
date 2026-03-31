/**
 * 📝 Notes Agent — "De persoonlijke notitie-assistent"
 *
 * Beheert persoonlijke notities: maken, zoeken, pinnen, bewerken, archiveren.
 * Checklist support (- [ ] / - [x] syntax), deadlines, prioriteit, event koppeling.
 */

import type { AgentDefinition, ContextOptions } from "../registry";
import { internal } from "../../_generated/api";

export const notesAgent: AgentDefinition = {
  id:           "notes",
  naam:         "Notities Agent",
  emoji:        "📝",
  beschrijving: "Persoonlijke notitie-assistent. Maakt, doorzoekt, bewerkt en beheert notities " +
                "met tags, kleuren, checklist support, deadlines, prioriteiten en event-koppelingen.",
  domein:       ["notes"],
  capabilities: [
    "Notities aanmaken (met tags, checklist syntax, deadline, prioriteit)",
    "Full-text zoeken in notities",
    "Notities pinnen/unpinnen",
    "Notities bewerken (inhoud, titel, tags, deadline, prioriteit)",
    "Notities archiveren",
    "Overzicht met filters (recent, pinned, deadline, hoog)",
    "Koppelen aan persoonlijke agenda-afspraken",
    "Checklist progress tracking",
  ],
  tools: [
    {
      naam: "notitieMaken", type: "mutation",
      beschrijving: "Nieuwe notitie aanmaken met optionele deadline/prioriteit/event-link",
      parameters: [
        { naam: "inhoud",        type: "string",  beschrijving: "Tekst van de notitie", verplicht: true },
        { naam: "titel",         type: "string",  beschrijving: "Optionele titel", verplicht: false },
        { naam: "tags",          type: "array",   beschrijving: "Optionele tags", verplicht: false },
        { naam: "deadline",      type: "string",  beschrijving: "ISO deadline", verplicht: false },
        { naam: "linkedEventId", type: "string",  beschrijving: "Event koppeling", verplicht: false },
        { naam: "prioriteit",    type: "string",  beschrijving: "hoog/normaal/laag", verplicht: false },
      ],
    },
    {
      naam: "notitiesZoeken", type: "query",
      beschrijving: "Doorzoek notities op inhoud",
      parameters: [
        { naam: "zoekterm", type: "string", beschrijving: "Zoekterm", verplicht: true },
      ],
    },
    {
      naam: "notitiePinnen", type: "mutation",
      beschrijving: "Pin/unpin notitie",
      parameters: [
        { naam: "noteId", type: "string", beschrijving: "Notitie ID", verplicht: true },
      ],
    },
    {
      naam: "notitieBewerken", type: "mutation",
      beschrijving: "Bewerk bestaande notitie",
      parameters: [
        { naam: "noteId",        type: "string", beschrijving: "Notitie ID", verplicht: true },
        { naam: "inhoud",        type: "string", beschrijving: "Nieuwe inhoud", verplicht: false },
        { naam: "titel",         type: "string", beschrijving: "Nieuwe titel", verplicht: false },
        { naam: "deadline",      type: "string", beschrijving: "Nieuwe deadline", verplicht: false },
        { naam: "prioriteit",    type: "string", beschrijving: "Nieuwe prioriteit", verplicht: false },
        { naam: "linkedEventId", type: "string", beschrijving: "Event koppeling", verplicht: false },
      ],
    },
    {
      naam: "notitieArchiveren", type: "mutation",
      beschrijving: "Archiveer notitie",
      parameters: [
        { naam: "noteId", type: "string", beschrijving: "Notitie ID", verplicht: true },
      ],
    },
    {
      naam: "notitiesOverzicht", type: "query",
      beschrijving: "Overzicht met filter",
      parameters: [
        { naam: "filter", type: "string", beschrijving: "recent/pinned/deadline/hoog", verplicht: false },
      ],
    },
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const data = await ctx.runQuery(internal.notes.listForAgent, { userId });
    const triage = await ctx.runQuery(internal.notes.getTriageCandidates, { userId });

    if (opts?.lite) {
      const deadlineCount = data.notities.filter((n) => n.deadline).length;
      return {
        notities: `${data.totaal} notities (${data.pinned} vastgezet, ${deadlineCount} met deadline)`,
        recenteTitels: data.notities.slice(0, 3).map((n) => n.titel),
        ...(triage.totaal > 0 ? { triageSuggesties: `${triage.totaal} notities klaar voor archivering` } : {}),
      };
    }

    return {
      totaal: data.totaal,
      pinned: data.pinned,
      notities: data.notities,
      ...(triage.totaal > 0 ? {
        triageSuggesties: {
          totaal: triage.totaal,
          verstrekenDeadlines: triage.verstrekenDeadlines,
          afgevinkt: triage.afgevinkt,
          stale: triage.stale,
        },
      } : {}),
    };
  },
};
