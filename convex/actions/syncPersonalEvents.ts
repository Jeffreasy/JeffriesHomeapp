"use node";

/**
 * convex/actions/syncPersonalEvents.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Convex Action: leest de "primary" kalender via Google Calendar API
 * en schrijft de afspraken naar de Convex personalEvents tabel.
 *
 * Implementeert de broodnodige "down-sync" inclusief verwijdering van wees-afspraken.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { internalAction, action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { google } from "googleapis";
import { createOAuthClient } from "../lib/googleAuth";

// ─── Config ──────────────────────────────────────────────────────────────────

const PRIMARY_CALENDAR_ID = "primary";
const SYNC_DAYS_BACK    = 30;
const SYNC_DAYS_FORWARD = 90;

type CalendarEvent = {
  id?: string | null;
  summary?: string | null;
  start?: { date?: string | null; dateTime?: string | null } | null;
  end?: { date?: string | null; dateTime?: string | null } | null;
  location?: string | null;
  description?: string | null;
};

type PersonalEventUpsert = {
  userId: string;
  eventId: string;
  titel: string;
  startDatum: string;
  startTijd?: string;
  eindDatum: string;
  eindTijd?: string;
  locatie?: string;
  beschrijving?: string;
  heledag: boolean;
  status: string;
  kalender: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function datumStr(d: Date) {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function tijdStr(d: Date | null | undefined, tz = "Europe/Amsterdam") {
  if (!d) return "";
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: tz });
}

function getStatus(start: Date, end: Date) {
  const now = new Date();
  if (end < now) return "Voorbij"; // past events
  return "Aankomend";
}

// ─── Sync action (internal — voor cron) ──────────────────────────────────────

export const syncFromCalendar = internalAction({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }): Promise<{ upserted: number; deleted: number; total: number }> => {
    const auth     = createOAuthClient();
    const calendar = google.calendar({ version: "v3", auth });

    // Scan window
    const now   = new Date();
    const start = new Date(now); start.setDate(start.getDate() - SYNC_DAYS_BACK);
    const end   = new Date(now); end.setDate(end.getDate() + SYNC_DAYS_FORWARD);

    // Haal alle events op met paginatie
    const allEvents: CalendarEvent[] = [];
    let pageToken: string | undefined;

    do {
      const res = await calendar.events.list({
        calendarId:   PRIMARY_CALENDAR_ID,
        timeMin:      start.toISOString(),
        timeMax:      end.toISOString(),
        singleEvents: true,
        orderBy:      "startTime",
        maxResults:   250,
        pageToken,
      });
      allEvents.push(...(res.data.items ?? []));
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    // Zet om naar PersonalEvent records
    const afspraken: PersonalEventUpsert[] = [];

    for (const ev of allEvents) {
      if (!ev.start) continue;

      const isAllDay = !!ev.start?.date && !ev.start?.dateTime;
      const startValue = isAllDay ? ev.start.date : ev.start.dateTime;
      const endValue = isAllDay ? ev.end?.date : ev.end?.dateTime;
      if (!startValue || !endValue) continue;

      const startDt  = isAllDay
        ? new Date(startValue + "T00:00:00")
        : new Date(startValue);
      const eindDt   = isAllDay
        ? new Date(endValue + "T00:00:00")
        : new Date(endValue);

      afspraken.push({
        userId,
        eventId:      ev.id ?? `${ev.summary}-${datumStr(startDt)}`,
        titel:        ev.summary ?? "(Geen titel)",
        startDatum:   datumStr(startDt),
        startTijd:    isAllDay ? undefined : tijdStr(startDt),
        eindDatum:    datumStr(eindDt),
        eindTijd:     isAllDay ? undefined : tijdStr(eindDt),
        locatie:      ev.location ?? undefined,
        beschrijving: ev.description ?? undefined,
        heledag:      isAllDay,
        status:       getStatus(startDt, eindDt),
        kalender:     "Main", // identifier om aan te geven dat deze uit de API is getrokken
      });
    }

    // Sla op via internalMutation inclusief orphan detectie
    const result = await ctx.runMutation(internal.personalEvents.bulkUpsertFromCalendar, {
      userId,
      afspraken,
    });

    return result;
  },
});

// ─── Publieke action (voor frontend "Sync nu" knop) ──────────────────────────

export const syncPersonalNow = action({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, { userId }): Promise<{ upserted: number; deleted: number; total: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Niet ingelogd");
    if (userId && userId !== identity.subject) throw new Error("Unauthorized");
    return ctx.runAction(internal.actions.syncPersonalEvents.syncFromCalendar, { userId: identity.subject });
  },
});
