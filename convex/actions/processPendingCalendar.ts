"use node";

/**
 * convex/actions/processPendingCalendar.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Convex Action: verwerkt "PendingCreate" persoonlijke afspraken uit Convex
 * en schrijft ze naar Google Calendar via googleapis.
 *
 * Vervangt GAS processPendingEvents() in PersonalCalendar.gs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { internalAction, action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { google } from "googleapis";
import { createOAuthClient } from "../lib/googleAuth";


// ─── Internal action (voor cron en handmatige trigger) ───────────────────────

export const processPending = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<{ aangemaakt: number; gefaald: number }> => {
    // Stap 1: Haal PendingCreate events op uit Convex
    const pending = await ctx.runQuery(
      internal.personalEvents.listPendingInternal,
      { userId }
    );

    if (pending.length === 0) return { aangemaakt: 0, gefaald: 0 };

    // Stap 2: Maak elk event aan in Google Calendar
    const auth     = createOAuthClient();
    const calendar = google.calendar({ version: "v3", auth });
    const primaryCalendarId = "primary"; // laventejeffrey@gmail.com primaire kalender

    let aangemaakt = 0;
    let gefaald    = 0;

    for (const event of pending) {
      try {
        let googleEvent;

        if (event.heledag) {
          // Hele-dag event — eindDatum +1 dag (Google Calendar exclusief)
          const eindDate = new Date(event.eindDatum + "T00:00:00");
          eindDate.setDate(eindDate.getDate() + 1);

          googleEvent = await calendar.events.insert({
            calendarId: primaryCalendarId,
            requestBody: {
              summary:     event.titel,
              description: event.beschrijving ?? "",
              location:    event.locatie     ?? "",
              start: { date: event.startDatum },
              end:   { date: eindDate.toISOString().slice(0, 10) },
            },
          });
        } else {
          // Getimed event
          const startTijd = event.startTijd ?? "09:00";
          const eindTijd  = event.eindTijd  ?? "10:00";

          googleEvent = await calendar.events.insert({
            calendarId: primaryCalendarId,
            requestBody: {
              summary:     event.titel,
              description: event.beschrijving ?? "",
              location:    event.locatie     ?? "",
              start: { dateTime: `${event.startDatum}T${startTijd}:00`, timeZone: "Europe/Amsterdam" },
              end:   { dateTime: `${event.eindDatum}T${eindTijd}:00`,   timeZone: "Europe/Amsterdam" },
            },
          });
        }

        const googleId = googleEvent.data.id ?? "";

        // Stap 3: Status update naar "Aankomend" in Convex
        await ctx.runMutation(internal.personalEvents.updateStatusInternal, {
          userId,
          eventId: event.eventId,
          status:  "Aankomend",
        });

        console.log(`✅ Aangemaakt: "${event.titel}" (${event.startDatum}) → Google ID: ${googleId}`);
        aangemaakt++;
      } catch (err: any) {
        console.error(`❌ Fout bij "${event.titel}": ${err.message}`);
        // Markeer als mislukt zodat GAS het niet opnieuw probeert
        await ctx.runMutation(internal.personalEvents.updateStatusInternal, {
          userId,
          eventId: event.eventId,
          status:  "Fout",
        });
        gefaald++;
      }
    }

    return { aangemaakt, gefaald };
  },
});

// ─── Publieke action (voor frontend "Verwerk" knop) ──────────────────────────

export const processPendingNow = action({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<{ aangemaakt: number; gefaald: number }> => {
    if (!userId) throw new Error("userId is vereist");
    return ctx.runAction(internal.actions.processPendingCalendar.processPending, { userId });
  },
});
