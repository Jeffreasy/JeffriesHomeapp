/**
 * convex/ai/grok/tools/calendar.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Calendar tool handlers — afspraak maken, verwijderen, opvragen.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { internal } from "../../../_generated/api";
import { todayCET } from "../types";

/** Corrigeert Google's +1 dag quirk voor hele-dag events. */
function displayEndDate(e: any): string {
  if (!e.heledag) return e.eindDatum || e.startDatum;
  const raw = e.eindDatum;
  if (!raw || raw.length < 10) return e.startDatum;
  const d = new Date(raw + "T12:00:00");
  if (isNaN(d.getTime())) return e.startDatum;
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function dateCET(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86400000)
    .toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

function normalizeText(value?: string): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isScheduleDuplicateEvent(event: any, schedule: any[]): boolean {
  const title = normalizeText(event.titel);
  if (/^[ar]\s+(vroeg|laat|dienst)$/.test(title)) return true;
  if (event.heledag || !event.startTijd || !event.eindTijd) return false;
  if (!/\b(vroeg|laat|dienst)\b/.test(title)) return false;

  return schedule.some((dienst: any) => {
    const sameSlot =
      dienst.status !== "VERWIJDERD" &&
      dienst.startDatum === event.startDatum &&
      dienst.startTijd === event.startTijd &&
      dienst.eindTijd === event.eindTijd;
    if (!sameSlot) return false;

    const shift = normalizeText(dienst.shiftType);
    const team = normalizeText(dienst.team);
    const teamShift = normalizeText(`${dienst.team} ${dienst.shiftType}`);
    return (
      title === teamShift ||
      title === normalizeText(`${team} ${shift}`) ||
      title === shift ||
      ["dienst", "vroeg", "laat"].includes(title) ||
      (Boolean(team) && title.includes(team) && title.includes(shift))
    );
  });
}

export async function handleAfspraakBewerken(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const eventId = args.eventId as string | undefined;
    const zoekterm = (args.zoekterm as string | undefined)?.toLowerCase();
    const allEvents = await ctx.runQuery(internal.personalEvents.listInternal, { userId });

    if (!eventId) {
      if (!zoekterm) {
        return JSON.stringify({ error: "eventId is verplicht. Gebruik eerst afsprakenOpvragen om de exacte afspraak te kiezen." });
      }
      const options = allEvents
        .filter((e: any) => e.status === "Aankomend" && e.titel?.toLowerCase().includes(zoekterm))
        .slice(0, 10)
        .map((e: any) => ({
          eventId: e.eventId,
          titel: e.titel,
          datum: e.startDatum,
          tijd: e.heledag ? "hele dag" : `${e.startTijd}-${e.eindTijd}`,
        }));
      return JSON.stringify({
        error: "Exacte eventId vereist voordat ik een afspraak wijzig.",
        opties: options,
        hint: "Vraag de gebruiker welke afspraak bedoeld wordt en roep daarna afspraakBewerken aan met eventId.",
      });
    }

    const matches = allEvents.filter((e: any) =>
      e.status === "Aankomend" && e.eventId === eventId
    );

    if (matches.length === 0) {
      return JSON.stringify({ error: `Geen aankomende afspraak gevonden met eventId "${eventId}"` });
    }

    // Meerdere matches? Geef lijst terug zodat Grok kan disambigueren
    if (matches.length > 1) {
      return JSON.stringify({
        error: `Meerdere afspraken gevonden met "${args.zoekterm}"`,
        opties: matches.map((e: any) => ({
          titel: e.titel, datum: e.startDatum,
          tijd: e.heledag ? "hele dag" : `${e.startTijd}-${e.eindTijd}`,
        })),
        hint: "Vraag de gebruiker welke bedoeld wordt en gebruik een specifiekere zoekterm.",
      });
    }

    const match = matches[0];

    const result = await ctx.runAction(internal.actions.updatePersonalEvent.updateEventInternal, {
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
      ? `${rawBeschrijving} [categorie:${categorie}]`
      : `[categorie:${categorie}]`;

    const result = await ctx.runMutation(internal.personalEvents.createInternal, {
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
    const eventId = args.eventId as string | undefined;
    const zoekterm = (args.zoekterm as string | undefined)?.toLowerCase();
    const allEvents = await ctx.runQuery(internal.personalEvents.listInternal, { userId });

    if (!eventId) {
      if (!zoekterm) {
        return JSON.stringify({ error: "eventId is verplicht. Gebruik eerst afsprakenOpvragen om de exacte afspraak te kiezen." });
      }
      const options = allEvents
        .filter((e: any) =>
          e.status !== "VERWIJDERD" &&
          e.status !== "Voorbij" &&
          e.titel?.toLowerCase().includes(zoekterm)
        )
        .slice(0, 10)
        .map((e: any) => ({
          eventId: e.eventId,
          titel: e.titel,
          datum: e.startDatum,
          tijd: e.heledag ? "hele dag" : `${e.startTijd}-${e.eindTijd}`,
        }));
      return JSON.stringify({
        error: "Exacte eventId vereist voordat ik een afspraak verwijder.",
        opties: options,
        hint: "Vraag de gebruiker welke afspraak bedoeld wordt en roep daarna afspraakVerwijderen aan met eventId.",
      });
    }

    const matches = allEvents.filter((e: any) =>
      e.status !== "VERWIJDERD" && e.status !== "Voorbij" &&
      e.eventId === eventId
    );

    if (matches.length === 0) {
      return JSON.stringify({ error: `Geen aankomende afspraak gevonden met eventId "${eventId}"` });
    }

    if (matches.length > 1) {
      return JSON.stringify({
        error: `Meerdere afspraken gevonden met "${args.zoekterm}"`,
        opties: matches.map((e: any) => ({
          titel: e.titel, datum: e.startDatum,
          tijd: e.heledag ? "hele dag" : `${e.startTijd}-${e.eindTijd}`,
        })),
        hint: "Vraag de gebruiker welke bedoeld wordt en gebruik een specifiekere zoekterm.",
      });
    }

    const match = matches[0];

    // Instant dual-write: verwijder uit Google Calendar + Convex DB in één stap
    const result = await ctx.runAction(internal.actions.deletePersonalEvent.deleteEventInternal, {
      userId, eventId: match.eventId,
    });

    if (!result.ok) {
      return JSON.stringify({ error: result.message ?? "Verwijderen mislukt" });
    }

    return JSON.stringify({
      ok: true,
      beschrijving: `"${match.titel}" verwijderd uit Google Calendar`,
      eventId: match.eventId,
      status: "Direct verwijderd uit Google Calendar en lokale database",
    });
  } catch (err) {
    return JSON.stringify({ error: `Afspraak verwijderen mislukt: ${(err as Error).message}` });
  }
}

export async function handleAfsprakenOpvragen(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const zoekterm = (args.zoekterm as string | undefined)?.trim().toLowerCase();
    const includeHistorie = Boolean(args.includeHistorie) || Boolean(zoekterm);
    const aantalDagen = (args.aantalDagen as number | undefined) ?? (zoekterm ? 365 : 30);
    const terugDagen = (args.terugDagen as number | undefined) ?? (includeHistorie ? 365 : 0);
    const status = args.status as string | undefined;
    const today = todayCET();
    const startDate = dateCET(-Math.max(0, terugDagen));
    const endDate = dateCET(Math.max(0, aantalDagen));

    const [allEvents, schedule] = await Promise.all([
      ctx.runQuery(internal.personalEvents.listInternal, { userId }),
      ctx.runQuery(internal.schedule.listInternal, { userId }),
    ]);
    const matching = allEvents
      .filter((e: any) => {
        if (e.status === "VERWIJDERD") return false;
        if (isScheduleDuplicateEvent(e, schedule)) return false;
        if (!includeHistorie && e.status === "Voorbij") return false;
        if (status && e.status !== status) return false;

        const eventEnd = displayEndDate(e);
        const inRange = eventEnd >= startDate && e.startDatum <= endDate;
        if (!inRange) return false;

        if (!zoekterm) return true;
        const haystack = [
          e.titel,
          e.locatie,
          e.beschrijving,
          e.status,
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(zoekterm);
      })
      .sort((a: any, b: any) => {
        const byDate = a.startDatum.localeCompare(b.startDatum);
        if (byDate !== 0) return zoekterm ? -byDate : byDate;
        return (a.startTijd ?? "00:00").localeCompare(b.startTijd ?? "00:00");
      });

    const weekdays = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

    const afspraken = matching.map((e: any) => {
      const d = new Date(e.startDatum + "T00:00:00");
      const dienst = schedule.find((s: any) => s.startDatum === e.startDatum && s.status !== "VERWIJDERD");
      const endDatum = displayEndDate(e);
      return {
        eventId: e.eventId,
        titel: e.titel, datum: e.startDatum, dag: weekdays[d.getDay()],
        eindDatum: e.startDatum !== endDatum ? endDatum : undefined,
        tijd: e.heledag ? "Hele dag" : `${e.startTijd ?? "?"} - ${e.eindTijd ?? "?"}`,
        locatie: e.locatie, beschrijving: e.beschrijving, status: e.status,
        conflict: dienst ? `⚠️ Conflict met ${dienst.shiftType} dienst (${dienst.startTijd}-${dienst.eindTijd})` : null,
      };
    });

    return JSON.stringify({
      periode: `${startDate} t/m ${endDate}`,
      vandaag: today,
      zoekterm: zoekterm ?? null,
      includeHistorie,
      totaal: afspraken.length,
      aankomend: afspraken.filter((a: any) => a.status === "Aankomend").length,
      voorbij: afspraken.filter((a: any) => a.status === "Voorbij").length,
      metConflict: afspraken.filter((a: any) => a.conflict).length,
      afspraken,
    });
  } catch (err) {
    return JSON.stringify({ error: `Afspraken ophalen mislukt: ${(err as Error).message}` });
  }
}
