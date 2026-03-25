/**
 * 🔍 Email Reader — "De email-lezer"
 *
 * Expert in email content ophalen, zoeken, en threads lezen.
 * Haalt volledige body + bijlagen on-demand op via Gmail API.
 */

import type { AgentDefinition, ContextOptions } from "../registry";

export const emailReaderAgent: AgentDefinition = {
  id:           "email-reader",
  naam:         "Email Reader",
  emoji:        "🔍",
  beschrijving: "Email content specialist. Zoekt en leest volledige email bodies, " +
                "volgt thread-conversaties, en haalt bijlagen op. Kan email content " +
                "samenvatten en analyseren.",
  domein:       ["emails"],
  capabilities: [
    "Full-text zoeken in alle emails",
    "Volledige email body ophalen (on-demand)",
    "Thread-conversatie volgen (alle berichten chronologisch)",
    "Bijlagen inventariseren en downloaden",
    "Email content samenvatten",
    "Specifieke informatie uit emails extraheren",
  ],
  tools: [
    {
      naam: "emails.search", type: "query",
      beschrijving: "Full-text zoeken in alle emails",
      endpoint: "GET /emails/search",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "zoekterm", type: "string", beschrijving: "Zoekterm (doorzoekt subject, snippet, afzender)", verplicht: true },
        { naam: "inclVerwijderd", type: "boolean", beschrijving: "Verwijderde meenemen", verplicht: false, default: false },
      ],
    },
    {
      naam: "emails.getThread", type: "query",
      beschrijving: "Alle berichten in een thread ophalen (chronologisch)",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "threadId", type: "string", beschrijving: "Thread ID", verplicht: true },
      ],
    },
    {
      naam: "getGmailBody.getBody", type: "action",
      beschrijving: "Volledige email body + bijlagen ophalen (on-demand via Gmail API)",
      methode: "POST",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "gmailId", type: "string", beschrijving: "Gmail message ID", verplicht: true },
      ],
    },
    {
      naam: "getGmailBody.getAttachment", type: "action",
      beschrijving: "Bijlage downloaden als base64",
      methode: "POST",
      parameters: [
        { naam: "gmailId", type: "string", beschrijving: "Gmail message ID", verplicht: true },
        { naam: "attachmentId", type: "string", beschrijving: "Bijlage ID", verplicht: true },
      ],
    },
    {
      naam: "emails.list", type: "query",
      beschrijving: "Emails ophalen met filters (voor browsen)",
      endpoint: "GET /emails",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "label", type: "string", beschrijving: "Label filter", verplicht: false, enum: ["INBOX", "SENT", "TRASH", "STARRED"] },
      ],
    },
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const allEmails = await ctx.db.query("emails")
      .withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    const active = allEmails.filter((e) => !e.isVerwijderd);

    if (opts?.lite) {
      return { totaal: active.length, metBijlagen: active.filter((e) => e.heeftBijlagen).length };
    }

    // ── Recente emails (max 15, voor browsing) ────────────────────────────
    const recente = active
      .sort((a, b) => b.ontvangen - a.ontvangen)
      .slice(0, 15)
      .map((e) => ({
        gmailId: e.gmailId, threadId: e.threadId,
        van: e.from.replace(/<.*>/, "").trim(),
        onderwerp: e.subject, snippet: e.snippet.slice(0, 100),
        datum: e.datum, gelezen: e.isGelezen,
        bijlagen: e.bijlagenCount, categorie: e.categorie,
      }));

    // ── Unieke threads ────────────────────────────────────────────────────
    const threadMap = new Map<string, number>();
    for (const e of active) threadMap.set(e.threadId, (threadMap.get(e.threadId) ?? 0) + 1);
    const multiMessageThreads = [...threadMap.entries()]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([threadId, berichten]) => {
        const first = active.find((e) => e.threadId === threadId);
        return { threadId, berichten, onderwerp: first?.subject ?? "", laatsteDatum: first?.datum ?? "" };
      });

    // ── Emails met bijlagen ───────────────────────────────────────────────
    const metBijlagen = active
      .filter((e) => e.heeftBijlagen)
      .sort((a, b) => b.ontvangen - a.ontvangen)
      .slice(0, 10)
      .map((e) => ({
        gmailId: e.gmailId, van: e.from.replace(/<.*>/, "").trim(),
        onderwerp: e.subject, datum: e.datum, bijlagen: e.bijlagenCount,
      }));

    return {
      recente,
      multiMessageThreads,
      metBijlagen,
      stats: { totaal: active.length, threads: threadMap.size, metBijlagen: metBijlagen.length },
    };
  },
};
