"use node";

/**
 * convex/actions/sendGmail.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gmail actions voor berichten versturen, beantwoorden, en beheren.
 * Gebruikt googleapis gmail_v1 via de bestaande OAuth2 client.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { google } from "googleapis";
import { createOAuthClient } from "../lib/googleAuth";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeHeaderValue(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${field} is verplicht`);
  if (/[\r\n]/.test(trimmed)) throw new Error(`${field} bevat ongeldige headertekens`);
  return trimmed;
}

function sanitizeOptionalHeaderValue(value: string | undefined, field: string): string | undefined {
  if (!value) return undefined;
  return sanitizeHeaderValue(value, field);
}

function sanitizeAddressList(value: string, field: string): string {
  const cleaned = sanitizeHeaderValue(value, field);
  const parts = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) throw new Error(`${field} bevat geen adressen`);
  for (const part of parts) {
    if (!/^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(part.replace(/^.*<([^>]+)>$/, "$1"))) {
      throw new Error(`${field} bevat een ongeldig emailadres`);
    }
  }
  return parts.join(", ");
}

function sanitizeOptionalAddressList(value: string | undefined, field: string): string | undefined {
  if (!value) return undefined;
  return sanitizeAddressList(value, field);
}

function buildRawEmail(opts: {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
}): string {
  const to = sanitizeAddressList(opts.to, "To");
  const subject = sanitizeHeaderValue(opts.subject, "Subject");
  const cc = sanitizeOptionalAddressList(opts.cc, "Cc");
  const bcc = sanitizeOptionalAddressList(opts.bcc, "Bcc");
  const inReplyTo = sanitizeOptionalHeaderValue(opts.inReplyTo, "In-Reply-To");
  const references = sanitizeOptionalHeaderValue(opts.references, "References");

  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=UTF-8`,
    `MIME-Version: 1.0`,
  ];
  if (cc)         lines.push(`Cc: ${cc}`);
  if (bcc)        lines.push(`Bcc: ${bcc}`);
  if (inReplyTo)  lines.push(`In-Reply-To: ${inReplyTo}`);
  if (references) lines.push(`References: ${references}`);
  lines.push("", opts.body);

  const raw = lines.join("\r\n");
  // Gmail API verwacht URL-safe Base64
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ─── Send Email ──────────────────────────────────────────────────────────────

/** Nieuw email versturen via Gmail API. */
export const sendEmail = internalAction({
  args: {
    userId:  v.string(),
    to:      v.string(),
    subject: v.string(),
    body:    v.string(),         // HTML body
    cc:      v.optional(v.string()),
    bcc:     v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.userId) throw new Error("userId is vereist");

    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    const raw = buildRawEmail({
      to:      args.to,
      subject: args.subject,
      body:    args.body,
      cc:      args.cc,
      bcc:     args.bcc,
    });

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    return { ok: true, messageId: res.data.id };
  },
});

// ─── Reply ───────────────────────────────────────────────────────────────────

/** Reply op een bestaand email thread. */
export const replyToEmail = internalAction({
  args: {
    userId:   v.string(),
    gmailId:  v.string(),        // ID van het bericht waarop gereageerd wordt
    threadId: v.string(),
    to:       v.string(),
    body:     v.string(),        // HTML body
    cc:       v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.userId) throw new Error("userId is vereist");

    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    // Haal origineel bericht op voor subject en Message-ID
    const orig = await gmail.users.messages.get({
      userId: "me",
      id: args.gmailId,
      format: "metadata",
      metadataHeaders: ["Subject", "Message-ID"],
    });

    const headers   = orig.data.payload?.headers ?? [];
    const subject   = headers.find((h) => h.name === "Subject")?.value ?? "";
    const messageId = headers.find((h) => h.name === "Message-ID")?.value ?? "";

    const raw = buildRawEmail({
      to:         args.to,
      subject:    subject.startsWith("Re:") ? subject : `Re: ${subject}`,
      body:       args.body,
      cc:         args.cc,
      inReplyTo:  messageId,
      references: messageId,
    });

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw, threadId: args.threadId },
    });

    return { ok: true, messageId: res.data.id };
  },
});

// ─── Trash / Untrash ─────────────────────────────────────────────────────────

/** Verplaats email naar prullenbak. */
export const trashEmail = internalAction({
  args: { userId: v.string(), gmailId: v.string() },
  handler: async (ctx, { userId, gmailId }) => {
    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.messages.trash({ userId: "me", id: gmailId });
    await ctx.runMutation(internal.emails.trashInternal, { userId, gmailId, isVerwijderd: true });
    return { ok: true };
  },
});

