"use node";

/**
 * convex/actions/deletePersonalEvent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Convex Action: Verwijdert een persoonlijke afspraak uit de Homeapp.
 * Als de afspraak ook in Google Calendar staat (kalender === "Main"), 
 * wordt de api call gedaan om het event ook daar te wissen.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { action } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { v } from "convex/values";
import { google } from "googleapis";
import { createOAuthClient } from "../lib/googleAuth";

export const deleteEvent = action({
  args: {
    userId:  v.string(),
    eventId: v.string(),
  },
  handler: async (ctx, { userId, eventId }): Promise<{ ok: boolean; message: string }> => {
    // 1. Zoek de afspraak lokaal op om te bepalen of hij API actie vereist
    // Omdat een actie geen DB operaties kan doen rechtstreeks, roepen we een kleine internal query aan.
    const eventList = await ctx.runQuery(api.personalEvents.list, { userId });
    const event = eventList.find(e => e.eventId === eventId);
    
    if (!event) {
      return { ok: false, message: "Afspraak lokaal niet gevonden." };
    }

    // 2. Als kalender === "Main" en ID niet lokaal (PendingCreate format is meestal custom),
    // verifieer en communiceer dit naar Google.
    // Sync acties gebruiken de werkelijke Google eventId als het veld eventId, Tenzij hij nog in een andere staat zit.
    if (event.kalender === "Main" && !event.eventId.includes("::pending::")) {
      try {
        const auth     = createOAuthClient();
        const calendar = google.calendar({ version: "v3", auth });

        await calendar.events.delete({
          calendarId: "primary",
          eventId:    event.eventId, // Google's id
        });
        console.log(`✅ Event succesvol verwijderd in Google API: ${event.eventId}`);
      } catch (e: any) {
        console.error("Fout bij remote verwijderen:", e.message);
        // We throwen of gaan door afhankelijk v/d fout, laten we het nu accepteren als het lokaal is 
        // Bijvoorbeeld als hij in Google stiekem vast al weg was: 404 of 410.
        if (!e.message?.includes("404") && !e.message?.includes("410")) {
           throw new Error(`Google Kalender weigerde de wijziging: ${e.message}`);
        }
      }
    }

    // 3. Verwijder lokaal uit Convex DB (werkt ook voor PendingCreate en onafhankelijke events)
    await ctx.runMutation(internal.personalEvents.deleteInternal, { userId, eventId });

    return { ok: true, message: "Afspraak succesvol verwijderd." };
  },
});
