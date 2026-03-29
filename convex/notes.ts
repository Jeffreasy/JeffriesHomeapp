import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const search = query({
  args: { userId: v.string(), zoekterm: v.string() },
  handler: async (ctx, { userId, zoekterm }) => {
    return ctx.db
      .query("notes")
      .withSearchIndex("search_notes", (q) =>
        q.search("inhoud", zoekterm).eq("userId", userId).eq("isArchived", false)
      )
      .take(20);
  },
});

export const recent = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    return ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .filter((q) => q.eq(q.field("isArchived"), false))
      .take(limit ?? 5);
  },
});

// ─── Internal Queries (AI agent) ──────────────────────────────────────────────

export const listForAgent = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const pinned = await ctx.db
      .query("notes")
      .withIndex("by_user_pinned", (q) => q.eq("userId", userId).eq("isPinned", true))
      .collect();

    const recent = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .filter((q) => q.eq(q.field("isArchived"), false))
      .take(10);

    const ids = new Set(pinned.map((n) => n._id));
    const merged = [...pinned, ...recent.filter((n) => !ids.has(n._id))];

    return {
      totaal: merged.length,
      pinned: pinned.length,
      notities: merged.map((n) => ({
        id: n._id,
        titel: n.titel || n.inhoud.slice(0, 40),
        inhoud: n.inhoud.length > 200 ? n.inhoud.slice(0, 200) + "…" : n.inhoud,
        tags: n.tags ?? [],
        isPinned: n.isPinned,
        aangemaakt: n.aangemaakt,
        gewijzigd: n.gewijzigd,
      })),
    };
  },
});

export const searchInternal = internalQuery({
  args: { userId: v.string(), zoekterm: v.string() },
  handler: async (ctx, { userId, zoekterm }) => {
    return ctx.db
      .query("notes")
      .withSearchIndex("search_notes", (q) =>
        q.search("inhoud", zoekterm).eq("userId", userId).eq("isArchived", false)
      )
      .take(10);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    userId:  v.string(),
    titel:   v.optional(v.string()),
    inhoud:  v.string(),
    tags:    v.optional(v.array(v.string())),
    kleur:   v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return ctx.db.insert("notes", {
      userId:     args.userId,
      titel:      args.titel,
      inhoud:     args.inhoud,
      tags:       args.tags,
      kleur:      args.kleur,
      isPinned:   false,
      isArchived: false,
      aangemaakt: now,
      gewijzigd:  now,
    });
  },
});

export const update = mutation({
  args: {
    id:      v.id("notes"),
    titel:   v.optional(v.string()),
    inhoud:  v.optional(v.string()),
    tags:    v.optional(v.array(v.string())),
    kleur:   v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Notitie niet gevonden");

    const patch: Record<string, unknown> = { gewijzigd: new Date().toISOString() };
    if (fields.titel !== undefined)  patch.titel  = fields.titel;
    if (fields.inhoud !== undefined) patch.inhoud  = fields.inhoud;
    if (fields.tags !== undefined)   patch.tags    = fields.tags;
    if (fields.kleur !== undefined)  patch.kleur   = fields.kleur;

    await ctx.db.patch(id, patch);
  },
});

export const togglePin = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const note = await ctx.db.get(id);
    if (!note) throw new Error("Notitie niet gevonden");
    await ctx.db.patch(id, {
      isPinned: !note.isPinned,
      gewijzigd: new Date().toISOString(),
    });
  },
});

export const archive = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const note = await ctx.db.get(id);
    if (!note) throw new Error("Notitie niet gevonden");
    await ctx.db.patch(id, {
      isArchived: !note.isArchived,
      isPinned: false,
      gewijzigd: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const note = await ctx.db.get(id);
    if (!note) throw new Error("Notitie niet gevonden");
    await ctx.db.delete(id);
  },
});

// ─── Internal Mutations (AI tools) ────────────────────────────────────────────

export const createInternal = internalMutation({
  args: {
    userId:     v.string(),
    inhoud:     v.string(),
    titel:      v.optional(v.string()),
    tags:       v.optional(v.array(v.string())),
    aangemaakt: v.string(),
    gewijzigd:  v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("notes", {
      userId:     args.userId,
      titel:      args.titel,
      inhoud:     args.inhoud,
      tags:       args.tags,
      isPinned:   false,
      isArchived: false,
      aangemaakt: args.aangemaakt,
      gewijzigd:  args.gewijzigd,
    });
  },
});

export const togglePinInternal = internalMutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    // Look up by querying to safely handle string IDs from Grok tools
    const note = await ctx.db
      .query("notes")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();
    if (!note) throw new Error("Notitie niet gevonden");
    await ctx.db.patch(note._id, {
      isPinned: !note.isPinned,
      gewijzigd: new Date().toISOString(),
    });
  },
});

