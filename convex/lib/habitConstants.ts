/**
 * convex/lib/habitConstants.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Habit gamification engine — XP, levels, badges, moeilijkheid multipliers.
 * Shared between server (habits.ts) and AI tools.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── XP System ───────────────────────────────────────────────────────────────

export const BASE_XP = 10;

export const XP_MULTIPLIER = {
  makkelijk: 0.5,
  normaal:   1,
  moeilijk:  2,
} as const;

export type Moeilijkheid = keyof typeof XP_MULTIPLIER;

export function computeXP(moeilijkheid: Moeilijkheid, streakBonus: number = 0): number {
  const base = Math.round(BASE_XP * XP_MULTIPLIER[moeilijkheid]);
  // Streak bonus: +1 XP per 5 streak days, capped at +10
  const bonus = Math.min(10, Math.floor(streakBonus / 5));
  return base + bonus;
}

// ─── Level System (exponential curve) ────────────────────────────────────────

export const LEVEL_THRESHOLDS = [
  0,       // Level 1
  100,     // Level 2
  250,     // Level 3
  500,     // Level 4
  1000,    // Level 5
  2000,    // Level 6
  3500,    // Level 7
  5500,    // Level 8
  8000,    // Level 9
  12000,   // Level 10
  18000,   // Level 11
  25000,   // Level 12 (max)
];

export interface LevelInfo {
  level:    number;
  xp:       number;
  nextXP:   number;    // XP needed for next level (0 at max)
  progress: number;    // 0-1 progress to next level
  titel:    string;
}

const LEVEL_TITLES = [
  "Beginner",        // 1
  "Leerling",        // 2
  "Gewoonte-bouwer", // 3
  "Discipline",      // 4
  "Strijder",        // 5
  "Kampioen",        // 6
  "Meester",         // 7
  "Expert",          // 8
  "Legende",         // 9
  "Titan",           // 10
  "Onstopbaar",      // 11
  "Grandmaster",     // 12
];

export function getLevel(totalXP: number): LevelInfo {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) { level = i + 1; break; }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? currentThreshold;
  const isMax = level >= LEVEL_THRESHOLDS.length;
  const range = nextThreshold - currentThreshold || 1;
  const progress = isMax ? 1 : (totalXP - currentThreshold) / range;

  return {
    level,
    xp: totalXP,
    nextXP: isMax ? 0 : nextThreshold - totalXP,
    progress: Math.min(1, Math.max(0, progress)),
    titel: LEVEL_TITLES[level - 1] ?? "Grandmaster",
  };
}

// ─── Badge Definitions ───────────────────────────────────────────────────────

export interface BadgeDefinition {
  id:           string;
  naam:         string;
  emoji:        string;
  beschrijving: string;
  trigger:      "streak" | "total" | "first" | "level";
  waarde:       number;
  xpBonus:      number;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Streak milestones
  { id: "streak_3",   naam: "Beginner",         emoji: "🌱", beschrijving: "3 dagen streak bereikt",     trigger: "streak", waarde: 3,    xpBonus: 25    },
  { id: "streak_7",   naam: "Week Warrior",     emoji: "⚡", beschrijving: "7 dagen streak bereikt",     trigger: "streak", waarde: 7,    xpBonus: 50    },
  { id: "streak_14",  naam: "Twee Weken",       emoji: "🔥", beschrijving: "14 dagen streak bereikt",    trigger: "streak", waarde: 14,   xpBonus: 100   },
  { id: "streak_30",  naam: "Maand Master",     emoji: "💎", beschrijving: "30 dagen streak bereikt",    trigger: "streak", waarde: 30,   xpBonus: 250   },
  { id: "streak_60",  naam: "Discipline King",  emoji: "👑", beschrijving: "60 dagen streak bereikt",    trigger: "streak", waarde: 60,   xpBonus: 500   },
  { id: "streak_100", naam: "Centurion",        emoji: "🏆", beschrijving: "100 dagen streak bereikt",   trigger: "streak", waarde: 100,  xpBonus: 1000  },
  { id: "streak_365", naam: "Jaarlegenda",      emoji: "🌟", beschrijving: "365 dagen streak bereikt",   trigger: "streak", waarde: 365,  xpBonus: 5000  },

  // Total completions
  { id: "total_10",   naam: "Eerste Stappen",   emoji: "👣", beschrijving: "10 keer voltooid",           trigger: "total",  waarde: 10,   xpBonus: 20    },
  { id: "total_50",   naam: "Halfweg",          emoji: "🎯", beschrijving: "50 keer voltooid",           trigger: "total",  waarde: 50,   xpBonus: 75    },
  { id: "total_100",  naam: "Honderdtal",       emoji: "💯", beschrijving: "100 keer voltooid",          trigger: "total",  waarde: 100,  xpBonus: 200   },
  { id: "total_500",  naam: "Veteraan",         emoji: "🎖️", beschrijving: "500 keer voltooid",          trigger: "total",  waarde: 500,  xpBonus: 500   },
  { id: "total_1000", naam: "Legende",          emoji: "🏅", beschrijving: "1000 keer voltooid",         trigger: "total",  waarde: 1000, xpBonus: 2000  },

  // Special
  { id: "first_habit", naam: "De Eerste",       emoji: "🚀", beschrijving: "Eerste habit voltooid!",     trigger: "first",  waarde: 1,    xpBonus: 10    },
];

/**
 * Check welke badges unlocked moeten worden na een completion.
 * Returns array van nieuw te unlocken badge IDs.
 */
export function getNewBadges(
  huidigeStreak: number,
  totaalVoltooid: number,
  reedsBehaald: Set<string>,
): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter((b) => {
    if (reedsBehaald.has(b.id)) return false;

    switch (b.trigger) {
      case "streak": return huidigeStreak >= b.waarde;
      case "total":  return totaalVoltooid >= b.waarde;
      case "first":  return totaalVoltooid >= b.waarde;
      default:       return false;
    }
  });
}

// ─── Curated Emoji Set ───────────────────────────────────────────────────────

export const HABIT_EMOJIS = [
  "💧", "🏋️", "🧘", "📖", "🏃", "💊", "🥗", "😴", "🧹", "✍️",
  "🚫", "🎯", "⏰", "🌅", "🌙", "☕", "🥤", "🍎", "🦷", "🧠",
  "📱", "💻", "🎵", "🎨", "🌿", "🐕", "💪", "🙏", "📝", "🔔",
];

// ─── Rooster Filter Labels ──────────────────────────────────────────────────

export const ROOSTER_FILTER_OPTIONS = [
  { value: "alle",         label: "Altijd" },
  { value: "werkdagen",    label: "Alleen op werkdagen" },
  { value: "vrijeDagen",   label: "Alleen op vrije dagen" },
  { value: "vroegeDienst", label: "Alleen bij Vroege dienst" },
  { value: "lateDienst",   label: "Alleen bij Late dienst" },
] as const;
