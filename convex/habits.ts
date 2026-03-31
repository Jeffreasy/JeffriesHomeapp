import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { computeXP, getNewBadges, getLevel, OVERLOAD_THRESHOLDS, type Moeilijkheid } from "./lib/habitConstants";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getDay(); // 0=zo,1=ma,...6=za
}

function prevDateStr(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Check of een dag een "due day" is voor een gegeven frequentie */
function isDueDay(frequentie: string, aangepasteDagen: number[] | undefined, dow: number): boolean {
  switch (frequentie) {
    case "dagelijks":    return true;
    case "weekdagen":    return dow >= 1 && dow <= 5;
    case "weekenddagen": return dow === 0 || dow === 6;
    case "aangepast":    return aangepasteDagen?.includes(dow) ?? false;
    case "x_per_week":   return true;
    case "x_per_maand":  return true;
    default:             return true;
  }
}

/**
 * Bereken streak achterwaarts vanaf een voltooid startpunt (positieve habits).
 * Pure functie — geen DB calls.
 */
function computeStreakFrom(
  completedDates: Set<string>,
  frequentie: string,
  aangepasteDagen: number[] | undefined,
  fromDate: string,
): number {
  if (!completedDates.has(fromDate)) return 0;

  let streak = 1;
  let current = prevDateStr(fromDate);

  for (let i = 0; i < 400; i++) {
    const dow = dayOfWeek(current);
    const due = isDueDay(frequentie, aangepasteDagen, dow);

    if (due) {
      if (completedDates.has(current)) {
        streak++;
      } else {
        break;
      }
    }
    // Niet-due dagen: overslaan, geen streak break
    current = prevDateStr(current);
  }

  return streak;
}

/**
 * Bereken streak voor negatieve ("Vermijden") habits.
 * Telt opeenvolgende due-dagen ZONDER incident — omgekeerde logica.
 * Begrensd door aanmaakdatum (voorkomt opgeblazen initiële streak).
 */
function computeNegativeStreakFrom(
  incidentDates: Set<string>,
  frequentie: string,
  aangepasteDagen: number[] | undefined,
  fromDate: string,
  createdDate: string,
): number {
  let streak = 0;
  let current = fromDate;

  for (let i = 0; i < 400; i++) {
    // Stop vóór aanmaakdatum
    if (current < createdDate) break;

    const dow = dayOfWeek(current);
    const due = isDueDay(frequentie, aangepasteDagen, dow);

    if (due) {
      if (incidentDates.has(current)) {
        break; // Incident = streak gebroken
      }
      streak++;
    }

    current = prevDateStr(current);
  }

  return streak;
}

/**
 * Bereken de huidige streak voor een habit.
 * - Positief: telt opeenvolgende due-dagen MET voltooiing
 * - Negatief: telt opeenvolgende due-dagen ZONDER incident (auto-groei)
 */
async function computeCurrentStreak(
  ctx: any,
  habitId: Id<"habits">,
  frequentie: string,
  aangepasteDagen: number[] | undefined,
  type: "positief" | "negatief" = "positief",
  aangemaakt?: string,
): Promise<number> {
  const today = todayStr();

  const logs = await ctx.db
    .query("habitLogs")
    .withIndex("by_habit", (q: any) => q.eq("habitId", habitId))
    .collect();

  // ── Negatieve habits: auto-groei (geen check nodig) ────────────────────
  if (type === "negatief") {
    const incidentDates = new Set<string>(
      logs.filter((l: any) => l.isIncident).map((l: any) => l.datum as string),
    );
    const createdDate = aangemaakt ? aangemaakt.slice(0, 10) : today;
    return computeNegativeStreakFrom(incidentDates, frequentie, aangepasteDagen, today, createdDate);
  }

  // ── Positieve habits: opeenvolgende voltooiingen ───────────────────────
  const completedDates = new Set<string>(
    logs.filter((l: any) => l.voltooid).map((l: any) => l.datum as string),
  );

  // Start vandaag: als due + voltooid → streak vanaf vandaag
  const todayDow = dayOfWeek(today);
  if (isDueDay(frequentie, aangepasteDagen, todayDow) && completedDates.has(today)) {
    return computeStreakFrom(completedDates, frequentie, aangepasteDagen, today);
  }

  // Vandaag niet voltooid (of geen due-dag) — check de vorige due-dag
  // Streak is "nog levend" als de vorige due-dag voltooid was
  let prev = prevDateStr(today);
  for (let i = 0; i < 7; i++) {
    const dow = dayOfWeek(prev);
    if (isDueDay(frequentie, aangepasteDagen, dow)) {
      if (completedDates.has(prev)) {
        return computeStreakFrom(completedDates, frequentie, aangepasteDagen, prev);
      }
      break; // Vorige due-dag niet voltooid → streak = 0
    }
    prev = prevDateStr(prev);
  }

  return 0;
}

// ─── Core Toggle Logic (shared) ──────────────────────────────────────────────

/**
 * Gedeelde toggle logica — gebruikt door zowel public als internal mutations.
 * Fixes: correcte streak berekening, enkele XP patch, badge check.
 */
async function coreToggle(
  ctx: any,
  userId: string,
  habitId: Id<"habits">,
  datum: string,
  bron: string,
  waarde?: number,
  notitie?: string,
): Promise<{ action: string; xp: number; streak: number; levelUp?: number; newBadges: Array<{ naam: string; emoji: string }> }> {
  const habit = await ctx.db.get(habitId);
  if (!habit) throw new Error("Habit niet gevonden");

  const existingLog = await ctx.db
    .query("habitLogs")
    .withIndex("by_habit_datum", (q: any) => q.eq("habitId", habitId).eq("datum", datum))
    .first();

  if (existingLog) {
    // Undo: verwijder log en herbereken streak
    const wasCompleted = existingLog.voltooid;
    await ctx.db.delete(existingLog._id);

    if (wasCompleted) {
      // Herbereken streak na verwijdering — checkt achterwaarts
      const newStreak = await computeCurrentStreak(
        ctx, habitId, habit.frequentie, habit.aangepasteDagen,
        habit.type, habit.aangemaakt,
      );

      await ctx.db.patch(habitId, {
        huidigeStreak:  newStreak,
        totaalVoltooid: Math.max(0, habit.totaalVoltooid - 1),
        totaalXP:       Math.max(0, habit.totaalXP - existingLog.xpVerdiend),
        gewijzigd:      new Date().toISOString(),
      });
    }

    return { action: "unchecked", xp: 0, streak: 0, newBadges: [] };
  }

  // Nieuw: log completion
  const xp = computeXP(habit.moeilijkheid as Moeilijkheid, habit.huidigeStreak);

  await ctx.db.insert("habitLogs", {
    userId,
    habitId,
    datum,
    voltooid:   true,
    waarde,
    isIncident: false,
    notitie,
    bron,
    xpVerdiend: xp,
    aangemaakt: new Date().toISOString(),
  });

  // Bereken correcte streak achterwaarts
  const newStreak = await computeCurrentStreak(
    ctx, habitId, habit.frequentie, habit.aangepasteDagen,
    habit.type, habit.aangemaakt,
  );
  const newTotal = habit.totaalVoltooid + 1;

  // Badge check
  const existingBadges = await ctx.db
    .query("habitBadges")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
  const behaald = new Set<string>(existingBadges.map((b: any) => b.badgeId as string));
  const newBadges = getNewBadges(newStreak, newTotal, behaald);

  let bonusXP = 0;
  for (const badge of newBadges) {
    bonusXP += badge.xpBonus;
    await ctx.db.insert("habitBadges", {
      userId,
      badgeId:      badge.id,
      habitId,
      naam:         badge.naam,
      emoji:        badge.emoji,
      beschrijving: badge.beschrijving,
      xpBonus:      badge.xpBonus,
      behaaldOp:    new Date().toISOString(),
    });
  }

  // Check level-up → genereer notitie
  const oldLevel = getLevel(habit.totaalXP).level;
  const newLevel = getLevel(habit.totaalXP + xp + bonusXP).level;

  // Eén enkele patch met alle updates (fixes race condition)
  await ctx.db.patch(habitId, {
    huidigeStreak:  newStreak,
    langsteStreak:  Math.max(habit.langsteStreak, newStreak),
    totaalVoltooid: newTotal,
    totaalXP:       habit.totaalXP + xp + bonusXP,
    gewijzigd:      new Date().toISOString(),
  });

  // Feature 5: Level-up → automatische notitie als beloning
  if (newLevel > oldLevel) {
    const levelInfo = getLevel(habit.totaalXP + xp + bonusXP);
    try {
      await ctx.db.insert("notes", {
        userId,
        inhoud: `- [ ] Level ${levelInfo.level} (${levelInfo.titel}) bereikt! Budget suggestie: €20 voor Vrije Tijd 🎮`,
        tags: ["level-up", "beloning"],
        isPinned: true,
        isArchived: false,
        aangemaakt: new Date().toISOString(),
        gewijzigd: new Date().toISOString(),
      });
    } catch { /* notes tabel niet beschikbaar in test */ }
  }

  return {
    action: "checked",
    xp,
    streak: newStreak,
    levelUp: newLevel > oldLevel ? newLevel : undefined,
    newBadges: newBadges.map((b) => ({ naam: b.naam, emoji: b.emoji })),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActief"), true))
      .collect();
  },
});

