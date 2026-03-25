import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";

// ─── Shared field definitions ─────────────────────────────────────────────────

const eventFields = {
  userId:            v.string(),
  eventId:           v.string(),
  titel:             v.string(),
  startDatum:        v.string(),
  startTijd:         v.optional(v.string()),
  eindDatum:         v.string(),
  eindTijd:          v.optional(v.string()),
  heledag:           v.boolean(),
  locatie:           v.optional(v.string()),
  beschrijving:      v.optional(v.string()),
  status:            v.string(),
  kalender:          v.string(),
  conflictMetDienst: v.optional(v.string()),
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Alle persoonlijke events voor een user, gesorteerd op startDatum ASC. */
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("personalEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Sorteer: Aankomend ↑ (vroegst eerst), Voorbij ↓ (meest recent eerst), VERWIJDERD onderaan
    const order = { Aankomend: 0, Voorbij: 1, VERWIJDERD: 2 } as Record<string, number>;
    return rows.sort((a, b) => {
      const sA = order[a.status] ?? 1;
      const sB = order[b.status] ?? 1;
      if (sA !== sB) return sA - sB;
      return a.status === "Aankomend"
        ? a.startDatum.localeCompare(b.startDatum)
        : b.startDatum.localeCompare(a.startDatum);
    });
  },
});

/** Alleen aankomende events — voor de NextAppointmentCard. */
export const listUpcoming = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("personalEvents")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "Aankomend")
      )
      .collect()
      .then((rows) =>
        rows.sort((a, b) => a.startDatum.localeCompare(b.startDatum))
      );
  },
});

/** Events op een specifieke datum — voor conflict overlay in het rooster. */
export const listByDate = query({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    return ctx.db
      .query("personalEvents")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("startDatum", date)
      )
      .filter((q) => q.neq(q.field("status"), "VERWIJDERD"))
      .collect();
  },
});

// ─── Internal mutation (aangeroepen vanuit http.ts) ───────────────────────────

/**
 * Upsert strategie: per eventId patch of insert.
 * Historische data (Voorbij) blijft bewaard.
 * VERWIJDERD events worden verwijderd uit de DB.
 */
export const bulkUpsertInternal = internalMutation({
  args: {
    userId:    v.string(),
    afspraken: v.array(v.object(eventFields)),
  },
  handler: async (ctx, { userId, afspraken }) => {
    let count = 0;

    for (const afspraak of afspraken) {
      // Verwijderde events: uit DB verwijderen als ze erin staan
      if (afspraak.status === "VERWIJDERD") {
        const existing = await ctx.db
          .query("personalEvents")
          .withIndex("by_user_eventId", (q) =>
            q.eq("userId", userId).eq("eventId", afspraak.eventId)
          )
          .first();
        if (existing) await ctx.db.delete(existing._id);
        continue;
      }

      const existing = await ctx.db
        .query("personalEvents")
        .withIndex("by_user_eventId", (q) =>
          q.eq("userId", userId).eq("eventId", afspraak.eventId)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, afspraak);
      } else {
        await ctx.db.insert("personalEvents", afspraak);
      }
      count++;
    }

    return { count };
  },
});

/**
 * ─── Orphan Detectie (Sync uit Google Calendar API) ───────────────────────────
 */