/** Herstel email uit prullenbak. */
export const untrashEmail = internalAction({
  args: { userId: v.string(), gmailId: v.string() },
  handler: async (ctx, { userId, gmailId }) => {
    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.messages.untrash({ userId: "me", id: gmailId });
    await ctx.runMutation(internal.emails.trashInternal, { userId, gmailId, isVerwijderd: false });
    return { ok: true };
  },
});

// ─── Labels ──────────────────────────────────────────────────────────────────

/** Labels toevoegen of verwijderen van een bericht. */
export const modifyLabels = internalAction({
  args: {
    userId:        v.string(),
    gmailId:       v.string(),
    addLabels:     v.optional(v.array(v.string())),
    removeLabels:  v.optional(v.array(v.string())),
  },
  handler: async (_ctx, { gmailId, addLabels, removeLabels }) => {
    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.messages.modify({
      userId: "me",
      id: gmailId,
      requestBody: {
        addLabelIds:    addLabels ?? [],
        removeLabelIds: removeLabels ?? [],
      },
    });
    return { ok: true };
  },
});

// ─── Markeer gelezen/ongelezen ────────────────────────────────────────────────

/** Markeer bericht als gelezen. */
export const markGelezen = internalAction({
  args: { userId: v.string(), gmailId: v.string(), gelezen: v.boolean() },
  handler: async (ctx, { userId, gmailId, gelezen }) => {
    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    await gmail.users.messages.modify({
      userId: "me",
      id: gmailId,
      requestBody: gelezen
        ? { removeLabelIds: ["UNREAD"] }
        : { addLabelIds: ["UNREAD"] },
    });

    await ctx.runMutation(internal.emails.markGelezenInternal, { userId, gmailId, isGelezen: gelezen });
    return { ok: true };
  },
});

/** Markeer bericht met ster. */
export const markSter = internalAction({
  args: { userId: v.string(), gmailId: v.string(), ster: v.boolean() },
  handler: async (ctx, { userId, gmailId, ster }) => {
    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    await gmail.users.messages.modify({
      userId: "me",
      id: gmailId,
      requestBody: ster
        ? { addLabelIds: ["STARRED"] }
        : { removeLabelIds: ["STARRED"] },
    });

    await ctx.runMutation(internal.emails.markSterInternal, { userId, gmailId, isSter: ster });
    return { ok: true };
  },
});

// ─── Bulk Operations (Gmail batchModify) ─────────────────────────────────────

/** Batch markeer meerdere emails als gelezen/ongelezen. */
export const bulkMarkGelezen = internalAction({
  args: {
    userId:   v.string(),
    gmailIds: v.array(v.string()),
    gelezen:  v.boolean(),
  },
  handler: async (ctx, { userId, gmailIds, gelezen }) => {
    if (gmailIds.length === 0) return { ok: true, count: 0 };

    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    await gmail.users.messages.batchModify({
      userId: "me",
      requestBody: {
        ids: gmailIds,
        ...(gelezen
          ? { removeLabelIds: ["UNREAD"] }
          : { addLabelIds: ["UNREAD"] }),
      },
    });

    // Sync Convex state
    for (const gmailId of gmailIds) {
      await ctx.runMutation(internal.emails.markGelezenInternal, { userId, gmailId, isGelezen: gelezen });
    }
    return { ok: true, count: gmailIds.length };
  },
});

/** Batch verwijder meerdere emails (naar prullenbak). */
export const bulkTrash = internalAction({
  args: {
    userId:   v.string(),
    gmailIds: v.array(v.string()),
  },
  handler: async (ctx, { userId, gmailIds }) => {
    if (gmailIds.length === 0) return { ok: true, count: 0 };

    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    // Gmail heeft geen batchTrash, dus batchModify met TRASH label
    await gmail.users.messages.batchModify({
      userId: "me",
      requestBody: {
        ids: gmailIds,
        addLabelIds: ["TRASH"],
        removeLabelIds: ["INBOX"],
      },
    });

    for (const gmailId of gmailIds) {
      await ctx.runMutation(internal.emails.trashInternal, { userId, gmailId, isVerwijderd: true });
    }
    return { ok: true, count: gmailIds.length };
  },
});

// ─── Internal versions (callable from other actions like grok.ts) ────────────

