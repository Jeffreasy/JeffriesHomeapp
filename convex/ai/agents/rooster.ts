/**
 * 📅 Rooster Agent — "De planning specialist"
 *
 * Expert in werkdiensten, persoonlijke afspraken, en conflictdetectie.
 * Token-safe: beperkt tot 7-dagen planning + 10 komende afspraken.
 */

import type { AgentDefinition, ContextOptions } from "../registry";

export const roosterAgent: AgentDefinition = {
  id:           "rooster",
  naam:         "Rooster Agent",
  emoji:        "📅",
  beschrijving: "Planning en rooster specialist. Kent alle werkdiensten (SDB), " +
                "persoonlijke afspraken, conflicten, en ORT-periodes. Expert in " +
                "dienst-analyse en weekplanning.",
  domein:       ["schedule", "scheduleMeta", "personalEvents"],
  capabilities: [
    "Weekoverzicht met alle diensten tonen",
    "Volgende dienst en type beschrijven",
    "Persoonlijke afspraken met conflicten detecteren",
    "ORT-uren en weekendtoeslag berekenen",
    "Dienst patronen analyseren (vroeg/laat verdeling)",
    "Vrije dagen identificeren",
  ],
  tools: [
    {
      naam: "schedule.list", type: "query",
      beschrijving: "Alle actieve diensten ophalen",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
      ],
    },
    {
      naam: "schedule.listByDate", type: "query",
      beschrijving: "Diensten ophalen voor specifieke datum",
      endpoint: "GET /schedule/today",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "datum", type: "string", beschrijving: "Datum in YYYY-MM-DD formaat", verplicht: true },
      ],
    },
    {
      naam: "personalEvents.create", type: "mutation",
      beschrijving: "Nieuwe persoonlijke afspraak aanmaken",
      methode: "POST",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "titel", type: "string", beschrijving: "Titel van de afspraak", verplicht: true },
        { naam: "startDatum", type: "string", beschrijving: "Start datum YYYY-MM-DD", verplicht: true },
        { naam: "startTijd", type: "string", beschrijving: "Start tijd HH:MM", verplicht: false },
        { naam: "eindDatum", type: "string", beschrijving: "Eind datum YYYY-MM-DD", verplicht: true },
        { naam: "eindTijd", type: "string", beschrijving: "Eind tijd HH:MM", verplicht: false },
        { naam: "heledag", type: "boolean", beschrijving: "Hele dag evenement", verplicht: true },
      ],
    },
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const now   = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekdays = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];

    const [allSchedule, allEvents, syncMeta] = await Promise.all([
      ctx.db.query("schedule").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("personalEvents").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("scheduleMeta").withIndex("by_user", (q) => q.eq("userId", userId)).first(),
    ]);

    const active = allSchedule.filter((s) => s.status !== "VERWIJDERD");
    const komend = active.filter((s) => s.startDatum >= today).sort((a, b) => a.startDatum.localeCompare(b.startDatum));

    // ── Lite mode (voor dashboard) ────────────────────────────────────────
    if (opts?.lite) {
      const dienstVandaag = active.find((s) => s.startDatum === today);
      const conflicten = allEvents.filter((e) => e.status === "Aankomend" && e.conflictMetDienst).length;
      return {
        dienstVandaag: dienstVandaag ? { type: dienstVandaag.shiftType, titel: dienstVandaag.titel } : null,
        komendeDiensten: komend.length,
        conflicten,
        afsprakenAankomend: allEvents.filter((e) => e.status === "Aankomend").length,
      };
    }

    // ── Shift type verdeling ──────────────────────────────────────────────
    const shiftVerdeling: Record<string, number> = {};
    for (const s of active) {
      const type = s.shiftType ?? "Onbekend";
      shiftVerdeling[type] = (shiftVerdeling[type] ?? 0) + 1;
    }

    // ── Komende 7 dagen planning (token-safe) ─────────────────────────────
    const zevenDagen = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() + i * 86400000);
      const datum = d.toISOString().slice(0, 10);
      const dienst = active.find((s) => s.startDatum === datum);
      const events = allEvents
        .filter((e) => e.status === "Aankomend" && e.startDatum === datum)
        .map((e) => ({ titel: e.titel, tijd: e.startTijd, conflict: e.conflictMetDienst }));

      zevenDagen.push({
        datum,
        dag: weekdays[d.getDay()],
        dienst: dienst ? {
          type: dienst.shiftType, titel: dienst.titel,
          start: dienst.startTijd, eind: dienst.eindTijd,
          locatie: dienst.locatie, team: dienst.team, duur: dienst.duur,
        } : null,
        afspraken: events,
        vrij: !dienst,
      });
    }

    // ── Conflicten (max 10) ───────────────────────────────────────────────
    const conflicten = allEvents
      .filter((e) => e.status === "Aankomend" && e.conflictMetDienst)
      .slice(0, 10)
      .map((e) => ({ afspraak: e.titel, datum: e.startDatum, dienstConflict: e.conflictMetDienst }));

    return {
      vandaag: today,
      dag:     weekdays[now.getDay()],
      weekPlanning: zevenDagen,
      statistieken: {
        totaalDiensten:  active.length,
        komendeDiensten: komend.length,
        gedraaid:        active.filter((s) => s.startDatum < today).length,
        shiftVerdeling,
        weekendDiensten: komend.filter((s) => { const d = new Date(s.startDatum + "T00:00:00"); return d.getDay() === 0 || d.getDay() === 6; }).length,
      },
      conflicten,
      persoonlijkeAfspraken: allEvents
        .filter((e) => e.status === "Aankomend" && e.startDatum >= today)
        .sort((a, b) => a.startDatum.localeCompare(b.startDatum))
        .slice(0, 10) // Token limit
        .map((e) => ({ titel: e.titel, datum: e.startDatum, tijd: e.startTijd ?? "Hele dag", locatie: e.locatie, conflict: e.conflictMetDienst })),
      syncInfo: syncMeta ? { laatsteSyncOp: syncMeta.importedAt, bron: syncMeta.fileName, totaalRijen: syncMeta.totalRows } : null,
    };
  },
};
