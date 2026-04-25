import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { dienstFields } from "./lib/fields";

async function resolveUserId(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } },
  requestedUserId: string,
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Niet ingelogd");
  if (requestedUserId !== identity.subject) throw new Error("Unauthorized");
  return identity.subject;
}

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

/** Interne query voor gebruik vanuit Actions (bijv. syncTodoist). Filtert VERWIJDERD records. */
export const listInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) =>
    (await ctx.db
      .query("schedule")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()
    ).filter((d) => d.status !== "VERWIJDERD"),
});

/** Alle actieve diensten voor de gebruiker (filtert VERWIJDERD server-side). */
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const owner = await resolveUserId(ctx, userId);
    return (await ctx.db
      .query("schedule")
      .withIndex("by_user", (q) => q.eq("userId", owner))
      .collect()
    ).filter((d) => d.status !== "VERWIJDERD");
  },
});

// ─── Get schedule meta ────────────────────────────────────────────────────────
export const getMeta = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const owner = await resolveUserId(ctx, userId);
    return ctx.db
      .query("scheduleMeta")
      .withIndex("by_user", (q) => q.eq("userId", owner))
      .first();
  },
});

/** Diensten op een specifieke datum (filtert VERWIJDERD). */
export const listByDate = query({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    const owner = await resolveUserId(ctx, userId);
    return ctx.db
      .query("schedule")
      .withIndex("by_user_date", (q) => q.eq("userId", owner).eq("startDatum", date))
      .filter((q) => q.neq(q.field("status"), "VERWIJDERD"))
      .collect();
  },
});

export const listByDateInternal = internalQuery({
  args: { userId: v.string(), date: v.string() },
  handler: async (ctx, { userId, date }) =>
    ctx.db
      .query("schedule")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("startDatum", date))
      .filter((q) => q.neq(q.field("status"), "VERWIJDERD"))
      .collect(),
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
    const owner = await resolveUserId(ctx, userId);
    const existing = await ctx.db
      .query("schedule")
      .withIndex("by_user", (q) => q.eq("userId", owner))
      .collect();
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)));
    await Promise.all(diensten.map((d) => ctx.db.insert("schedule", { ...d, userId: owner })));

    const existingMeta = await ctx.db
      .query("scheduleMeta")
      .withIndex("by_user", (q) => q.eq("userId", owner))
      .first();

    if (existingMeta) {
      await ctx.db.patch(existingMeta._id, { importedAt, fileName, totalRows: diensten.length });
    } else {
      await ctx.db.insert("scheduleMeta", { userId: owner, importedAt, fileName, totalRows: diensten.length });
    }

    return { count: diensten.length };
  },
});
