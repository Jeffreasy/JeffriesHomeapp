/**
 * convex/ai/grok/tools/notes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Grok tool handlers for personal notes (create, search, pin, edit, archive, overview).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { internal } from "../../../_generated/api";

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleNotitieMaken(
  ctx: any,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const inhoud    = args.inhoud as string;
  const titel     = args.titel as string | undefined;
  const tags      = args.tags as string[] | undefined;
  const deadline  = args.deadline as string | undefined;
  const linkedEventId = args.linkedEventId as string | undefined;
  const prioriteit    = args.prioriteit as string | undefined;

  if (!inhoud?.trim()) {
    return JSON.stringify({ error: "Inhoud mag niet leeg zijn." });
  }

  const now = new Date().toISOString();
  const id = await ctx.runMutation(internal.notes.createInternal, {
    userId,
    inhoud: inhoud.trim(),
    titel: titel?.trim(),
    tags,
    deadline,
    linkedEventId,
    prioriteit: prioriteit ?? "normaal",
    aangemaakt: now,
    gewijzigd:  now,
  });

  const parts = [`Notitie aangemaakt${titel ? ` "${titel}"` : ""}.`];
  if (deadline)      parts.push(`Deadline: ${deadline}`);
  if (prioriteit)    parts.push(`Prioriteit: ${prioriteit}`);
  if (linkedEventId) parts.push(`Gekoppeld aan event: ${linkedEventId}`);

  return JSON.stringify({
    ok: true,
    message: parts.join(" | "),
    noteId: id,
    tags: tags ?? [],
    deadline: deadline ?? null,
    prioriteit: prioriteit ?? "normaal",
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
      id:         n._id,
      titel:      n.titel || n.inhoud.slice(0, 50),
      inhoud:     n.inhoud.length > 200 ? n.inhoud.slice(0, 200) + "…" : n.inhoud,
      tags:       n.tags ?? [],
      pinned:     n.isPinned,
      deadline:   n.deadline ?? null,
      prioriteit: n.prioriteit ?? "normaal",
      datum:      n.gewijzigd,
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

export async function handleNotitieBewerken(
  ctx: any,
  args: Record<string, unknown>,
): Promise<string> {
  const noteId = args.noteId as string;
  if (!noteId) {
    return JSON.stringify({ error: "noteId is verplicht." });
  }

  const updates: Record<string, unknown> = { id: noteId };
  if (args.inhoud !== undefined)        updates.inhoud        = args.inhoud;
  if (args.titel !== undefined)         updates.titel         = args.titel;
  if (args.tags !== undefined)          updates.tags          = args.tags;
  if (args.deadline !== undefined)      updates.deadline      = args.deadline;
  if (args.linkedEventId !== undefined) updates.linkedEventId = args.linkedEventId;
  if (args.prioriteit !== undefined)    updates.prioriteit    = args.prioriteit;

  try {
    await ctx.runMutation(internal.notes.updateInternal, updates);
    return JSON.stringify({ ok: true, message: "Notitie bijgewerkt." });
  } catch {
    return JSON.stringify({ error: "Notitie niet gevonden of bewerking mislukt." });
  }
}

export async function handleNotitieArchiveren(
  ctx: any,
  args: Record<string, unknown>,
): Promise<string> {
  const noteId = args.noteId as string;
  if (!noteId) {
    return JSON.stringify({ error: "noteId is verplicht." });
  }

  try {
    await ctx.runMutation(internal.notes.archiveInternal, { id: noteId });
    return JSON.stringify({ ok: true, message: "Notitie gearchiveerd." });
  } catch {
    return JSON.stringify({ error: "Notitie niet gevonden." });
  }
}

export async function handleNotitiesOverzicht(
  ctx: any,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const filter = (args.filter as string) ?? "recent";
  const data = await ctx.runQuery(internal.notes.listForAgent, { userId });

  if (!data || data.totaal === 0) {
    return JSON.stringify({ totaal: 0, message: "Geen notities gevonden." });
  }

  let notities = data.notities;

  // Apply filter
  if (filter === "pinned") {
    notities = notities.filter((n: any) => n.isPinned);
  } else if (filter === "deadline") {
    notities = notities
      .filter((n: any) => n.deadline)
      .sort((a: any, b: any) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));
  } else if (filter === "hoog") {
    notities = notities.filter((n: any) => n.prioriteit === "hoog");
  }

  return JSON.stringify({
    totaal: data.totaal,
    pinned: data.pinned,
    filter,
    notities: notities.map((n: any) => ({
      id:         n.id,
      titel:      n.titel,
      tags:       n.tags,
      isPinned:   n.isPinned,
      deadline:   n.deadline,
      prioriteit: n.prioriteit,
      gewijzigd:  n.gewijzigd,
    })),
  });
}
