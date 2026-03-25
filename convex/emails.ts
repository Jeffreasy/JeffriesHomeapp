import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Inbox listing — alle niet-verwijderde emails, nieuwste eerst. */
export const list = query({
  args: {
    userId:    v.string(),
    label:     v.optional(v.string()),          // "INBOX" | "SENT" | "TRASH" etc.
    onlyOngelezen: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, label, onlyOngelezen }) => {
    let q = ctx.db
      .query("emails")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    const rows = await q.collect();

    return rows
      .filter((e) => {
        if (e.isVerwijderd && label !== "TRASH") return false;
        if (label && !e.labelIds.includes(label)) return false;
        if (onlyOngelezen && e.isGelezen) return false;
        return true;
      })
      .sort((a, b) => b.ontvangen - a.ontvangen);
  },
});

/** Alle berichten in een thread, chronologisch. */
export const getThread = query({
  args: { userId: v.string(), threadId: v.string() },
  handler: async (ctx, { userId, threadId }) =>
    (await ctx.db
      .query("emails")
      .withIndex("by_user_thread", (q) =>
        q.eq("userId", userId).eq("threadId", threadId)
      )
      .collect()
    ).sort((a, b) => a.ontvangen - b.ontvangen),
});

/** Full-text search over emails. */
export const search = query({
  args: {
    userId: v.string(),
    zoekterm: v.string(),
    inclVerwijderd: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, zoekterm, inclVerwijderd }) => {
    if (!zoekterm.trim()) return [];

    const results = await ctx.db
      .query("emails")
      .withSearchIndex("search_emails", (q) => {
        let sq = q.search("searchText", zoekterm).eq("userId", userId);
        if (!inclVerwijderd) sq = sq.eq("isVerwijderd", false);
        return sq;
      })
      .take(50);

    return results;
  },
});

/** Statistieken: ongelezen, totaal, per label. */
export const getStats = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db
      .query("emails")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const active = all.filter((e) => !e.isVerwijderd);
    const inbox  = active.filter((e) => e.labelIds.includes("INBOX"));

    return {
      totaal:     active.length,
      ongelezen:  inbox.filter((e) => !e.isGelezen).length,
      inbox:      inbox.length,
      verzonden:  active.filter((e) => e.labelIds.includes("SENT")).length,
      concepten:  active.filter((e) => e.isDraft).length,
      prullenbak: all.filter((e) => e.isVerwijderd).length,
      ster:       active.filter((e) => e.isSter).length,
    };
  },
});

// ─── Internal Mutations (voor sync actions) ─────────────────────────────────

/** Bulk upsert van gesyncte emails. Per gmailId: patch of insert. */
export const bulkUpsertInternal = internalMutation({
  args: {
    emails: v.array(v.object({
      userId:        v.string(),
      gmailId:       v.string(),
      threadId:      v.string(),
      from:          v.string(),
      to:            v.string(),
      cc:            v.optional(v.string()),
      bcc:           v.optional(v.string()),
      subject:       v.string(),
      snippet:       v.string(),
      datum:         v.string(),
      ontvangen:     v.number(),
      isGelezen:     v.boolean(),
      isSter:        v.boolean(),
      isVerwijderd:  v.boolean(),
      isDraft:       v.boolean(),
      labelIds:      v.array(v.string()),
      categorie:     v.optional(v.string()),
      heeftBijlagen: v.boolean(),
      bijlagenCount: v.number(),
      searchText:    v.string(),
      syncedAt:      v.string(),
    })),
  },
  handler: async (ctx, { emails }) => {
    let upserted = 0;
    for (const email of emails) {
      const existing = await ctx.db
        .query("emails")
        .withIndex("by_user_gmailId", (q) =>
          q.eq("userId", email.userId).eq("gmailId", email.gmailId)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, email);
      } else {
        await ctx.db.insert("emails", email);
      }
      upserted++;
    }
    return { upserted };
  },
});

/** Markeer email als gelezen/ongelezen. */
export const markGelezenInternal = internalMutation({
  args: { userId: v.string(), gmailId: v.string(), isGelezen: v.boolean() },
  handler: async (ctx, { userId, gmailId, isGelezen }) => {
    const email = await ctx.db
      .query("emails")
      .withIndex("by_user_gmailId", (q) =>
        q.eq("userId", userId).eq("gmailId", gmailId)
      )
      .first();
    if (email) await ctx.db.patch(email._id, { isGelezen });
  },
});

/** Markeer email als ster / geen ster. */
export const markSterInternal = internalMutation({
  args: { userId: v.string(), gmailId: v.string(), isSter: v.boolean() },
  handler: async (ctx, { userId, gmailId, isSter }) => {
    const email = await ctx.db
      .query("emails")
      .withIndex("by_user_gmailId", (q) =>
        q.eq("userId", userId).eq("gmailId", gmailId)
      )
      .first();
    if (email) await ctx.db.patch(email._id, { isSter });
  },
});

/** Verplaats email naar/uit prullenbak. */
export const trashInternal = internalMutation({
  args: { userId: v.string(), gmailId: v.string(), isVerwijderd: v.boolean() },
  handler: async (ctx, { userId, gmailId, isVerwijderd }) => {
    const email = await ctx.db
      .query("emails")
      .withIndex("by_user_gmailId", (q) =>
        q.eq("userId", userId).eq("gmailId", gmailId)
      )
      .first();
    if (email) await ctx.db.patch(email._id, { isVerwijderd });
  },
});

// ─── Sync Meta ──────────────────────────────────────────────────────────────

/** Sync meta ophalen voor incremental sync. */
export const getSyncMeta = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) =>
    ctx.db
      .query("emailSyncMeta")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first(),
});

/** Sync meta aanmaken of bijwerken. */
export const upsertSyncMeta = internalMutation({
  args: {
    userId:       v.string(),
    historyId:    v.string(),
    lastFullSync: v.string(),
    totalSynced:  v.number(),
  },
  handler: async (ctx, { userId, historyId, lastFullSync, totalSynced }) => {
    const existing = await ctx.db
      .query("emailSyncMeta")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { historyId, lastFullSync, totalSynced });
    } else {
      await ctx.db.insert("emailSyncMeta", { userId, historyId, lastFullSync, totalSynced });
    }
  },
});
