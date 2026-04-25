"use node";

/**
 * convex/actions/updatePersonalEvent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Convex Action: Werkt een persoonlijke afspraak bij in de Homeapp en Google API.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { action, internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { google } from "googleapis";
import { createOAuthClient } from "../lib/googleAuth";

type PersonalEventRef = {
  eventId: string;
  kalender: string;
  titel: string;
};

const updateArgs = {
  userId:       v.string(),
  eventId:      v.string(),
  titel:        v.string(),
  startDatum:   v.string(),
  eindDatum:    v.string(),
  heledag:      v.boolean(),
  startTijd:    v.optional(v.string()),
  eindTijd:     v.optional(v.string()),
  locatie:      v.optional(v.string()),
  beschrijving: v.optional(v.string()),
};

async function requireMatchingUser(ctx: ActionCtx, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Niet ingelogd");
  if (identity.subject !== userId) throw new Error("Unauthorized");
}

async function updateEventCore(ctx: ActionCtx, args: {
  userId: string;
  eventId: string;
  titel: string;
  startDatum: string;
  eindDatum: string;
  heledag: boolean;
  startTijd?: string;
  eindTijd?: string;
  locatie?: string;
  beschrijving?: string;
}): Promise<{ ok: boolean; message: string }> {
  const { userId, eventId, ...updates } = args;

  // 1. Zoek de afspraak lokaal op om te bepalen of hij API actie vereist
  const eventList = await ctx.runQuery(internal.personalEvents.listInternal, { userId }) as PersonalEventRef[];
  const event = eventList.find((item) => item.eventId === eventId);

  if (!event) {
    return { ok: false, message: "Afspraak lokaal niet gevonden." };
  }

  // 2. Als kalender === "Main" patch dan in Google Calendar
  if (event.kalender === "Main" && !event.eventId.includes("::pending::")) {
    try {
      const auth     = createOAuthClient();
      const calendar = google.calendar({ version: "v3", auth });

      let startObj: any;
      let endObj:   any;

      if (updates.heledag) {
        // Hele-dag event: date veld, dateTime expliciet null
        startObj = { date: updates.startDatum, dateTime: null };
        const eindDate = new Date(updates.eindDatum + "T00:00:00");
        eindDate.setDate(eindDate.getDate() + 1);
        endObj = { date: eindDate.toISOString().slice(0, 10), dateTime: null };
      } else {
        // Getimed event: dateTime veld, date expliciet null
        const startT = updates.startTijd?.trim() || "09:00";
        const eindT  = updates.eindTijd?.trim()  || "10:00";
        startObj = { dateTime: `${updates.startDatum}T${startT}:00`, timeZone: "Europe/Amsterdam", date: null };
        endObj   = { dateTime: `${updates.eindDatum}T${eindT}:00`,   timeZone: "Europe/Amsterdam", date: null };
      }

      console.log("📤 Google patch payload:", JSON.stringify({ start: startObj, end: endObj, heledag: updates.heledag }));

      await calendar.events.patch({
        calendarId: "primary",
        eventId:    event.eventId, // Google's id
        requestBody: {
          summary:     updates.titel,
          description: updates.beschrijving ?? "",
          location:    updates.locatie ?? "",
          start:       startObj,
          end:         endObj,
        }
      });
      console.log(`✅ Event succesvol bijgewerkt in Google API: ${event.eventId}`);
    } catch (e: any) {
      console.error("Fout bij remote bewerken:", e.message);
      throw new Error(`Google Kalender weigerde de update: ${e.message}`);
    }
  }

  // 3. Patch lokaal in Convex DB
  await ctx.runMutation(internal.personalEvents.updateDetailsInternal, {
    userId,
    eventId,
    updates
  });

  return { ok: true, message: "Afspraak succesvol bijgewerkt." };
}

export const updateEvent = action({
  args: updateArgs,
  handler: async (ctx, args): Promise<{ ok: boolean; message: string }> => {
    await requireMatchingUser(ctx, args.userId);
    return updateEventCore(ctx, args);
  },
});

export const updateEventInternal = internalAction({
  args: updateArgs,
  handler: async (ctx, args): Promise<{ ok: boolean; message: string }> => {
    return updateEventCore(ctx, args);
  },
});
