/**
 * convex/ai/grok/tools/email.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Email tool handlers — read, search, manage, bulk ops, inbox cleanup.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { api, internal } from "../../../_generated/api";

const MAX_BULK_EMAILS = 50;

function limitedIds(value: unknown): string[] {
  const ids = Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  return ids.slice(0, MAX_BULK_EMAILS);
}

/** Strip HTML naar leesbare plain text. */
function cleanHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|tr|li|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function handleLeesEmail(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const result = await ctx.runAction(internal.actions.getGmailBody.getBodyInternal, {
      userId, gmailId: args.gmailId as string,
    });
    const body = result.text || cleanHtml(result.html ?? "") || "(geen body)";
    return JSON.stringify({
      van: result.from, aan: result.to, cc: result.cc,
      onderwerp: result.subject, datum: result.date,
      body: body.slice(0, 3000),
      bijlagen: result.attachments?.map((a: any) => a.filename) ?? [],
    });
  } catch (err) {
    return JSON.stringify({ error: `Kon email niet ophalen: ${(err as Error).message}` });
  }
}

export async function handleZoekEmails(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const zoekterm = (args.zoekterm as string).toLowerCase();
    const allEmails = await ctx.runQuery(api.emails.list, { userId });
    const matches = allEmails
      .filter((e: any) =>
        e.subject?.toLowerCase().includes(zoekterm) ||
        e.from?.toLowerCase().includes(zoekterm) ||
        e.snippet?.toLowerCase().includes(zoekterm)
      )
      .slice(0, 10)
      .map((e: any) => ({
        gmailId: e.gmailId, van: e.from?.replace(/<.*>/, "").trim(),
        onderwerp: e.subject, snippet: e.snippet?.slice(0, 80),
        datum: e.datum, gelezen: e.isGelezen,
      }));
    return JSON.stringify({ resultaten: matches.length, emails: matches });
  } catch (err) {
    return JSON.stringify({ error: `Zoeken mislukt: ${(err as Error).message}` });
  }
}

export async function handleMarkeerGelezen(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    await ctx.runAction(internal.actions.sendGmail.markGelezenInternal, {
      userId, gmailId: args.gmailId as string, gelezen: args.gelezen as boolean,
    });
    return JSON.stringify({ ok: true, beschrijving: `Email ${args.gelezen ? "gelezen" : "ongelezen"} gemarkeerd` });
  } catch (err) {
    return JSON.stringify({ error: `Markeren mislukt: ${(err as Error).message}` });
  }
}

export async function handleVerwijderEmail(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    await ctx.runAction(internal.actions.sendGmail.trashEmailInternal, {
      userId, gmailId: args.gmailId as string,
    });
    return JSON.stringify({ ok: true, beschrijving: "Email naar prullenbak verplaatst" });
  } catch (err) {
    return JSON.stringify({ error: `Verwijderen mislukt: ${(err as Error).message}` });
  }
}

export async function handleMarkeerSter(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    await ctx.runAction(internal.actions.sendGmail.markSterInternal, {
      userId, gmailId: args.gmailId as string, ster: args.ster as boolean,
    });
    return JSON.stringify({ ok: true, beschrijving: `Ster ${args.ster ? "toegevoegd" : "verwijderd"}` });
  } catch (err) {
    return JSON.stringify({ error: `Ster mislukt: ${(err as Error).message}` });
  }
}

export async function handleEmailVersturen(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    await ctx.runAction(internal.actions.sendGmail.sendEmailInternal, {
      userId, to: args.aan as string, subject: args.onderwerp as string,
      body: args.body as string, cc: args.cc as string | undefined,
    });
    return JSON.stringify({ ok: true, beschrijving: `Email verstuurd naar ${args.aan}` });
  } catch (err) {
    return JSON.stringify({ error: `Versturen mislukt: ${(err as Error).message}` });
  }
}

