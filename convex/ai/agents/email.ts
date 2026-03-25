/**
 * 📧 Email Agent — "De communicatie manager"
 *
 * Gmail specialist. Token-safe: max 10 ongelezen, top 10 afzenders.
 */

import type { AgentDefinition, ContextOptions } from "../registry";

export const emailAgent: AgentDefinition = {
  id:           "email",
  naam:         "Email Agent",
  emoji:        "📧",
  beschrijving: "Gmail communicatie specialist. Analyseert inbox, herkent afzender-patronen, " +
                "categoriseert emails, en biedt full-text zoekfunctionaliteit.",
  domein:       ["emails", "emailSyncMeta"],
  capabilities: [
    "Inbox overzicht met ongelezen prioriteit",
    "Full-text zoeken in alle emails",
    "Afzender frequentie en patronen analyseren",
    "Emails per categorie filteren",
    "Thread overzicht met conversatie context",
    "Bijlagen detectie en inventarisatie",
  ],
  tools: [
    {
      naam: "emails.search", type: "query",
      beschrijving: "Full-text zoeken in alle emails",
      endpoint: "GET /emails/search",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "zoekterm", type: "string", beschrijving: "Zoekterm", verplicht: true },
        { naam: "inclVerwijderd", type: "boolean", beschrijving: "Verwijderde emails meenemen", verplicht: false, default: false },
      ],
    },
    {
      naam: "emails.list", type: "query",
      beschrijving: "Email listing met filters",
      endpoint: "GET /emails",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "label", type: "string", beschrijving: "Label filter", verplicht: false, enum: ["INBOX", "SENT", "TRASH", "STARRED", "DRAFT", "IMPORTANT"] },
        { naam: "onlyOngelezen", type: "boolean", beschrijving: "Alleen ongelezen tonen", verplicht: false },
      ],
    },
    {
      naam: "getGmailBody.getBody", type: "action",
      beschrijving: "Volledige email body ophalen (on-demand, niet gecached)",
      methode: "POST",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "gmailId", type: "string", beschrijving: "Gmail message ID", verplicht: true },
      ],
    },
    {
      naam: "sendGmail.sendEmail", type: "action",
      beschrijving: "Nieuw email versturen",
      methode: "POST",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "to", type: "string", beschrijving: "Ontvanger email", verplicht: true },
        { naam: "subject", type: "string", beschrijving: "Onderwerp", verplicht: true },
        { naam: "body", type: "string", beschrijving: "HTML email body", verplicht: true },
        { naam: "cc", type: "string", beschrijving: "CC adressen", verplicht: false },
      ],
    },
    {
      naam: "sendGmail.markGelezen", type: "action",
      beschrijving: "Email markeren als gelezen/ongelezen",
      methode: "POST",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "gmailId", type: "string", beschrijving: "Gmail message ID", verplicht: true },
        { naam: "gelezen", type: "boolean", beschrijving: "Markeer als gelezen (true) of ongelezen (false)", verplicht: true },
      ],
    },
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const [allEmails, syncMeta] = await Promise.all([
      ctx.db.query("emails").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("emailSyncMeta").withIndex("by_user", (q) => q.eq("userId", userId)).first(),
    ]);

    const active   = allEmails.filter((e) => !e.isVerwijderd);
    const inbox    = active.filter((e) => e.labelIds.includes("INBOX"));
    const ongelezen = inbox.filter((e) => !e.isGelezen);

    // ── Lite mode (voor dashboard) ────────────────────────────────────────
    if (opts?.lite) {
      return {
        inbox: inbox.length,
        ongelezen: ongelezen.length,
        recentste: ongelezen
          .sort((a, b) => b.ontvangen - a.ontvangen)
          .slice(0, 3)
          .map((e) => ({ van: e.from.replace(/<.*>/, "").trim(), onderwerp: e.subject })),
      };
    }

    // ── Top afzenders (max 10, token-safe) ─────────────────────────────────
    const senderMap = new Map<string, number>();
    for (const e of active) {
      const sender = e.from.replace(/<.*>/, "").trim() || e.from;
      senderMap.set(sender, (senderMap.get(sender) ?? 0) + 1);
    }
    const topAfzenders = [...senderMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([naam, aantal]) => ({ naam, aantal }));

    // ── Categorie verdeling ───────────────────────────────────────────────
    const categorien: Record<string, number> = {};
    for (const e of active) {
      const cat = e.categorie ?? "overig";
      categorien[cat] = (categorien[cat] ?? 0) + 1;
    }

    // ── Recente ongelezen (max 10, token-safe) ────────────────────────────
    const recenteOngelezen = ongelezen
      .sort((a, b) => b.ontvangen - a.ontvangen)
      .slice(0, 10)
      .map((e) => ({
        gmailId: e.gmailId, van: e.from.replace(/<.*>/, "").trim(),
        onderwerp: e.subject, snippet: e.snippet.slice(0, 80),
        datum: e.datum, categorie: e.categorie, bijlagen: e.bijlagenCount,
      }));

    return {
      stats: {
        totaal: active.length, inbox: inbox.length, ongelezen: ongelezen.length,
        verzonden: active.filter((e) => e.labelIds.includes("SENT")).length,
        ster: active.filter((e) => e.isSter).length,
        metBijlagen: active.filter((e) => e.heeftBijlagen).length,
      },
      topAfzenders,
      categorien,
      recenteOngelezen,
      syncStatus: syncMeta ? {
        laatsteSync: syncMeta.lastFullSync, totaalGesynct: syncMeta.totalSynced,
      } : null,
    };
  },
};
