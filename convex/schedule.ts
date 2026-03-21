import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";

const dienstFields = {
  userId:      v.string(),
  eventId:     v.string(),
  titel:       v.string(),
  startDatum:  v.string(),
  startTijd:   v.string(),
  eindDatum:   v.string(),
  eindTijd:    v.string(),
  werktijd:    v.string(),
  locatie:     v.string(),
  team:        v.string(),
  shiftType:   v.string(),
  prioriteit:  v.number(),
  duur:        v.number(),
  weeknr:      v.string(),
  dag:         v.string(),
  status:      v.string(),
  beschrijving: v.string(),
  heledag:     v.boolean(),
};

// ─── Smart upsert per eventId (gebruikt door syncSchedule action) ─────────────
export const bulkUpsertFromCalendar = internalMutation({
  args: {
    userId:     v.string(),
    diensten:   v.array(v.object(dienstFields)),
    importedAt: v.string(),
  },
  handler: async (ctx, { userId, diensten, importedAt }) => {
    let upserted = 0;
    let deleted  = 0;

    const incomingIds = new Set(diensten.map((d) => d.eventId));

    const existing = await ctx.db
      .query("schedule")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Verwijder records die niet meer in de kalender staan (w/in scan-window)
    const now       = new Date();
    const scanStart = new Date(now); scanStart.setDate(scanStart.getDate() - 30);
    const scanEnd   = new Date(now); scanEnd.setDate(scanEnd.getDate() + 90);
    const scanStartStr = scanStart.toISOString().slice(0, 10);
    const scanEndStr   = scanEnd.toISOString().slice(0, 10);

    for (const doc of existing) {
      if (
        doc.startDatum >= scanStartStr &&
        doc.startDatum <= scanEndStr &&
        !incomingIds.has(doc.eventId) &&
        doc.status !== "VERWIJDERD"
      ) {
        await ctx.db.patch(doc._id, { status: "VERWIJDERD" });
        deleted++;
      }
    }

    // Upsert inkomende records
    const existingMap = new Map(existing.map((d) => [d.eventId, d]));
    for (const dienst of diensten) {
      const ex = existingMap.get(dienst.eventId);
      if (ex) {
        await ctx.db.patch(ex._id, dienst);
      } else {
        await ctx.db.insert("schedule", dienst);
      }
      upserted++;
    }

    // Update meta
    const meta = await ctx.db
      .query("scheduleMeta")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const totalRows = existing.length + diensten.filter((d) => !existingMap.has(d.eventId)).length;
    if (meta) {
      await ctx.db.patch(meta._id, { importedAt, fileName: "Google Calendar API", totalRows });
    } else {
      await ctx.db.insert("scheduleMeta", { userId, importedAt, fileName: "Google Calendar API", totalRows });
    }

    return { upserted, deleted };
  },
});

// ─── Internal list (voor gebruik vanuit Actions) ──────────────────────────────
export const listInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("schedule")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// ─── List all diensten for current user ──────────────────────────────────────
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("schedule")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// ─── Get schedule meta ────────────────────────────────────────────────────────
export const getMeta = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("scheduleMeta")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

// ─── List diensten for a specific date ───────────────────────────────────────
export const listByDate = query({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    return ctx.db
      .query("schedule")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("startDatum", date))
      .collect();
  },
});

// ─── Bulk import: replace all schedule data for a user (XLSX upload) ─────────
export const bulkImport = mutation({
  args: {
    userId:     v.string(),
    diensten:   v.array(v.object(dienstFields)),
    importedAt: v.string(),
    fileName:   v.string(),
  },
  handler: async (ctx, { userId, diensten, importedAt, fileName }) => {
    const existing = await ctx.db
      .query("schedule")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)));
    await Promise.all(diensten.map((d) => ctx.db.insert("schedule", d)));

    const existingMeta = await ctx.db
      .query("scheduleMeta")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingMeta) {
      await ctx.db.patch(existingMeta._id, { importedAt, fileName, totalRows: diensten.length });
    } else {
      await ctx.db.insert("scheduleMeta", { userId, importedAt, fileName, totalRows: diensten.length });
    }

    return { count: diensten.length };
  },
});
