/**
 * 🗂️ Email Manager — "De inbox manager"
 *
 * Expert in inbox organisatie: gelezen/ongelezen, ster, trash, labels.
 * Voert triage uit — sorteert, labelt, en ruimt op.
 */

import type { AgentDefinition, ContextOptions } from "../registry";

export const emailManagerAgent: AgentDefinition = {
  id:           "email-manager",
  naam:         "Email Manager",
  emoji:        "🗂️",
  beschrijving: "Inbox beheer specialist. Organiseert emails, markeert gelezen/ongelezen, " +
                "beheert sterren en labels, verplaatst naar prullenbak, en voert inbox triage uit.",
  domein:       ["emails"],
  capabilities: [
    "Email markeren als gelezen of ongelezen",
    "Ster toevoegen of verwijderen",
    "Email naar prullenbak verplaatsen",
    "Email uit prullenbak herstellen",
    "Labels toevoegen of verwijderen",
    "Bulk triage suggesties geven (wat kan weg/gelezen)",
    "Prullenbak inventarisatie",
  ],
  tools: [
    {
      naam: "sendGmail.markGelezen", type: "action",
      beschrijving: "Email markeren als gelezen/ongelezen",
      methode: "POST",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "gmailId", type: "string", beschrijving: "Gmail message ID", verplicht: true },
        { naam: "gelezen", type: "boolean", beschrijving: "true=gelezen, false=ongelezen", verplicht: true },
      ],
    },
    {
      naam: "sendGmail.markSter", type: "action",
      beschrijving: "Ster toevoegen of verwijderen",
      methode: "POST",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "gmailId", type: "string", beschrijving: "Gmail message ID", verplicht: true },
        { naam: "ster", type: "boolean", beschrijving: "true=ster toevoegen, false=verwijderen", verplicht: true },
      ],
    },
    {
      naam: "sendGmail.trashEmail", type: "action",
      beschrijving: "Email naar prullenbak verplaatsen",
      methode: "POST",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "gmailId", type: "string", beschrijving: "Gmail message ID", verplicht: true },
      ],
    },
    {
      naam: "sendGmail.untrashEmail", type: "action",
      beschrijving: "Email herstellen uit prullenbak",
      methode: "POST",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "gmailId", type: "string", beschrijving: "Gmail message ID", verplicht: true },
      ],
    },
    {
      naam: "sendGmail.modifyLabels", type: "action",
      beschrijving: "Labels toevoegen of verwijderen van een email",
      methode: "POST",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "gmailId", type: "string", beschrijving: "Gmail message ID", verplicht: true },
        { naam: "addLabels", type: "array", beschrijving: "Labels om toe te voegen", verplicht: false },
        { naam: "removeLabels", type: "array", beschrijving: "Labels om te verwijderen", verplicht: false },
      ],
    },
    {
      naam: "emails.list", type: "query",
      beschrijving: "Emails ophalen met filters",
      endpoint: "GET /emails",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "label", type: "string", beschrijving: "Label filter", verplicht: false, enum: ["INBOX", "SENT", "TRASH", "STARRED", "DRAFT"] },
        { naam: "onlyOngelezen", type: "boolean", beschrijving: "Alleen ongelezen", verplicht: false },
      ],
    },
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const allEmails = await ctx.db.query("emails")
      .withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    const active = allEmails.filter((e) => !e.isVerwijderd);
    const inbox  = active.filter((e) => e.labelIds.includes("INBOX"));
    const ongelezen = inbox.filter((e) => !e.isGelezen);

    if (opts?.lite) {
      return { ongelezen: ongelezen.length, prullenbak: allEmails.filter((e) => e.isVerwijderd).length };
    }

    // ── Triage overzicht ──────────────────────────────────────────────────
    const oud = ongelezen.filter((e) => Date.now() - e.ontvangen > 7 * 86400000);
    const nieuwsbrief = ongelezen.filter((e) =>
      e.categorie === "promotions" || e.categorie === "social" || e.categorie === "forums"
    );

    return {
      inbox: {
        totaal: inbox.length,
        ongelezen: ongelezen.length,
        ster: active.filter((e) => e.isSter).length,
        concepten: active.filter((e) => e.isDraft).length,
        prullenbak: allEmails.filter((e) => e.isVerwijderd).length,
      },

      triage: {
        oudOngelezen: oud.length,
        nieuwsbrieven: nieuwsbrief.length,
        suggestie: oud.length > 5
          ? `${oud.length} ongelezen emails ouder dan 7 dagen — overweeg bulk markeren als gelezen`
          : nieuwsbrief.length > 10
            ? `${nieuwsbrief.length} ongelezen nieuwsbrieven/promoties — overweeg opruimen`
            : "Inbox ziet er goed uit!",
      },

      oudsteOngelezen: oud
        .sort((a, b) => a.ontvangen - b.ontvangen)
        .slice(0, 10)
        .map((e) => ({
          gmailId: e.gmailId, van: e.from.replace(/<.*>/, "").trim(),
          onderwerp: e.subject, datum: e.datum, categorie: e.categorie,
        })),

      recentePrullenbak: allEmails
        .filter((e) => e.isVerwijderd)
        .sort((a, b) => b.ontvangen - a.ontvangen)
        .slice(0, 5)
        .map((e) => ({
          gmailId: e.gmailId, van: e.from.replace(/<.*>/, "").trim(),
          onderwerp: e.subject, datum: e.datum,
        })),
    };
  },
};