export const listAll = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/** Habits + log status voor een specifieke datum, met rooster-aware filtering */
export const getForDate = query({
  args: { userId: v.string(), datum: v.optional(v.string()) },
  handler: async (ctx, { userId, datum }) => {
    const targetDate = datum ?? todayStr();
    const dow = dayOfWeek(targetDate);

    // Haal dienst op voor deze datum (rooster integratie)
    const dienst = await ctx.db
      .query("schedule")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("startDatum", targetDate))
      .first();

    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user_actief", (q) => q.eq("userId", userId).eq("isActief", true))
      .collect();

    // Logs voor deze datum
    const logs = await ctx.db
      .query("habitLogs")
      .withIndex("by_user_datum", (q) => q.eq("userId", userId).eq("datum", targetDate))
      .collect();

    const logMap = new Map(logs.map((l) => [l.habitId, l]));

    // Filter habits op basis van frequentie + rooster
    const filtered = habits.filter((h) => {
      if (h.isPauze) return false;

      // Frequentie check
      switch (h.frequentie) {
        case "dagelijks": break;
        case "weekdagen":     if (dow === 0 || dow === 6) return false; break;
        case "weekenddagen":  if (dow !== 0 && dow !== 6) return false; break;
        case "aangepast":     if (!h.aangepasteDagen?.includes(dow)) return false; break;
        case "x_per_week":    break; // Flexibel — altijd tonen
        case "x_per_maand":   break; // Flexibel — altijd tonen
      }

      // Rooster filter
      if (h.roosterFilter && h.roosterFilter !== "alle") {
        const heeftDienst = !!dienst;
        switch (h.roosterFilter) {
          case "werkdagen":     if (!heeftDienst) return false; break;
          case "vrijeDagen":    if (heeftDienst) return false; break;
          case "vroegeDienst":  if (!heeftDienst || dienst.shiftType !== "Vroeg") return false; break;
          case "lateDienst":    if (!heeftDienst || dienst.shiftType !== "Laat") return false; break;
        }
      }

      return true;
    });

    // Sorteer op volgorde
    filtered.sort((a, b) => a.volgorde - b.volgorde);

    return {
      datum: targetDate,
      dienst: dienst ? { shiftType: dienst.shiftType, team: dienst.team } : null,
      habits: filtered.map((h) => {
        const log = logMap.get(h._id);
        return {
          ...h,
          log: log ? {
            _id: log._id,
            voltooid: log.voltooid,
            waarde: log.waarde,
            isIncident: log.isIncident,
            trigger: log.trigger,
            notitie: log.notitie,
            xpVerdiend: log.xpVerdiend,
          } : null,
        };
      }),
    };
  },
});

