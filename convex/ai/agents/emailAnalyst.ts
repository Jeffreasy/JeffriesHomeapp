/**
 * 📧 Email Analyst — "De inbox-analist"
 *
 * Expert in inbox overzicht, afzender patronen, en categorie analyse.
 * Read-only — analyseert maar wijzigt niets.
 */

import type { AgentDefinition, ContextOptions } from "../registry";

export const emailAnalystAgent: AgentDefinition = {
  id:           "email-analyst",
  naam:         "Email Analyst",
  emoji:        "📊",
  beschrijving: "Inbox analyse specialist. Herkent afzender-patronen, analyseert categorie-verdeling, " +
                "detecteert trends in emailverkeer, en geeft prioriteits-rankings van ongelezen berichten.",
  domein:       ["emails", "emailSyncMeta"],
  capabilities: [
    "Inbox statistieken berekenen (totaal/ongelezen/per label)",
    "Top afzenders ranking met frequentie en categorieën",
    "Emailverkeer trends analyseren (dag-verdeling, piekuren)",
    "Categorie verdeling visualiseren (primary/social/promotions/updates)",
    "Bijlagen-inventaris maken",
    "Sync status en data-integriteit rapporteren",
  ],
  tools: [
    {
      naam: "emails.getStats", type: "query",
      beschrijving: "Inbox statistieken (totaal, ongelezen, per label)",
      parameters: [{ naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true }],
    },
    {
      naam: "emails.aiSummary", type: "query",
      beschrijving: "AI inbox digest — compact overzicht met trends",
      endpoint: "GET /emails/ai-summary",
      parameters: [{ naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true }],
    },
    {
      naam: "emails.senderAnalysis", type: "query",
      beschrijving: "Top-25 afzenders met frequentie, categorieën, bijlagen",
      endpoint: "GET /emails/senders",
      parameters: [{ naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true }],
    },
    {
      naam: "emails.recentByCategory", type: "query",
      beschrijving: "Recente emails filteren per categorie",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "categorie", type: "string", beschrijving: "Categorie filter", verplicht: true, enum: ["primary", "social", "promotions", "updates", "forums"] },
        { naam: "limiet", type: "number", beschrijving: "Max resultaten (default 20)", verplicht: false },
      ],
    },
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const [allEmails, syncMeta] = await Promise.all([
      ctx.db.query("emails").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("emailSyncMeta").withIndex("by_user", (q) => q.eq("userId", userId)).first(),
    ]);

    const active = allEmails.filter((e) => !e.isVerwijderd);
    const inbox  = active.filter((e) => e.labelIds.includes("INBOX"));

    if (opts?.lite) {
      return { totaal: active.length, ongelezen: inbox.filter((e) => !e.isGelezen).length };
    }

    // ── Top afzenders (max 15) ────────────────────────────────────────────
    const senderMap = new Map<string, { count: number; ongelezen: number; categorieen: Record<string, number> }>();
    for (const e of active) {
      const sender = e.from.replace(/<.*>/, "").trim() || e.from;
      const entry = senderMap.get(sender) ?? { count: 0, ongelezen: 0, categorieen: {} };
      entry.count++;
      if (!e.isGelezen) entry.ongelezen++;
      const cat = e.categorie ?? "overig";
      entry.categorieen[cat] = (entry.categorieen[cat] ?? 0) + 1;
      senderMap.set(sender, entry);
    }
    const topAfzenders = [...senderMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15)
      .map(([naam, data]) => ({ naam, ...data }));

    // ── Categorie verdeling ───────────────────────────────────────────────
    const categorien: Record<string, number> = {};
    for (const e of active) {
      const cat = e.categorie ?? "overig";
      categorien[cat] = (categorien[cat] ?? 0) + 1;
    }

    // ── Dag-verdeling (7 dagen) ───────────────────────────────────────────
    const now = Date.now();
    const dagVerdeling: Record<string, number> = {};
    for (const e of active) {
      if (now - e.ontvangen < 7 * 86400000) {
        dagVerdeling[e.datum] = (dagVerdeling[e.datum] ?? 0) + 1;
      }
    }

    return {
      stats: {
        totaal: active.length, inbox: inbox.length,
        ongelezen: inbox.filter((e) => !e.isGelezen).length,
        verzonden: active.filter((e) => e.labelIds.includes("SENT")).length,
        ster: active.filter((e) => e.isSter).length,
        metBijlagen: active.filter((e) => e.heeftBijlagen).length,
      },
      topAfzenders,
      categorien,
      dagVerdeling,
      syncStatus: syncMeta ? { laatsteSync: syncMeta.lastFullSync, totaalGesynct: syncMeta.totalSynced } : null,
    };
  },
};
