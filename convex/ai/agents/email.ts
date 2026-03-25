/**
 * 📧 Email Agent — "De inbox specialist"
 *
 * Geconsolideerde email agent: combineert analyse, triage, search en compose
 * in één efficiënte agent. Vervangt de voormalige Director + 4 sub-agents.
 */

import type { AgentDefinition, ContextOptions } from "../registry";

export const emailAgent: AgentDefinition = {
  id:           "email",
  naam:         "Email Agent",
  emoji:        "📧",
  beschrijving: "Complete email specialist. Analyseert inbox patronen, organiseert en triageert, " +
                "zoekt en leest emails, en kan berichten versturen en beantwoorden.",
  domein:       ["emails", "emailSyncMeta"],
  capabilities: [
    "Inbox statistieken en ongelezen overzicht",
    "Top afzenders ranking met frequentie",
    "Email zoeken en lezen (on-demand via Gmail API)",
    "Gelezen/ongelezen markeren, ster, prullenbak",
    "Bulk operaties (markeer gelezen, verwijder)",
    "Email versturen en threads beantwoorden",
    "Inbox triage suggesties (oud/nieuwsbrieven)",
    "Categorie verdeling (primary/social/promotions)",
  ],
  tools: [],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const [allEmails, syncMeta] = await Promise.all([
      ctx.db.query("emails").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("emailSyncMeta").withIndex("by_user", (q) => q.eq("userId", userId)).first(),
    ]);

    const active  = allEmails.filter((e) => !e.isVerwijderd);
    const inbox   = active.filter((e) => e.labelIds.includes("INBOX"));
    const ongelezen = inbox.filter((e) => !e.isGelezen);

    // ── Lite mode (voor dashboard delegation) ────────────────────────────
    if (opts?.lite) {
      return {
        totaal: active.length,
        ongelezen: ongelezen.length,
        prullenbak: allEmails.filter((e) => e.isVerwijderd).length,
      };
    }

    // ── Top afzenders (max 10) ────────────────────────────────────────────
    const senderMap = new Map<string, { count: number; ongelezen: number }>();
    for (const e of active) {
      const sender = e.from.replace(/<.*>/, "").trim() || e.from;
      const entry = senderMap.get(sender) ?? { count: 0, ongelezen: 0 };
      entry.count++;
      if (!e.isGelezen) entry.ongelezen++;
      senderMap.set(sender, entry);
    }
    const topAfzenders = [...senderMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([naam, data]) => ({ naam, ...data }));

    // ── Categorie verdeling ──────────────────────────────────────────────
    const categorien: Record<string, number> = {};
    for (const e of active) {
      const cat = e.categorie ?? "overig";
      categorien[cat] = (categorien[cat] ?? 0) + 1;
    }

    // ── Triage suggesties ────────────────────────────────────────────────
    const oud = ongelezen.filter((e) => Date.now() - e.ontvangen > 7 * 86400000);
    const nieuwsbrief = ongelezen.filter((e) =>
      e.categorie === "promotions" || e.categorie === "social" || e.categorie === "forums"
    );

    // ── Recente emails (max 15) ──────────────────────────────────────────
    const recente = inbox
      .sort((a, b) => b.ontvangen - a.ontvangen)
      .slice(0, 15)
      .map((e) => ({
        gmailId: e.gmailId, threadId: e.threadId,
        van: e.from.replace(/<.*>/, "").trim(),
        onderwerp: e.subject, snippet: e.snippet.slice(0, 80),
        datum: e.datum, gelezen: e.isGelezen,
        categorie: e.categorie, bijlagen: e.bijlagenCount,
      }));

    return {
      stats: {
        totaal: active.length, inbox: inbox.length,
        ongelezen: ongelezen.length,
        verzonden: active.filter((e) => e.labelIds.includes("SENT")).length,
        ster: active.filter((e) => e.isSter).length,
        prullenbak: allEmails.filter((e) => e.isVerwijderd).length,
      },
      topAfzenders,
      categorien,
      triage: {
        oudOngelezen: oud.length,
        nieuwsbrieven: nieuwsbrief.length,
        suggestie: oud.length > 5
          ? `${oud.length} ongelezen emails ouder dan 7 dagen — bulk markeren?`
          : nieuwsbrief.length > 10
            ? `${nieuwsbrief.length} ongelezen nieuwsbrieven — opruimen?`
            : "Inbox ziet er goed uit!",
      },
      recente,
      syncStatus: syncMeta ? { laatsteSync: syncMeta.lastFullSync, totaalGesynct: syncMeta.totalSynced } : null,
    };
  },
};
