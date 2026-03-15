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
    weeknr:      String(get("Weeknr") ?? ""),
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
