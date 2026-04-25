"use node";

/**
 * convex/actions/getGmailBody.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * On-demand body ophalen voor een specifiek email bericht.
 * Wordt NIET opgeslagen in Convex — elke keer vers uit Gmail API gehaald.
 * Dit bespaart opslag (~50KB per email body × duizenden emails).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { google } from "googleapis";
import { createOAuthClient } from "../lib/googleAuth";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function decodeBody(encoded: string): string {
  return Buffer.from(encoded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function extractBody(payload: any): { html: string; text: string } {
  let html = "";
  let text = "";

  if (payload.body?.data) {
    const decoded = decodeBody(payload.body.data);
    if (payload.mimeType === "text/html") html = decoded;
    else text = decoded;
  }

  const parts = payload.parts ?? [];
  for (const part of parts) {
    if (part.mimeType === "text/html" && part.body?.data) {
      html = decodeBody(part.body.data);
    } else if (part.mimeType === "text/plain" && part.body?.data) {
      text = decodeBody(part.body.data);
    } else if (part.parts) {
      // Nested multipart (bijv. multipart/alternative in multipart/mixed)
      const nested = extractBody(part);
      if (nested.html) html = nested.html;
      if (nested.text && !text) text = nested.text;
    }
  }

  return { html, text };
}

function extractAttachments(payload: any, gmailId: string): {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}[] {
  const attachments: any[] = [];
  const parts = payload.parts ?? [];

  for (const part of parts) {
    if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
      attachments.push({
        filename:     part.filename,
        mimeType:     part.mimeType ?? "application/octet-stream",
        size:         part.body.size ?? 0,
        attachmentId: part.body.attachmentId,
      });
    }
    if (part.parts) {
      attachments.push(...extractAttachments(part, gmailId));
    }
  }

  return attachments;
}

// ─── Action ──────────────────────────────────────────────────────────────────

async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Niet ingelogd");
  return identity.subject;
}

async function verifyKnownEmail(ctx: any, userId: string, gmailId: string) {
  const email = await ctx.runQuery(internal.emails.getByGmailIdInternal, { userId, gmailId });
  if (!email) throw new Error("Email niet gevonden voor deze gebruiker");
}

/** Haal de volledige body + bijlagen metadata op voor een specifiek email. */
export const getBody = action({
  args: {
    userId:  v.string(),
    gmailId: v.string(),
  },
  handler: async (ctx, { userId, gmailId }) => {
    const owner = await requireUserId(ctx);
    if (owner !== userId) throw new Error("Unauthorized");
    await verifyKnownEmail(ctx, owner, gmailId);

    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    const res = await gmail.users.messages.get({
      userId: "me",
      id: gmailId,
      format: "full",
    });

    const payload = res.data.payload;
    if (!payload) throw new Error("Geen payload in Gmail response");

    const { html, text } = extractBody(payload);
    const attachments     = extractAttachments(payload, gmailId);

    const headers = payload.headers ?? [];
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

    return {
      gmailId,
      html,
      text,
      from:    getHeader("From"),
      to:      getHeader("To"),
      cc:      getHeader("Cc"),
      date:    getHeader("Date"),
      subject: getHeader("Subject"),
      attachments,
    };
  },
});

/** Download een specifieke bijlage als base64. */
export const getAttachment = action({
  args: {
    gmailId:      v.string(),
    attachmentId: v.string(),
  },
  handler: async (ctx, { gmailId, attachmentId }) => {
    const userId = await requireUserId(ctx);
    await verifyKnownEmail(ctx, userId, gmailId);

    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    const res = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId: gmailId,
      id: attachmentId,
    });

    return {
      data: res.data.data ?? "",  // base64 encoded
      size: res.data.size ?? 0,
    };
  },
});

// ─── Internal (voor Grok AI action calling) ──────────────────────────────────

/** Internal: email body ophalen vanuit Grok action. */
export const getBodyInternal = internalAction({
  args: { userId: v.string(), gmailId: v.string() },
  handler: async (ctx, { userId, gmailId }) => {
    await verifyKnownEmail(ctx, userId, gmailId);

    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.messages.get({ userId: "me", id: gmailId, format: "full" });
    const payload = res.data.payload;
    if (!payload) throw new Error("Geen payload in Gmail response");

    const { html, text } = extractBody(payload);
    const attachments     = extractAttachments(payload, gmailId);
    const headers = payload.headers ?? [];
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

    return {
      gmailId, html, text,
      from: getHeader("From"), to: getHeader("To"), cc: getHeader("Cc"),
      date: getHeader("Date"), subject: getHeader("Subject"),
      attachments,
    };
  },
});
