import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { computeXP, getNewBadges, type Moeilijkheid } from "./lib/habitConstants";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T12:00:00").getDay(); // 0=zo,1=ma,...6=za
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
      .map((h) => ({ naam: h.naam, emoji: h.emoji, streak: h.huidigeStreak }));

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

/** 365 dagen heatmap data */
export const getHeatmapData = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Bereken datumrange: 365 dagen terug
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 364);
    const startStr = start.toISOString().slice(0, 10);

    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActief"), true))
      .collect();

    const habitCount = habits.length || 1;

    // Alle logs in range
    const logs = await ctx.db
      .query("habitLogs")
      .withIndex("by_user_datum", (q) => q.eq("userId", userId).gte("datum", startStr))
      .collect();

    // Groepeer per datum
    const dayMap = new Map<string, number>();
    for (const log of logs) {
      if (log.voltooid) {
        dayMap.set(log.datum, (dayMap.get(log.datum) ?? 0) + 1);
      }
    }

    // Genereer 365 dagen
    const days: Array<{ datum: string; count: number; rate: number }> = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      const count = dayMap.get(ds) ?? 0;
      days.push({ datum: ds, count, rate: count / habitCount });
    }

    return { days, habitCount };
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

    const logSet = new Set(logs.filter((l) => l.voltooid).map((l) => l.habitId.toString()));

    const badges = await ctx.db
      .query("habitBadges")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const totaalXP = habits.reduce((s, h) => s + h.totaalXP, 0)
      + badges.reduce((s, b) => s + b.xpBonus, 0);

    return {
      totaal: habits.length,
      vandaagVoltooid: logSet.size,
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
          vandaagKlaar: logSet.has(h._id.toString()),
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

    // Bepaal volgorde (achteraan)
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
    const habit = await ctx.db.get(args.habitId);
    if (!habit) throw new Error("Habit niet gevonden");

    const datum = args.datum ?? todayStr();
    const bron = args.bron ?? "web";

    // Check of er al een log is voor deze datum
    const existingLog = await ctx.db
      .query("habitLogs")
      .withIndex("by_habit_datum", (q) => q.eq("habitId", args.habitId).eq("datum", datum))
      .first();

    if (existingLog) {
      // Undo: verwijder log en pas streak aan
      const wasCompleted = existingLog.voltooid;
      await ctx.db.delete(existingLog._id);

      if (wasCompleted) {
        const newStreak = Math.max(0, habit.huidigeStreak - 1);
        await ctx.db.patch(args.habitId, {
          huidigeStreak:  newStreak,
          totaalVoltooid: Math.max(0, habit.totaalVoltooid - 1),
          totaalXP:       Math.max(0, habit.totaalXP - existingLog.xpVerdiend),
          gewijzigd:      new Date().toISOString(),
        });
      }

      return { action: "unchecked", xp: 0 };
    }

    // Nieuw: log completion
    const xp = computeXP(habit.moeilijkheid as Moeilijkheid, habit.huidigeStreak);
    const newStreak = habit.huidigeStreak + 1;
    const newTotal = habit.totaalVoltooid + 1;

    await ctx.db.insert("habitLogs", {
      userId:     args.userId,
      habitId:    args.habitId,
      datum,
      voltooid:   true,
      waarde:     args.waarde,
      isIncident: false,
      notitie:    args.notitie,
      bron,
      xpVerdiend: xp,
      aangemaakt: new Date().toISOString(),
    });

    await ctx.db.patch(args.habitId, {
      huidigeStreak:  newStreak,
      langsteStreak:  Math.max(habit.langsteStreak, newStreak),
      totaalVoltooid: newTotal,
      totaalXP:       habit.totaalXP + xp,
      gewijzigd:      new Date().toISOString(),
    });

    // Badge check
    const existingBadges = await ctx.db
      .query("habitBadges")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const behaald = new Set(existingBadges.map((b) => b.badgeId));
    const newBadges = getNewBadges(newStreak, newTotal, behaald);

    let bonusXP = 0;
    for (const badge of newBadges) {
      bonusXP += badge.xpBonus;
      await ctx.db.insert("habitBadges", {
        userId:       args.userId,
        badgeId:      badge.id,
        habitId:      args.habitId,
        naam:         badge.naam,
        emoji:        badge.emoji,
        beschrijving: badge.beschrijving,
        xpBonus:      badge.xpBonus,
        behaaldOp:    new Date().toISOString(),
      });
    }

    if (bonusXP > 0) {
      await ctx.db.patch(args.habitId, {
        totaalXP: habit.totaalXP + xp + bonusXP,
      });
    }

    return {
      action: "checked",
      xp,
      streak: newStreak,
      newBadges: newBadges.map((b) => ({ naam: b.naam, emoji: b.emoji })),
    };
  },
});

