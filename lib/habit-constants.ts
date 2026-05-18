/**
 * lib/habit-constants.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Frontend constants, labels & formatters for the Habit system.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Habit Colors (12 preset kleuren) ─────────────────────────────────────────

export const HABIT_COLORS = [
  "#f97316", // Orange
  "#ef4444", // Red
  "#ec4899", // Pink
  "#8b5cf6", // Violet
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#22c55e", // Green
  "#84cc16", // Lime
  "#eab308", // Yellow
  "#78716c", // Stone
  "#64748b", // Slate
] as const;

// ─── Labels ──────────────────────────────────────────────────────────────────

export const MOEILIJKHEID_LABELS: Record<string, string> = {
  makkelijk: "Makkelijk",
  normaal:   "Normaal",
  moeilijk:  "Moeilijk",
};

export const FREQUENTIE_LABELS: Record<string, string> = {
  dagelijks:     "Dagelijks",
  weekdagen:     "Ma – Vr",
  weekenddagen:  "Za – Zo",
  aangepast:     "Aangepaste dagen",
  x_per_week:    "X keer per week",
  x_per_maand:   "X keer per maand",
};

export const DAG_LABELS = ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"];

export const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  positief: { label: "Positief",  emoji: "✅" },
  negatief: { label: "Negatief", emoji: "🚫" },
};

// ─── Formatters ──────────────────────────────────────────────────────────────

export function formatStreak(days: number): string {
  if (days === 0) return "Geen streak";
  if (days === 1) return "1 dag 🔥";
  return `${days} dagen 🔥`;
}

export function formatXP(xp: number): string {
  if (xp >= 1_000) return `${(xp / 1000).toFixed(1)}K XP`;
  return `${xp} XP`;
}

export function formatLevel(level: number, titel: string): string {
  return `Lv.${level} ${titel}`;
}

// ─── Heatmap Intensity ───────────────────────────────────────────────────────

export const HEATMAP_COLORS = [
  "rgba(255,255,255,0.04)",  // 0: no data
  "rgba(249,115,22,0.20)",   // 1: low (1-25%)
  "rgba(249,115,22,0.40)",   // 2: medium (26-50%)
  "rgba(249,115,22,0.60)",   // 3: good (51-75%)
  "rgba(249,115,22,0.85)",   // 4: perfect (76-100%)
] as const;

export function getHeatmapLevel(completionRate: number): number {
  if (completionRate <= 0) return 0;
  if (completionRate <= 0.25) return 1;
  if (completionRate <= 0.50) return 2;
  if (completionRate <= 0.75) return 3;
  return 4;
}

// ─── Level System (from convex/lib/habitConstants) ──────────────────────────

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 18000, 25000,
];

const LEVEL_TITLES = [
  "Beginner", "Leerling", "Gewoonte-bouwer", "Discipline", "Strijder",
  "Kampioen", "Meester", "Expert", "Legende", "Titan", "Onstopbaar", "Grandmaster",
];

export interface LevelInfo {
  level: number;
  xp: number;
  nextXP: number;
  progress: number;
  titel: string;
}

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

// ─── Emoji Set ───────────────────────────────────────────────────────────────

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

// ─── Incident Triggers ────────────────────────────────────────────────────────

export const INCIDENT_TRIGGERS = [
  { value: "mentale_overprikkeling", label: "Mentale overprikkeling", emoji: "🧠" },
  { value: "fysieke_vermoeidheid",   label: "Fysieke vermoeidheid",   emoji: "😴" },
  { value: "stress_emotie",          label: "Stress / Emotionele reactie", emoji: "😤" },
  { value: "vermijdingsgedrag",      label: "Vermijdingsgedrag / Uitstel", emoji: "🙈" },
  { value: "sociale_druk",           label: "Sociale druk / Gezelligheid", emoji: "👥" },
  { value: "anders",                 label: "Anders",                  emoji: "📝" },
] as const;

// ─── Default Stap per Eenheid ────────────────────────────────────────────────

export const DEFAULT_STAP: Record<string, number> = {
  ml:  250,
  min: 15,
  km:  1,
  pg:  5,
  x:   1,
};

// ─── Badge Definitions ───────────────────────────────────────────────────────

export interface BadgeDefinition {
  id: string;
  naam: string;
  emoji: string;
  beschrijving: string;
  trigger: "streak" | "total" | "first" | "level";
  waarde: number;
  xpBonus: number;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: "streak_3",   naam: "Beginner",        emoji: "🌱", beschrijving: "3 dagen streak bereikt",    trigger: "streak", waarde: 3,    xpBonus: 25    },
  { id: "streak_7",   naam: "Week Warrior",    emoji: "⚡", beschrijving: "7 dagen streak bereikt",    trigger: "streak", waarde: 7,    xpBonus: 50    },
  { id: "streak_14",  naam: "Twee Weken",      emoji: "🔥", beschrijving: "14 dagen streak bereikt",   trigger: "streak", waarde: 14,   xpBonus: 100   },
  { id: "streak_30",  naam: "Maand Master",    emoji: "💎", beschrijving: "30 dagen streak bereikt",   trigger: "streak", waarde: 30,   xpBonus: 250   },
  { id: "streak_60",  naam: "Discipline King", emoji: "👑", beschrijving: "60 dagen streak bereikt",   trigger: "streak", waarde: 60,   xpBonus: 500   },
  { id: "streak_100", naam: "Centurion",       emoji: "🏆", beschrijving: "100 dagen streak bereikt",  trigger: "streak", waarde: 100,  xpBonus: 1000  },
  { id: "streak_365", naam: "Jaarlegenda",     emoji: "🌟", beschrijving: "365 dagen streak bereikt",  trigger: "streak", waarde: 365,  xpBonus: 5000  },
  { id: "total_10",   naam: "Eerste Stappen",  emoji: "👣", beschrijving: "10 keer voltooid",          trigger: "total",  waarde: 10,   xpBonus: 20    },
  { id: "total_50",   naam: "Halfweg",         emoji: "🎯", beschrijving: "50 keer voltooid",          trigger: "total",  waarde: 50,   xpBonus: 75    },
  { id: "total_100",  naam: "Honderdtal",      emoji: "💯", beschrijving: "100 keer voltooid",         trigger: "total",  waarde: 100,  xpBonus: 200   },
  { id: "total_500",  naam: "Veteraan",        emoji: "🎖️", beschrijving: "500 keer voltooid",         trigger: "total",  waarde: 500,  xpBonus: 500   },
  { id: "total_1000", naam: "Legende",         emoji: "🏅", beschrijving: "1000 keer voltooid",        trigger: "total",  waarde: 1000, xpBonus: 2000  },
  { id: "first_habit", naam: "De Eerste",      emoji: "🚀", beschrijving: "Eerste habit voltooid!",    trigger: "first",  waarde: 1,    xpBonus: 10    },
];
