export type LaventeCarePdfTheme = "screen" | "print";

export type LaventeCarePdfPalette = {
  bgDeep: string;
  bgBase: string;
  bgSurface: string;
  bgCard: string;
  teal: string;
  tealSoft: string;
  emerald: string;
  amber: string;
  rose: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderSubtle: string;
  borderAccent: string;
};

export const LAVENTECARE_PDF_FONTS = {
  title: "Outfit",
  body: "Inter",
} as const;

export const LAVENTECARE_PDF_SPACING = {
  pageX: 44,
  pageY: 38,
} as const;

export function isLaventeCarePdfTheme(value: string | null): value is LaventeCarePdfTheme {
  return value === "screen" || value === "print";
}

export function getLaventeCarePdfPalette(theme: LaventeCarePdfTheme = "screen"): LaventeCarePdfPalette {
  if (theme === "print") {
    return {
      bgDeep: "#FFFFFF",
      bgBase: "#FFFFFF",
      bgSurface: "#F8FAFC",
      bgCard: "#EEF2F7",
      teal: "#0F766E",
      tealSoft: "#0D9488",
      emerald: "#047857",
      amber: "#B45309",
      rose: "#BE123C",
      textPrimary: "#0F172A",
      textSecondary: "#334155",
      textMuted: "#64748B",
      borderSubtle: "#CBD5E1",
      borderAccent: "#0F766E",
    };
  }

  return {
    bgDeep: "#0A1628",
    bgBase: "#0F1E35",
    bgSurface: "#162844",
    bgCard: "#1C3255",
    teal: "#0891B2",
    tealSoft: "#22D3EE",
    emerald: "#34D399",
    amber: "#FBBF24",
    rose: "#FB7185",
    textPrimary: "#F0F9FF",
    textSecondary: "#BAE6FD",
    textMuted: "#94A3B8",
    borderSubtle: "#1E3A52",
    borderAccent: "#0891B2",
  };
}

