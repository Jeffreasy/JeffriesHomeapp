"use node";

/**
 * convex/actions/syncGmail.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gmail sync action: haalt email metadata + snippets op via Gmail API
 * en slaat ze op in de Convex emails tabel.
 *
 * Twee modi:
 *   1. Initial sync — eerste keer: haalt laatste 200 emails op
 *   2. Incremental sync — daarna: gebruikt history.list() voor delta
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { internalAction, action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { google } from "googleapis";
import { createOAuthClient } from "../lib/googleAuth";

const MAX_INITIAL_SYNC = 200;
const BATCH_SIZE       = 20; // parallel message.get calls per batch

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function categorizeLabels(labelIds: string[]): string | undefined {
  if (labelIds.includes("CATEGORY_SOCIAL"))     return "social";
  if (labelIds.includes("CATEGORY_PROMOTIONS")) return "promotions";
  if (labelIds.includes("CATEGORY_UPDATES"))    return "updates";
  if (labelIds.includes("CATEGORY_FORUMS"))     return "forums";
  if (labelIds.includes("CATEGORY_PERSONAL"))   return "primary";
  return "primary";
}

function parseEmail(msg: any, userId: string): {
  userId: string; gmailId: string; threadId: string;
  from: string; to: string; cc?: string; bcc?: string;
  subject: string; snippet: string; datum: string; ontvangen: number;
  isGelezen: boolean; isSter: boolean; isVerwijderd: boolean; isDraft: boolean;
  labelIds: string[]; categorie?: string;
  heeftBijlagen: boolean; bijlagenCount: number;
  searchText: string; syncedAt: string;
} {
  const headers   = msg.payload?.headers ?? [];
  const labelIds  = msg.labelIds ?? [];
  const parts     = msg.payload?.parts ?? [];

  const from    = getHeader(headers, "From");
  const to      = getHeader(headers, "To");
  const cc      = getHeader(headers, "Cc") || undefined;
  const bcc     = getHeader(headers, "Bcc") || undefined;
  const subject = getHeader(headers, "Subject") || "(geen onderwerp)";

  const ontvangen = parseInt(msg.internalDate ?? "0", 10);
  const datum     = new Date(ontvangen).toISOString().slice(0, 10);

  const attachments = parts.filter((p: any) => p.filename && p.filename.length > 0);

  const searchText = [subject, msg.snippet ?? "", from, to].join(" ").slice(0, 500);

  return {
    userId,
    gmailId:       msg.id,
    threadId:      msg.threadId ?? msg.id,
    from, to, cc, bcc,
    subject,
    snippet:       msg.snippet ?? "",
    datum,
    ontvangen,
    isGelezen:     !labelIds.includes("UNREAD"),
    isSter:        labelIds.includes("STARRED"),
    isVerwijderd:  labelIds.includes("TRASH"),
    isDraft:       labelIds.includes("DRAFT"),
    labelIds:      labelIds.filter((l: string) => !l.startsWith("CATEGORY_")),
    categorie:     categorizeLabels(labelIds),
    heeftBijlagen: attachments.length > 0,
    bijlagenCount: attachments.length,
    searchText,
    syncedAt:      new Date().toISOString(),
  };
}

// ─── Internal Action (voor cron) ─────────────────────────────────────────────

export const syncFromGmail = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<{ synced: number; mode: string }> => {
    const auth  = createOAuthClient();
    const gmail = google.gmail({ version: "v1", auth });

    // Check sync meta voor incremental
    const meta = await ctx.runQuery(internal.emails.getSyncMeta, { userId });

    if (meta?.historyId) {
      // ─── Incremental sync via history ────────────────────────────────────
      try {
        const histRes = await gmail.users.history.list({
          userId: "me",
          startHistoryId: meta.historyId,
          historyTypes: ["messageAdded", "messageDeleted", "labelAdded", "labelRemoved"],
        });

        const changedIds = new Set<string>();
        for (const h of histRes.data.history ?? []) {
          for (const m of [...(h.messagesAdded ?? []), ...(h.labelsAdded ?? []), ...(h.labelsRemoved ?? [])]) {
            if (m.message?.id) changedIds.add(m.message.id);
          }
        }

        if (changedIds.size === 0) {
          // Niets veranderd — update alleen timestamp
          await ctx.runMutation(internal.emails.upsertSyncMeta, {
            userId,
            historyId: histRes.data.historyId ?? meta.historyId,
            lastFullSync: meta.lastFullSync,
            totalSynced: meta.totalSynced,
          });
          return { synced: 0, mode: "incremental" };
        }

        // Haal gewijzigde berichten op
        const emails = [];
        const ids = Array.from(changedIds);
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          const batch = ids.slice(i, i + BATCH_SIZE);
          const results = await Promise.allSettled(
            batch.map((id) =>
              gmail.users.messages.get({ userId: "me", id, format: "metadata", metadataHeaders: ["From", "To", "Cc", "Bcc", "Subject"] })
            )
          );
          for (const r of results) {
            if (r.status === "fulfilled" && r.value.data) {
              emails.push(parseEmail(r.value.data, userId));
            }
          }
        }

        if (emails.length > 0) {
          await ctx.runMutation(internal.emails.bulkUpsertInternal, { emails });
        }

        await ctx.runMutation(internal.emails.upsertSyncMeta, {
          userId,
          historyId: histRes.data.historyId ?? meta.historyId,
          lastFullSync: meta.lastFullSync,
          totalSynced: meta.totalSynced + emails.length,
        });

        return { synced: emails.length, mode: "incremental" };
      } catch (e: any) {
        // Als historyId verlopen is → full sync
        if (e.code === 404 || e.message?.includes("Start history id")) {
          console.log("[Gmail Sync] History verlopen, fallback naar full sync");
        } else {
          throw e;
        }
      }
    }

    // ─── Full sync ─────────────────────────────────────────────────────────
    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults: MAX_INITIAL_SYNC,
    });

    const messageIds = (listRes.data.messages ?? []).map((m) => m.id!);
    if (messageIds.length === 0) return { synced: 0, mode: "full" };

    const emails = [];
    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
      const batch = messageIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((id) =>
          gmail.users.messages.get({ userId: "me", id, format: "metadata", metadataHeaders: ["From", "To", "Cc", "Bcc", "Subject"] })
        )
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.data) {
          emails.push(parseEmail(r.value.data, userId));
        }
      }
    }

    if (emails.length > 0) {
      // Splits in batches van 50 voor Convex mutation limiet
      for (let i = 0; i < emails.length; i += 50) {
        await ctx.runMutation(internal.emails.bulkUpsertInternal, {
          emails: emails.slice(i, i + 50),
        });
      }
    }

    // Haal het huidige historyId op voor toekomstige incremental sync
    const profileRes = await gmail.users.getProfile({ userId: "me" });
    const historyId  = String(profileRes.data.historyId ?? "");

    await ctx.runMutation(internal.emails.upsertSyncMeta, {
      userId,
      historyId,
      lastFullSync: new Date().toISOString(),
      totalSynced: emails.length,
    });

    return { synced: emails.length, mode: "full" };
  },
});

// ─── Publieke action (voor frontend "Sync nu" knop) ──────────────────────────

export const syncNow = action({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<{ synced: number; mode: string }> => {
    if (!userId) throw new Error("userId is vereist");
    return ctx.runAction(internal.actions.syncGmail.syncFromGmail, { userId });
  },
});
