/**
 * convex/chatMessages.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Telegram conversation history — geeft Grok geheugen per chat.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Sla een bericht op (user of assistant). */
export const save = mutation({
  args: {
    chatId:  v.number(),
    role:    v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatMessages", {
      ...args,
      createdAt: new Date().toISOString(),
    });

    // Bewaar max 20 berichten per chat (FIFO)
    const all = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();
    if (all.length > 20) {
      const toDelete = all.slice(0, all.length - 20);
      for (const msg of toDelete) await ctx.db.delete(msg._id);
    }
  },
});

/** Haal de laatste N berichten op voor een chat. */
export const getHistory = query({
  args: {
    chatId: v.number(),
    limit:  v.optional(v.number()),
  },
  handler: async (ctx, { chatId, limit }) => {
    const all = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .collect();
    const n = limit ?? 10;
    return all.slice(-n);
  },
});
