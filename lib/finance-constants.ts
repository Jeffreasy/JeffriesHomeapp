// ─── Finance shared constants ─────────────────────────────────────────────────
// Single source of truth for category options and code labels.
// Used by page.tsx, FilterPanel, TransactionList, and any future finance component.

export const CATEGORIE_OPTIES = [
  "Boodschappen", "Brandstof", "Coffeeshop", "Crypto", "Familie",
  "Fastfood", "Gaming", "Geldopname", "Online Winkelen", "Persoonlijk",
  "SaaS", "SaaS Abonnementen", "Salaris", "Sport", "Streaming",
  "Telecom", "Toeslagen", "Vakantie", "Vaste Lasten", "Vervoer",
  "Verzekeringen", "Vrienden", "Vrije Tijd", "Zakelijk",
  "Zorgverzekering", "Overig",
] as const;

export type Categorie = (typeof CATEGORIE_OPTIES)[number];

export const CODE_LABELS: Record<string, string> = {
  tb: "Overboeking", bc: "Betaalopdracht", id: "Incasso",
  ei: "Europese Incasso", ba: "Bankopdracht", bg: "Bankgiro",
  cb: "Creditcard", db: "Debetkaart", st: "Stornering",
  sb: "SEPA", ga: "Geldautomaat", gb: "Geldautomaat", kh: "Kascheque",
};

export function ibanLabel(iban: string): string {
  if (!iban) return "Onbekende rekening";
  const suffix = iban.slice(-4);
  return `Rekening ${suffix}`;
}

// ─── Category color palette ──────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<string, string> = {
  Boodschappen:       "#22c55e",
  Brandstof:          "#f97316",
  Coffeeshop:         "#8b5cf6",
  Crypto:             "#06b6d4",
  Familie:            "#ec4899",
  Fastfood:           "#ef4444",
  Gaming:             "#3b82f6",
  Geldopname:         "#fb7185",
  "Interne Overboeking": "#475569",
  "Online Winkelen":  "#f59e0b",
  Persoonlijk:        "#14b8a6",
  SaaS:               "#6366f1",
  "SaaS Abonnementen":"#a78bfa",
  Salaris:            "#34d399",
  Sport:              "#84cc16",
  Streaming:          "#e879f9",
  Telecom:            "#0ea5e9",
  Toeslagen:          "#a3e635",
  Vakantie:           "#fbbf24",
  "Vaste Lasten":     "#94a3b8",
  Vervoer:            "#0284c7",
  Verzekeringen:      "#f43f5e",
  Vrienden:           "#d946ef",
  "Vrije Tijd":       "#2dd4bf",
  Zakelijk:           "#78716c",
  Zorgverzekering:    "#fda4af",
  Overig:             "#64748b",
};

export function getCatColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? "#64748b";
}

// ─── Currency formatters ─────────────────────────────────────────────────────

export const eur = (n: number) =>
  n.toLocaleString("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const eurExact = (n: number) =>
  n.toLocaleString("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
