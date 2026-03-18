import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Shared field definition — gespiegeld van schema.ts
const salaryFields = {
  userId:             v.string(),
  periode:            v.string(),       // "2026-03"
  jaar:               v.number(),
  maand:              v.number(),
  aantalDiensten:     v.number(),
  uurloonORT:         v.number(),

  // Bruto componenten
  basisLoon:          v.number(),
  amtZeerintensief:   v.number(),
  toeslagBalansvif:   v.number(),
  ortTotaal:          v.number(),
  extraUrenBedrag:    v.number(),
  toeslagVakatieUren: v.number(),
  reiskosten:         v.number(),
  eenmaligTotaal:     v.number(),
  brutoBetaling:      v.number(),

  // Inhoudingen & netto
  pensioenpremie:    v.number(),
  loonheffingSchat:  v.number(),
  nettoPrognose:     v.number(),

  // Detail JSON strings (flexibel, geen nested Convex objects)
  ortDetail:      v.optional(v.string()), // JSON: { VROEG: 45.50, ZONDAG: 89.20 }
  eenmaligDetail: v.optional(v.string()), // JSON: [{ label, bedrag }]

  berekendOp: v.string(), // ISO timestamp
};

// ─── List all salary records for current user (newest first) ─────────────────
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("salary")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.sort((a, b) => b.periode.localeCompare(a.periode));
  },
});

// ─── Get salary for a specific periode ───────────────────────────────────────
export const getByPeriode = query({
  args: { userId: v.string(), periode: v.string() },
  handler: async (ctx, { userId, periode }) => {
    return ctx.db
      .query("salary")
      .withIndex("by_user_periode", (q) => q.eq("userId", userId).eq("periode", periode))
      .first();
  },
});

// ─── Internal bulk upsert (called from HTTP action) ──────────────────────────
export const bulkSalaryInternal = internalMutation({
  args: {
    userId:      v.string(),
    salarisData: v.array(v.object(salaryFields)),
  },
  handler: async (ctx, { userId, salarisData }) => {
    let upserted = 0;

    for (const record of salarisData) {
      const existing = await ctx.db
        .query("salary")
        .withIndex("by_user_periode", (q) =>
          q.eq("userId", userId).eq("periode", record.periode)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, record);
      } else {
        await ctx.db.insert("salary", record);
      }
      upserted++;
    }

    return { count: upserted };
  },
});

// ─── Direct mutation voor single-record update (optioneel, frontend gebruik) ──
export const upsertSalary = mutation({
  args: { userId: v.string(), record: v.object(salaryFields) },
  handler: async (ctx, { userId, record }) => {
    const existing = await ctx.db
      .query("salary")
      .withIndex("by_user_periode", (q) =>
        q.eq("userId", userId).eq("periode", record.periode)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, record);
      return existing._id;
    }
    return ctx.db.insert("salary", record);
  },
});