/** Internal: markeer gelezen/ongelezen. */
export const markGelezenInternal = internalAction({
  args: { userId: v.string(), gmailId: v.string(), gelezen: v.boolean() },
  handler: async (ctx, { userId, gmailId, gelezen }) => {
    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.messages.modify({
      userId: "me", id: gmailId,
      requestBody: gelezen ? { removeLabelIds: ["UNREAD"] } : { addLabelIds: ["UNREAD"] },
    });
    await ctx.runMutation(internal.emails.markGelezenInternal, { userId, gmailId, isGelezen: gelezen });
    return { ok: true };
  },
});

/** Internal: markeer ster. */
export const markSterInternal = internalAction({
  args: { userId: v.string(), gmailId: v.string(), ster: v.boolean() },
  handler: async (ctx, { userId, gmailId, ster }) => {
    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.messages.modify({
      userId: "me", id: gmailId,
      requestBody: ster ? { addLabelIds: ["STARRED"] } : { removeLabelIds: ["STARRED"] },
    });
    await ctx.runMutation(internal.emails.markSterInternal, { userId, gmailId, isSter: ster });
    return { ok: true };
  },
});

/** Internal: trash email. */
export const trashEmailInternal = internalAction({
  args: { userId: v.string(), gmailId: v.string() },
  handler: async (ctx, { userId, gmailId }) => {
    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.messages.trash({ userId: "me", id: gmailId });
    await ctx.runMutation(internal.emails.trashInternal, { userId, gmailId, isVerwijderd: true });
    return { ok: true };
  },
});

/** Internal: batch markeer gelezen. */
export const bulkMarkGelezenInternal = internalAction({
  args: { userId: v.string(), gmailIds: v.array(v.string()), gelezen: v.boolean() },
  handler: async (ctx, { userId, gmailIds, gelezen }) => {
    if (gmailIds.length === 0) return { ok: true, count: 0 };
    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.messages.batchModify({
      userId: "me",
      requestBody: {
        ids: gmailIds,
        ...(gelezen ? { removeLabelIds: ["UNREAD"] } : { addLabelIds: ["UNREAD"] }),
      },
    });
    for (const gmailId of gmailIds) {
      await ctx.runMutation(internal.emails.markGelezenInternal, { userId, gmailId, isGelezen: gelezen });
    }
    return { ok: true, count: gmailIds.length };
  },
});

/** Internal: batch trash. */
export const bulkTrashInternal = internalAction({
  args: { userId: v.string(), gmailIds: v.array(v.string()) },
  handler: async (ctx, { userId, gmailIds }) => {
    if (gmailIds.length === 0) return { ok: true, count: 0 };
    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.messages.batchModify({
      userId: "me",
      requestBody: { ids: gmailIds, addLabelIds: ["TRASH"], removeLabelIds: ["INBOX"] },
    });
    for (const gmailId of gmailIds) {
      await ctx.runMutation(internal.emails.trashInternal, { userId, gmailId, isVerwijderd: true });
    }
    return { ok: true, count: gmailIds.length };
  },
});

// ─── Internal Send/Reply (voor Grok AI action calling) ───────────────────────

/** Internal: email versturen vanuit Grok action. */
export const sendEmailInternal = internalAction({
  args: {
    userId:  v.string(),
    to:      v.string(),
    subject: v.string(),
    body:    v.string(),
    cc:      v.optional(v.string()),
    bcc:     v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });
    const raw = buildRawEmail({
      to: args.to, subject: args.subject, body: args.body,
      cc: args.cc, bcc: args.bcc,
    });
    const res = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
    return { ok: true, messageId: res.data.id };
  },
});

/** Internal: reply op thread vanuit Grok action. */
export const replyToEmailInternal = internalAction({
  args: {
    userId:   v.string(),
    gmailId:  v.string(),
    threadId: v.string(),
    to:       v.string(),
    body:     v.string(),
    cc:       v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });
    const orig = await gmail.users.messages.get({
      userId: "me", id: args.gmailId, format: "metadata",
      metadataHeaders: ["Subject", "Message-ID"],
    });
    const headers   = orig.data.payload?.headers ?? [];
    const subject   = headers.find((h) => h.name === "Subject")?.value ?? "";
    const messageId = headers.find((h) => h.name === "Message-ID")?.value ?? "";
    const raw = buildRawEmail({
      to: args.to,
      subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
      body: args.body, cc: args.cc,
      inReplyTo: messageId, references: messageId,
    });
    const res = await gmail.users.messages.send({
      userId: "me", requestBody: { raw, threadId: args.threadId },
    });
    return { ok: true, messageId: res.data.id };
  },
});