/** Globale stats: totaal XP, level, streak overview */
export const getStats = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const badges = await ctx.db
      .query("habitBadges")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const totaalXP = habits.reduce((sum, h) => sum + h.totaalXP, 0)
      + badges.reduce((sum, b) => sum + b.xpBonus, 0);

    const actief = habits.filter((h) => h.isActief);
    const topStreaks = actief
      .filter((h) => h.huidigeStreak > 0)
      .sort((a, b) => b.huidigeStreak - a.huidigeStreak)
      .slice(0, 5)
      .map((h) => ({ naam: h.naam, emoji: h.emoji, streak: h.huidigeStreak, type: h.type }));

    return {
      totaalXP,
      totaalHabits: actief.length,
      totaalVoltooid: habits.reduce((sum, h) => sum + h.totaalVoltooid, 0),
      topStreaks,
      badgeCount: badges.length,
      langsteStreakOoit: Math.max(0, ...habits.map((h) => h.langsteStreak)),
    };
  },
});

/** 365 dagen heatmap data — rate berekend o.b.v. due habits per dag */
export const getHeatmapData = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 364);
    const startStr = start.toISOString().slice(0, 10);

    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActief"), true))
      .collect();

    // Alle logs in range
    const logs = await ctx.db
      .query("habitLogs")
      .withIndex("by_user_datum", (q) => q.eq("userId", userId).gte("datum", startStr))
      .collect();

    // Groepeer voltooiingen per datum
    const dayMap = new Map<string, number>();
    for (const log of logs) {
      if (log.voltooid) {
        dayMap.set(log.datum, (dayMap.get(log.datum) ?? 0) + 1);
      }
    }

    // Genereer 365 dagen met correcte rate (due habits per dag)
    const days: Array<{ datum: string; count: number; rate: number }> = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      const dow = d.getDay();
      const count = dayMap.get(ds) ?? 0;

      // Tel hoeveel habits "due" waren op deze dag
      const dueCount = habits.filter((h) => {
        if (h.isPauze) return false;
        return isDueDay(h.frequentie, h.aangepasteDagen, dow);
      }).length;

      const rate = dueCount > 0 ? count / dueCount : 0;
      days.push({ datum: ds, count, rate: Math.min(1, rate) });
    }

    return { days, habitCount: habits.length || 1 };
  },
});

