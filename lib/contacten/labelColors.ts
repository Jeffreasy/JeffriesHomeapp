// Maps a label palette key (stored on the backend) to Tailwind chip classes.
// Keep the keys in sync with store.NormalizeLabelColor on the backend.

export const LABEL_COLOR_KEYS = [
  "slate",
  "amber",
  "sky",
  "emerald",
  "rose",
  "violet",
  "orange",
  "teal",
  "blue",
  "pink",
  "lime",
  "cyan",
  "red",
  "indigo",
  "fuchsia",
] as const;

export type LabelColorKey = (typeof LABEL_COLOR_KEYS)[number];

// Full-static class strings (no interpolation) so Tailwind's JIT keeps them.
const CHIP: Record<LabelColorKey, string> = {
  slate: "border-slate-400/30 bg-slate-400/12 text-slate-200",
  amber: "border-amber-500/30 bg-amber-500/12 text-amber-200",
  sky: "border-sky-500/30 bg-sky-500/12 text-sky-200",
  emerald: "border-emerald-500/30 bg-emerald-500/12 text-emerald-200",
  rose: "border-rose-500/30 bg-rose-500/12 text-rose-200",
  violet: "border-violet-500/30 bg-violet-500/12 text-violet-200",
  orange: "border-orange-500/30 bg-orange-500/12 text-orange-200",
  teal: "border-teal-500/30 bg-teal-500/12 text-teal-200",
  blue: "border-blue-500/30 bg-blue-500/12 text-blue-200",
  pink: "border-pink-500/30 bg-pink-500/12 text-pink-200",
  lime: "border-lime-500/30 bg-lime-500/12 text-lime-200",
  cyan: "border-cyan-500/30 bg-cyan-500/12 text-cyan-200",
  red: "border-red-500/30 bg-red-500/12 text-red-200",
  indigo: "border-indigo-500/30 bg-indigo-500/12 text-indigo-200",
  fuchsia: "border-fuchsia-500/30 bg-fuchsia-500/12 text-fuchsia-200",
};

// Solid dot swatch for the palette picker.
const DOT: Record<LabelColorKey, string> = {
  slate: "bg-slate-400",
  amber: "bg-amber-500",
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  orange: "bg-orange-500",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  pink: "bg-pink-500",
  lime: "bg-lime-500",
  cyan: "bg-cyan-500",
  red: "bg-red-500",
  indigo: "bg-indigo-500",
  fuchsia: "bg-fuchsia-500",
};

function normalize(color: string): LabelColorKey {
  const c = (color || "").toLowerCase();
  return (LABEL_COLOR_KEYS as readonly string[]).includes(c) ? (c as LabelColorKey) : "slate";
}

export function labelChipClasses(color: string): string {
  return CHIP[normalize(color)];
}

export function labelDotClasses(color: string): string {
  return DOT[normalize(color)];
}
