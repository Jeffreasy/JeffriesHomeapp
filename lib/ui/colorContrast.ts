import { hexToRgb } from "@/lib/utils";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function linearChannel(channel: number) {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }: RgbColor) {
  return (
    0.2126 * linearChannel(r) +
    0.7152 * linearChannel(g) +
    0.0722 * linearChannel(b)
  );
}

export function contrastRatio(first: RgbColor, second: RgbColor) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

export function hexContrastRatio(first: string, second: string) {
  return contrastRatio(hexToRgb(first), hexToRgb(second));
}
// CSS variables cannot be measured before render, so these candidates mirror the
// canonical solid-foreground tokens and keep runtime colour projection deterministic.
const SOLID_FOREGROUND_CANDIDATES = {
  dark: { color: "#0a0a0f", token: "var(--color-solid-foreground-dark)" },
  light: { color: "#ffffff", token: "var(--color-solid-foreground-light)" },
} as const;

export function solidForegroundToken(background: string) {
  const darkContrast = hexContrastRatio(background, SOLID_FOREGROUND_CANDIDATES.dark.color);
  const lightContrast = hexContrastRatio(background, SOLID_FOREGROUND_CANDIDATES.light.color);
  return darkContrast >= lightContrast
    ? SOLID_FOREGROUND_CANDIDATES.dark.token
    : SOLID_FOREGROUND_CANDIDATES.light.token;
}
