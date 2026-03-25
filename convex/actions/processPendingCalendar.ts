"use node";

/**
 * convex/actions/processPendingCalendar.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Convex Action: verwerkt "PendingCreate" en "PendingDelete" persoonlijke
 * afspraken uit Convex en schrijft/verwijdert ze in Google Calendar.
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
  handler: async (ctx, { userId }): Promise<{ aangemaakt: number; gefaald: number; verwijderd: number }> => {
    const pending = await ctx.runQuery(
      internal.personalEvents.listPendingInternal,
      { userId }
    );

    const auth     = createOAuthClient();
    const calendar = google.calendar({ version: "v3", auth });
    const primaryCalendarId = "primary";

    let aangemaakt = 0;
    let gefaald    = 0;

    // ─── Google Calendar kleurcodes per categorie ──────────────────────────
    // colorId: 1=Lavender, 2=Sage, 3=Grape, 4=Flamingo, 5=Banana,
    //          6=Tangerine, 7=Peacock, 8=Graphite, 9=Blueberry, 10=Basil, 11=Tomato
    const CATEGORY_COLORS: Record<string, string> = {
      sociaal:    "7",  // Peacock (teal)
      werk:       "9",  // Blueberry
      gezondheid: "11", // Tomato (rood = belangrijk)
      sport:      "10", // Basil (groen)
      admin:      "8",  // Graphite
      studie:     "1",  // Lavender
      onderhoud:  "6",  // Tangerine
      evenement:  "4",  // Flamingo
      overig:     "5",  // Banana
    };

    // ─── PendingCreate verwerken ─────────────────────────────────────────────
    for (const event of pending) {
      try {
        // Parse categorie uit beschrijving tag [categorie:xxx]
        const catMatch = event.beschrijving?.match(/\[categorie:(\w+)\]/);
        const categorie = catMatch?.[1] ?? "overig";
        const colorId = CATEGORY_COLORS[categorie] ?? "5";

        // Strip de categorie-tag uit beschrijving voor schone Google Calendar weergave
        const cleanBeschrijving = (event.beschrijving ?? "")
          .replace(/\n*---\n*\[categorie:\w+\]/g, "")
          .replace(/^\[categorie:\w+\]$/g, "")
          .trim();

        let googleEvent;

        if (event.heledag) {
          const eindDate = new Date(event.eindDatum + "T00:00:00");
          eindDate.setDate(eindDate.getDate() + 1);

          googleEvent = await calendar.events.insert({
            calendarId: primaryCalendarId,
            requestBody: {
              summary:     event.titel,
              description: cleanBeschrijving,
              location:    event.locatie ?? "",
              colorId,
              start: { date: event.startDatum },
              end:   { date: eindDate.toISOString().slice(0, 10) },
              reminders: {
                useDefault: false,
                overrides: [
                  { method: "popup", minutes: 1440 },  // 1 dag van tevoren
                ],
              },
            },
          });
        } else {
          const startTijd = event.startTijd ?? "09:00";
          const eindTijd  = event.eindTijd  ?? "10:00";

          googleEvent = await calendar.events.insert({
            calendarId: primaryCalendarId,
            requestBody: {
              summary:     event.titel,
              description: cleanBeschrijving,
              location:    event.locatie ?? "",
              colorId,
              start: { dateTime: `${event.startDatum}T${startTijd}:00`, timeZone: "Europe/Amsterdam" },
              end:   { dateTime: `${event.eindDatum}T${eindTijd}:00`,   timeZone: "Europe/Amsterdam" },
              reminders: {
                useDefault: false,
                overrides: [
                  { method: "popup", minutes: 30 },    // 30 min voor de afspraak
                  { method: "popup", minutes: 1440 },  // 1 dag van tevoren
                ],
              },
            },
          });
        }

        const googleId = googleEvent.data.id ?? "";

        await ctx.runMutation(internal.personalEvents.updateStatusInternal, {
          userId,
          eventId: event.eventId,
          status:  "Aankomend",
        });

        console.log(`✅ Aangemaakt: "${event.titel}" (${event.startDatum}) → Google ID: ${googleId}`);
        aangemaakt++;
      } catch (err: any) {
        console.error(`❌ Fout bij "${event.titel}": ${err.message}`);
        await ctx.runMutation(internal.personalEvents.updateStatusInternal, {
          userId,
          eventId: event.eventId,
          status:  "Fout",
        });
        gefaald++;
      }
    }

    // ─── PendingDelete verwerken ─────────────────────────────────────────────
    const pendingDeletes = await ctx.runQuery(
      internal.personalEvents.listPendingDeleteInternal,
      { userId }
    );

    let verwijderd = 0;

    for (const event of pendingDeletes) {
      try {
        // Zoek het Google Calendar event op basis van titel + datum
        const listResult = await calendar.events.list({
          calendarId: primaryCalendarId,
          q:          event.titel,
          timeMin:    `${event.startDatum}T00:00:00Z`,
          timeMax:    `${event.startDatum}T23:59:59Z`,
          singleEvents: true,
          maxResults: 5,
        });

        const googleEvents = listResult.data.items ?? [];
        const match = googleEvents.find(
          (ge) => ge.summary?.toLowerCase() === event.titel.toLowerCase()
        );

        if (match?.id) {
          await calendar.events.delete({
            calendarId: primaryCalendarId,
            eventId:    match.id,
          });
          console.log(`🗑️ Verwijderd uit Google Calendar: "${event.titel}" (${event.startDatum})`);
        } else {
          console.log(`⚠️ Niet gevonden in Google Calendar: "${event.titel}" — alleen uit Convex verwijderd`);
        }

        // Verwijder uit Convex DB
        await ctx.runMutation(internal.personalEvents.deleteInternal, {
          userId,
          eventId: event.eventId,
        });
        verwijderd++;
      } catch (err: any) {
        console.error(`❌ Fout bij verwijderen "${event.titel}": ${err.message}`);
        // Bij fout toch uit DB verwijderen
        await ctx.runMutation(internal.personalEvents.deleteInternal, {
          userId,
          eventId: event.eventId,
        });
        verwijderd++;
      }
    }

    return { aangemaakt, gefaald, verwijderd };
  },
});

// ─── Publieke action (voor frontend "Verwerk" knop) ──────────────────────────

export const processPendingNow = action({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<{ aangemaakt: number; gefaald: number; verwijderd: number }> => {
    if (!userId) throw new Error("userId is vereist");
    return ctx.runAction(internal.actions.processPendingCalendar.processPending, { userId });
  },
});
