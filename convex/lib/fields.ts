/**
 * convex/lib/fields.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gedeelde Convex validator definities voor hergebruik in mutations/queries.
 * Voorkomt duplicatie van veld-definities tussen schedule.ts en personalEvents.ts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { v } from "convex/values";

/** Dienst (schedule) veld-validators — gebruikt door bulkImport en bulkUpsertFromCalendar. */
export const dienstFields = {
  userId:       v.string(),
  eventId:      v.string(),
  titel:        v.string(),
  startDatum:   v.string(),     // "YYYY-MM-DD"
  startTijd:    v.string(),     // "HH:MM"
  eindDatum:    v.string(),
  eindTijd:     v.string(),
  werktijd:     v.string(),
  locatie:      v.string(),
  team:         v.string(),
  shiftType:    v.string(),     // "Vroeg" | "Laat" | "Dienst"
  prioriteit:   v.number(),
  duur:         v.number(),     // uren
  weeknr:       v.string(),     // "2026-W13"
  dag:          v.string(),     // "Maandag" .. "Zondag"
  status:       v.string(),     // "Opkomend" | "Bezig" | "Gedraaid" | "VERWIJDERD"
  beschrijving: v.string(),
  heledag:      v.boolean(),
};

/** Personal event veld-validators — gebruikt door bulkUpsert en CRUD mutations. */
export const eventFields = {
  userId:            v.string(),
  eventId:           v.string(),            // "Titel::startISO" — dedup sleutel
  titel:             v.string(),
  startDatum:        v.string(),            // "YYYY-MM-DD"
  startTijd:         v.optional(v.string()), // "HH:MM" — leeg bij hele-dag events
  eindDatum:         v.string(),
  eindTijd:          v.optional(v.string()),
  heledag:           v.boolean(),
  locatie:           v.optional(v.string()),
  beschrijving:      v.optional(v.string()),
  status:            v.string(),            // "Aankomend" | "Voorbij" | "PendingCreate" | "VERWIJDERD"
  kalender:          v.string(),            // "Main"
};
