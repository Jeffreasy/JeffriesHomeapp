import type { LoonstrookRecord } from "@/hooks/useLoonstroken";
import type { SalarisRecord } from "@/hooks/useSalary";
import type { DienstRow } from "@/lib/schedule";

const SALARY_CONFIG = {
  contractUrenPerWeek: 16,
  deeltijdFactor: 0.4444,
  reisafstandKmEnkel: 33,
  tarieven: [
    { vanaf: "2025-01-01", salaris100: 3107.0, uurloonORT: 19.85, reiskostenKm: 0.16 },
    { vanaf: "2025-08-01", salaris100: 3231.0, uurloonORT: 20.65, reiskostenKm: 0.2 },
    { vanaf: "2025-12-01", salaris100: 3319.0, uurloonORT: 20.65, reiskostenKm: 0.2 },
    { vanaf: "2026-01-01", salaris100: 3481.0, uurloonORT: 21.21, reiskostenKm: 0.2 },
    { vanaf: "2026-02-01", salaris100: 3481.0, uurloonORT: 22.24, reiskostenKm: 0.2 },
  ],
  ort: {
    avond: { label: "Avond 20-22 (22%)", pct: 0.22 },
    vroeg: { label: "Vroeg 06-07 (38%)", pct: 0.38 },
    nacht: { label: "Nacht 22-06 (44%)", pct: 0.44 },
    zaterdag: { label: "Zaterdag (52%)", pct: 0.52 },
    zondag: { label: "Zon-/feestdag (60%)", pct: 0.6 },
  },
  amtZeerintensiefPct: 0.05,
  toeslagBalansvlfPct: 0.0304,
  toeslagVakantieurenPct: 0.0767,
  pensioenPct: 0.1295,
  vakantiegeldPct: 0.08,
  eindejaarsuitkeringPct: 0.0833,
  fallbackLoonheffingPct: 0.32,
};

type OrtKey = keyof typeof SALARY_CONFIG.ort;

/**
 * Publieke, read-only weergave van de forecast-aannames (S2): de PrognoseCard
 * toont deze zodat de gebruiker weet waarop een prognose gebaseerd is.
 */
export const FORECAST_ASSUMPTIONS = {
  contractUrenPerWeek: SALARY_CONFIG.contractUrenPerWeek,
  deeltijdFactor: SALARY_CONFIG.deeltijdFactor,
  reisafstandKmEnkel: SALARY_CONFIG.reisafstandKmEnkel,
  fallbackLoonheffingPct: SALARY_CONFIG.fallbackLoonheffingPct,
} as const;

export type ScheduleSalaryForecast = {
  periode: string;
  nettoPrognose: number;
  brutoBetaling: number;
  pensioenpremie: number;
  aantalDiensten: number;
  totaalUren: number;
};

type SalaryCalibration = {
  salaryRecords?: SalarisRecord[];
  loonstroken?: LoonstrookRecord[];
};

