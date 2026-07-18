import { detectCsvDelimiter, parseDelimitedRows, type CsvDelimiter } from "@/lib/csv";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DienstRow {
  eventId:    string;
  titel:      string;
  startDatum: string; // "YYYY-MM-DD"
  startTijd:  string; // "HH:MM"
  eindDatum:  string; // "YYYY-MM-DD"
  eindTijd:   string; // "HH:MM"
  werktijd:   string; // "HH:MM - HH:MM"
  locatie:    string;
  team:       string; // "R." | "A." | "?"
  shiftType:  "Vroeg" | "Laat" | "Dienst" | string;
  prioriteit: number;
  duur:       number; // uur
  weeknr:     string;
  dag:        string;
  status:     "Opkomend" | "Bezig" | "Gedraaid" | "VERWIJDERD" | string;
  beschrijving: string;
  heledag:    boolean;
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export interface ScheduleMeta {
  importedAt: string;
  fileName:   string;
  totalRows:  number;
}

// Note: the schedule now lives server-side (useSchedule + Go API). The old
// localStorage load/save helpers had zero importers and were removed (audit L
// dead-code sweep).

// ─── CSV → DienstRow ──────────────────────────────────────────────────────────

/** Native CSV parser replacing vulnerable xlsx library */
export function parseCsv(text: string, delimiter: CsvDelimiter = detectCsvDelimiter(text)): { headers: string[]; rows: string[][] } {
  const records = parseDelimitedRows(text, delimiter);
  if (records.length < 2) return { headers: [], rows: [] };
  return {
    headers: records[0].map((header) => header.trim()),
    rows: records.slice(1).map((row) => row.map((cell) => cell.trim())),
  };
}
/** Parse raw row from csv to DienstRow */
export function parseCsvRow(row: unknown[], headers: string[]): DienstRow | null {
  const get = (col: string): unknown => {
    const idx = headers.indexOf(col);
    return idx >= 0 ? row[idx] : undefined;
  };

  const eventId = String(get("Event ID") ?? "").trim();
  if (!eventId) return null;

  const rawStart = get("Start Datum");
  const rawEind  = get("Eind Datum");

  const startDatum = _toDateString(rawStart);
  const eindDatum  = _toDateString(rawEind);

  const status = String(get("Status") ?? "Opkomend").trim();
  if (status === "VERWIJDERD") return null; // filter verwijderde diensten

  const rawDuur = get("Duur (uur)");
  const duur = typeof rawDuur === "number"
    ? rawDuur
    : parseFloat(String(rawDuur ?? "0").replace(",", ".")) || 0;

  return {
    eventId,
    titel:       String(get("Titel") ?? ""),
    startDatum,
    startTijd:   _toTimeString(get("Start Tijd")),
    eindDatum,
    eindTijd:    _toTimeString(get("Eind Tijd")),
    werktijd:    String(get("Werktijd") ?? ""),
    locatie:     String(get("Locatie") ?? ""),
    team:        String(get("Team Prefix") ?? ""),
    shiftType:   String(get("Shift Type") ?? "Dienst"),
    prioriteit:  Number(get("Prioriteit") ?? 1),
    duur,
    weeknr:      String(get("Weeknr") ?? "").trim().slice(0, 20),
    dag:         String(get("Dag") ?? ""),
    status,
    beschrijving: String(get("Beschrijving") ?? ""),
    heledag:     String(get("Hele Dag") ?? "Nee").toLowerCase() === "ja",
  };
}

function _toDateString(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") {
    // Already "YYYY-MM-DD" or "DD-MM-YYYY"
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10);
    if (/^\d{2}-\d{2}-\d{4}/.test(val)) {
      const [d, m, y] = val.split("-");
      return `${y}-${m}-${d}`;
    }
    // Try parse
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toISOString().slice(0, 10);
  }
  if (typeof val === "number") {
    // Excel serial date number
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

function _toTimeString(val: unknown): string {
  if (!val && val !== 0) return "";
  if (typeof val === "string") {
    if (/^\d{1,2}:\d{2}/.test(val)) return val.slice(0, 5);
    return val;
  }
  if (typeof val === "number") {
    // Excel fraction of day → HH:MM
    const totalMinutes = Math.round(val * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return String(val);
}

// ─── Query helpers ────────────────────────────────────────────────────────────

const APP_TIMEZONE = "Europe/Amsterdam";

function getAmsterdamParts(date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("nl-NL", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function normalizeTime(time: string | undefined, fallback: string): string {
  if (!time) return fallback;
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function getStartKey(dienst: DienstRow): string {
  return `${dienst.startDatum} ${normalizeTime(dienst.startTijd, "00:00")}`;
}

export function getEndKey(dienst: DienstRow): string {
  let endDate = dienst.eindDatum || dienst.startDatum;
  const startKey = getStartKey(dienst);
  let endKey = `${endDate} ${normalizeTime(dienst.eindTijd, "23:59")}`;

  // Night shifts sometimes arrive with equal start/end dates. Treat an end
  // time before the start time as crossing midnight in Amsterdam.
  if (endKey <= startKey) {
    endDate = addDaysIso(dienst.startDatum, 1);
    endKey = `${endDate} ${normalizeTime(dienst.eindTijd, "23:59")}`;
  }

  return endKey;
}

function getNowKey(date = new Date()): string {
  const now = getAmsterdamParts(date);
  return `${now.date} ${now.time}`;
}

function getLimitKey(days: number, date = new Date()): string {
  const now = getAmsterdamParts(date);
  return `${addDaysIso(now.date, days)} 23:59`;
}

function getRuntimeStatus(dienst: DienstRow, nowKey = getNowKey()): DienstRow["status"] {
  if (dienst.status === "VERWIJDERD") return dienst.status;

  const startKey = getStartKey(dienst);
  const endKey = getEndKey(dienst);

  if (startKey <= nowKey && nowKey <= endKey) return "Bezig";
  if (endKey < nowKey) return "Gedraaid";
  if (dienst.status === "Bezig" || dienst.status === "Gedraaid") return "Opkomend";

  return dienst.status;
}

export function withRuntimeStatus(dienst: DienstRow, nowKey = getNowKey()): DienstRow {
  const status = getRuntimeStatus(dienst, nowKey);
  return status === dienst.status ? dienst : { ...dienst, status };
}

export function getUpcoming(diensten: DienstRow[], days = 30): DienstRow[] {
  const nowKey = getNowKey();
  const limitKey = getLimitKey(days);

  return diensten
    .filter(d => {
      if (d.status === "VERWIJDERD") return false;
      return getEndKey(d) >= nowKey && getStartKey(d) <= limitKey;
    })
    .sort((a, b) => getStartKey(a).localeCompare(getStartKey(b)))
    .map(d => withRuntimeStatus(d, nowKey));
}

export function getNextDienst(diensten: DienstRow[]): DienstRow | null {
  const upcoming = getUpcoming(diensten).filter(d => !d.heledag);
  return upcoming.find(d => d.status === "Bezig") ?? upcoming[0] ?? null;
}


export function getThisWeek(diensten: DienstRow[]): DienstRow[] {
  return getUpcoming(diensten, 7);
}


export function formatDienst(d: DienstRow): string {
  return `${d.dag} ${d.startDatum.slice(8)} ${d.startDatum.slice(5, 7)} · ${d.startTijd}–${d.eindTijd}`;
}

// ─── Stats & Grouping helpers ─────────────────────────────────────────────────

/**
 * ISO-8601 week key "YYYY-WW" for a date string ("YYYY-MM-DD"). Single shared
 * implementation (audit F5) — also used by lib/unified.ts for the timeline.
 * ISO year ≠ calendar year around the year boundary (e.g. 2026-12-29 → 2027-01).
 */
export function getIsoWeek(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00"); // veilige parse
    if (isNaN(d.getTime())) return "Onbekend";

    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

    return `${date.getUTCFullYear()}-${String(weekNum).padStart(2, "0")}`;
  } catch {
    return "Onbekend";
  }
}

/** Group diensten by ISO week, sorted ascending. The week is always computed
 *  from startDatum — the CSV "Weeknr" column is ignored because it has proven
 *  unreliable around year boundaries (audit F5). */
export function groupByWeekNr(diensten: DienstRow[]): { weeknr: string; rows: DienstRow[] }[] {
  const map = new Map<string, DienstRow[]>();
  for (const d of diensten) { if (d.status === "VERWIJDERD") continue;
    const key = d.startDatum ? getIsoWeek(d.startDatum) : "?";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([weeknr, rows]) => ({ weeknr, rows: rows.sort((a, b) => a.startDatum.localeCompare(b.startDatum)) }));
}


/** Total hours across a set of diensten */
export function calcTotalHours(diensten: DienstRow[]): number {
  return Math.round(diensten.reduce((sum, d) => sum + (d.status === "VERWIJDERD" ? 0 : (d.duur ?? 0)), 0) * 10) / 10;
}

/** Count per shiftType */
export function shiftBreakdown(diensten: DienstRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of diensten) { if (d.status === "VERWIJDERD") continue;
    out[d.shiftType] = (out[d.shiftType] ?? 0) + 1;
  }
  return out;
}

/** Count per team prefix */
export function teamBreakdown(diensten: DienstRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of diensten) { if (d.status === "VERWIJDERD") continue;
    const key = d.team?.trim() || "?";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/** Past / completed diensten (status Gedraaid), most recent first */
export function getHistory(diensten: DienstRow[], limit = 20): DienstRow[] {
  const nowKey = getNowKey();
  return diensten
    .map(d => withRuntimeStatus(d, nowKey))
    .filter(d => d.status === "Gedraaid")
    .sort((a, b) => b.startDatum.localeCompare(a.startDatum))
    .slice(0, limit);
}

// ─── Month / Year analytics ───────────────────────────────────────────────────

export interface MonthStats {
  month:      string;   // "YYYY-MM"
  label:      string;   // "Maart 2026"
  rows:       DienstRow[];
  totalHours: number;
  count:      number;
  shifts:     Record<string, number>;  // { Vroeg: 3, Laat: 2, ... }
  teams:      Record<string, number>;  // { "R.": 4, "A.": 2, ... }
  avgDuur:    number;
  gedraaid:   number;   // how many are status=Gedraaid
}

const NL_MONTHS = [
  "Januari","Februari","Maart","April","Mei","Juni",
  "Juli","Augustus","September","Oktober","November","December"
];

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${NL_MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

/** Compute rich stats for a set of diensten in one month */
export function computeMonthStats(month: string, rows: DienstRow[]): MonthStats {
  const shifts: Record<string, number> = {};
  const teams:  Record<string, number> = {};
  let gedraaid = 0;

  for (const d of rows) { if (d.status === "VERWIJDERD") continue;
    shifts[d.shiftType] = (shifts[d.shiftType] ?? 0) + 1;
    const t = d.team?.trim() || "?";
    teams[t] = (teams[t] ?? 0) + 1;
    if (d.status === "Gedraaid") gedraaid++;
  }

  const totalHours = Math.round(rows.reduce((s, d) => s + (d.status === "VERWIJDERD" ? 0 : (d.duur ?? 0)), 0) * 10) / 10;
  return {
    month,
    label:  monthLabel(month),
    rows,
    totalHours,
    count:  rows.length,
    shifts,
    teams,
    avgDuur: rows.length ? Math.round((totalHours / rows.length) * 10) / 10 : 0,
    gedraaid,
  };
}

/** Group ALL diensten by "YYYY-MM", return sorted ascending */
export function groupByMonth(diensten: DienstRow[]): MonthStats[] {
  const map = new Map<string, DienstRow[]>();
  for (const d of diensten) { if (d.status === "VERWIJDERD") continue;
    if (!d.startDatum) continue;
    const key = d.startDatum.slice(0, 7); // "YYYY-MM"
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rows]) => computeMonthStats(month, rows));
}

/** Group months into years */
export interface YearStats {
  year:       string;
  months:     MonthStats[];
  totalHours: number;
  count:      number;
  teams:      Record<string, number>;
}

export function groupByYear(diensten: DienstRow[]): YearStats[] {
  const months = groupByMonth(diensten);
  const yearMap = new Map<string, MonthStats[]>();
  for (const m of months) {
    const y = m.month.slice(0, 4);
    if (!yearMap.has(y)) yearMap.set(y, []);
    yearMap.get(y)!.push(m);
  }
  return Array.from(yearMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, mons]) => {
      const teams: Record<string, number> = {};
      let totalHours = 0;
      let count = 0;
      for (const m of mons) {
        totalHours += m.totalHours;
        count      += m.count;
        for (const [t, n] of Object.entries(m.teams)) {
          teams[t] = (teams[t] ?? 0) + n;
        }
      }
      return { year, months: mons, totalHours: Math.round(totalHours * 10) / 10, count, teams };
    });
}

// ─── Contract Tracking ────────────────────────────────────────────────────────

export interface WeeklyBalance {
  weeknr: string;
  actualHours: number;
  expectedHours: number;
  delta: number;
  /** Week ligt ná de huidige ISO-week — gepland, telt niet mee in totalDelta (audit F6). */
  future: boolean;
}

export interface ContractStats {
  contractUrenPerWeek: number;
  weeklyBalances: WeeklyBalance[];
  totalDelta: number;
}

/** Current ISO week key in the same "YYYY-WW" format groupByWeekNr produces.
 *  Delegates to the shared getIsoWeek helper so the year-boundary weeks
 *  (e.g. 29 dec → "2027-01", not "2026-53") are correct (audit F5). */
export function getCurrentWeekNr(date = new Date()): string {
  return getIsoWeek(getAmsterdamParts(date).date);
}

/**
 * Pick the balance to surface as "this week": the current ISO week if it has
 * shifts, otherwise the most recent week that is not in the future. Never
 * returns a future week, so the headline never presents a far-ahead planned
 * week as the current contract-hour balance.
 */
export function getCurrentWeekBalance(
  stats: ContractStats,
  date = new Date(),
): WeeklyBalance | null {
  if (stats.weeklyBalances.length === 0) return null;
  const currentKey = getCurrentWeekNr(date);
  const exact = stats.weeklyBalances.find(w => w.weeknr === currentKey);
  if (exact) return exact;
  // weeklyBalances is sorted ascending; take the last week at or before now.
  const pastOrCurrent = stats.weeklyBalances.filter(
    w => w.weeknr.localeCompare(currentKey, undefined, { numeric: true }) <= 0,
  );
  if (pastOrCurrent.length > 0) return pastOrCurrent[pastOrCurrent.length - 1];
  // Only future weeks exist (e.g. brand-new schedule) — fall back to the first.
  return stats.weeklyBalances[0];
}

export function analyzeContract(diensten: DienstRow[], contractUren = 16, date = new Date()): ContractStats {
  const weeks = groupByWeekNr(diensten);
  const currentWeekNr = getCurrentWeekNr(date);

  let totalDelta = 0;
  const weeklyBalances: WeeklyBalance[] = [];

  for (const week of weeks) {
    const actualHours = calcTotalHours(week.rows);
    const delta = Math.round((actualHours - contractUren) * 10) / 10;
    // Toekomstige (nog niet begonnen) weken zijn "gepland": ze tellen niet mee
    // in de totaalbalans, anders drukt elke lege toekomstige week de balans
    // met -contractUren omlaag (audit F6).
    const future = week.weeknr.localeCompare(currentWeekNr, undefined, { numeric: true }) > 0;

    if (!future) totalDelta += delta;

    weeklyBalances.push({
      weeknr: week.weeknr,
      actualHours,
      expectedHours: contractUren,
      delta,
      future,
    });
  }

  return {
    contractUrenPerWeek: contractUren,
    weeklyBalances,
    totalDelta: Math.round(totalDelta * 10) / 10,
  };
}
