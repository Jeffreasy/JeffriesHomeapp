/**
 * convex/lib/salaryCalc.ts
 * ============================================================
 * Pure TypeScript vertaling van Salaris.gs _berekenMaandloon()
 * Geen externe afhankelijkheden — werkt in Convex queries en Actions.
 * ============================================================
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleItem {
  startDatum:  string;   // "YYYY-MM-DD"
  startTijd:   string;   // "HH:MM"
  eindTijd:    string;   // "HH:MM"
  duur:        number;   // uren
  dag:         string;   // "Maandag" .. "Zondag"
  shiftType:   string;   // "Vroeg" | "Laat" | "Dienst"
  status:      string;   // "Opkomend" | "Gedraaid"
  heledag:     boolean;
}

export interface OrtCategorie {
  pct:   number;
  label: string;
}

export interface Tarief {
  salaris100:    number;
  uurloonORT:    number;
  reiskostenKm:  number;
}

export interface EenmaligItem {
  label:  string;
  bedrag: number;
}

export interface MaandResult {
  jaar:             number;
  maand:            number;
  maandLabel:       string;
  aantalDiensten:   number;
  tarieven:         Tarief;

  basisLoon:          number;
  amtZeerintensief:   number;
  toeslagBalansvif:   number;
  reiskosten:         number;
  werkdagenMaand:     number;

  ortUren:            Record<string, number>;
  ortTotalen:         Record<string, number>;
  ortTotaalBedrag:    number;

  extraUren:          number;
  extraUrenBedrag:    number;
  toeslagVakatieUren: number;

  eenmalig:           EenmaligItem[];
  eenmaligTotaal:     number;

  brutoBetaling:      number;
  pensioengrondslag:  number;
  pensioenpremie:     number;
  loonheffingSchat:   number;
  nettoPrognose:      number;
}

// ─── Configuratie ─────────────────────────────────────────────────────────────

export const SALARIS_CONFIG = {
  DEELTIJDFACTOR: 0.44440,

  TARIEF_TABEL: [
    { vanaf: "2025-01-01", salaris100: 3107.00, uurloonORT: 19.85, reiskostenKm: 0.16 },
    { vanaf: "2025-08-01", salaris100: 3231.00, uurloonORT: 20.65, reiskostenKm: 0.20 },
    { vanaf: "2025-12-01", salaris100: 3319.00, uurloonORT: 20.65, reiskostenKm: 0.20 },
    { vanaf: "2026-01-01", salaris100: 3481.00, uurloonORT: 21.21, reiskostenKm: 0.20 },
    { vanaf: "2026-02-01", salaris100: 3481.00, uurloonORT: 22.24, reiskostenKm: 0.20 },
  ] as Array<{ vanaf: string; salaris100: number; uurloonORT: number; reiskostenKm: number }>,

  ORT: {
    AVOND:    { pct: 0.22, label: "ORT 22% (avond/doordeweeks)" },
    VROEG:    { pct: 0.38, label: "ORT 38% (vroeg)" },
    NACHT:    { pct: 0.44, label: "ORT 44% (nacht)" },
    ZATERDAG: { pct: 0.52, label: "ORT 52% (zaterdag)" },
    ZONDAG:   { pct: 0.60, label: "ORT 60% (zondag)" },
  } as Record<string, OrtCategorie>,

  AMT_ZEERINTENSIEF_PCT:    0.0500,
  TOESLAG_BALANSVIF_PCT:    0.0304,
  TOESLAG_VAKANTIEUREN_PCT: 0.0767,
  PENSIOEN_PCT:             0.1295,
  VAKANTIEGELD_PCT:         0.0800,
  EINDEJAARSUITKERING_PCT:  0.0833,
  REISAFSTAND_KM_ENKEL:     33,

  LOONHEFFING_TABEL_2026: [
    { tot: 38441,      tarief: 0.3597 },
    { tot: 76817,      tarief: 0.3748 },
    { tot: Infinity,   tarief: 0.4950 },
  ],
  LOONHEFFINGSKORTING_2026: 3070,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function r2(n: number): number { return Math.round(n * 100) / 100; }

export function getTarief(peilDatum: Date): Tarief {
  const peilStr = peilDatum.toISOString().slice(0, 10);
  const sorted  = [...SALARIS_CONFIG.TARIEF_TABEL].sort((a, b) =>
    b.vanaf.localeCompare(a.vanaf)
  );
  const match = sorted.find(t => t.vanaf <= peilStr);
  return match ?? sorted[sorted.length - 1];
}

function telWerkdagen(jaar: number, maand: number): number {
  let count = 0;
  const daysInMonth = new Date(jaar, maand, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(jaar, maand - 1, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

function berekenDuur(startTijd: string, eindTijd: string): number {
  if (!startTijd || !eindTijd) return 0;
  const [sh, sm] = startTijd.split(":").map(Number);
  const [eh, em] = eindTijd.split(":").map(Number);
  let minuten = (eh * 60 + em) - (sh * 60 + sm);
  if (minuten < 0) minuten += 24 * 60; // nachtdienst over middernacht
  return r2(minuten / 60);
}

function classifyDienst(d: ScheduleItem): {
  uren: number;
  ortCategorie: string | null;
  isExtra: boolean;
} {
  const uren = d.duur > 0 ? d.duur : berekenDuur(d.startTijd, d.eindTijd);
  if (uren <= 0) return { uren: 0, ortCategorie: null, isExtra: false };

  const dag        = d.dag?.toLowerCase() ?? "";
  const shiftType  = d.shiftType?.toLowerCase() ?? "";
  const startUur   = parseInt(d.startTijd?.split(":")[0] ?? "9", 10);

  let ortCategorie: string | null = null;

  if (dag === "zondag")    ortCategorie = "ZONDAG";
  else if (dag === "zaterdag") ortCategorie = "ZATERDAG";
  else if (shiftType === "vroeg" || startUur < 7) ortCategorie = "VROEG";
  else if (startUur >= 20) ortCategorie = "NACHT";
  else if (startUur >= 18) ortCategorie = "AVOND";
  else if (startUur >= 13) ortCategorie = "AVOND"; // laat dienst → avond ORT

  // Extra uren: diensten langer dan 8u of shiftType bevat "extra" — vereenvoudigd
  const isExtra = uren > 8;

  return { uren, ortCategorie, isExtra };
}

function berekenLoonheffingSchatting(jaarBruto: number, jaar: number): number {
  // Simpele marginaal-tarief schatting (voldoende nauwkeurig voor prognose)
  const tabel = SALARIS_CONFIG.LOONHEFFING_TABEL_2026;
  let heffing = 0;
  let vorig   = 0;
  for (const bracket of tabel) {
    if (jaarBruto <= vorig) break;
    const belastbaar = Math.min(jaarBruto, bracket.tot) - vorig;
    heffing += belastbaar * bracket.tarief;
    vorig    = bracket.tot;
  }
  // Trek heffingskorting af
  heffing = Math.max(0, heffing - SALARIS_CONFIG.LOONHEFFINGSKORTING_2026);
  return r2(heffing);
}

// ─── Hoofd berekening ─────────────────────────────────────────────────────────

/**
 * Berekent het volledige maandloon voor een periode.
 * Directe TypeScript port van Salaris.gs _berekenMaandloon().
 */