export async function handleEmailBeantwoorden(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    await ctx.runAction(internal.actions.sendGmail.replyToEmailInternal, {
      userId, gmailId: args.gmailId as string, threadId: args.threadId as string,
      to: args.aan as string, body: args.body as string,
    });
    return JSON.stringify({ ok: true, beschrijving: `Reply verstuurd naar ${args.aan}` });
  } catch (err) {
    return JSON.stringify({ error: `Beantwoorden mislukt: ${(err as Error).message}` });
  }
}

export async function handleBulkMarkeerGelezen(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  const gmailIds = limitedIds(args.gmailIds);
  if (!gmailIds.length) return JSON.stringify({ error: "Geen gmailIds opgegeven" });
  try {
    const result = await ctx.runAction(internal.actions.sendGmail.bulkMarkGelezenInternal, {
      userId, gmailIds, gelezen: args.gelezen as boolean,
    });
    return JSON.stringify({ ok: true, beschrijving: `${result.count} emails ${args.gelezen ? "gelezen" : "ongelezen"} gemarkeerd` });
  } catch (err) {
    return JSON.stringify({ error: `Bulk markeren mislukt: ${(err as Error).message}` });
  }
}

export async function handleBulkVerwijder(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  const gmailIds = limitedIds(args.gmailIds);
  if (!gmailIds.length) return JSON.stringify({ error: "Geen gmailIds opgegeven" });
  try {
    const result = await ctx.runAction(internal.actions.sendGmail.bulkTrashInternal, {
      userId, gmailIds,
    });
    return JSON.stringify({ ok: true, beschrijving: `${result.count} emails verwijderd` });
  } catch (err) {
    return JSON.stringify({ error: `Bulk verwijderen mislukt: ${(err as Error).message}` });
  }
}

export async function handleInboxOpruimen(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const allEmails = await ctx.runQuery(api.emails.list, { userId });
    const active = allEmails.filter((e: any) => !e.isVerwijderd);
    const filter = args.filter as string;
    const maxAantal = Math.min((args.maxAantal as number) ?? MAX_BULK_EMAILS, MAX_BULK_EMAILS);
    let filtered: any[] = [];

    switch (filter) {
      case "promoties":     filtered = active.filter((e: any) => e.categorie === "promotions"); break;
      case "social":        filtered = active.filter((e: any) => e.categorie === "social"); break;
      case "forums":        filtered = active.filter((e: any) => e.categorie === "forums"); break;
      case "updates":       filtered = active.filter((e: any) => e.categorie === "updates"); break;
      case "oud_ongelezen":  filtered = active.filter((e: any) => !e.isGelezen && (Date.now() - e.ontvangen > 7 * 86400000)); break;
      case "van_afzender": {
        const afzender = (args.afzender as string || "").toLowerCase();
        filtered = active.filter((e: any) => e.from?.toLowerCase().includes(afzender));
        break;
      }
    }

    const targets = filtered.slice(0, maxAantal);
    if (targets.length === 0) {
      return JSON.stringify({ ok: true, beschrijving: `Geen ${filter} emails gevonden`, count: 0 });
    }

    const gmailIds = targets.map((e: any) => e.gmailId);
    const actie = args.actie as string;

    if (actie === "gelezen_markeren") {
      await ctx.runAction(internal.actions.sendGmail.bulkMarkGelezenInternal, { userId, gmailIds, gelezen: true });
    } else {
      await ctx.runAction(internal.actions.sendGmail.bulkTrashInternal, { userId, gmailIds });
    }

    return JSON.stringify({
      ok: true,
      beschrijving: `${targets.length} ${filter} emails ${actie === "gelezen_markeren" ? "als gelezen gemarkeerd" : "verwijderd"}`,
      count: targets.length, totaalInFilter: filtered.length,
    });
  } catch (err) {
    return JSON.stringify({ error: `Inbox opruimen mislukt: ${(err as Error).message}` });
  }
}
