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
const SDB_CALENDAR_ID = "7gml08968kada988va91mu3i2qkci0ts@import.calendar.google.com";
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

type CalendarSource = {
  id: string;
  summary: string;
  primary: boolean;
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

type ScheduleDuplicateCheck = {
  startDatum: string;
  startTijd: string;
  eindTijd: string;
  shiftType: string;
  team: string;
  titel: string;
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

function normalizeText(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isShiftLikeTitle(title: string) {
  const normalized = normalizeText(title);
  return /\b(vroeg|laat|dienst)\b/.test(normalized);
}

function isRosterShadowEvent(event: PersonalEventUpsert) {
  const title = normalizeText(event.titel);
  return /^[ar]\s+(vroeg|laat|dienst)$/.test(title);
}

function isScheduleDuplicate(event: PersonalEventUpsert, schedule: ScheduleDuplicateCheck[]) {
  if (event.heledag || !event.startTijd || !event.eindTijd) return false;
  if (!isShiftLikeTitle(event.titel)) return false;

  const title = normalizeText(event.titel);
  return schedule.some((dienst) => {
    const sameSlot =
      dienst.startDatum === event.startDatum &&
      dienst.startTijd === event.startTijd &&
      dienst.eindTijd === event.eindTijd;
    if (!sameSlot) return false;

    const shift = normalizeText(dienst.shiftType);
    const team = normalizeText(dienst.team);
    const teamShift = normalizeText(`${dienst.team} ${dienst.shiftType}`);
    const plainShiftTitles = new Set(["dienst", "vroeg", "laat"]);

    return (
      title === teamShift ||
      title === normalizeText(`${team} ${shift}`) ||
      title === shift ||
      plainShiftTitles.has(title) ||
      (Boolean(team) && title.includes(team) && title.includes(shift))
    );
  });
}

function configuredCalendarIds(): string[] | null {
  const raw = process.env.GOOGLE_PERSONAL_CALENDAR_IDS;
  if (!raw) return null;
  const ids = raw.split(",").map((item) => item.trim()).filter(Boolean);
  return ids.length ? ids : null;
}

function shouldIncludeCalendar(entry: { id?: string | null; summary?: string | null; selected?: boolean | null; deleted?: boolean | null }) {
  const id = entry.id ?? "";
  const summary = (entry.summary ?? "").toLowerCase();
  if (!id || entry.deleted) return false;
  if (id === SDB_CALENDAR_ID || summary.includes("sdb planning")) return false;
  return true;
}

async function getCalendarSources(calendar: ReturnType<typeof google.calendar>): Promise<CalendarSource[]> {
  const configured = configuredCalendarIds();
  if (configured) {
    return configured
      .filter((id) => id !== SDB_CALENDAR_ID)
      .map((id) => ({ id, summary: id === PRIMARY_CALENDAR_ID ? "Main" : id, primary: id === PRIMARY_CALENDAR_ID }));
  }

  const sources: CalendarSource[] = [];
  let pageToken: string | undefined;
  do {
    const res = await calendar.calendarList.list({
      minAccessRole: "reader",
      pageToken,
      maxResults: 250,
    });
    for (const entry of res.data.items ?? []) {
      if (!shouldIncludeCalendar(entry)) continue;
      sources.push({
        id: entry.id ?? PRIMARY_CALENDAR_ID,
        summary: entry.primary ? "Main" : (entry.summary ?? entry.id ?? "Calendar"),
        primary: entry.primary === true || entry.id === PRIMARY_CALENDAR_ID,
      });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  if (!sources.some((source) => source.primary)) {
    sources.unshift({ id: PRIMARY_CALENDAR_ID, summary: "Main", primary: true });
  }

  return sources;
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

    const sources = await getCalendarSources(calendar);

    // Haal alle events op met paginatie per geselecteerde agenda.
    const allEvents: CalendarEvent[] = [];
    const sourceByEvent = new WeakMap<CalendarEvent, CalendarSource>();

    for (const source of sources) {
      let pageToken: string | undefined;
      do {
        const res = await calendar.events.list({
          calendarId:   source.id,
          timeMin:      start.toISOString(),
          timeMax:      end.toISOString(),
          singleEvents: true,
          orderBy:      "startTime",
          maxResults:   250,
          pageToken,
        });
        for (const event of res.data.items ?? []) {
          allEvents.push(event);
          sourceByEvent.set(event, source);
        }
        pageToken = res.data.nextPageToken ?? undefined;
      } while (pageToken);
    }

    // Zet om naar PersonalEvent records
    const afspraken: PersonalEventUpsert[] = [];

    for (const ev of allEvents) {
      if (!ev.start) continue;
      const source = sourceByEvent.get(ev) ?? { id: PRIMARY_CALENDAR_ID, summary: "Main", primary: true };

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
        eventId:      source.primary ? (ev.id ?? `${ev.summary}-${datumStr(startDt)}`) : `${source.id}:${ev.id ?? `${ev.summary}-${datumStr(startDt)}`}`,
        titel:        ev.summary ?? "(Geen titel)",
        startDatum:   datumStr(startDt),
        startTijd:    isAllDay ? undefined : tijdStr(startDt),
        eindDatum:    datumStr(eindDt),
        eindTijd:     isAllDay ? undefined : tijdStr(eindDt),
        locatie:      ev.location ?? undefined,
        beschrijving: ev.description ?? undefined,
        heledag:      isAllDay,
        status:       getStatus(startDt, eindDt),
        kalender:     source.primary ? "Main" : source.summary,
      });
    }

    const schedule = await ctx.runQuery(internal.schedule.listInternal, { userId }) as ScheduleDuplicateCheck[];
    const persoonlijkeAfspraken = afspraken.filter((event) =>
      !isRosterShadowEvent(event) && !isScheduleDuplicate(event, schedule)
    );

    // Sla op via internalMutation inclusief orphan detectie. Gefilterde
    // dienst-dubbels verdwijnen hierbij uit Convex als orphan.
    const result = await ctx.runMutation(internal.personalEvents.bulkUpsertFromCalendar, {
      userId,
      afspraken: persoonlijkeAfspraken,
    });

    return result;
  },
});

export const syncFromCalendarTracked = internalAction({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }): Promise<{ upserted: number; deleted: number; total: number }> => {
    await ctx.runMutation(internal.syncStatus.markRunning, { userId, source: "personal" });
    try {
      const result = await ctx.runAction(internal.actions.syncPersonalEvents.syncFromCalendar, { userId });
      await ctx.runMutation(internal.syncStatus.markSuccess, {
        userId,
        source: "personal",
        result: JSON.stringify(result),
      });
      await ctx.runMutation(internal.auditLogs.recordInternal, {
        userId,
        actor: "system",
        source: "cron.syncPersonalEvents",
        action: "sync",
        entity: "personalEvents",
        status: "success",
        summary: `Persoonlijke agenda sync voltooid (${result.total} items)`,
        metadata: JSON.stringify(result),
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.syncStatus.markFailed, { userId, source: "personal", error: message });
      await ctx.runMutation(internal.auditLogs.recordInternal, {
        userId,
        actor: "system",
        source: "cron.syncPersonalEvents",
        action: "sync",
        entity: "personalEvents",
        status: "failed",
        summary: "Persoonlijke agenda sync mislukt",
        metadata: JSON.stringify({ error: message }),
      });
      throw err;
    }
  },
});

