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
  VOLTIJD_UREN_WEEK: 36,

  TARIEF_TABEL: [
    { vanaf: "2025-01-01", salaris100: 3107.00, uurloonORT: 19.85, reiskostenKm: 0.16 },
    { vanaf: "2025-08-01", salaris100: 3231.00, uurloonORT: 20.65, reiskostenKm: 0.20 },
    { vanaf: "2025-12-01", salaris100: 3319.00, uurloonORT: 20.65, reiskostenKm: 0.20 },
    { vanaf: "2026-01-01", salaris100: 3481.00, uurloonORT: 21.21, reiskostenKm: 0.20 },
    { vanaf: "2026-02-01", salaris100: 3481.00, uurloonORT: 22.24, reiskostenKm: 0.20 },
    { vanaf: "2026-05-01", salaris100: 3551.00, uurloonORT: 22.69, reiskostenKm: 0.20 },
    { vanaf: "2026-11-01", salaris100: 3622.00, uurloonORT: 23.14, reiskostenKm: 0.20 },
  ] as Array<{ vanaf: string; salaris100: number; uurloonORT: number; reiskostenKm: number }>,

  ORT: {
    VROEG:    { pct: 0.22, label: "ORT 22% (06:00-07:00)" },
    AVOND:    { pct: 0.22, label: "ORT 22% (20:00-22:00)" },
    NACHT:    { pct: 0.47, label: "ORT 47% (nacht)" },
    ZATERDAG: { pct: 0.52, label: "ORT 52% (zaterdag)" },
    ZONDAG:   { pct: 0.52, label: "ORT 52% (zondag)" },
    FEESTDAG: { pct: 0.60, label: "ORT 60% (feestdag)" },
  } as Record<string, OrtCategorie>,

  AMT_ZEERINTENSIEF_PCT:    0.0500,
  TOESLAG_BALANSVIF_PCT:    0.0304,
  TOESLAG_VAKANTIEUREN_PCT: 0.0767,
  PENSIOEN_PCT:             0.1295,
  VAKANTIEGELD_PCT:         0.0800,
  EINDEJAARSUITKERING_PCT:  0.0833,
  REISAFSTAND_KM_ENKEL:     33,

  LOONHEFFING_TABEL_2026: [
    { tot: 38883,      tarief: 0.3575 },
    { tot: 78426,      tarief: 0.3756 },
    { tot: Infinity,   tarief: 0.4950 },
  ],
  ALGEMENE_HEFFINGSKORTING_2026: {
    max: 3115,
    afbouwStart: 29736,
    afbouwEind: 78426,
    afbouwPct: 0.06398,
  },
  ARBEIDSKORTING_2026: [
    { vanaf: 0,      tot: 11965,  basis: 0,    pct: 0.08324 },
    { vanaf: 11965,  tot: 25845,  basis: 996,  pct: 0.31009 },
    { vanaf: 25845,  tot: 45592,  basis: 5300, pct: 0.01950 },
    { vanaf: 45592,  tot: 132920, basis: 5685, pct: -0.06510 },
    { vanaf: 132920, tot: Infinity, basis: 0,  pct: 0 },
  ],
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

