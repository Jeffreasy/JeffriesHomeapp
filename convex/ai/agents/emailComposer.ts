/**
 * ✍️ Email Composer — "De communicatie specialist"
 *
 * Expert in email opstellen, versturen, en beantwoorden.
 * Schrijft, formatteert, en verzendt emails via Gmail API.
 */

import type { AgentDefinition, ContextOptions } from "../registry";

export const emailComposerAgent: AgentDefinition = {
  id:           "email-composer",
  naam:         "Email Composer",
  emoji:        "✍️",
  beschrijving: "Communicatie specialist. Stelt emails op, beantwoordt threads, " +
                "en kan professionele berichten formuleren namens de gebruiker.",
  domein:       ["emails"],
  capabilities: [
    "Nieuw email opstellen en versturen",
    "Reply op bestaande thread schrijven",
    "Professionele toon en opmaak toepassen",
    "CC/BCC beheren",
    "Gesprekscontext meenemen bij reply",
  ],
  tools: [
    {
      naam: "sendGmail.sendEmail", type: "action",
      beschrijving: "Nieuw email versturen",
      methode: "POST",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "to", type: "string", beschrijving: "Ontvanger email adres", verplicht: true },
        { naam: "subject", type: "string", beschrijving: "Onderwerp", verplicht: true },
        { naam: "body", type: "string", beschrijving: "Email body (HTML)", verplicht: true },
        { naam: "cc", type: "string", beschrijving: "CC adressen (komma-gescheiden)", verplicht: false },
        { naam: "bcc", type: "string", beschrijving: "BCC adressen (komma-gescheiden)", verplicht: false },
      ],
    },
    {
      naam: "sendGmail.replyToEmail", type: "action",
      beschrijving: "Reply op een bestaande email thread",
      methode: "POST",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "gmailId", type: "string", beschrijving: "Gmail message ID om op te reageren", verplicht: true },
        { naam: "threadId", type: "string", beschrijving: "Thread ID", verplicht: true },
        { naam: "to", type: "string", beschrijving: "Ontvanger email", verplicht: true },
        { naam: "body", type: "string", beschrijving: "Reply body (HTML)", verplicht: true },
        { naam: "cc", type: "string", beschrijving: "CC adressen", verplicht: false },
      ],
    },
    {
      naam: "emails.search", type: "query",
      beschrijving: "Zoek emails (voor context bij reply)",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "zoekterm", type: "string", beschrijving: "Zoekterm", verplicht: true },
      ],
    },
    {
      naam: "emails.getThread", type: "query",
      beschrijving: "Hele thread ophalen (voor context bij reply)",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "threadId", type: "string", beschrijving: "Thread ID", verplicht: true },
      ],
    },
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const allEmails = await ctx.db.query("emails")
      .withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    const active = allEmails.filter((e) => !e.isVerwijderd);
    const sent   = active.filter((e) => e.labelIds.includes("SENT"));

    if (opts?.lite) {
      return { verzonden: sent.length, concepten: active.filter((e) => e.isDraft).length };
    }

    // ── Recente verzonden (max 10) ────────────────────────────────────────
    const recentVerzonden = sent
      .sort((a, b) => b.ontvangen - a.ontvangen)
      .slice(0, 10)
      .map((e) => ({
        gmailId: e.gmailId, threadId: e.threadId,
        aan: e.to, onderwerp: e.subject,
        datum: e.datum, snippet: e.snippet.slice(0, 80),
      }));

    // ── Frequente ontvangers ──────────────────────────────────────────────
    const ontvangerMap = new Map<string, number>();
    for (const e of sent) {
      const to = e.to.replace(/<.*>/, "").trim() || e.to;
      ontvangerMap.set(to, (ontvangerMap.get(to) ?? 0) + 1);
    }
    const frequenteOntvangers = [...ontvangerMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([naam, aantal]) => ({ naam, aantal }));

    // ── Onbeantwoorde threads ─────────────────────────────────────────────
    const inbox = active.filter((e) => e.labelIds.includes("INBOX") && !e.isGelezen);
    const onbeantwoord = inbox
      .sort((a, b) => b.ontvangen - a.ontvangen)
      .slice(0, 10)
      .map((e) => ({
        gmailId: e.gmailId, threadId: e.threadId,
        van: e.from.replace(/<.*>/, "").trim(),
        onderwerp: e.subject, datum: e.datum,
        snippet: e.snippet.slice(0, 80),
      }));

    return {
      recentVerzonden,
      frequenteOntvangers,
      onbeantwoord,
      stats: { verzonden: sent.length, concepten: active.filter((e) => e.isDraft).length },
    };
  },
};