export const getBadges = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("habitBadges")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getWeeklyReport = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const today = todayStr();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekStart = weekAgo.toISOString().slice(0, 10);

    const logs = await ctx.db
      .query("habitLogs")
      .withIndex("by_user_datum", (q) => q.eq("userId", userId).gte("datum", weekStart))
      .filter((q) => q.lte(q.field("datum"), today))
      .collect();

    const completions = logs.filter((l) => l.voltooid).length;
    const incidents = logs.filter((l) => l.isIncident).length;
    const xpEarned = logs.reduce((sum, l) => sum + l.xpVerdiend, 0);

    return { completions, incidents, xpEarned, logCount: logs.length };
  },
});

// ─── Internal Queries (for AI agent context) ──────────────────────────────────

export const listForAgent = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user_actief", (q) => q.eq("userId", userId).eq("isActief", true))
      .collect();

    const today = todayStr();
    const logs = await ctx.db
      .query("habitLogs")
      .withIndex("by_user_datum", (q) => q.eq("userId", userId).eq("datum", today))
      .collect();

    const completedSet = new Set(logs.filter((l) => l.voltooid).map((l) => l.habitId.toString()));
    const incidentSet = new Set(logs.filter((l) => l.isIncident).map((l) => l.habitId.toString()));

    const badges = await ctx.db
      .query("habitBadges")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const totaalXP = habits.reduce((s, h) => s + h.totaalXP, 0)
      + badges.reduce((s, b) => s + b.xpBonus, 0);

    // Negatieve habits zonder incident vandaag = "klaar" (auto-streak)
    const isKlaar = (h: typeof habits[0]) => {
      if (h.type === "negatief") return !incidentSet.has(h._id.toString());
      return completedSet.has(h._id.toString());
    };

    return {
      totaal: habits.length,
      vandaagVoltooid: habits.filter(isKlaar).length,
      totaalXP,
      badgeCount: badges.length,
      habits: habits
        .sort((a, b) => b.huidigeStreak - a.huidigeStreak)
        .map((h) => ({
          id: h._id,
          naam: h.naam,
          emoji: h.emoji,
          type: h.type,
          streak: h.huidigeStreak,
          langsteStreak: h.langsteStreak,
          totaal: h.totaalVoltooid,
          vandaagKlaar: isKlaar(h),
          moeilijkheid: h.moeilijkheid,
        })),
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    userId:            v.string(),
    naam:              v.string(),
    emoji:             v.string(),
    type:              v.union(v.literal("positief"), v.literal("negatief")),
    beschrijving:      v.optional(v.string()),
    frequentie:        v.union(v.literal("dagelijks"), v.literal("weekdagen"), v.literal("weekenddagen"), v.literal("aangepast"), v.literal("x_per_week"), v.literal("x_per_maand")),
    aangepasteDagen:   v.optional(v.array(v.number())),
    doelAantal:        v.optional(v.number()),
    roosterFilter:     v.optional(v.union(v.literal("alle"), v.literal("werkdagen"), v.literal("vrijeDagen"), v.literal("vroegeDienst"), v.literal("lateDienst"))),
    isKwantitatief:    v.optional(v.boolean()),
    doelWaarde:        v.optional(v.number()),
    eenheid:           v.optional(v.string()),
    doelTijd:          v.optional(v.string()),
    moeilijkheid:      v.optional(v.union(v.literal("makkelijk"), v.literal("normaal"), v.literal("moeilijk"))),
    financieCategorie: v.optional(v.string()),
    kleur:             v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const moeilijkheid = args.moeilijkheid ?? "normaal";

    const existing = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const maxOrder = existing.reduce((m, h) => Math.max(m, h.volgorde), -1);

    return ctx.db.insert("habits", {
      userId:            args.userId,
      naam:              args.naam,
      emoji:             args.emoji,
      type:              args.type,
      beschrijving:      args.beschrijving,
      frequentie:        args.frequentie,
      aangepasteDagen:   args.aangepasteDagen,
      doelAantal:        args.doelAantal,
      roosterFilter:     args.roosterFilter,
      isKwantitatief:    args.isKwantitatief ?? false,
      doelWaarde:        args.doelWaarde,
      eenheid:           args.eenheid,
      doelTijd:          args.doelTijd,
      moeilijkheid,
      financieCategorie: args.financieCategorie,
      kleur:             args.kleur,
      xpPerVoltooiing:   computeXP(moeilijkheid),
      huidigeStreak:     0,
      langsteStreak:     0,
      totaalVoltooid:    0,
      totaalXP:          0,
      volgorde:          maxOrder + 1,
      isActief:          true,
      isPauze:           false,
      aangemaakt:        now,
      gewijzigd:         now,
    });
  },
});

