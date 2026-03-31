import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

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
        deadline: n.deadline ?? null,
        linkedEventId: n.linkedEventId ?? null,
        prioriteit: n.prioriteit ?? "normaal",
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
    userId:        v.string(),
    titel:         v.optional(v.string()),
    inhoud:        v.string(),
    tags:          v.optional(v.array(v.string())),
    kleur:         v.optional(v.string()),
    deadline:      v.optional(v.string()),
    linkedEventId: v.optional(v.string()),
    prioriteit:    v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const noteId = await ctx.db.insert("notes", {
      userId:        args.userId,
      titel:         args.titel,
      inhoud:        args.inhoud,
      tags:          args.tags,
      kleur:         args.kleur,
      deadline:      args.deadline,
      linkedEventId: args.linkedEventId,
      prioriteit:    args.prioriteit,
      isPinned:      false,
      isArchived:    false,
      aangemaakt:    now,
      gewijzigd:     now,
    });
    await syncNoteLinksHelper(ctx, noteId, args.userId, args.inhoud);
    return noteId;
  },
});

export const update = mutation({
  args: {
    id:            v.id("notes"),
    titel:         v.optional(v.string()),
    inhoud:        v.optional(v.string()),
    tags:          v.optional(v.array(v.string())),
    kleur:         v.optional(v.string()),
    deadline:      v.optional(v.string()),
    linkedEventId: v.optional(v.string()),
    prioriteit:    v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Notitie niet gevonden");

    const patch: Record<string, unknown> = { gewijzigd: new Date().toISOString() };
    if (fields.titel !== undefined)         patch.titel         = fields.titel;
    if (fields.inhoud !== undefined)        patch.inhoud         = fields.inhoud;
    if (fields.tags !== undefined)          patch.tags           = fields.tags;
    if (fields.kleur !== undefined)         patch.kleur          = fields.kleur;
    if (fields.deadline !== undefined)      patch.deadline       = fields.deadline;
    if (fields.linkedEventId !== undefined) patch.linkedEventId  = fields.linkedEventId;
    if (fields.prioriteit !== undefined)    patch.prioriteit     = fields.prioriteit;

    await ctx.db.patch(id, patch);
    const finalContent = fields.inhoud ?? existing.inhoud;
    await syncNoteLinksHelper(ctx, id, existing.userId, finalContent);
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
    userId:        v.string(),
    inhoud:        v.string(),
    titel:         v.optional(v.string()),
    tags:          v.optional(v.array(v.string())),
    deadline:      v.optional(v.string()),
    linkedEventId: v.optional(v.string()),
    prioriteit:    v.optional(v.string()),
    aangemaakt:    v.string(),
    gewijzigd:     v.string(),
  },
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("notes", {
      userId:        args.userId,
      titel:         args.titel,
      inhoud:        args.inhoud,
      tags:          args.tags,
      deadline:      args.deadline,
      linkedEventId: args.linkedEventId,
      prioriteit:    args.prioriteit,
      isPinned:      false,
      isArchived:    false,
      aangemaakt:    args.aangemaakt,
      gewijzigd:     args.gewijzigd,
    });
    await syncNoteLinksHelper(ctx, noteId, args.userId, args.inhoud);
    return noteId;
  },
});

export const updateInternal = internalMutation({
  args: {
    id:            v.string(),
    inhoud:        v.optional(v.string()),
    titel:         v.optional(v.string()),
    tags:          v.optional(v.array(v.string())),
    deadline:      v.optional(v.string()),
    linkedEventId: v.optional(v.string()),
    prioriteit:    v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const note = await ctx.db
      .query("notes")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();
    if (!note) throw new Error("Notitie niet gevonden");

    const patch: Record<string, unknown> = { gewijzigd: new Date().toISOString() };
    if (fields.inhoud !== undefined)        patch.inhoud         = fields.inhoud;
    if (fields.titel !== undefined)         patch.titel          = fields.titel;
    if (fields.tags !== undefined)          patch.tags           = fields.tags;
    if (fields.deadline !== undefined)      patch.deadline       = fields.deadline;
    if (fields.linkedEventId !== undefined) patch.linkedEventId  = fields.linkedEventId;
    if (fields.prioriteit !== undefined)    patch.prioriteit     = fields.prioriteit;

    await ctx.db.patch(note._id, patch);
    const finalContent = fields.inhoud ?? note.inhoud;
    await syncNoteLinksHelper(ctx, note._id, note.userId, finalContent);
  },
});

export const archiveInternal = internalMutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const note = await ctx.db
      .query("notes")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();
    if (!note) throw new Error("Notitie niet gevonden");
    await ctx.db.patch(note._id, {
      isArchived: true,
      isPinned: false,
      gewijzigd: new Date().toISOString(),
    });
  },
});

export const togglePinInternal = internalMutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
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

// ─── Triage System (AI-assisted cleanup) ──────────────────────────────────────

