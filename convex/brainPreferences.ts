import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

const DETAIL_LEVELS = ["kort", "normaal", "uitgebreid"] as const;
const TONES = ["direct", "warm", "coachend"] as const;
const PROACTIVE_LEVELS = ["laag", "normaal", "hoog"] as const;

const DEFAULT_PREFERENCES = {
  detailLevel: "normaal" as const,
  tone: "warm" as const,
  proactiveLevel: "normaal" as const,
  focusAreas: ["planning", "gezondheid", "rust"],
  briefingTime: "08:00",
  quietHoursStart: "23:00",
  quietHoursEnd: "07:00",
};

function nowIso() {
  return new Date().toISOString();
}

function withDefaults(row: {
  detailLevel: "kort" | "normaal" | "uitgebreid";
  tone: "direct" | "warm" | "coachend";
  proactiveLevel: "laag" | "normaal" | "hoog";
  focusAreas: string[];
  briefingTime?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  updatedAt: string;
} | null) {
  return {
    ...DEFAULT_PREFERENCES,
    ...(row ?? {}),
  };
}

async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Niet ingelogd");
  return identity.subject;
}

const updateArgs = {
  userId:          v.string(),
  detailLevel:     v.optional(v.union(v.literal("kort"), v.literal("normaal"), v.literal("uitgebreid"))),
  tone:            v.optional(v.union(v.literal("direct"), v.literal("warm"), v.literal("coachend"))),
  proactiveLevel:  v.optional(v.union(v.literal("laag"), v.literal("normaal"), v.literal("hoog"))),
  focusAreas:      v.optional(v.array(v.string())),
  briefingTime:    v.optional(v.string()),
  quietHoursStart: v.optional(v.string()),
  quietHoursEnd:   v.optional(v.string()),
};

export const getInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const row = await ctx.db
      .query("brainPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return withDefaults(row);
  },
});

export const getForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db
      .query("brainPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return withDefaults(row);
  },
});

export const updateInternal = internalMutation({
  args: updateArgs,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("brainPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const patch = {
      ...(args.detailLevel ? { detailLevel: args.detailLevel } : {}),
      ...(args.tone ? { tone: args.tone } : {}),
      ...(args.proactiveLevel ? { proactiveLevel: args.proactiveLevel } : {}),
      ...(args.focusAreas ? { focusAreas: args.focusAreas.map((area) => area.trim()).filter(Boolean).slice(0, 10) } : {}),
      ...(args.briefingTime ? { briefingTime: args.briefingTime } : {}),
      ...(args.quietHoursStart ? { quietHoursStart: args.quietHoursStart } : {}),
      ...(args.quietHoursEnd ? { quietHoursEnd: args.quietHoursEnd } : {}),
      updatedAt: nowIso(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return { ok: true, id: existing._id, preferences: withDefaults({ ...existing, ...patch }) };
    }

    const id = await ctx.db.insert("brainPreferences", {
      userId: args.userId,
      ...DEFAULT_PREFERENCES,
      ...patch,
    });
    const preferences = await ctx.db.get(id);
    return { ok: true, id, preferences: withDefaults(preferences) };
  },
});

export const updateForUser = mutation({
  args: {
    detailLevel:     updateArgs.detailLevel,
    tone:            updateArgs.tone,
    proactiveLevel:  updateArgs.proactiveLevel,
    focusAreas:      updateArgs.focusAreas,
    briefingTime:    updateArgs.briefingTime,
    quietHoursStart: updateArgs.quietHoursStart,
    quietHoursEnd:   updateArgs.quietHoursEnd,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("brainPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const patch = {
      ...(args.detailLevel ? { detailLevel: args.detailLevel } : {}),
      ...(args.tone ? { tone: args.tone } : {}),
      ...(args.proactiveLevel ? { proactiveLevel: args.proactiveLevel } : {}),
      ...(args.focusAreas ? { focusAreas: args.focusAreas.map((area) => area.trim()).filter(Boolean).slice(0, 10) } : {}),
      ...(args.briefingTime ? { briefingTime: args.briefingTime } : {}),
      ...(args.quietHoursStart ? { quietHoursStart: args.quietHoursStart } : {}),
      ...(args.quietHoursEnd ? { quietHoursEnd: args.quietHoursEnd } : {}),
      updatedAt: nowIso(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return { ok: true, preferences: withDefaults({ ...existing, ...patch }) };
    }

    const id = await ctx.db.insert("brainPreferences", {
      userId,
      ...DEFAULT_PREFERENCES,
      ...patch,
    });
    const preferences = await ctx.db.get(id);
    return { ok: true, preferences: withDefaults(preferences) };
  },
});

export const options = query({
  args: {},
  handler: async () => ({
    detailLevels: DETAIL_LEVELS,
    tones: TONES,
    proactiveLevels: PROACTIVE_LEVELS,
  }),
});