function contractUrenVoorMaand(jaar: number, maand: number): number {
  const werkdagenMaand = telWerkdagen(jaar, maand);
  const contractUrenWeek = SALARIS_CONFIG.VOLTIJD_UREN_WEEK * SALARIS_CONFIG.DEELTIJDFACTOR;
  return r2((werkdagenMaand / 5) * contractUrenWeek);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function isFeestdag(date: Date): boolean {
  const year = date.getFullYear();
  const pasen = easterSunday(year);
  const iso = formatDate(date);
  const fixed = new Set([
    `${year}-01-01`,
    `${year}-04-27`,
    `${year}-12-25`,
    `${year}-12-26`,
    formatDate(pasen),
    formatDate(addDays(pasen, 49)),
  ]);

  return fixed.has(iso);
}

function ortCategorieVoorMoment(date: Date): string | null {
  if (isFeestdag(date)) return "FEESTDAG";

  const dag = date.getDay();
  const minuut = date.getHours() * 60 + date.getMinutes();
  const maandDag = formatDate(date).slice(5);

  if ((maandDag === "12-24" || maandDag === "12-31") && minuut >= 18 * 60) return "FEESTDAG";
  if (dag === 6) return "ZATERDAG";
  if (dag === 0) return "ZONDAG";
  if (minuut >= 6 * 60 && minuut < 7 * 60) return "VROEG";
  if (minuut >= 20 * 60 && minuut < 22 * 60) return "AVOND";
  if (minuut < 6 * 60 || minuut >= 22 * 60) return "NACHT";
  return null;
}

function datumTijd(startDatum: string, tijd: string): Date | null {
  if (!startDatum || !tijd) return null;
  const date = new Date(`${startDatum}T${tijd}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dienstUren(d: ScheduleItem): number {
  return d.duur > 0 ? d.duur : berekenDuur(d.startTijd, d.eindTijd);
}

function berekenOrtUrenVoorDienst(d: ScheduleItem): Record<string, number> {
  const result: Record<string, number> = { AVOND: 0, VROEG: 0, NACHT: 0, ZATERDAG: 0, ZONDAG: 0, FEESTDAG: 0 };
  if (d.heledag) return result;

  const start = datumTijd(d.startDatum, d.startTijd);
  const end = datumTijd(d.startDatum, d.eindTijd);
  if (!start || !end) return result;

  if (end <= start) end.setDate(end.getDate() + 1);

  for (let t = start.getTime(); t < end.getTime(); t += 60_000) {
    const cat = ortCategorieVoorMoment(new Date(t));
    if (cat) result[cat] += 1 / 60;
  }

  for (const key of Object.keys(result)) {
    result[key] = r2(result[key]);
  }

  return result;
}

function telReisdagen(diensten: ScheduleItem[]): number {
  return new Set(
    diensten
      .filter((d) => !d.heledag && dienstUren(d) > 0)
      .map((d) => d.startDatum)
  ).size;
}

function berekenAlgemeneHeffingskorting(jaarBruto: number): number {
  const c = SALARIS_CONFIG.ALGEMENE_HEFFINGSKORTING_2026;
  if (jaarBruto <= c.afbouwStart) return c.max;
  if (jaarBruto >= c.afbouwEind) return 0;
  return Math.max(0, c.max - (jaarBruto - c.afbouwStart) * c.afbouwPct);
}

function berekenArbeidskorting(arbeidsinkomen: number): number {
  const bracket = SALARIS_CONFIG.ARBEIDSKORTING_2026.find((b) =>
    arbeidsinkomen >= b.vanaf && arbeidsinkomen < b.tot
  );
  if (!bracket) return 0;
  if (bracket.tot === Infinity) return bracket.basis;
  return Math.max(0, bracket.basis + (arbeidsinkomen - bracket.vanaf) * bracket.pct);
}

function berekenLoonheffingSchatting(jaarBruto: number): number {
  // Jaarbelasting met algemene heffingskorting en arbeidskorting.
  // Dit blijft een prognose: payroll rekent tijdvakken, bijzondere beloning en
  // pensioenexacties apart door.
  const tabel = SALARIS_CONFIG.LOONHEFFING_TABEL_2026;
  let heffing = 0;
  let vorig   = 0;
  for (const bracket of tabel) {
    if (jaarBruto <= vorig) break;
    const belastbaar = Math.min(jaarBruto, bracket.tot) - vorig;
    heffing += belastbaar * bracket.tarief;
    vorig    = bracket.tot;
  }
  const kortingen = berekenAlgemeneHeffingskorting(jaarBruto) + berekenArbeidskorting(jaarBruto);
  heffing = Math.max(0, heffing - kortingen);
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
  const reisdagen      = telReisdagen(diensten);
  const reiskosten     = r2(reisdagen * 2 * SALARIS_CONFIG.REISAFSTAND_KM_ENKEL * reiskostenKm);

  // ORT per categorie
  const ortTotalen: Record<string, number> = { AVOND: 0, VROEG: 0, NACHT: 0, ZATERDAG: 0, ZONDAG: 0, FEESTDAG: 0 };
  const ortUren:    Record<string, number> = { AVOND: 0, VROEG: 0, NACHT: 0, ZATERDAG: 0, ZONDAG: 0, FEESTDAG: 0 };
  let totaalDienstUren = 0;

  for (const d of diensten) {
    const uren = dienstUren(d);
    if (uren <= 0 || d.heledag) continue;
    totaalDienstUren += uren;

    const dienstOrtUren = berekenOrtUrenVoorDienst(d);
    for (const [categorie, urenInCategorie] of Object.entries(dienstOrtUren)) {
      if (urenInCategorie <= 0 || !SALARIS_CONFIG.ORT[categorie]) continue;
      ortUren[categorie] = r2((ortUren[categorie] ?? 0) + urenInCategorie);
      ortTotalen[categorie] = r2(
        (ortTotalen[categorie] ?? 0) +
        urenInCategorie * uurloonORT * SALARIS_CONFIG.ORT[categorie].pct
      );
    }
  }

  const extraUren       = r2(Math.max(0, totaalDienstUren - contractUrenVoorMaand(jaar, maand)));
  const extraUrenBedrag = r2(extraUren * uurloonORT);
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
  const loonheffingSchat = r2(berekenLoonheffingSchatting(fiscaalBruto * 12) / 12);
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