/** Detecteer notities die kandidaat zijn voor archivering */
export const getTriageCandidates = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    const now = new Date().toISOString();
    const staleThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const verstrekenDeadlines: typeof all = [];
    const afgevinkt: typeof all = [];
    const stale: typeof all = [];

    for (const n of all) {
      // 1. Verstreken deadline
      if (n.deadline && n.deadline < now) {
        verstrekenDeadlines.push(n);
        continue;
      }

      // 2. Volledig afgevinkte checklists
      const unchecked = (n.inhoud.match(/- \[ \]/g) ?? []).length;
      const checked = (n.inhoud.match(/- \[x\]/gi) ?? []).length;
      if (checked > 0 && unchecked === 0) {
        afgevinkt.push(n);
        continue;
      }

      // 3. Stale: >30 dagen niet gewijzigd, niet gepind
      if (!n.isPinned && n.gewijzigd < staleThreshold) {
        stale.push(n);
      }
    }

    const format = (n: typeof all[0]) => ({
      id: n._id,
      titel: n.titel || n.inhoud.slice(0, 40),
      deadline: n.deadline ?? null,
      gewijzigd: n.gewijzigd,
    });

    return {
      verstrekenDeadlines: verstrekenDeadlines.map(format),
      afgevinkt: afgevinkt.map(format),
      stale: stale.map(format),
      totaal: verstrekenDeadlines.length + afgevinkt.length + stale.length,
    };
  },
});

/** Wekelijkse cron: flag triage-kandidaten */
export const triageNotesInternal = internalMutation({
  handler: async (ctx): Promise<{ flagged: number }> => {
    const { JEFFREY_USER_ID } = await import("./lib/config");

    const all = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", JEFFREY_USER_ID))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    const now = new Date().toISOString();
    const staleThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const candidateIds: string[] = [];
    for (const n of all) {
      if (n.deadline && n.deadline < now) { candidateIds.push(n._id); continue; }
      const unchecked = (n.inhoud.match(/- \[ \]/g) ?? []).length;
      const checked = (n.inhoud.match(/- \[x\]/gi) ?? []).length;
      if (checked > 0 && unchecked === 0) { candidateIds.push(n._id); continue; }
      if (!n.isPinned && n.gewijzigd < staleThreshold) { candidateIds.push(n._id); }
    }

    // Reset old flags
    const flagged = await ctx.db
      .query("notes")
      .filter((q) => q.eq(q.field("triageFlag"), true))
      .collect();
    for (const n of flagged) {
      await ctx.db.patch(n._id, { triageFlag: undefined });
    }

    // Set new flags
    for (const id of candidateIds) {
      const note = await ctx.db.get(id as any);
      if (note) await ctx.db.patch(note._id, { triageFlag: true });
    }

    return { flagged: candidateIds.length };
  },
});

/** Bulk archiveer notities (AI triage bevestiging) */
export const bulkArchiveInternal = internalMutation({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, { ids }) => {
    const now = new Date().toISOString();
    let count = 0;
    for (const id of ids) {
      const note = await ctx.db
        .query("notes")
        .filter((q) => q.eq(q.field("_id"), id))
        .first();
      if (note && !note.isArchived) {
        await ctx.db.patch(note._id, {
          isArchived: true,
          isPinned: false,
          triageFlag: undefined,
          gewijzigd: now,
        });
        count++;
      }
    }
    return { gearchiveerd: count };
  },
});

// ─── Zettelkasten (bi-directionele [[nota]] links) ────────────────────────────

/** Autocomplete voor [[ syntax — doorzoekt titels */
export const searchTitles = query({
  args: { userId: v.string(), term: v.string() },
  handler: async (ctx, { userId, term }) => {
    const all = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    const lower = term.toLowerCase();
    return all
      .filter((n) => {
        const title = (n.titel ?? n.inhoud.slice(0, 40)).toLowerCase();
        return title.includes(lower);
      })
      .slice(0, 10)
      .map((n) => ({ id: n._id, titel: n.titel || n.inhoud.slice(0, 40) }));
  },
});

/** Haal alle notities op die naar deze notitie linken */
export const getBacklinks = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, { noteId }) => {
    const links = await ctx.db
      .query("noteLinks")
      .withIndex("by_target", (q) => q.eq("targetId", noteId))
      .collect();

    const results = [];
    for (const link of links) {
      const source = await ctx.db.get(link.sourceId);
      if (source && !source.isArchived) {
        results.push({ id: source._id, titel: source.titel || source.inhoud.slice(0, 40) });
      }
    }
    return results;
  },
});

/** Parse [[titel]] uit inhoud en synchroniseer noteLinks tabel */
async function syncNoteLinksHelper(
  ctx: any,
  noteId: any,
  userId: string,
  inhoud: string,
) {
  // Extract alle [[titel]] matches
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const linkedTitles: string[] = [];
  let match;
  while ((match = linkRegex.exec(inhoud)) !== null) {
    linkedTitles.push(match[1]);
  }

  // Resolve titels naar IDs
  const allNotes = await ctx.db
    .query("notes")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .filter((q: any) => q.eq(q.field("isArchived"), false))
    .collect();

  const targetIds: Set<string> = new Set();
  for (const title of linkedTitles) {
    const lower = title.toLowerCase();
    const target = allNotes.find((n: any) =>
      (n.titel ?? "").toLowerCase() === lower && n._id !== noteId
    );
    if (target) targetIds.add(target._id);
  }

  // Haal bestaande links op
  const existing = await ctx.db
    .query("noteLinks")
    .withIndex("by_source", (q: any) => q.eq("sourceId", noteId))
    .collect();

  const existingTargetIds = new Set(existing.map((l: any) => l.targetId));

  // Verwijder links die niet meer in de inhoud staan
  for (const link of existing) {
    if (!targetIds.has(link.targetId)) {
      await ctx.db.delete(link._id);
    }
  }

  // Maak nieuwe links aan
  const now = new Date().toISOString();
  for (const targetId of targetIds) {
    if (!existingTargetIds.has(targetId)) {
      await ctx.db.insert("noteLinks", {
        userId,
        sourceId: noteId,
        targetId: targetId as any,
        aangemaakt: now,
      });
    }
  }
}