export const update = mutation({
  args: {
    id:                v.id("habits"),
    naam:              v.optional(v.string()),
    emoji:             v.optional(v.string()),
    beschrijving:      v.optional(v.string()),
    frequentie:        v.optional(v.union(v.literal("dagelijks"), v.literal("weekdagen"), v.literal("weekenddagen"), v.literal("aangepast"), v.literal("x_per_week"), v.literal("x_per_maand"))),
    aangepasteDagen:   v.optional(v.array(v.number())),
    doelAantal:        v.optional(v.number()),
    roosterFilter:     v.optional(v.union(v.literal("alle"), v.literal("werkdagen"), v.literal("vrijeDagen"), v.literal("vroegeDienst"), v.literal("lateDienst"))),
    isKwantitatief:    v.optional(v.boolean()),
    doelWaarde:        v.optional(v.number()),
    eenheid:           v.optional(v.string()),
    doelTijd:          v.optional(v.string()),
    moeilijkheid:      v.optional(v.union(v.literal("makkelijk"), v.literal("normaal"), v.literal("moeilijk"))),
    financieCategorie: v.optional(v.string()),
    kleur:             v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Habit niet gevonden");

    const patch: Record<string, unknown> = { gewijzigd: new Date().toISOString() };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) patch[key] = val;
    }
    if (fields.moeilijkheid) {
      patch.xpPerVoltooiing = computeXP(fields.moeilijkheid);
    }

    await ctx.db.patch(id, patch);
  },
});

/** Toggle completion voor een specifieke datum */
export const toggleCompletion = mutation({
  args: {
    userId:  v.string(),
    habitId: v.id("habits"),
    datum:   v.optional(v.string()),
    waarde:  v.optional(v.number()),
    notitie: v.optional(v.string()),
    bron:    v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const datum = args.datum ?? todayStr();
    const bron = args.bron ?? "web";
    return coreToggle(ctx, args.userId, args.habitId, datum, bron, args.waarde, args.notitie);
  },
});

/** Negatieve habit: log incident (streak reset) */
export const logIncident = mutation({
  args: {
    userId:  v.string(),
    habitId: v.id("habits"),
    trigger: v.optional(v.string()),
    notitie: v.optional(v.string()),
    bron:    v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const habit = await ctx.db.get(args.habitId);
    if (!habit) throw new Error("Habit niet gevonden");
    if (habit.type !== "negatief") throw new Error("Alleen voor negatieve habits");

    const datum = todayStr();
    const bron = args.bron ?? "web";

    // Voorkom duplicate incident op dezelfde dag
    const existing = await ctx.db
      .query("habitLogs")
      .withIndex("by_habit_datum", (q) => q.eq("habitId", args.habitId).eq("datum", datum))
      .first();
    if (existing?.isIncident) {
      return { action: "already_logged", streakReset: false };
    }
    if (existing) await ctx.db.delete(existing._id);

    await ctx.db.insert("habitLogs", {
      userId:     args.userId,
      habitId:    args.habitId,
      datum,
      voltooid:   false,
      isIncident: true,
      trigger:    args.trigger,
      notitie:    args.notitie,
      bron,
      xpVerdiend: 0,
      aangemaakt: new Date().toISOString(),
    });

    // Reset streak
    await ctx.db.patch(args.habitId, {
      huidigeStreak: 0,
      gewijzigd:     new Date().toISOString(),
    });

    return { action: "incident", streakReset: true };
  },
});

