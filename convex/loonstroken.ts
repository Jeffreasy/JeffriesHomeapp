/**
 * convex/loonstroken.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * CRUD + bulk upsert voor geüploade loonstroken (PDF-parsed payslips).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const requireAuth = async (ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Niet ingelogd");
  return identity.subject;
};

const resolveUserId = async (
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } },
  requested?: string
) => {
  const userId = await requireAuth(ctx);
  if (requested && requested !== userId) throw new Error("Geen toegang tot deze loonstroken");
  return userId;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export const list = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.userId);
    return ctx.db
      .query("loonstroken")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getByPeriode = query({
  args: {
    userId: v.optional(v.string()),
    jaar:   v.number(),
    periode: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.userId);
    return ctx.db
      .query("loonstroken")
      .withIndex("by_user_periode", (q) =>
        q.eq("userId", userId).eq("jaar", args.jaar).eq("periode", args.periode)
      )
      .first();
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

const loonstrookFields = {
  jaar:              v.number(),
  periode:           v.number(),
  periodeLabel:      v.string(),
  type:              v.string(),
  netto:             v.number(),
  brutoBetaling:     v.number(),
  brutoInhouding:    v.number(),
  salarisBasis:      v.number(),
  ortTotaal:         v.number(),
  ortDetail:         v.string(),
  amtZeerintensief:  v.optional(v.number()),
  pensioenpremie:    v.optional(v.number()),
  loonheffing:       v.optional(v.number()),
  reiskosten:        v.optional(v.number()),
  vakantietoeslag:   v.optional(v.number()),
  ejuBedrag:         v.optional(v.number()),
  toeslagBalansvlf:  v.optional(v.number()),
  extraUrenBedrag:   v.optional(v.number()),
  schaalnummer:      v.string(),
  trede:             v.string(),
  parttimeFactor:    v.number(),
  uurloon:           v.optional(v.number()),
  componenten:       v.string(),
  cumulatieven:      v.optional(v.string()),
};

/** Bulk upsert — dedup op userId + jaar + periode. */
export const bulkUpsert = mutation({
  args: {
    userId:       v.optional(v.string()),
    loonstroken:  v.array(v.object(loonstrookFields)),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.userId);
    let toegevoegd = 0;
    let bijgewerkt = 0;

    for (const ls of args.loonstroken) {
      const existing = await ctx.db
        .query("loonstroken")
        .withIndex("by_user_periode", (q) =>
          q.eq("userId", userId).eq("jaar", ls.jaar).eq("periode", ls.periode)
        )
        .first();

      const data = {
        ...ls,
        userId,
        geimporteerdOp: new Date().toISOString(),
      };

      if (existing) {
        await ctx.db.patch(existing._id, data);
        bijgewerkt++;
      } else {
        await ctx.db.insert("loonstroken", data);
        toegevoegd++;
      }
    }

    return { toegevoegd, bijgewerkt, totaal: toegevoegd + bijgewerkt };
  },
});

/** Verwijder een enkele loonstrook. */
export const remove = mutation({
  args: {
    userId: v.optional(v.string()),
    jaar:   v.number(),
    periode: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.userId);
    const existing = await ctx.db
      .query("loonstroken")
      .withIndex("by_user_periode", (q) =>
        q.eq("userId", userId).eq("jaar", args.jaar).eq("periode", args.periode)
      )
      .first();

    if (!existing) throw new Error("Loonstrook niet gevonden");
    await ctx.db.delete(existing._id);
    return { ok: true };
  },
});
