import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { eventFields } from "./lib/fields";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireAuth(ctx: { auth: { getUserIdentity: () => Promise<any> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Niet ingelogd");
  return identity.subject as string; // Clerk user ID
}

/** Alle persoonlijke events voor een user. Filtert VERWIJDERD server-side. */
export const list = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = args.userId || await requireAuth(ctx);
    const rows = await ctx.db
      .query("personalEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const order = { Aankomend: 0, PendingCreate: 0, Voorbij: 1 } as Record<string, number>;
    return rows
      .filter((r) => r.status !== "VERWIJDERD")
      .sort((a, b) => {
        const sA = order[a.status] ?? 1;
        const sB = order[b.status] ?? 1;
        if (sA !== sB) return sA - sB;
        return a.status === "Aankomend" || a.status === "PendingCreate"
          ? a.startDatum.localeCompare(b.startDatum)
          : b.startDatum.localeCompare(a.startDatum);
      });
  },
});

/** Alleen aankomende events — voor dashboard en widgets. */
export const listUpcoming = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = args.userId || await requireAuth(ctx);
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
  args: { userId: v.optional(v.string()), date: v.string() },
  handler: async (ctx, args) => {
    const userId = args.userId || await requireAuth(ctx);
    return ctx.db
      .query("personalEvents")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("startDatum", args.date)
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

    // Pending-dedup: prevent duplicate inserts when a promoted Google event
    // arrives via sync while a pending version (::pending::) still exists locally.
    // Key = "titel::startDatum" → the pending record to replace.
    const pendingMap = new Map(
      existing
        .filter(e => e.eventId.includes("::pending::") && e.status !== "VERWIJDERD")
        .map(e => [`${e.titel}::${e.startDatum}`, e])
    );

    for (const afspraak of afspraken) {
      const ex = existingMap.get(afspraak.eventId);
      if (ex) {
        // Known event → patch in place
        await ctx.db.patch(ex._id, afspraak);
      } else {
        // Unknown eventId — check if this is a promoted version of a pending event
        const pendingKey = `${afspraak.titel}::${afspraak.startDatum}`;
        const pendingMatch = pendingMap.get(pendingKey);
        if (pendingMatch) {
          // Promote: replace the pending record with the real Google event data
          await ctx.db.patch(pendingMatch._id, afspraak);
          pendingMap.delete(pendingKey); // prevent double-match
        } else {
          await ctx.db.insert("personalEvents", afspraak);
        }
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
    userId:       v.optional(v.string()),
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
    const userId = args.userId || await requireAuth(ctx);
    const eventId = `${args.titel}::pending::${Date.now()}`;
    await ctx.db.insert("personalEvents", {
      userId,
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

/**
 * Verwijder een afspraak op basis van eventId of titel (zoekterm).
 * ⚠️ LEGACY: Niet meer actief gebruikt. De primaire delete flow is nu
 * deletePersonalEvent.deleteEvent (instant dual-write).
 * Deze mutation wordt bewaard als safety net voor eventuele oude PendingDelete records.
 */
export const remove = mutation({
  args: {
    userId:   v.optional(v.string()),
    eventId:  v.optional(v.string()),
    zoekterm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = args.userId || await requireAuth(ctx);
    let target;

    if (args.eventId) {
      target = await ctx.db
        .query("personalEvents")
        .withIndex("by_user_eventId", (q) =>
          q.eq("userId", userId).eq("eventId", args.eventId!)
        )
        .first();
    } else if (args.zoekterm) {
      const lower = args.zoekterm.toLowerCase();
      const all = await ctx.db
        .query("personalEvents")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      target = all.find(
        (e) =>
          e.status !== "VERWIJDERD" &&
          e.status !== "Voorbij" &&
          e.titel.toLowerCase().includes(lower)
      );
    }

    if (!target) return { ok: false, error: "Afspraak niet gevonden" };

    if (target.status === "PendingCreate") {
      await ctx.db.delete(target._id);
      return { ok: true, beschrijving: `"${target.titel}" verwijderd (was nog niet in Google Calendar)` };
    }

    await ctx.db.patch(target._id, { status: "PendingDelete" });
    return {
      ok: true,
      beschrijving: `"${target.titel}" wordt verwijderd uit Google Calendar`,
      eventId: target.eventId,
    };
  },
});

/** PendingCreate events ophalen — voor processPendingCalendar action. */
export const listPendingInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) =>
    ctx.db
      .query("personalEvents")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "PendingCreate")
      )
      .collect(),
});

/** PendingDelete events ophalen — voor processPendingCalendar delete action. */
export const listPendingDeleteInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) =>
    ctx.db
      .query("personalEvents")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "PendingDelete")
      )
      .collect(),
});

/** Promote pending event naar Google Calendar ID — na succesvolle insert. */
export const promoteToGoogleInternal = internalMutation({
  args: {
    userId:      v.string(),
    oldEventId:  v.string(),
    googleId:    v.string(),
  },
  handler: async (ctx, { userId, oldEventId, googleId }) => {
    const existing = await ctx.db
      .query("personalEvents")
      .withIndex("by_user_eventId", (q) =>
        q.eq("userId", userId).eq("eventId", oldEventId)
      )
      .first();
    if (!existing) return;
    await ctx.db.patch(existing._id, {
      eventId: googleId,
      status:  "Aankomend",
    });
  },
});


// ─── GAS terugkoppeling: status updaten na Google Calendar write ──────────────

/** Publieke status-update (voor GAS via http route). */
export const updateStatus = mutation({
  args: {
    userId:   v.optional(v.string()),
    eventId:  v.string(),
    status:   v.string(),           // "Aankomend" | "Fout"
    googleId: v.optional(v.string()), // Google Calendar event ID
  },
  handler: async (ctx, args) => {
    const userId = args.userId || await requireAuth(ctx);
    const existing = await ctx.db
      .query("personalEvents")
      .withIndex("by_user_eventId", (q) =>
        q.eq("userId", userId).eq("eventId", args.eventId)
      )
      .first();
    if (!existing) throw new Error(`Event ${args.eventId} niet gevonden`);

    const patch: Record<string, string> = { status: args.status };
    if (args.googleId) patch.kalender = "Main";
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
