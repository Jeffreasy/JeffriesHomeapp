/**
 * 📝 Notes Agent — "De persoonlijke notitie-assistent"
 *
 * Beheert persoonlijke notities: maken, zoeken, pinnen, archiveren.
 * Checklist support (- [ ] / - [x] syntax).
 */

import type { AgentDefinition, ContextOptions } from "../registry";
import { internal } from "../../_generated/api";

export const notesAgent: AgentDefinition = {
  id:           "notes",
  naam:         "Notities Agent",
  emoji:        "📝",
  beschrijving: "Persoonlijke notitie-assistent. Maakt, doorzoekt en beheert notities " +
                "met tags, kleuren en checklist support.",
  domein:       ["notes"],
  capabilities: [
    "Notities aanmaken (met optionele tags en checklist syntax)",
    "Full-text zoeken in notities",
    "Notities pinnen/unpinnen",
    "Overzicht van recente + vastgezette notities",
    "Checklist progress tracking",
  ],
  tools: [
    {
      naam: "notitieMaken", type: "mutation",
      beschrijving: "Nieuwe notitie aanmaken",
      parameters: [
        { naam: "inhoud", type: "string", beschrijving: "Tekst van de notitie", verplicht: true },
        { naam: "titel",  type: "string", beschrijving: "Optionele titel", verplicht: false },
        { naam: "tags",   type: "array",  beschrijving: "Optionele tags", verplicht: false },
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
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const data = await ctx.runQuery(internal.notes.listForAgent, { userId });

    if (opts?.lite) {
      return {
        notities: `${data.totaal} notities (${data.pinned} vastgezet)`,
        recenteTitels: data.notities.slice(0, 3).map((n) => n.titel),
      };
    }

    return {
      totaal: data.totaal,
      pinned: data.pinned,
      notities: data.notities,
    };
  },
};