/** Kwantitatief: increment waarde (auto-complete bij doel) */
export const incrementWaarde = mutation({
  args: {
    userId:  v.string(),
    habitId: v.id("habits"),
    stap:    v.number(),
    datum:   v.optional(v.string()),
    bron:    v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const habit = await ctx.db.get(args.habitId);
    if (!habit) throw new Error("Habit niet gevonden");
    if (!habit.isKwantitatief) throw new Error("Niet kwantitatief");

    const datum = args.datum ?? todayStr();
    const bron = args.bron ?? "web";

    const existingLog = await ctx.db
      .query("habitLogs")
      .withIndex("by_habit_datum", (q) => q.eq("habitId", args.habitId).eq("datum", datum))
      .first();

    const oldWaarde = existingLog?.waarde ?? 0;
    const newWaarde = Math.max(0, oldWaarde + args.stap);
    const doelBereikt = habit.doelWaarde ? newWaarde >= habit.doelWaarde : false;
    const wasVoltooid = existingLog?.voltooid ?? false;

    if (existingLog) {
      // Update bestaande log
      await ctx.db.patch(existingLog._id, {
        waarde: newWaarde,
        voltooid: doelBereikt,
      });

      // Doel net bereikt → XP + streak update
      if (doelBereikt && !wasVoltooid) {
        const xp = computeXP(habit.moeilijkheid as Moeilijkheid, habit.huidigeStreak);
        await ctx.db.patch(existingLog._id, { xpVerdiend: xp });

        const newStreak = await computeCurrentStreak(
          ctx, args.habitId, habit.frequentie, habit.aangepasteDagen,
          habit.type, habit.aangemaakt,
        );
        const newTotal = habit.totaalVoltooid + 1;

        // Badge check
        const existingBadges = await ctx.db
          .query("habitBadges")
          .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
          .collect();
        const behaald = new Set<string>(existingBadges.map((b: any) => b.badgeId as string));
        const newBadges = getNewBadges(newStreak, newTotal, behaald);
        let bonusXP = 0;
        for (const badge of newBadges) {
          bonusXP += badge.xpBonus;
          await ctx.db.insert("habitBadges", {
            userId: args.userId, badgeId: badge.id, habitId: args.habitId,
            naam: badge.naam, emoji: badge.emoji, beschrijving: badge.beschrijving,
            xpBonus: badge.xpBonus, behaaldOp: new Date().toISOString(),
          });
        }

        await ctx.db.patch(args.habitId, {
          huidigeStreak: newStreak,
          langsteStreak: Math.max(habit.langsteStreak, newStreak),
          totaalVoltooid: newTotal,
          totaalXP: habit.totaalXP + xp + bonusXP,
          gewijzigd: new Date().toISOString(),
        });

        return { waarde: newWaarde, voltooid: true, xp, action: "goal_reached" };
      }

      // Doel weer onder grens → undo completion
      if (!doelBereikt && wasVoltooid) {
        await ctx.db.patch(existingLog._id, { xpVerdiend: 0 });
        const newStreak = await computeCurrentStreak(
          ctx, args.habitId, habit.frequentie, habit.aangepasteDagen,
          habit.type, habit.aangemaakt,
        );
        await ctx.db.patch(args.habitId, {
          huidigeStreak: newStreak,
          totaalVoltooid: Math.max(0, habit.totaalVoltooid - 1),
          totaalXP: Math.max(0, habit.totaalXP - (existingLog.xpVerdiend ?? 0)),
          gewijzigd: new Date().toISOString(),
        });
      }

      return { waarde: newWaarde, voltooid: doelBereikt, xp: 0, action: "incremented" };
    }

    // Nieuw log
    await ctx.db.insert("habitLogs", {
      userId: args.userId, habitId: args.habitId, datum,
      voltooid: doelBereikt, waarde: newWaarde,
      isIncident: false, bron,
      xpVerdiend: 0, aangemaakt: new Date().toISOString(),
    });

    return { waarde: newWaarde, voltooid: doelBereikt, xp: 0, action: "started" };
  },
});

export const reorder = mutation({
  args: { items: v.array(v.object({ id: v.id("habits"), volgorde: v.number() })) },
  handler: async (ctx, { items }) => {
    for (const { id, volgorde } of items) {
      await ctx.db.patch(id, { volgorde });
    }
  },
});

