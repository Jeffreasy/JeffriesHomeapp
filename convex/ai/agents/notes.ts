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
    "Bulk archivering na triage-suggesties (verstreken deadlines, afgevinkte checklists, stale)",
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
    {
      naam: "bulkArchiveerNotities", type: "mutation",
      beschrijving: "Archiveer meerdere notities tegelijk na triage-bevestiging",
      parameters: [
        { naam: "noteIds", type: "array", beschrijving: "Array van notitie IDs", verplicht: true },
      ],
    },
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const data = await ctx.runQuery(internal.notes.listForAgent, { userId });
    const triage = await ctx.runQuery(internal.notes.getTriageCandidates, { userId });

    // ── Proactieve Context: match notities aan vandaag/morgen ──────────
    const now = new Date();
    const today = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
    const tomorrow = new Date(now.getTime() + 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });

    // Cross-domain: diensten + afspraken vandaag/morgen
    const [diensten, events] = await Promise.all([
      ctx.db.query("schedule").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("personalEvents").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ]);

    const relevanteDatums = [today, tomorrow];
    const dienstenNu = diensten.filter((s) => relevanteDatums.includes(s.startDatum) && s.status !== "VERWIJDERD");
    const eventsNu = events.filter((e) => relevanteDatums.includes(e.startDatum) && e.status === "Aankomend");

    // Match notities op: (1) deadline vandaag/morgen, (2) linkedEventId, (3) tag matching
    const eventTitels = [...dienstenNu.map((s) => s.titel?.toLowerCase() ?? ""), ...eventsNu.map((e) => e.titel?.toLowerCase() ?? "")];
    const eventIds = eventsNu.map((e) => e.eventId);
    const werkTags = ["werk", "dienst", "shift", "sdb"];

    const relevanteNotities = data.notities.filter((n) => {
      if (!n) return false;

      // 1. Deadline vandaag/morgen
      if (n.deadline) {
        const dDate = n.deadline.slice(0, 10);
        if (relevanteDatums.includes(dDate)) return true;
      }

      // 2. Direct gekoppeld event
      if (n.linkedEventId && eventIds.includes(n.linkedEventId)) return true;

      // 3. Tag matching: als er een dienst is en notitie heeft werk-gerelateerde tag
      if (dienstenNu.length > 0 && n.tags?.some((t: string) => werkTags.includes(t.toLowerCase()))) return true;

      // 4. Titel overlap: als notitieTitel woorden bevat die matchen met event titels
      if (n.titel && eventTitels.some((et) => et && n.titel!.toLowerCase().includes(et))) return true;

      return false;
    }).slice(0, 5);

    const formatRelevant = (n: typeof data.notities[0]) => ({
      id: n.id,
      titel: n.titel || n.inhoud.slice(0, 40),
      reden: n.deadline && relevanteDatums.includes(n.deadline.slice(0, 10))
        ? "deadline"
        : n.linkedEventId && eventIds.includes(n.linkedEventId)
          ? "gekoppeld-event"
          : "tag-match",
    });

    if (opts?.lite) {
      const deadlineCount = data.notities.filter((n) => n.deadline).length;
      return {
        notities: `${data.totaal} notities (${data.pinned} vastgezet, ${deadlineCount} met deadline)`,
        recenteTitels: data.notities.slice(0, 3).map((n) => n.titel),
        ...(triage.totaal > 0 ? { triageSuggesties: `${triage.totaal} notities klaar voor archivering` } : {}),
        ...(relevanteNotities.length > 0 ? { relevanteNotities: relevanteNotities.map(formatRelevant) } : {}),
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
      ...(relevanteNotities.length > 0 ? { relevanteNotities: relevanteNotities.map(formatRelevant) } : {}),
    };
  },
};