export const bulkUpsertFromCalendar = internalMutation({
  args: {
    userId:    v.string(),
    afspraken: v.array(v.object(eventFields)),
  },
  handler: async (ctx, { userId, afspraken }) => {
    let upserted = 0;
    let deleted  = 0;

    const incomingIds = new Set(afspraken.map(a => a.eventId));

    const existing = await ctx.db
      .query("personalEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const now = new Date();
    const scanStart = new Date(now); scanStart.setDate(scanStart.getDate() - 30);
    const scanEnd   = new Date(now); scanEnd.setDate(scanEnd.getDate() + 90);
    const scanStartStr = scanStart.toISOString().slice(0, 10);
    const scanEndStr   = scanEnd.toISOString().slice(0, 10);

    for (const doc of existing) {
      // Check alleen afspraken uit de Google kalender die binnen afzienbare tijd plaatsvonden,
      // die NIET meer inkomstig zijn, NIET pending zijn voor creatie en NIET al verwijderd zijn.
      if (
        doc.kalender === "Main" && 
        doc.startDatum >= scanStartStr &&
        doc.startDatum <= scanEndStr &&
        !incomingIds.has(doc.eventId) &&
        doc.status !== "VERWIJDERD" &&
        doc.status !== "PendingCreate"
      ) {
        await ctx.db.patch(doc._id, { status: "VERWIJDERD" });
        deleted++;
      }
    }

    const existingMap = new Map(existing.map((e) => [e.eventId, e]));
    for (const afspraak of afspraken) {
      const ex = existingMap.get(afspraak.eventId);
      if (ex) {
        await ctx.db.patch(ex._id, afspraak);
      } else {
        await ctx.db.insert("personalEvents", afspraak);
      }
      upserted++;
    }

    return { upserted, deleted, total: upserted };
  },
});

// ─── Afspraak aanmaken vanuit de frontend ─────────────────────────────────────

/**
 * Maakt een nieuwe persoonlijke afspraak aan in Convex.
 * Status = "PendingCreate" — GAS pikt dit op en schrijft naar Google Calendar.
 */
export const create = mutation({
  args: {
    userId:       v.string(),
    titel:        v.string(),
    startDatum:   v.string(),   // "YYYY-MM-DD"
    eindDatum:    v.string(),
    heledag:      v.boolean(),
    startTijd:    v.optional(v.string()),  // "HH:MM"
    eindTijd:     v.optional(v.string()),
    locatie:      v.optional(v.string()),
    beschrijving: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const eventId = `${args.titel}::pending::${Date.now()}`;
    await ctx.db.insert("personalEvents", {
      userId:       args.userId,
      eventId,
      titel:        args.titel,
      startDatum:   args.startDatum,
      eindDatum:    args.eindDatum,
      heledag:      args.heledag,
      startTijd:    args.startTijd,
      eindTijd:     args.eindTijd,
      locatie:      args.locatie,
      beschrijving: args.beschrijving,
      status:       "PendingCreate",
      kalender:     "Main",
    });
    return { ok: true, eventId };
  },
});

// ─── GAS polling: haal PendingCreate events op ───────────────────────────────

/** Geeft alle events terug met status "PendingCreate" voor een user. */
export const listPending = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("personalEvents")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "PendingCreate")
      )
      .collect();
  },
});

/** Interne versie voor Convex Actions. */
export const listPendingInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("personalEvents")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "PendingCreate")
      )
      .collect();
  },
});


// ─── GAS terugkoppeling: status updaten na Google Calendar write ──────────────

/** Publieke status-update (voor GAS via http route). */
export const updateStatus = mutation({
  args: {
    userId:   v.string(),
    eventId:  v.string(),
    status:   v.string(),           // "Aankomend" | "Fout"
    googleId: v.optional(v.string()), // Google Calendar event ID
  },
  handler: async (ctx, { userId, eventId, status, googleId }) => {
    const existing = await ctx.db
      .query("personalEvents")
      .withIndex("by_user_eventId", (q) =>
        q.eq("userId", userId).eq("eventId", eventId)
      )
      .first();
    if (!existing) throw new Error(`Event ${eventId} niet gevonden`);

    const patch: Record<string, string> = { status };
    if (googleId) patch.kalender = "Main"; // bewaar Google ID in kalender-veld als referentie
    await ctx.db.patch(existing._id, patch);
    return { ok: true };
  },
});

/** Interne status-update (voor httpAction). */
export const updateStatusInternal = internalMutation({
  args: {
    userId:  v.string(),
    eventId: v.string(),
    status:  v.string(),
  },
  handler: async (ctx, { userId, eventId, status }) => {
    const existing = await ctx.db
      .query("personalEvents")
      .withIndex("by_user_eventId", (q) =>
        q.eq("userId", userId).eq("eventId", eventId)
      )
      .first();
    if (!existing) return;
    await ctx.db.patch(existing._id, { status });
  },
});

/** Interne delete (na verwijdering uit Google of lokale queues). */
export const deleteInternal = internalMutation({
  args: {
    userId:  v.string(),
    eventId: v.string(),
  },
  handler: async (ctx, { userId, eventId }) => {
    const existing = await ctx.db
      .query("personalEvents")
      .withIndex("by_user_eventId", (q) =>
        q.eq("userId", userId).eq("eventId", eventId)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/** Interne update (na wijziging in Google). */
export const updateDetailsInternal = internalMutation({
  args: {
    userId:  v.string(),
    eventId: v.string(),
    updates: v.object({
      titel:        v.optional(v.string()),
      startDatum:   v.optional(v.string()),
      startTijd:    v.optional(v.string()),
      eindDatum:    v.optional(v.string()),
      eindTijd:     v.optional(v.string()),
      locatie:      v.optional(v.string()),
      beschrijving: v.optional(v.string()),
      heledag:      v.optional(v.boolean()),
    })
  },
  handler: async (ctx, { userId, eventId, updates }) => {
    const existing = await ctx.db
      .query("personalEvents")
      .withIndex("by_user_eventId", (q) =>
        q.eq("userId", userId).eq("eventId", eventId)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, updates);
    }
  },
});
