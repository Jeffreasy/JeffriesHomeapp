/**
 * convex/ai/grok/tools/habits.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Grok tool handlers for the Habits domain.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { internal } from "../../../_generated/api";
import { getLevel, BADGE_DEFINITIONS } from "../../../lib/habitConstants";

type Ctx = any;

// ─── Helper: find habit by name (fuzzy) ──────────────────────────────────────

async function findHabit(ctx: Ctx, userId: string, naam: string) {
  const data = await ctx.runQuery(internal.habits.listForAgent, { userId });
  const lower = naam.toLowerCase();

  // Exact match first
  let match = data.habits.find((h: any) => h.naam.toLowerCase() === lower);
  if (!match) {
    // Partial match
    match = data.habits.find((h: any) => h.naam.toLowerCase().includes(lower));
  }
  if (!match) {
    // Reverse: search term contains habit name
    match = data.habits.find((h: any) => lower.includes(h.naam.toLowerCase()));
  }
  return match;
}

// ─── Tool Handlers ───────────────────────────────────────────────────────────

async function handleHabitAanmaken(ctx: Ctx, args: Record<string, unknown>, userId: string): Promise<string> {
  const naam = args.naam as string;
  const emoji = (args.emoji as string) ?? "🎯";
  const type = (args.type as string) ?? "positief";
  const frequentie = (args.frequentie as string) ?? "dagelijks";
  const moeilijkheid = (args.moeilijkheid as string) ?? "normaal";
  const beschrijving = args.beschrijving as string | undefined;
  const roosterFilter = args.roosterFilter as string | undefined;

  await ctx.runMutation(internal.habits.createInternal, {
    userId, naam, emoji,
    type: type as any,
    frequentie: frequentie as any,
    moeilijkheid: moeilijkheid as any,
    beschrijving,
    roosterFilter,
  });

  return JSON.stringify({
    ok: true,
    bericht: `${emoji} Habit "${naam}" aangemaakt! Type: ${type}, frequentie: ${frequentie}, moeilijkheid: ${moeilijkheid}.`,
  });
}

async function handleHabitVoltooien(ctx: Ctx, args: Record<string, unknown>, userId: string): Promise<string> {
  const habitNaam = args.habitNaam as string;
  const match = await findHabit(ctx, userId, habitNaam);

  if (!match) {
    return JSON.stringify({ ok: false, error: `Geen habit gevonden met naam "${habitNaam}". Gebruik habitsOverzicht om alle habits te zien.` });
  }

  const result = await ctx.runMutation(internal.habits.toggleCompletionInternal, {
    userId, habitId: match.id, bron: "grok",
  });

  if (result.action === "unchecked") {
    return JSON.stringify({ ok: true, bericht: `${match.emoji} "${match.naam}" gemarkeerd als niet-voltooid.` });
  }

  let bericht = `${match.emoji} "${match.naam}" voltooid! +${result.xp} XP, streak: ${result.streak} dagen 🔥`;
  if (result.newBadges?.length) {
    bericht += `\n🏆 Nieuwe badge(s): ${result.newBadges.map((b: any) => `${b.emoji} ${b.naam}`).join(", ")}`;
  }
  return JSON.stringify({ ok: true, bericht });
}

async function handleHabitIncident(ctx: Ctx, args: Record<string, unknown>, userId: string): Promise<string> {
  const habitNaam = args.habitNaam as string;
  const notitie = args.notitie as string | undefined;
  const match = await findHabit(ctx, userId, habitNaam);

  if (!match) {
    return JSON.stringify({ ok: false, error: `Geen habit gevonden met naam "${habitNaam}".` });
  }

  if (match.type !== "negatief") {
    return JSON.stringify({ ok: false, error: `"${match.naam}" is een positieve habit. Incident logging is alleen voor negatieve habits.` });
  }

  await ctx.runMutation(internal.habits.logIncidentInternal, {
    userId, habitId: match.id, notitie,
  });

  return JSON.stringify({
    ok: true,
    bericht: `${match.emoji} Incident gelogd voor "${match.naam}". Streak gereset naar 0. Morgen begin je opnieuw! 💪`,
  });
}

async function handleHabitsOverzicht(ctx: Ctx, _args: Record<string, unknown>, userId: string): Promise<string> {
  const data = await ctx.runQuery(internal.habits.listForAgent, { userId });
  const level = getLevel(data.totaalXP);

  return JSON.stringify({
    ok: true,
    level: `Level ${level.level} ${level.titel} (${data.totaalXP} XP)`,
    vandaag: `${data.vandaagVoltooid}/${data.totaal} voltooid`,
    badges: data.badgeCount,
    habits: data.habits.map((h: any) => ({
      naam: `${h.emoji} ${h.naam}`,
      type: h.type,
      streak: `${h.streak} dagen`,
      vandaag: h.vandaagKlaar ? "✅" : "⬜",
      totaal: h.totaal,
    })),
  });
}

async function handleHabitStreaks(ctx: Ctx, _args: Record<string, unknown>, userId: string): Promise<string> {
  const data = await ctx.runQuery(internal.habits.listForAgent, { userId });

  const streaks = data.habits
    .filter((h: any) => h.streak > 0)
    .sort((a: any, b: any) => b.streak - a.streak)
    .map((h: any) => `${h.emoji} ${h.naam}: ${h.streak} dagen (record: ${h.langsteStreak})`);

  return JSON.stringify({
    ok: true,
    streaks: streaks.length > 0 ? streaks : ["Nog geen actieve streaks. Begin vandaag! 🚀"],
  });
}

async function handleHabitBadges(ctx: Ctx, _args: Record<string, unknown>, userId: string): Promise<string> {
  const data = await ctx.runQuery(internal.habits.listForAgent, { userId });
  const level = getLevel(data.totaalXP);

  // Get actual badges from DB via agent context (badges are in the full context)
  const totalPossible = BADGE_DEFINITIONS.length;

  return JSON.stringify({
    ok: true,
    level: `Level ${level.level} ${level.titel}`,
    xp: data.totaalXP,
    badges: `${data.badgeCount}/${totalPossible} badges unlocked`,
    nextLevel: level.nextXP > 0 ? `Nog ${level.nextXP} XP voor level ${level.level + 1}` : "Max level bereikt! 🌟",
  });
}

async function handleHabitRapport(ctx: Ctx, _args: Record<string, unknown>, userId: string): Promise<string> {
  const data = await ctx.runQuery(internal.habits.listForAgent, { userId });
  const level = getLevel(data.totaalXP);

  const actief = data.habits.filter((h: any) => !h.vandaagKlaar);
  const voltooid = data.habits.filter((h: any) => h.vandaagKlaar);

  return JSON.stringify({
    ok: true,
    rapport: {
      level: `Level ${level.level} ${level.titel} (${data.totaalXP} XP)`,
      totaalHabits: data.totaal,
      vandaag: `${data.vandaagVoltooid}/${data.totaal}`,
      voltooide: voltooid.map((h: any) => `${h.emoji} ${h.naam}`),
      openstaand: actief.map((h: any) => `${h.emoji} ${h.naam}`),
      topStreaks: data.habits
        .filter((h: any) => h.streak > 0)
        .slice(0, 3)
        .map((h: any) => `${h.emoji} ${h.naam}: ${h.streak} dagen`),
      badges: data.badgeCount,
    },
  });
}

async function handleHabitNotitie(ctx: Ctx, args: Record<string, unknown>, userId: string): Promise<string> {
  const habitNaam = args.habitNaam as string;
  const notitie = args.notitie as string;
  const match = await findHabit(ctx, userId, habitNaam);

  if (!match) {
    return JSON.stringify({ ok: false, error: `Geen habit gevonden met naam "${habitNaam}".` });
  }

  // Store the notitie on today's log (creates or updates)
  await ctx.runMutation(internal.habits.addNoteInternal, {
    userId, habitId: match.id, notitie,
  });

  return JSON.stringify({
    ok: true,
    bericht: `📝 Notitie opgeslagen bij "${match.naam}": "${notitie.slice(0, 100)}"`,
  });
}

// ─── Router ──────────────────────────────────────────────────────────────────

const HABIT_TOOL_HANDLERS: Record<string, (ctx: Ctx, args: Record<string, unknown>, userId: string) => Promise<string>> = {
  habitAanmaken:   handleHabitAanmaken,
  habitVoltooien:  handleHabitVoltooien,
  habitIncident:   handleHabitIncident,
  habitsOverzicht: handleHabitsOverzicht,
  habitStreaks:     handleHabitStreaks,
  habitBadges:     handleHabitBadges,
  habitRapport:    handleHabitRapport,
  habitNotitie:    handleHabitNotitie,
};

export async function handleHabitTool(
  ctx: Ctx,
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const handler = HABIT_TOOL_HANDLERS[toolName];
  if (!handler) return JSON.stringify({ error: `Onbekende habit tool: ${toolName}` });
  return handler(ctx, args, userId);
}