// ─── Publieke action (voor frontend "Sync nu" knop) ──────────────────────────

export const syncPersonalNow = action({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, { userId }): Promise<{ upserted: number; deleted: number; total: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Niet ingelogd");
    if (userId && userId !== identity.subject) throw new Error("Unauthorized");
    const owner = identity.subject;
    await ctx.runMutation(internal.syncStatus.markRunning, { userId: owner, source: "personal" });
    try {
      const result = await ctx.runAction(internal.actions.syncPersonalEvents.syncFromCalendar, { userId: owner });
      await ctx.runMutation(internal.syncStatus.markSuccess, {
        userId: owner,
        source: "personal",
        result: JSON.stringify(result),
      });
      await ctx.runMutation(internal.auditLogs.recordInternal, {
        userId: owner,
        actor: "user",
        source: "settings.sync",
        action: "sync",
        entity: "personalEvents",
        status: "success",
        summary: `Persoonlijke agenda sync voltooid (${result.total} items)`,
        metadata: JSON.stringify(result),
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.syncStatus.markFailed, { userId: owner, source: "personal", error: message });
      await ctx.runMutation(internal.auditLogs.recordInternal, {
        userId: owner,
        actor: "user",
        source: "settings.sync",
        action: "sync",
        entity: "personalEvents",
        status: "failed",
        summary: "Persoonlijke agenda sync mislukt",
        metadata: JSON.stringify({ error: message }),
      });
      throw err;
    }
  },
});
