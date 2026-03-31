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