/** Negatieve habit: log incident (streak reset) */
export const logIncident = mutation({
  args: {
    userId:  v.string(),
    habitId: v.id("habits"),
    notitie: v.optional(v.string()),
    bron:    v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const habit = await ctx.db.get(args.habitId);
    if (!habit) throw new Error("Habit niet gevonden");
    if (habit.type !== "negatief") throw new Error("Alleen voor negatieve habits");

    const datum = todayStr();
    const bron = args.bron ?? "web";

    await ctx.db.insert("habitLogs", {
      userId:     args.userId,
      habitId:    args.habitId,
      datum,
      voltooid:   false,
      isIncident: true,
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

export const toggleCompletionInternal = internalMutation({
  args: {
    userId:  v.string(),
    habitId: v.string(),
    datum:   v.optional(v.string()),
    bron:    v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const habitId = args.habitId as Id<"habits">;
    const habit = await ctx.db.get(habitId);
    if (!habit) throw new Error("Habit niet gevonden");

    const datum = args.datum ?? todayStr();
    const bron = args.bron ?? "grok";

    const existingLog = await ctx.db
      .query("habitLogs")
      .withIndex("by_habit_datum", (q) => q.eq("habitId", habitId).eq("datum", datum))
      .first();

    if (existingLog) {
      await ctx.db.delete(existingLog._id);
      if (existingLog.voltooid) {
        await ctx.db.patch(habitId, {
          huidigeStreak:  Math.max(0, habit.huidigeStreak - 1),
          totaalVoltooid: Math.max(0, habit.totaalVoltooid - 1),
          totaalXP:       Math.max(0, habit.totaalXP - existingLog.xpVerdiend),
          gewijzigd:      new Date().toISOString(),
        });
      }
      return { action: "unchecked" };
    }

    const xp = computeXP(habit.moeilijkheid as Moeilijkheid, habit.huidigeStreak);
    const newStreak = habit.huidigeStreak + 1;
    const newTotal = habit.totaalVoltooid + 1;

    await ctx.db.insert("habitLogs", {
      userId: args.userId, habitId, datum, voltooid: true, isIncident: false,
      bron, xpVerdiend: xp, aangemaakt: new Date().toISOString(),
    });

    await ctx.db.patch(habitId, {
      huidigeStreak:  newStreak,
      langsteStreak:  Math.max(habit.langsteStreak, newStreak),
      totaalVoltooid: newTotal,
      totaalXP:       habit.totaalXP + xp,
      gewijzigd:      new Date().toISOString(),
    });

    // Badge check (same logic as public toggleCompletion)
    const existingBadges = await ctx.db
      .query("habitBadges")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const behaald = new Set(existingBadges.map((b) => b.badgeId));
    const newBadges = getNewBadges(newStreak, newTotal, behaald);

    let bonusXP = 0;
    for (const badge of newBadges) {
      bonusXP += badge.xpBonus;
      await ctx.db.insert("habitBadges", {
        userId:       args.userId,
        badgeId:      badge.id,
        habitId,
        naam:         badge.naam,
        emoji:        badge.emoji,
        beschrijving: badge.beschrijving,
        xpBonus:      badge.xpBonus,
        behaaldOp:    new Date().toISOString(),
      });
    }

    if (bonusXP > 0) {
      await ctx.db.patch(habitId, {
        totaalXP: habit.totaalXP + xp + bonusXP,
      });
    }

    return {
      action: "checked",
      xp,
      streak: newStreak,
      newBadges: newBadges.map((b) => ({ naam: b.naam, emoji: b.emoji })),
    };
  },
});

export const logIncidentInternal = internalMutation({
  args: { userId: v.string(), habitId: v.string(), notitie: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const habitId = args.habitId as Id<"habits">;
    const habit = await ctx.db.get(habitId);
    if (!habit) throw new Error("Habit niet gevonden");

    await ctx.db.insert("habitLogs", {
      userId: args.userId, habitId, datum: todayStr(), voltooid: false,
      isIncident: true, notitie: args.notitie, bron: "grok", xpVerdiend: 0,
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

    // Find existing log for today
    const existingLog = await ctx.db
      .query("habitLogs")
      .withIndex("by_habit_datum", (q) => q.eq("habitId", habitId).eq("datum", datum))
      .first();

    if (existingLog) {
      // Patch the notitie onto the existing log
      await ctx.db.patch(existingLog._id, { notitie: args.notitie });
      return { action: "note_updated" };
    }

    // No log yet — create a non-completion note log
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