export const togglePause = mutation({
  args: { id: v.id("habits") },
  handler: async (ctx, { id }) => {
    const h = await ctx.db.get(id);
    if (!h) throw new Error("Habit niet gevonden");
    await ctx.db.patch(id, {
      isPauze:     !h.isPauze,
      gepauzeerOm: h.isPauze ? undefined : new Date().toISOString(),
      gewijzigd:   new Date().toISOString(),
    });
  },
});

export const archive = mutation({
  args: { id: v.id("habits") },
  handler: async (ctx, { id }) => {
    const h = await ctx.db.get(id);
    if (!h) throw new Error("Habit niet gevonden");
    await ctx.db.patch(id, { isActief: false, gewijzigd: new Date().toISOString() });
  },
});

export const remove = mutation({
  args: { id: v.id("habits") },
  handler: async (ctx, { id }) => {
    const h = await ctx.db.get(id);
    if (!h) throw new Error("Habit niet gevonden");
    // Verwijder gerelateerde logs
    const logs = await ctx.db
      .query("habitLogs")
      .withIndex("by_habit", (q) => q.eq("habitId", id))
      .collect();
    for (const log of logs) await ctx.db.delete(log._id);
    // Verwijder gerelateerde badges
    const badges = await ctx.db
      .query("habitBadges")
      .withIndex("by_user", (q) => q.eq("userId", h.userId))
      .filter((q) => q.eq(q.field("habitId"), id))
      .collect();
    for (const b of badges) await ctx.db.delete(b._id);
    await ctx.db.delete(id);
  },
});

// ─── Internal Mutations (AI tools) ────────────────────────────────────────────

export const createInternal = internalMutation({
  args: {
    userId:         v.string(),
    naam:           v.string(),
    emoji:          v.string(),
    type:           v.union(v.literal("positief"), v.literal("negatief")),
    beschrijving:   v.optional(v.string()),
    frequentie:     v.union(v.literal("dagelijks"), v.literal("weekdagen"), v.literal("weekenddagen"), v.literal("aangepast"), v.literal("x_per_week"), v.literal("x_per_maand")),
    moeilijkheid:   v.optional(v.union(v.literal("makkelijk"), v.literal("normaal"), v.literal("moeilijk"))),
    roosterFilter:  v.optional(v.string()),
    kleur:          v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const moeilijkheid = args.moeilijkheid ?? "normaal";
    const existing = await ctx.db.query("habits").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
    const maxOrder = existing.reduce((m, h) => Math.max(m, h.volgorde), -1);

    return ctx.db.insert("habits", {
      userId:           args.userId,
      naam:             args.naam,
      emoji:            args.emoji,
      type:             args.type,
      beschrijving:     args.beschrijving,
      frequentie:       args.frequentie,
      isKwantitatief:   false,
      moeilijkheid,
      xpPerVoltooiing:  computeXP(moeilijkheid),
      roosterFilter:    args.roosterFilter as any,
      kleur:            args.kleur,
      huidigeStreak:    0,
      langsteStreak:    0,
      totaalVoltooid:   0,
      totaalXP:         0,
      volgorde:         maxOrder + 1,
      isActief:         true,
      isPauze:          false,
      aangemaakt:       now,
      gewijzigd:        now,
    });
  },
});

/** Toggle via AI — delegeert naar gedeelde coreToggle */
export const toggleCompletionInternal = internalMutation({
  args: {
    userId:  v.string(),
    habitId: v.string(),
    datum:   v.optional(v.string()),
    bron:    v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const habitId = args.habitId as Id<"habits">;
    const datum = args.datum ?? todayStr();
    const bron = args.bron ?? "grok";
    return coreToggle(ctx, args.userId, habitId, datum, bron);
  },
});

export const logIncidentInternal = internalMutation({
  args: { userId: v.string(), habitId: v.string(), trigger: v.optional(v.string()), notitie: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const habitId = args.habitId as Id<"habits">;
    const habit = await ctx.db.get(habitId);
    if (!habit) throw new Error("Habit niet gevonden");

    const datum = todayStr();

    const existing = await ctx.db
      .query("habitLogs")
      .withIndex("by_habit_datum", (q) => q.eq("habitId", habitId).eq("datum", datum))
      .first();
    if (existing?.isIncident) {
      return { action: "already_logged", streakReset: false };
    }
    if (existing) await ctx.db.delete(existing._id);

    await ctx.db.insert("habitLogs", {
      userId: args.userId, habitId, datum, voltooid: false,
      isIncident: true, trigger: args.trigger, notitie: args.notitie, bron: "grok", xpVerdiend: 0,
      aangemaakt: new Date().toISOString(),
    });

    await ctx.db.patch(habitId, { huidigeStreak: 0, gewijzigd: new Date().toISOString() });
    return { action: "incident", streakReset: true };
  },
});