type MonthCalculationOptions = SalaryCalibration & {
  contractUrenPerWeek?: number;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundHours(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getTarief(jaar: number, maand: number) {
  const peilDatum = new Date(jaar, maand - 1, 1);
  let actief = SALARY_CONFIG.tarieven[0];
  for (const entry of SALARY_CONFIG.tarieven) {
    const parts = entry.vanaf.split("-");
    const vanafDatum = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (peilDatum >= vanafDatum) actief = entry;
  }
  return actief;
}


function parseDateTime(date: string, time: string) {
  const dateMatch = date?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const timeMatch = time?.match(/^(\d{1,2}):(\d{2})/);
  if (!dateMatch || !timeMatch) return null;
  return new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
    0
  );
}

function getDienstRange(dienst: DienstRow) {
  const start = parseDateTime(dienst.startDatum, dienst.startTijd);
  const end = parseDateTime(dienst.eindDatum || dienst.startDatum, dienst.eindTijd);
  if (!start || !end) return null;
  if (end <= start) end.setDate(end.getDate() + 1);
  return { start, end };
}

function localIsoDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getEasterDate(year: number) {
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

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dutchHolidayDates(year: number) {
  const easter = getEasterDate(year);
  return new Set([
    `${year}-01-01`,
    `${year}-04-27`,
    `${year}-05-05`,
    localIsoDate(easter),
    localIsoDate(addDays(easter, 1)),
    localIsoDate(addDays(easter, 39)),
    localIsoDate(addDays(easter, 49)),
    localIsoDate(addDays(easter, 50)),
    `${year}-12-25`,
    `${year}-12-26`,
  ]);
}

const holidayCache = new Map<number, Set<string>>();

function isDutchHoliday(date: Date) {
  const year = date.getFullYear();
  if (!holidayCache.has(year)) holidayCache.set(year, dutchHolidayDates(year));
  return holidayCache.get(year)!.has(localIsoDate(date));
}

function classifyOrtSlot(date: Date): OrtKey | null {
  const day = date.getDay();
  const minutes = date.getHours() * 60 + date.getMinutes();

  if (day === 0 || isDutchHoliday(date)) return "zondag";
  if (day === 6) return "zaterdag";
  if (minutes >= 22 * 60 || minutes < 6 * 60) return "nacht";
  if (minutes >= 6 * 60 && minutes < 7 * 60) return "vroeg";
  if (minutes >= 20 * 60 && minutes < 22 * 60) return "avond";
  return null;
}

function fallbackOrtKey(dienst: DienstRow): OrtKey | null {
  const day = dienst.dag?.toLowerCase();
  if (day === "zondag") return "zondag";
  if (day === "zaterdag") return "zaterdag";
  const type = dienst.shiftType?.toLowerCase();
  if (type === "nacht") return "nacht";
  if (type === "laat") return "avond";
  if (type === "vroeg") return "vroeg";
  return null;
}

function collectOrt(dienst: DienstRow) {
  const hours: Partial<Record<OrtKey, number>> = {};
  const range = getDienstRange(dienst);

  if (!range) {
    const key = fallbackOrtKey(dienst);
    if (key && dienst.duur > 0) hours[key] = dienst.duur;
    return hours;
  }

  const stepMs = 15 * 60 * 1000;
  let cursor = range.start.getTime();
  const end = range.end.getTime();

  while (cursor < end) {
    const next = Math.min(cursor + stepMs, end);
    const key = classifyOrtSlot(new Date(cursor));
    if (key) hours[key] = (hours[key] ?? 0) + (next - cursor) / 3_600_000;
    cursor = next;
  }

  return hours;
}

function getMonthRows(diensten: DienstRow[], periode: string) {
  return diensten.filter((dienst) => (
    dienst.status !== "VERWIJDERD" &&
    !dienst.heledag &&
    dienst.startDatum?.slice(0, 7) === periode
  ));
}

function contractHoursForMonth(jaar: number, maand: number, contractUrenPerWeek: number) {
  const days = new Date(jaar, maand, 0).getDate();
  return roundHours((days / 7) * contractUrenPerWeek);
}

function findLoonstrookForPeriod(records: LoonstrookRecord[] | undefined, periode: string) {
  return records?.find((record) => record.periodeLabel === periode);
}

function findSalaryForPeriod(records: SalarisRecord[] | undefined, periode: string) {
  return records?.find((record) => record.periode === periode);
}

function findLatestLoonstrook(records: LoonstrookRecord[] | undefined, periode: string) {
  const sorted = [...(records ?? [])].sort((a, b) => a.periodeLabel.localeCompare(b.periodeLabel));
  return [...sorted].reverse().find((record) => record.periodeLabel <= periode && record.uurloon) ?? sorted[sorted.length - 1];
}

function effectiveTaxPct(loonstrook?: LoonstrookRecord) {
  if (!loonstrook || loonstrook.brutoBetaling <= 0) return SALARY_CONFIG.fallbackLoonheffingPct;
  const taxable = Math.max(1, loonstrook.brutoBetaling - (loonstrook.pensioenpremie ?? 0));
  const pct = (loonstrook.loonheffing ?? 0) / taxable;
  if (!Number.isFinite(pct) || pct <= 0) return SALARY_CONFIG.fallbackLoonheffingPct;
  return Math.min(0.48, Math.max(0.18, pct));
}

function getCalibration(jaar: number, maand: number, calibration: SalaryCalibration = {}) {
  const periode = `${jaar}-${String(maand).padStart(2, "0")}`;
  const tarief = getTarief(jaar, maand);
  const exactSalary = findSalaryForPeriod(calibration.salaryRecords, periode);
  const exactLoonstrook = findLoonstrookForPeriod(calibration.loonstroken, periode);
  const latestLoonstrook = findLatestLoonstrook(calibration.loonstroken, periode);

  const basisLoon =
    exactSalary?.basisLoon ||
    exactLoonstrook?.salarisBasis ||
    tarief.salaris100 * SALARY_CONFIG.deeltijdFactor;

  const uurloonORT =
    exactSalary?.uurloonORT ||
    exactLoonstrook?.uurloon ||
    latestLoonstrook?.uurloon ||
    tarief.uurloonORT;

  return {
    basisLoon: roundMoney(basisLoon),
    uurloonORT: roundMoney(uurloonORT),
    reiskostenKm: tarief.reiskostenKm,
    tariefVanaf: tarief.vanaf,
    taxPct: effectiveTaxPct(exactLoonstrook ?? latestLoonstrook),
    calibrationLabel: exactLoonstrook
      ? "loonstrook dezelfde maand"
      : latestLoonstrook
        ? `laatste loonstrook ${latestLoonstrook.periodeLabel}`
        : "cao-tarieven 2026",
  };
}

export function calculateScheduleSalaryRecord(
  diensten: DienstRow[],
  periode: string,
  options: MonthCalculationOptions = {}
): SalarisRecord | null {
  if (!/^\d{4}-\d{2}$/.test(periode)) return null;

  const [jaar, maand] = periode.split("-").map(Number);
  const monthRows = getMonthRows(diensten, periode);
  if (monthRows.length === 0) return null;

  const contractUrenPerWeek = options.contractUrenPerWeek ?? SALARY_CONFIG.contractUrenPerWeek;
  const contractUren = contractHoursForMonth(jaar, maand, contractUrenPerWeek);
  const calibration = getCalibration(jaar, maand, options);

  const ortHours: Partial<Record<OrtKey, number>> = {};
  let totaalUren = 0;

  for (const dienst of monthRows) {
    const dienstUren = dienst.duur > 0 ? dienst.duur : 0;
    totaalUren += dienstUren;

    const dienstOrt = collectOrt(dienst);
    for (const [key, hours] of Object.entries(dienstOrt) as Array<[OrtKey, number]>) {
      ortHours[key] = (ortHours[key] ?? 0) + hours;
    }
  }

  totaalUren = roundHours(totaalUren);
  const extraUren = Math.max(0, roundHours(totaalUren - contractUren));

  const ortUrenDetail: Record<string, number> = {};
  const ortBedragDetail: Record<string, number> = {};
  let ortTotaal = 0;
  let ortUren = 0;

  for (const key of Object.keys(ortHours) as OrtKey[]) {
    const hours = roundHours(ortHours[key] ?? 0);
    if (hours <= 0) continue;
    const config = SALARY_CONFIG.ort[key];
    const amount = roundMoney(hours * calibration.uurloonORT * config.pct);
    ortUrenDetail[config.label] = hours;
    ortBedragDetail[config.label] = amount;
    ortTotaal += amount;
    ortUren += hours;
  }

  const basisLoon = calibration.basisLoon;
  const amtZeerintensief = roundMoney(basisLoon * SALARY_CONFIG.amtZeerintensiefPct);
  const toeslagBalansvif = roundMoney(basisLoon * SALARY_CONFIG.toeslagBalansvlfPct);
  const toeslagVakatieUren = roundMoney(basisLoon * SALARY_CONFIG.toeslagVakantieurenPct);
  const extraUrenBedrag = roundMoney(extraUren * calibration.uurloonORT);
  const reiskosten = roundMoney(monthRows.length * 2 * SALARY_CONFIG.reisafstandKmEnkel * calibration.reiskostenKm);
  const eenmaligTotaal =
    maand === 5
      ? roundMoney((basisLoon + amtZeerintensief + toeslagBalansvif) * 12 * SALARY_CONFIG.vakantiegeldPct)
      : maand === 12
        ? roundMoney((basisLoon + amtZeerintensief) * 12 * SALARY_CONFIG.eindejaarsuitkeringPct + 240)
        : 0;

  const brutoBetaling = roundMoney(
    basisLoon +
    amtZeerintensief +
    toeslagBalansvif +
    toeslagVakatieUren +
    ortTotaal +
    extraUrenBedrag +
    reiskosten +
    eenmaligTotaal
  );
  const pensioenpremie = roundMoney((basisLoon + amtZeerintensief + toeslagBalansvif + ortTotaal) * SALARY_CONFIG.pensioenPct);
  const loonheffingSchat = roundMoney(Math.max(0, brutoBetaling - reiskosten - pensioenpremie) * calibration.taxPct);
  const nettoPrognose = roundMoney(brutoBetaling - pensioenpremie - loonheffingSchat);

  return {
    _id: `schedule-${periode}`,
    periode,
    jaar,
    maand,
    aantalDiensten: monthRows.length,
    uurloonORT: calibration.uurloonORT,
    basisLoon,
    amtZeerintensief,
    toeslagBalansvif,
    ortTotaal: roundMoney(ortTotaal),
    extraUrenBedrag,
    toeslagVakatieUren,
    reiskosten,
    eenmaligTotaal,
    brutoBetaling,
    pensioenpremie,
    loonheffingSchat,
    nettoPrognose,
    ortDetail: JSON.stringify(ortBedragDetail),
    eenmaligDetail: eenmaligTotaal > 0 ? JSON.stringify([{ label: maand === 5 ? "Vakantietoeslag" : "Eindejaarsuitkering", bedrag: eenmaligTotaal }]) : undefined,
    berekendOp: new Date().toISOString(),
    generatedFromSchedule: true,
    totaalUren,
    contractUren,
    contractUrenPerWeek,
    extraUren,
    ortUren: roundHours(ortUren),
    ortUrenDetail: JSON.stringify(ortUrenDetail),
    salarisCalibratie: calibration.calibrationLabel,
    loonheffingPct: calibration.taxPct,
    tariefVanaf: calibration.tariefVanaf,
  };
}

export function calculateScheduleSalaryRecords(
  diensten: DienstRow[],
  options: MonthCalculationOptions = {}
): SalarisRecord[] {
  const periods = new Set(
    diensten
      .filter((dienst) => dienst.status !== "VERWIJDERD" && !dienst.heledag && dienst.startDatum)
      .map((dienst) => dienst.startDatum.slice(0, 7))
  );

  return Array.from(periods)
    .sort()
    .map((periode) => calculateScheduleSalaryRecord(diensten, periode, options))
    .filter((record): record is SalarisRecord => Boolean(record));
}

export function calculateScheduleSalaryForecast(
  diensten: DienstRow[],
  periode?: string,
  options: MonthCalculationOptions = {}
): ScheduleSalaryForecast | null {
  if (!periode) return null;
  const record = calculateScheduleSalaryRecord(diensten, periode, options);
  if (!record) return null;

  return {
    periode: record.periode,
    nettoPrognose: record.nettoPrognose,
    brutoBetaling: record.brutoBetaling,
    pensioenpremie: record.pensioenpremie,
    aantalDiensten: record.aantalDiensten,
    totaalUren: record.totaalUren ?? 0,
  };
}
