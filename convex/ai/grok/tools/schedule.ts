/**
 * convex/ai/grok/tools/schedule.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Schedule & salary tool handlers — diensten opvragen, salaris berekenen.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { api } from "../../../_generated/api";
import { getWeekNumber, WEEKDAYS, MAAND_NAMEN } from "../types";

export async function handleDienstenOpvragen(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const allSchedule = await ctx.runQuery(api.schedule.list, { userId });
    const active = allSchedule.filter((s: any) => s.status !== "VERWIJDERD");

    let vanDatum: string;
    let totDatum: string;

    if (args.vanDatum && args.totDatum) {
      vanDatum = args.vanDatum as string;
      totDatum = args.totDatum as string;
    } else {
      const maand = args.maand as number;
      const jaar = (args.jaar as number) ?? new Date().getFullYear();
      vanDatum = `${jaar}-${String(maand).padStart(2, "0")}-01`;
      const lastDay = new Date(jaar, maand, 0).getDate();
      totDatum = `${jaar}-${String(maand).padStart(2, "0")}-${lastDay}`;
    }

    const filtered = active
      .filter((s: any) => s.startDatum >= vanDatum && s.startDatum <= totDatum)
      .sort((a: any, b: any) => a.startDatum.localeCompare(b.startDatum));

    const allEvents = await ctx.runQuery(api.personalEvents.list, { userId });

    const weken: Record<string, any[]> = {};
    let totaalUren = 0;
    let weekendDiensten = 0;

    const diensten = filtered.map((s: any) => {
      const d = new Date(s.startDatum + "T00:00:00");
      const dag = WEEKDAYS[d.getDay()];
      const weekNr = getWeekNumber(d);
      const weekKey = `Week ${weekNr}`;
      const uren = s.duur ?? 0;
      totaalUren += uren;
      if (d.getDay() === 0 || d.getDay() === 6) weekendDiensten++;

      const conflict = allEvents.find((e: any) =>
        e.status === "Aankomend" && e.startDatum === s.startDatum
      );

      const entry = {
        datum: s.startDatum, dag, weekNr, type: s.shiftType,
        tijd: `${s.startTijd} - ${s.eindTijd}`, uren,
        locatie: s.locatie, team: s.team,
        conflict: conflict ? { titel: conflict.titel, tijd: conflict.heledag ? "hele dag" : `${conflict.startTijd}-${conflict.eindTijd}` } : null,
      };

      if (!weken[weekKey]) weken[weekKey] = [];
      weken[weekKey].push(entry);
      return entry;
    });

    const verdeling: Record<string, number> = {};
    for (const d of diensten) {
      verdeling[d.type ?? "Onbekend"] = (verdeling[d.type ?? "Onbekend"] ?? 0) + 1;
    }

    const dienstDatums = new Set(filtered.map((s: any) => s.startDatum));
    const vrijeDagen: string[] = [];
    const start = new Date(vanDatum + "T00:00:00");
    const end = new Date(totDatum + "T00:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = new Date(d.getTime()).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
      if (!dienstDatums.has(ds)) vrijeDagen.push(ds);
    }

    const conflicten = diensten.filter((d: any) => d.conflict);
    const maandNr = parseInt(vanDatum.slice(5, 7));
    const jaarNr = parseInt(vanDatum.slice(0, 4));

    return JSON.stringify({
      titel: `${MAAND_NAMEN[maandNr]} ${jaarNr}`,
      periode: `${vanDatum} t/m ${totDatum}`,
      samenvatting: {
        totaalDiensten: diensten.length,
        totaalUren: Math.round(totaalUren * 10) / 10,
        weekendDiensten, vrijeDagen: vrijeDagen.length,
        conflicten: conflicten.length,
      },
      verdeling, perWeek: weken,
      conflicten: conflicten.map((c: any) => ({
        datum: c.datum, dag: c.dag, dienst: c.type,
        afspraak: c.conflict.titel, afspraakTijd: c.conflict.tijd,
      })),
    });
  } catch (err) {
    return JSON.stringify({ error: `Diensten ophalen mislukt: ${(err as Error).message}` });
  }
}

export async function handleSalarisOpvragen(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const maand = args.maand as number;
    const jaar = (args.jaar as number) ?? new Date().getFullYear();
    const periode = `${jaar}-${String(maand).padStart(2, "0")}`;

    const stored = await ctx.runQuery(api.salary.getByPeriode, { userId, periode });
    if (stored) {
      return JSON.stringify({
        bron: "opgeslagen", periode,
        bruto: stored.brutoBetaling, netto: stored.nettoPrognose,
        ort: stored.ortTotaal, basisLoon: stored.basisLoon,
        diensten: stored.aantalDiensten,
      });
    }

    const berekend = await ctx.runQuery(api.salary.computeFromSchedule, { userId });
    const maandData = berekend.find((s: any) => s.periode === periode);
    if (maandData) {
      return JSON.stringify({
        bron: "berekend_uit_rooster", periode,
        bruto: maandData.brutoBetaling, netto: maandData.nettoPrognose,
        ort: maandData.ortTotaal, basisLoon: maandData.basisLoon,
        diensten: maandData.aantalDiensten, ortDetails: maandData.ortDetails,
      });
    }

    return JSON.stringify({ error: `Geen salaris data voor ${periode}` });
  } catch (err) {
    return JSON.stringify({ error: `Salaris ophalen mislukt: ${(err as Error).message}` });
  }
}