export function berekenMaandloon(
  jaar:     number,
  maand:    number,
  diensten: ScheduleItem[]
): MaandResult {
  const peilDatum = new Date(jaar, maand - 1, 1);
  const tarieven  = getTarief(peilDatum);
  const { salaris100, uurloonORT, reiskostenKm } = tarieven;

  const basisLoon        = r2(salaris100 * SALARIS_CONFIG.DEELTIJDFACTOR);
  const amtZeerintensief = r2(basisLoon  * SALARIS_CONFIG.AMT_ZEERINTENSIEF_PCT);
  const toeslagBalansvif = r2(basisLoon  * SALARIS_CONFIG.TOESLAG_BALANSVIF_PCT);

  const werkdagenMaand = telWerkdagen(jaar, maand);
  const reiskosten     = r2(werkdagenMaand * 2 * SALARIS_CONFIG.REISAFSTAND_KM_ENKEL * reiskostenKm);

  // ORT per categorie
  const ortTotalen: Record<string, number> = { AVOND: 0, VROEG: 0, NACHT: 0, ZATERDAG: 0, ZONDAG: 0 };
  const ortUren:    Record<string, number> = { AVOND: 0, VROEG: 0, NACHT: 0, ZATERDAG: 0, ZONDAG: 0 };
  let extraUrenBedrag = 0;
  let extraUren       = 0;

  for (const d of diensten) {
    const { uren, ortCategorie, isExtra } = classifyDienst(d);
    if (uren <= 0) continue;

    if (isExtra) {
      extraUrenBedrag += r2(uren * uurloonORT);
      extraUren       += uren;
    }

    if (ortCategorie && SALARIS_CONFIG.ORT[ortCategorie]) {
      const bedrag = r2(uren * uurloonORT * SALARIS_CONFIG.ORT[ortCategorie].pct);
      ortTotalen[ortCategorie] += bedrag;
      ortUren[ortCategorie]    += uren;
    }
  }

  const ortTotaalBedrag    = r2(Object.values(ortTotalen).reduce((s, v) => s + v, 0));
  const toeslagVakatieUren = r2(extraUrenBedrag * SALARIS_CONFIG.TOESLAG_VAKANTIEUREN_PCT);

  // Eenmalige uitkeringen
  const eenmalig: EenmaligItem[] = [];
  if (maand === 5) {
    const vkgBasis  = (basisLoon + amtZeerintensief + toeslagBalansvif) * 12;
    eenmalig.push({ label: "Vakantiegeld (8%)", bedrag: r2(vkgBasis * SALARIS_CONFIG.VAKANTIEGELD_PCT) });
  }
  if (maand === 12) {
    const edBasis = (basisLoon + amtZeerintensief) * 12;
    eenmalig.push({ label: "Eindejaarsuitkering (8,33%)", bedrag: r2(edBasis * SALARIS_CONFIG.EINDEJAARSUITKERING_PCT) });
    eenmalig.push({ label: "WKR Uitruil (belastingvrij)", bedrag: 240.00 });
  }
  const eenmaligTotaal = r2(eenmalig.reduce((s, e) => s + e.bedrag, 0));

  // Bruto totaal
  const brutoBetaling = r2(
    basisLoon + amtZeerintensief + toeslagBalansvif +
    ortTotaalBedrag + extraUrenBedrag + toeslagVakatieUren +
    reiskosten + eenmaligTotaal
  );

  // Pensioen
  const pensioengrondslag = r2(basisLoon + amtZeerintensief + toeslagBalansvif + ortTotaalBedrag + extraUrenBedrag);
  const pensioenpremie    = r2(pensioengrondslag * SALARIS_CONFIG.PENSIOEN_PCT);

  // Netto prognose
  const fiscaalBruto     = brutoBetaling - reiskosten;
  const loonheffingSchat = r2(berekenLoonheffingSchatting(fiscaalBruto * 12, jaar) / 12);
  const nettoPrognose    = r2(brutoBetaling - pensioenpremie - loonheffingSchat);

  return {
    jaar, maand,
    maandLabel:       `${jaar}-${String(maand).padStart(2, "0")}`,
    aantalDiensten:   diensten.length,
    tarieven,
    basisLoon, amtZeerintensief, toeslagBalansvif, reiskosten, werkdagenMaand,
    ortUren, ortTotalen, ortTotaalBedrag,
    extraUren, extraUrenBedrag, toeslagVakatieUren,
    eenmalig, eenmaligTotaal,
    brutoBetaling,
    pensioengrondslag, pensioenpremie, loonheffingSchat, nettoPrognose,
  };
}

/**
 * Groepeert een array van ScheduleItems per jaar-maand key ("YYYY-MM").
 */
export function groepeerPerMaand(
  diensten: ScheduleItem[]
): Record<string, ScheduleItem[]> {
  return diensten.reduce<Record<string, ScheduleItem[]>>((acc, d) => {
    const key = d.startDatum.slice(0, 7); // "YYYY-MM"
    (acc[key] ??= []).push(d);
    return acc;
  }, {});
}
