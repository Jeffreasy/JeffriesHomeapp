/**
 * convex/ai/grok/tools/notes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Grok tool handlers for personal notes (create, search, pin).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { internal } from "../../../_generated/api";

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleNotitieMaken(
  ctx: any,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const inhoud = args.inhoud as string;
  const titel  = args.titel as string | undefined;
  const tags   = args.tags as string[] | undefined;

  if (!inhoud?.trim()) {
    return JSON.stringify({ error: "Inhoud mag niet leeg zijn." });
  }

  const now = new Date().toISOString();
  const id = await ctx.runMutation(internal.notes.createInternal, {
    userId,
    inhoud: inhoud.trim(),
    titel: titel?.trim(),
    tags,
    aangemaakt: now,
    gewijzigd:  now,
  });

  return JSON.stringify({
    ok: true,
    message: `Notitie aangemaakt${titel ? ` "${titel}"` : ""}.`,
    noteId: id,
    tags: tags ?? [],
  });
}

export async function handleNotitiesZoeken(
  ctx: any,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const zoekterm = args.zoekterm as string;
  if (!zoekterm?.trim()) {
    return JSON.stringify({ error: "Zoekterm mag niet leeg zijn." });
  }

  const results = await ctx.runQuery(internal.notes.searchInternal, {
    userId,
    zoekterm: zoekterm.trim(),
  });

  if (!results || results.length === 0) {
    return JSON.stringify({ gevonden: 0, message: `Geen notities gevonden voor "${zoekterm}".` });
  }

  return JSON.stringify({
    gevonden: results.length,
    notities: results.map((n: any) => ({
      id:     n._id,
      titel:  n.titel || n.inhoud.slice(0, 50),
      inhoud: n.inhoud.length > 200 ? n.inhoud.slice(0, 200) + "…" : n.inhoud,
      tags:   n.tags ?? [],
      pinned: n.isPinned,
      datum:  n.gewijzigd,
    })),
  });
}

export async function handleNotitiePinnen(
  ctx: any,
  args: Record<string, unknown>,
): Promise<string> {
  const noteId = args.noteId as string;
  if (!noteId) {
    return JSON.stringify({ error: "noteId is verplicht." });
  }

  try {
    await ctx.runMutation(internal.notes.togglePinInternal, { id: noteId });
    return JSON.stringify({ ok: true, message: "Pin status getoggeld." });
  } catch {
    return JSON.stringify({ error: "Notitie niet gevonden." });
  }
}
