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

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "homeapp_schedule";
const META_KEY    = "homeapp_schedule_meta";

export interface ScheduleMeta {
  importedAt: string;
  fileName:   string;
  totalRows:  number;
}

export function loadSchedule(): DienstRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveSchedule(rows: DienstRow[], meta: ScheduleMeta): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

export function loadScheduleMeta(): ScheduleMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearSchedule(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(META_KEY);
}

// ─── XLSX → DienstRow ─────────────────────────────────────────────────────────

const EXPECTED_HEADERS = [
  "Event ID", "Titel", "Start Datum", "Start Tijd", "Eind Datum", "Eind Tijd",
  "Werktijd", "Locatie", "Team Prefix", "Shift Type", "Prioriteit", "Duur (uur)",
  "Weeknr", "Dag", "Status", "Beschrijving", "Hele Dag",
];

/** Parse raw row from xlsx getValues() to DienstRow */
export function parseXlsxRow(row: any[], headers: string[]): DienstRow | null {
  const get = (col: string): any => {
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

function _toDateString(val: any): string {
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

function _toTimeString(val: any): string {
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

export function getUpcoming(diensten: DienstRow[], days = 30): DienstRow[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);

  return diensten
    .filter(d => {
      if (d.status === "Gedraaid" || d.status === "VERWIJDERD") return false;
      const start = new Date(d.startDatum);
      return start >= today && start <= limit;
    })
    .sort((a, b) => a.startDatum.localeCompare(b.startDatum));
}

export function getNextDienst(diensten: DienstRow[]): DienstRow | null {
  const now  = new Date();
  const today = now.toISOString().slice(0, 10);

  // Check if one is currently "Bezig"
  const bezig = diensten.find(d => d.status === "Bezig");
  if (bezig) return bezig;

  // Return first upcoming
  return getUpcoming(diensten)[0] ?? null;
}

export function getThisWeek(diensten: DienstRow[]): DienstRow[] {
  return getUpcoming(diensten, 7);
}

export function shiftTypeColor(type: string): { bg: string; text: string; accent: string } {
  switch (type) {
    case "Vroeg":  return { bg: "bg-orange-900/30", text: "text-orange-300", accent: "#f97316" };
    case "Laat":   return { bg: "bg-red-900/30",    text: "text-red-300",    accent: "#ef4444" };
    default:       return { bg: "bg-blue-900/30",   text: "text-blue-300",   accent: "#3b82f6" };
  }
}

export function formatDienst(d: DienstRow): string {
  return `${d.dag} ${d.startDatum.slice(8)} ${d.startDatum.slice(5, 7)} · ${d.startTijd}–${d.eindTijd}`;
}

// ─── Stats & Grouping helpers ─────────────────────────────────────────────────

/** Group diensten by weeknr, sorted ascending */

/** Normalise weeknr: converts full date-strings to "YYYY-WW" */
function normalizeWeekNr(raw: string): string {
  if (!raw) return "?";
  // Already compact (e.g. "2026-14" or "14")
  if (raw.length <= 10 && !raw.includes(":")) return raw;
  // Try to parse as date
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw.slice(0, 10);
    // ISO week calculation
    const jan4   = new Date(d.getFullYear(), 0, 4);
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
    const weekNum = Math.floor((d.getTime() - monday.getTime()) / (7 * 86_400_000)) + 1;
    return `${d.getFullYear()}-${String(weekNum).padStart(2, "0")}`;
  } catch {
    return raw.slice(0, 10);
  }
}

export function groupByWeekNr(diensten: DienstRow[]): { weeknr: string; rows: DienstRow[] }[] {
  const map = new Map<string, DienstRow[]>();
  for (const d of diensten) {
    const key = normalizeWeekNr(d.weeknr || "?");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([weeknr, rows]) => ({ weeknr, rows: rows.sort((a, b) => a.startDatum.localeCompare(b.startDatum)) }));
}


/** Total hours across a set of diensten */
export function calcTotalHours(diensten: DienstRow[]): number {
  return Math.round(diensten.reduce((sum, d) => sum + (d.duur ?? 0), 0) * 10) / 10;
}

/** Count per shiftType */
export function shiftBreakdown(diensten: DienstRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of diensten) {
    out[d.shiftType] = (out[d.shiftType] ?? 0) + 1;
  }
  return out;
}

/** Count per team prefix */
export function teamBreakdown(diensten: DienstRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of diensten) {
    const key = d.team?.trim() || "?";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/** Past / completed diensten (status Gedraaid), most recent first */
export function getHistory(diensten: DienstRow[], limit = 20): DienstRow[] {
  return diensten
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

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${NL_MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

/** Compute rich stats for a set of diensten in one month */
export function computeMonthStats(month: string, rows: DienstRow[]): MonthStats {
  const shifts: Record<string, number> = {};
  const teams:  Record<string, number> = {};
  let gedraaid = 0;

  for (const d of rows) {
    shifts[d.shiftType] = (shifts[d.shiftType] ?? 0) + 1;
    const t = d.team?.trim() || "?";
    teams[t] = (teams[t] ?? 0) + 1;
    if (d.status === "Gedraaid") gedraaid++;
  }

  const totalHours = Math.round(rows.reduce((s, d) => s + (d.duur ?? 0), 0) * 10) / 10;
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
  for (const d of diensten) {
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
