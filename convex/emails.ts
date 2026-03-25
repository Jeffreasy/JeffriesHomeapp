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

// ─── Grok AI Queries ────────────────────────────────────────────────────────

/**
 * AI Summary — Compact inbox digest geoptimaliseerd voor Grok.
 * Retourneert: stats, top afzenders, recente ongelezen, categorie-verdeling.
 * Eén single call geeft Grok volledige inbox context.
 */
export const aiSummary = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db
      .query("emails")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const active = all.filter((e) => !e.isVerwijderd);
    const inbox  = active.filter((e) => e.labelIds.includes("INBOX"));
    const ongelezen = inbox.filter((e) => !e.isGelezen);

    // ── Top afzenders (frequentie) ────────────────────────────────────────
    const senderCount = new Map<string, number>();
    for (const e of active) {
      const sender = e.from.replace(/<.*>/, "").trim() || e.from;
      senderCount.set(sender, (senderCount.get(sender) ?? 0) + 1);
    }
    const topAfzenders = [...senderCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([naam, aantal]) => ({ naam, aantal }));

    // ── Categorie verdeling ───────────────────────────────────────────────
    const categorien: Record<string, number> = {};
    for (const e of active) {
      const cat = e.categorie ?? "overig";
      categorien[cat] = (categorien[cat] ?? 0) + 1;
    }

    // ── Recente ongelezen (top 15) ────────────────────────────────────────
    const recenteOngelezen = ongelezen
      .sort((a, b) => b.ontvangen - a.ontvangen)
      .slice(0, 15)
      .map((e) => ({
        gmailId:  e.gmailId,
        van:      e.from.replace(/<.*>/, "").trim() || e.from,
        onderwerp: e.subject,
        snippet:  e.snippet,
        datum:    e.datum,
        bijlagen: e.bijlagenCount,
        labels:   e.labelIds.filter((l) => !["INBOX", "UNREAD", "CATEGORY_PERSONAL"].includes(l)),
      }));

    // ── Datum spreiding (laatste 7 dagen) ─────────────────────────────────
    const now = Date.now();
    const dagVerdeling: Record<string, number> = {};
    for (const e of active) {
      if (now - e.ontvangen < 7 * 24 * 60 * 60 * 1000) {
        dagVerdeling[e.datum] = (dagVerdeling[e.datum] ?? 0) + 1;
      }
    }

    return {
      stats: {
        totaal: active.length,
        inbox: inbox.length,
        ongelezen: ongelezen.length,
        verzonden: active.filter((e) => e.labelIds.includes("SENT")).length,
        metBijlagen: active.filter((e) => e.heeftBijlagen).length,
        ster: active.filter((e) => e.isSter).length,
      },
      topAfzenders,
      categorien,
      recenteOngelezen,
      dagVerdeling,
      syncInfo: {
        oudste: active.length > 0
          ? new Date(Math.min(...active.map((e) => e.ontvangen))).toISOString().slice(0, 10)
          : null,
        nieuwste: active.length > 0
          ? new Date(Math.max(...active.map((e) => e.ontvangen))).toISOString().slice(0, 10)
          : null,
      },
    };
  },
});

/**
 * Afzender analyse — top afzenders met detail per categorie.
 * Grok kan hiermee patronen herkennen (wie stuurt het meest, welke categorie).
 */
export const senderAnalysis = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db
      .query("emails")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const active = all.filter((e) => !e.isVerwijderd);

    const senders = new Map<string, {
      email: string;
      naam: string;
      totaal: number;
      ongelezen: number;
      categorieen: Record<string, number>;
      laatsteEmail: string;
      heeftBijlagen: number;
    }>();

    for (const e of active) {
      const emailMatch = e.from.match(/<(.+?)>/);
      const email = emailMatch?.[1] ?? e.from;
      const naam  = e.from.replace(/<.*>/, "").trim() || email;

      const existing = senders.get(email) ?? {
        email, naam, totaal: 0, ongelezen: 0,
        categorieen: {}, laatsteEmail: e.datum, heeftBijlagen: 0,
      };

      existing.totaal++;
      if (!e.isGelezen) existing.ongelezen++;
      if (e.heeftBijlagen) existing.heeftBijlagen++;
      const cat = e.categorie ?? "overig";
      existing.categorieen[cat] = (existing.categorieen[cat] ?? 0) + 1;
      if (e.datum > existing.laatsteEmail) existing.laatsteEmail = e.datum;

      senders.set(email, existing);
    }

    return [...senders.values()]
      .sort((a, b) => b.totaal - a.totaal)
      .slice(0, 25);
  },
});

/**
 * Recente emails per categorie — voor Grok om snel per domein te analyseren.
 */
export const recentByCategory = query({
  args: { userId: v.string(), categorie: v.string(), limiet: v.optional(v.number()) },
  handler: async (ctx, { userId, categorie, limiet }) => {
    const all = await ctx.db
      .query("emails")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return all
      .filter((e) => !e.isVerwijderd && e.categorie === categorie)
      .sort((a, b) => b.ontvangen - a.ontvangen)
      .slice(0, limiet ?? 20)
      .map((e) => ({
        gmailId:   e.gmailId,
        threadId:  e.threadId,
        van:       e.from,
        onderwerp: e.subject,
        snippet:   e.snippet,
        datum:     e.datum,
        gelezen:   e.isGelezen,
        bijlagen:  e.bijlagenCount,
      }));
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