/** Add/update notitie on today's log for a habit (AI tool) */
export const addNoteInternal = internalMutation({
  args: { userId: v.string(), habitId: v.string(), notitie: v.string() },
  handler: async (ctx, args) => {
    const habitId = args.habitId as Id<"habits">;
    const datum = todayStr();

    const existingLog = await ctx.db
      .query("habitLogs")
      .withIndex("by_habit_datum", (q) => q.eq("habitId", habitId).eq("datum", datum))
      .first();

    if (existingLog) {
      await ctx.db.patch(existingLog._id, { notitie: args.notitie });
      return { action: "note_updated" };
    }

    await ctx.db.insert("habitLogs", {
      userId: args.userId,
      habitId,
      datum,
      voltooid: false,
      isIncident: false,
      notitie: args.notitie,
      bron: "grok",
      xpVerdiend: 0,
      aangemaakt: new Date().toISOString(),
    });
    return { action: "note_created" };
  },
});

// ─── Streak Cron (dagelijks) ──────────────────────────────────────────────────

/**
 * Dagelijkse streak validatie + auto-groei.
 * - Positieve habits: reset streaks die gebroken zijn door een gemiste due-dag
 * - Negatieve habits: auto-groei streaks (elke dag zonder incident = +1)
 */
export const decayStreaks = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Verwerk ALLE actieve habits (niet alleen streak > 0)
    // Negatieve habits MOETEN ook bij streak=0 verwerkt worden (auto-groei na incident reset)
    const allHabits = await ctx.db
      .query("habits")
      .filter((q) => q.and(
        q.eq(q.field("isActief"), true),
        q.eq(q.field("isPauze"), false),
      ))
      .collect();

    let updated = 0;
    let badgesAwarded = 0;
    let overloadSuggestions = 0;

    for (const habit of allHabits) {
      const newStreak = await computeCurrentStreak(
        ctx, habit._id, habit.frequentie, habit.aangepasteDagen,
        habit.type, habit.aangemaakt,
      );

      if (newStreak !== habit.huidigeStreak) {
        await ctx.db.patch(habit._id, {
          huidigeStreak: newStreak,
          langsteStreak: Math.max(habit.langsteStreak, newStreak),
          gewijzigd:     new Date().toISOString(),
        });
        updated++;

        // Badge check bij streak-groei
        if (newStreak > habit.huidigeStreak) {
          const existingBadges = await ctx.db
            .query("habitBadges")
            .withIndex("by_user", (q) => q.eq("userId", habit.userId))
            .collect();
          const behaald = new Set<string>(existingBadges.map((b) => b.badgeId));
          const newBadges = getNewBadges(newStreak, habit.totaalVoltooid, behaald);

          for (const badge of newBadges) {
            const exists = existingBadges.some((b) => b.badgeId === badge.id);
            if (exists) continue;

            await ctx.db.insert("habitBadges", {
              userId:       habit.userId,
              badgeId:      badge.id,
              habitId:      habit._id,
              naam:         badge.naam,
              emoji:        badge.emoji,
              beschrijving: badge.beschrijving,
              xpBonus:      badge.xpBonus,
              behaaldOp:    new Date().toISOString(),
            });
            badgesAwarded++;
          }
        }
      }

      // Feature 3: Progressive Overload — stel moeilijkheidsverlaging voor
      if (
        habit.moeilijkheid !== "makkelijk" &&
        OVERLOAD_THRESHOLDS.some((t) => newStreak === t)
      ) {
        try {
          await ctx.db.insert("notes", {
            userId: habit.userId,
            inhoud: `${habit.emoji} **${habit.naam}** heeft een streak van ${newStreak} dagen!\n\nDeze gewoonte zit verankerd in je systeem. Overweeg de moeilijkheid te verlagen van "${habit.moeilijkheid}" naar "${habit.moeilijkheid === "moeilijk" ? "normaal" : "makkelijk"}" om XP-inflatie te voorkomen.\n\n- [ ] Moeilijkheid aanpassen in Habits`,
            tags: ["overload", "habits"],
            isPinned: false,
            isArchived: false,
            aangemaakt: new Date().toISOString(),
            gewijzigd: new Date().toISOString(),
          });
          overloadSuggestions++;
        } catch { /* notes tabel fallback */ }
      }
    }

    return { checked: allHabits.length, updated, badgesAwarded, overloadSuggestions };
  },
});
