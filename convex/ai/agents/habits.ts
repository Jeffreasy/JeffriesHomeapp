/**
 * 🎯 Habits Agent — "De persoonlijke habit coach"
 *
 * Beheert dagelijkse gewoontes, streaks, XP, badges en rapporten.
 * Rooster-aware: past habits aan op basis van dienst-type.
 */

import type { AgentDefinition, ContextOptions } from "../registry";
import { internal } from "../../_generated/api";
import { getLevel } from "../../lib/habitConstants";

export const habitsAgent: AgentDefinition = {
  id:           "habits",
  naam:         "Habits Agent",
  emoji:        "🎯",
  beschrijving: "Habit tracking assistent. Beheert dagelijkse gewoontes, streaks, XP, badges " +
                "en rapporten. Rooster-bewust: past habits aan op dienst-type.",
  domein:       ["habits", "habitLogs", "habitBadges"],
  capabilities: [
    "Habits aanmaken en beheren (positief + negatief)",
    "Dagelijkse completions loggen",
    "Streaks en XP bijhouden",
    "Negatieve habit incidents registreren (streak reset)",
    "Badges en achievements tonen",
    "Wekelijkse rapporten genereren",
    "Rooster-bewuste habit planning",
    "Habit notitie toevoegen",
  ],
  tools: [
    {
      naam: "habitAanmaken", type: "mutation",
      beschrijving: "Nieuwe habit/gewoonte aanmaken",
      parameters: [
        { naam: "naam",          type: "string",  beschrijving: "Naam van de habit",                 verplicht: true  },
        { naam: "emoji",         type: "string",  beschrijving: "Emoji icoon",                       verplicht: true  },
        { naam: "type",          type: "string",  beschrijving: "positief of negatief",              verplicht: true, enum: ["positief", "negatief"] },
        { naam: "frequentie",    type: "string",  beschrijving: "Frequentie",                        verplicht: true, enum: ["dagelijks", "weekdagen", "weekenddagen", "aangepast", "x_per_week", "x_per_maand"] },
        { naam: "moeilijkheid",  type: "string",  beschrijving: "Moeilijkheidsgraad",               verplicht: false, enum: ["makkelijk", "normaal", "moeilijk"] },
        { naam: "beschrijving",  type: "string",  beschrijving: "Optionele beschrijving",           verplicht: false },
        { naam: "roosterFilter", type: "string",  beschrijving: "Rooster-koppeling",                verplicht: false, enum: ["alle", "werkdagen", "vrijeDagen", "vroegeDienst", "lateDienst"] },
      ],
    },
    {
      naam: "habitVoltooien", type: "mutation",
      beschrijving: "Markeer habit als voltooid voor vandaag",
      parameters: [
        { naam: "habitNaam", type: "string", beschrijving: "Naam (of deel van naam) van de habit", verplicht: true },
      ],
    },
    {
      naam: "habitIncident", type: "mutation",
      beschrijving: "Log een negatieve habit incident (streak reset)",
      parameters: [
        { naam: "habitNaam", type: "string", beschrijving: "Naam van de negatieve habit", verplicht: true },
        { naam: "trigger",   type: "string", beschrijving: "Trigger categorie: mentale_overprikkeling|fysieke_vermoeidheid|stress_emotie|vermijdingsgedrag|sociale_druk|anders", verplicht: false },
        { naam: "notitie",   type: "string", beschrijving: "Optionele notitie",          verplicht: false },
      ],
    },
    {
      naam: "habitsOverzicht", type: "query",
      beschrijving: "Toon alle habits met streaks en status",
      parameters: [],
    },
    {
      naam: "habitStreaks", type: "query",
      beschrijving: "Toon streak overzicht van alle habits",
      parameters: [],
    },
    {
      naam: "habitBadges", type: "query",
      beschrijving: "Toon behaalde badges en achievements",
      parameters: [],
    },
    {
      naam: "habitRapport", type: "query",
      beschrijving: "Genereer wekelijks habit rapport",
      parameters: [],
    },
    {
      naam: "habitNotitie", type: "mutation",
      beschrijving: "Voeg notitie toe aan habit log",
      parameters: [
        { naam: "habitNaam", type: "string", beschrijving: "Naam van de habit", verplicht: true },
        { naam: "notitie",   type: "string", beschrijving: "Notitie tekst",    verplicht: true },
      ],
    },
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const data = await ctx.runQuery(internal.habits.listForAgent, { userId });

    if (opts?.lite) {
      const level = getLevel(data.totaalXP);
      const topHabit = data.habits[0];
      return {
        habits: `${data.totaal} actief (${data.vandaagVoltooid} voltooid vandaag)`,
        level: `Level ${level.level} ${level.titel} (${data.totaalXP} XP)`,
        topStreak: topHabit ? `${topHabit.emoji} ${topHabit.naam}: ${topHabit.streak} dagen` : "Nog geen streaks",
        badges: `${data.badgeCount} badges`,
      };
    }

    const level = getLevel(data.totaalXP);

    // Haal recente incidenten op voor correlatie-analyse
    const recentLogs = await ctx.runQuery(internal.habits.getWeeklyReportInternal, { userId });

    return {
      level: {
        nummer: level.level,
        titel: level.titel,
        xp: data.totaalXP,
        volgendLevel: level.nextXP,
        voortgang: Math.round(level.progress * 100) + "%",
      },
      vandaagVoltooid: data.vandaagVoltooid,
      totaal: data.totaal,
      badgeCount: data.badgeCount,
      weekRapport: {
        voltooiingen: recentLogs.completions,
        incidenten: recentLogs.incidents,
        xpVerdiend: recentLogs.xpEarned,
      },
      habits: data.habits,
      instructie: "Analyseer patronen: als incidenten correleren met bepaalde triggers of diensttypen, benoem dit proactief als coach. Stel concrete acties voor.",
    };
  },
};
