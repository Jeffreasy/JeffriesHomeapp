import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  berekenMaandloon,
  groepeerPerMaand,
  type ScheduleItem,
} from "./lib/salaryCalc";

// ─── Compute salary directly from schedule table ───────────────────────────────
export const computeFromSchedule = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const alleDiensten = await ctx.db
      .query("schedule")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const items: ScheduleItem[] = alleDiensten
      .filter((d) => d.status !== "VERWIJDERD" && !d.heledag)
      .map((d) => ({
        startDatum: d.startDatum,
        startTijd:  d.startTijd,
        eindTijd:   d.eindTijd,
        duur:       d.duur,
        dag:        d.dag,
        shiftType:  d.shiftType,
        status:     d.status,
        heledag:    d.heledag,
      }));

    const perMaand  = groepeerPerMaand(items);
    const maandKeys = Object.keys(perMaand).sort();

    return maandKeys.map((key) => {
      const [jaar, maand] = key.split("-").map(Number);
      return berekenMaandloon(jaar, maand, perMaand[key]);
    });
  },
});

// ─── Huidige maand prognose ───────────────────────────────────────────────────
export const currentMonthPrognose = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const now    = new Date();
    const jaar   = now.getFullYear();
    const maand  = now.getMonth() + 1;
    const prefix = `${jaar}-${String(maand).padStart(2, "0")}`;

    const diensten = await ctx.db
      .query("schedule")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("startDatum", `${prefix}-01`)
      )
      .filter((q) =>
        q.and(
          q.lte(q.field("startDatum"), `${prefix}-31`),
          q.neq(q.field("status"), "VERWIJDERD"),
          q.eq(q.field("heledag"), false)
        )
      )
      .collect();

    const items: ScheduleItem[] = diensten.map((d) => ({
      startDatum: d.startDatum,
      startTijd:  d.startTijd,
      eindTijd:   d.eindTijd,
      duur:       d.duur,
      dag:        d.dag,
      shiftType:  d.shiftType,
      status:     d.status,
      heledag:    d.heledag,
    }));

    return berekenMaandloon(jaar, maand, items);
  },
});

// ─── List all stored salary records (historisch, van vóór migratie) ───────────
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
