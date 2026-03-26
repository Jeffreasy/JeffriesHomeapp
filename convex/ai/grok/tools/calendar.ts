/**
 * convex/ai/grok/tools/calendar.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Calendar tool handlers — afspraak maken, verwijderen, opvragen.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { api } from "../../../_generated/api";
import { todayCET } from "../types";

export async function handleAfspraakBewerken(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const zoekterm = (args.zoekterm as string).toLowerCase();
    const allEvents = await ctx.runQuery(api.personalEvents.list, { userId });
    const match = allEvents.find((e: any) =>
      e.status === "Aankomend" && e.titel?.toLowerCase().includes(zoekterm)
    );

    if (!match) {
      return JSON.stringify({ error: `Geen aankomende afspraak gevonden met "${args.zoekterm}"` });
    }

    const result = await ctx.runAction(api.actions.updatePersonalEvent.updateEvent, {
      userId,
      eventId: match.eventId,
      titel: (args.titel as string) ?? match.titel,
      startDatum: (args.startDatum as string) ?? match.startDatum,
      eindDatum: (args.eindDatum as string) ?? match.eindDatum,
      heledag: (args.heledag as boolean) ?? match.heledag,
      startTijd: (args.startTijd as string) ?? match.startTijd,
      eindTijd: (args.eindTijd as string) ?? match.eindTijd,
      locatie: (args.locatie as string) ?? match.locatie,
      beschrijving: (args.beschrijving as string) ?? match.beschrijving,
    });

    if (!result.ok) {
      return JSON.stringify({ error: result.message });
    }

    const wijzigingen: string[] = [];
    if (args.titel) wijzigingen.push(`titel → "${args.titel}"`);
    if (args.startDatum) wijzigingen.push(`datum → ${args.startDatum}`);
    if (args.startTijd) wijzigingen.push(`tijd → ${args.startTijd}`);
    if (args.locatie) wijzigingen.push(`locatie → "${args.locatie}"`);
    if (args.beschrijving) wijzigingen.push("beschrijving bijgewerkt");

    return JSON.stringify({
      ok: true,
      beschrijving: `Afspraak "${match.titel}" bijgewerkt`,
      wijzigingen,
      googleSync: "Automatisch gesynchroniseerd naar Google Calendar",
    });
  } catch (err) {
    return JSON.stringify({ error: `Afspraak bewerken mislukt: ${(err as Error).message}` });
  }
}


export async function handleAfspraakMaken(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const categorie = (args.categorie as string) ?? "overig";
    const rawBeschrijving = (args.beschrijving as string) ?? "";
    const beschrijving = rawBeschrijving
      ? `${rawBeschrijving}\n\n---\n[categorie:${categorie}]`
      : `[categorie:${categorie}]`;

    const result = await ctx.runMutation(api.personalEvents.create, {
      userId,
      titel: args.titel as string,
      startDatum: args.startDatum as string,
      eindDatum: args.eindDatum as string,
      heledag: args.heledag as boolean,
      startTijd: args.startTijd as string | undefined,
      eindTijd: args.eindTijd as string | undefined,
      locatie: args.locatie as string | undefined,
      beschrijving,
    });

    const tijdInfo = args.heledag
      ? "hele dag"
      : `${args.startTijd ?? "?"} - ${args.eindTijd ?? "?"}`;

    return JSON.stringify({
      ok: true,
      beschrijving: `Afspraak "${args.titel}" aangemaakt`,
      details: {
        datum: args.startDatum, tijd: tijdInfo, categorie,
        locatie: args.locatie ?? "Niet opgegeven",
        googleSync: "Wordt automatisch gesynchroniseerd met kleurcodering en herinneringen",
      },
      eventId: result.eventId,
    });
  } catch (err) {
    return JSON.stringify({ error: `Afspraak aanmaken mislukt: ${(err as Error).message}` });
  }
}

export async function handleAfspraakVerwijderen(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const result = await ctx.runMutation(api.personalEvents.remove, {
      userId, zoekterm: args.zoekterm as string,
    });
    if (!result.ok) {
      return JSON.stringify({ error: result.error ?? "Afspraak niet gevonden" });
    }
    return JSON.stringify({
      ok: true, beschrijving: result.beschrijving,
      eventId: result.eventId,
      status: "Wordt automatisch uit Google Calendar verwijderd",
    });
  } catch (err) {
    return JSON.stringify({ error: `Afspraak verwijderen mislukt: ${(err as Error).message}` });
  }
}

export async function handleAfsprakenOpvragen(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const aantalDagen = (args.aantalDagen as number) ?? 30;
    const today = todayCET();
    const endDate = new Date(Date.now() + aantalDagen * 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });

    const allEvents = await ctx.runQuery(api.personalEvents.list, { userId });
    const upcoming = allEvents
      .filter((e: any) => e.status === "Aankomend" && e.startDatum >= today && e.startDatum <= endDate)
      .sort((a: any, b: any) => a.startDatum.localeCompare(b.startDatum));

    const schedule = await ctx.runQuery(api.schedule.list, { userId });
    const weekdays = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

    const afspraken = upcoming.map((e: any) => {
      const d = new Date(e.startDatum + "T00:00:00");
      const dienst = schedule.find((s: any) => s.startDatum === e.startDatum && s.status !== "VERWIJDERD");
      return {
        titel: e.titel, datum: e.startDatum, dag: weekdays[d.getDay()],
        tijd: e.heledag ? "Hele dag" : `${e.startTijd ?? "?"} - ${e.eindTijd ?? "?"}`,
        locatie: e.locatie, beschrijving: e.beschrijving,
        conflict: dienst ? `⚠️ Conflict met ${dienst.shiftType} dienst (${dienst.startTijd}-${dienst.eindTijd})` : null,
      };
    });

    return JSON.stringify({
      periode: `${today} t/m ${endDate}`,
      totaal: afspraken.length,
      metConflict: afspraken.filter((a: any) => a.conflict).length,
      afspraken,
    });
  } catch (err) {
    return JSON.stringify({ error: `Afspraken ophalen mislukt: ${(err as Error).message}` });
  }
}
