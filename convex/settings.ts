import { query } from "./_generated/server";

function hasEnv(name: string) {
  return Boolean(process.env[name]?.trim());
}

function hasAllEnv(names: string[]) {
  return names.every(hasEnv);
}

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject;

    const [
      devices,
      rooms,
      automations,
      commands,
      schedule,
      scheduleMeta,
      personalEvents,
      emails,
      unreadEmails,
      emailSyncMeta,
      notes,
      habits,
      transactions,
      pendingActions,
      syncStatuses,
      bridgeRows,
      auditRows,
      privacySettings,
    ] = await Promise.all([
      ctx.db.query("devices").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("rooms").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("automations").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("deviceCommands").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("schedule").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("scheduleMeta").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("personalEvents").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("emails").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db
        .query("emails")
        .withIndex("by_user_gelezen", (q) => q.eq("userId", userId).eq("isGelezen", false))
        .collect(),
      ctx.db.query("emailSyncMeta").withIndex("by_user", (q) => q.eq("userId", userId)).first(),
      ctx.db.query("notes").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("habits").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("transactions").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db
        .query("aiPendingActions")
        .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "pending"))
        .collect(),
      ctx.db.query("syncStatus").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("bridgeHealth").withIndex("by_updated").collect(),
      ctx.db.query("auditLogs").withIndex("by_user_created", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("privacySettings").withIndex("by_user", (q) => q.eq("userId", userId)).first(),
    ]);

    const latestScheduleMeta = scheduleMeta.sort((a, b) => b.importedAt.localeCompare(a.importedAt))[0] ?? null;
    const latestBridge = bridgeRows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
    const recentAudit = auditRows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
    const now = new Date();
    const bridgeAgeMs = latestBridge ? now.getTime() - new Date(latestBridge.lastSeenAt).getTime() : null;
    const bridgeOnline = typeof bridgeAgeMs === "number" && bridgeAgeMs < 45_000;
    const pendingNotExpired = pendingActions.filter((action) => action.expiresAt > now.toISOString());

    return {
      account: {
        userId,
        name: identity.name ?? identity.email ?? "Ingelogd",
        email: identity.email ?? null,
      },
      devices: {
        total: devices.length,
        online: devices.filter((device) => device.status === "online").length,
        offline: devices.filter((device) => device.status !== "online").length,
        on: devices.filter((device) => device.currentState.on).length,
      },
      rooms: {
        total: rooms.length,
        unassignedDevices: devices.filter((device) => !device.roomId).length,
      },
      automations: {
        total: automations.length,
        active: automations.filter((automation) => automation.enabled).length,
      },
      commands: {
        total: commands.length,
        pending: commands.filter((command) => command.status === "pending").length,
        failed: commands.filter((command) => command.status === "failed").length,
      },
      bridge: latestBridge ? {
        bridgeId: latestBridge.bridgeId,
        status: bridgeOnline ? latestBridge.status : "offline",
        online: bridgeOnline,
        lastSeenAt: latestBridge.lastSeenAt,
        lastPollAt: latestBridge.lastPollAt ?? null,
        lastSuccessAt: latestBridge.lastSuccessAt ?? null,
        lastErrorAt: latestBridge.lastErrorAt ?? null,
        lastError: latestBridge.lastError ?? null,
        commandsSeen: latestBridge.commandsSeen,
        commandsDone: latestBridge.commandsDone,
        commandsFailed: latestBridge.commandsFailed,
        version: latestBridge.version ?? null,
      } : null,
      confirmations: {
        pending: pendingNotExpired.length,
        expired: pendingActions.length - pendingNotExpired.length,
      },
      sync: Object.fromEntries(syncStatuses.map((status) => [status.source, {
        status: status.status,
        startedAt: status.startedAt ?? null,
        finishedAt: status.finishedAt ?? null,
        lastSuccessAt: status.lastSuccessAt ?? null,
        lastErrorAt: status.lastErrorAt ?? null,
        lastError: status.lastError ?? null,
        result: status.result ?? null,
      }])),
      schedule: {
        total: schedule.length,
        upcoming: schedule.filter((item) => item.status === "Opkomend" || item.status === "Bezig").length,
        importedAt: latestScheduleMeta?.importedAt ?? null,
      },
      personalEvents: {
        total: personalEvents.length,
        upcoming: personalEvents.filter((event) => event.status === "Aankomend").length,
      },
      email: {
        total: emails.length,
        unread: unreadEmails.length,
        lastFullSync: emailSyncMeta?.lastFullSync ?? null,
        totalSynced: emailSyncMeta?.totalSynced ?? 0,
      },
      data: {
        notes: notes.filter((note) => !note.isArchived).length,
        archivedNotes: notes.filter((note) => note.isArchived).length,
        habits: habits.length,
        activeHabits: habits.filter((habit) => habit.isActief).length,
        transactions: transactions.length,
      },
      privacy: privacySettings ? {
        finance: privacySettings.finance,
        habits: privacySettings.habits,
        notes: privacySettings.notes,
        email: privacySettings.email,
        account: privacySettings.account,
      } : {
        finance: true,
        habits: true,
        notes: true,
        email: true,
        account: true,
      },
      audit: {
        recent: recentAudit.map((row) => ({
          _id: row._id,
          actor: row.actor,
          source: row.source,
          action: row.action,
          entity: row.entity,
          status: row.status,
          summary: row.summary,
          createdAt: row.createdAt,
        })),
      },
      integrations: {
        convex: true,
        googleOAuth: hasAllEnv(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"]),
        telegramBot: hasEnv("TELEGRAM_BOT_TOKEN"),
        telegramOwner: hasEnv("TELEGRAM_OWNER_CHAT_ID"),
        telegramWebhookSecret: hasEnv("TELEGRAM_WEBHOOK_SECRET"),
        localBridge: hasEnv("TELEGRAM_BRIDGE_SECRET"),
        legacyHttpSecret: hasEnv("HOMEAPP_GAS_SECRET"),
        grok: hasEnv("GROK_API_KEY"),
        todoist: hasAllEnv(["TODOIST_API_TOKEN", "TODOIST_PROJECT_ID"]),
      },
    };
  },
});
