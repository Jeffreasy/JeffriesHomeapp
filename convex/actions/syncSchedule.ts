"use node";

/**
 * convex/actions/syncSchedule.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Convex Action: leest SDB Planning kalender via Google Calendar API
 * en schrijft de diensten naar de Convex schedule tabel.
 *
 * Vervangt GAS syncCalendarToSheet() + pushScheduleToConvex().
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { internalAction, action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { google } from "googleapis";
import { createOAuthClient } from "../lib/googleAuth";


// ─── Config (gespiegeld van GAS CONFIG) ──────────────────────────────────────

const SDB_CALENDAR_ID = "7gml08968kada988va91mu3i2qkci0ts@import.calendar.google.com";
const SYNC_DAYS_BACK    = 30;
const SYNC_DAYS_FORWARD = 90;

const KEYWORDS_INCLUDE = ["dienst", "sdb", "shift"];
const KEYWORDS_EXCLUDE = ["vrij", "vakantie"];

const NL_DAYS = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];

type CalendarEvent = {
  id?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: { date?: string | null; dateTime?: string | null } | null;
  end?: { date?: string | null; dateTime?: string | null } | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function datumStr(d: Date) {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function tijdStr(d: Date | null | undefined, tz = "Europe/Amsterdam") {
  if (!d) return "";
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: tz });
}

function weeknr(d: Date) {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const week = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function duurUren(start: Date, end: Date) {
  return Math.round(((end.getTime() - start.getTime()) / 3600000) * 100) / 100;
}

function getTeam(locatie: string) {
  const l = locatie.toLowerCase();
  if (l.includes("appartementen")) return "R.";
  if (l.includes("aa")) return "A.";
  return "?";
}

function getShiftType(start: Date, isAllDay: boolean) {
  if (isAllDay) return "Dienst";
  const h = start.getHours();
  if (h < 10) return "Vroeg";
  if (h >= 13) return "Laat";
  return "Dienst";
}

function getPrioriteit(shiftType: string) {
  if (shiftType === "Vroeg") return 4;
  if (shiftType === "Laat") return 2;
  return 1;
}

function getStatus(start: Date, end: Date) {
  const now = new Date();
  if (end < now) return "Gedraaid";
  if (start <= now && end > now) return "Bezig";
  return "Opkomend";
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
        calendarId:   SDB_CALENDAR_ID,
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

    // Filter op keywords
    const gefilterd = allEvents.filter((ev) => {
      const titleL = (ev.summary ?? "").toLowerCase();
      const descL  = (ev.description ?? "").toLowerCase();
      const match  = KEYWORDS_INCLUDE.some((k) => titleL.includes(k) || descL.includes(k));
      const excl   = KEYWORDS_EXCLUDE.some((k) => titleL.includes(k));
      return match && !excl;
    });

    // Zet om naar dienst-records
    const diensten = gefilterd.map((ev) => {
      const isAllDay = !!ev.start?.date && !ev.start?.dateTime;
      const startValue = isAllDay ? ev.start?.date : ev.start?.dateTime;
      const endValue = isAllDay ? ev.end?.date : ev.end?.dateTime;
      if (!startValue || !endValue) return null;

      const startDt  = isAllDay
        ? new Date(startValue + "T00:00:00")
        : new Date(startValue);
      const eindDt   = isAllDay
        ? new Date(endValue + "T00:00:00")
        : new Date(endValue);

      const locatie   = ev.location ?? "";
      const shiftType = getShiftType(startDt, isAllDay);

      return {
        userId,
        eventId:     ev.id ?? `${ev.summary}-${datumStr(startDt)}`,
        titel:       ev.summary ?? "(onbekend)",
        startDatum:  datumStr(startDt),
        startTijd:   isAllDay ? "" : tijdStr(startDt),
        eindDatum:   datumStr(eindDt),
        eindTijd:    isAllDay ? "" : tijdStr(eindDt),
        werktijd:    isAllDay ? "Hele Dag" : `${tijdStr(startDt)} - ${tijdStr(eindDt)}`,
        locatie,
        team:        getTeam(locatie),
        shiftType,
        prioriteit:  getPrioriteit(shiftType),
        duur:        isAllDay ? 0 : duurUren(startDt, eindDt),
        weeknr:      weeknr(startDt),
        dag:         NL_DAYS[startDt.getDay()],
        status:      getStatus(startDt, eindDt),
        beschrijving: ev.description ?? "",
        heledag:     isAllDay,
      };
    }).filter((dienst): dienst is NonNullable<typeof dienst> => dienst !== null);

    // Sla op via internalMutation
    const result = await ctx.runMutation(internal.schedule.bulkUpsertFromCalendar, {
      userId,
      diensten,
      importedAt: new Date().toISOString(),
    });

    return { ...result, total: diensten.length };
  },
});

// ─── Publieke action (voor frontend "Sync nu" knop) ──────────────────────────

export const syncNow = action({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, { userId }): Promise<{ upserted: number; deleted: number; total: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Niet ingelogd");
    if (userId && userId !== identity.subject) throw new Error("Unauthorized");
    return ctx.runAction(internal.actions.syncSchedule.syncFromCalendar, { userId: identity.subject });
  },
});
