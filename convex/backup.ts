import { query } from "./_generated/server";

async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Niet ingelogd");
  return identity.subject;
}

export const exportForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const [
      rooms,
      devices,
      automations,
      schedule,
      personalEvents,
      notes,
      habits,
      habitLogs,
      habitBadges,
      transactions,
      emailSyncMeta,
      privacySettings,
    ] = await Promise.all([
      ctx.db.query("rooms").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("devices").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("automations").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("schedule").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("personalEvents").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("notes").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("habits").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("habitLogs").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("habitBadges").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("transactions").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("emailSyncMeta").withIndex("by_user", (q) => q.eq("userId", userId)).first(),
      ctx.db.query("privacySettings").withIndex("by_user", (q) => q.eq("userId", userId)).first(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      userId,
      version: 1,
      tables: {
        rooms,
        devices,
        automations,
        schedule,
        personalEvents,
        notes,
        habits,
        habitLogs,
        habitBadges,
        transactions,
        emailSyncMeta,
        privacySettings,
      },
    };
  },
});
