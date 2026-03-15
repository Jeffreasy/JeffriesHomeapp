import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

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

// ─── List all diensten for current user ───────────────────────────────────────
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

// ─── Bulk import: replace all schedule data for a user ───────────────────────
export const bulkImport = mutation({
  args: {
    userId:     v.string(),
    diensten:   v.array(v.object(dienstFields)),
    importedAt: v.string(),
    fileName:   v.string(),
  },
  handler: async (ctx, { userId, diensten, importedAt, fileName }) => {
    // Delete existing schedule for this user
    const existing = await ctx.db
      .query("schedule")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(existing.map((r) => ctx.db.delete(r._id)));

    // Insert new rows
    await Promise.all(diensten.map((d) => ctx.db.insert("schedule", d)));

    // Upsert meta
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

// ─── Internal bulk import (called from HTTP action) ──────────────────────────
export const bulkImportInternal = internalMutation({
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
