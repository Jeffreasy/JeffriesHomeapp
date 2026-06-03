import { formatDateRange, getTimeLabel, type PersonalEvent } from "@/hooks/usePersonalEvents";
import type { DienstRow } from "@/lib/schedule";

export type DashboardDateInfo = {
  greeting: string;
  todayLabel: string;
  todayIso: string;
  period: string;
};

export type Tone = "amber" | "blue" | "green" | "indigo" | "rose" | "slate";

export const toneClasses: Record<Tone, { icon: string; surface: string; border: string; text: string }> = {
  amber: {
    icon: "text-amber-300",
    surface: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-200",
  },
  blue: {
    icon: "text-sky-300",
    surface: "bg-sky-500/10",
    border: "border-sky-500/20",
    text: "text-sky-200",
  },
  green: {
    icon: "text-emerald-300",
    surface: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-200",
  },
  indigo: {
    icon: "text-indigo-300",
    surface: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    text: "text-indigo-200",
  },
  rose: {
    icon: "text-rose-300",
    surface: "bg-rose-500/10",
    border: "border-rose-500/20",
    text: "text-rose-200",
  },
  slate: {
    icon: "text-slate-300",
    surface: "bg-[var(--color-surface)]",
    border: "border-[var(--color-border)]",
    text: "text-slate-200",
  },
};

export function getDashboardDateInfo(): DashboardDateInfo {
  const now = new Date();
  const todayIso = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const hour = Number(
    new Intl.DateTimeFormat("nl-NL", {
      timeZone: "Europe/Amsterdam",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now)
  );

  return {
    greeting:
      hour < 6
        ? "Goedenacht"
        : hour < 12
          ? "Goedemorgen"
          : hour < 18
            ? "Goedemiddag"
            : "Goedenavond",
    todayLabel: now.toLocaleDateString("nl-NL", {
      timeZone: "Europe/Amsterdam",
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    todayIso,
    period: todayIso.slice(0, 7),
  };
}

export function formatCurrency(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Geen data";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function parseIsoDate(iso?: string) {
  if (!iso) return null;
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffDays(targetIso: string, todayIso: string) {
  const target = parseIsoDate(targetIso);
  const today = parseIsoDate(todayIso);
  if (!target || !today) return null;
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatShortDate(iso?: string) {
  if (!iso) return "Geen datum";
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function formatLongDate(iso?: string) {
  const date = parseIsoDate(iso);
  if (!date) return iso ?? "Geen datum";
  return date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatRelativeDateLabel(iso?: string, todayIso?: string) {
  if (!iso) return "Geen datum";
  const absolute = formatLongDate(iso);
  if (!todayIso) return absolute;

  const diff = diffDays(iso, todayIso);
  if (diff === null) return absolute;
  if (diff === 0) return `Vandaag (${absolute})`;
  if (diff === 1) return `Morgen (${absolute})`;
  if (diff === 2) return `Overmorgen (${absolute})`;
  if (diff > 2 && diff <= 6) return `Over ${diff} dagen (${absolute})`;
  if (diff === -1) return `Gisteren (${absolute})`;
  if (diff < -1) return `${Math.abs(diff)} dagen geleden (${absolute})`;
  return capitalize(absolute);
}

export function formatEventMeta(event: PersonalEvent | null, todayIso?: string) {
  if (!event) return "Geen aankomende afspraak";
  const dateLabel = event.startDatum === event.eindDatum
    ? formatRelativeDateLabel(event.startDatum, todayIso)
    : formatDateRange(event);
  const timeLabel = getTimeLabel(event);
  return `${dateLabel} · ${timeLabel}`;
}

const SALARY_CONFIG = {
  deeltijdFactor: 0.44440,
  tarieven: [
    { vanaf: "2025-01-01", salaris100: 3107.00, uurloonORT: 19.85, reiskostenKm: 0.16 },
    { vanaf: "2025-08-01", salaris100: 3231.00, uurloonORT: 20.65, reiskostenKm: 0.20 },
    { vanaf: "2025-12-01", salaris100: 3319.00, uurloonORT: 20.65, reiskostenKm: 0.20 },
    { vanaf: "2026-01-01", salaris100: 3481.00, uurloonORT: 21.21, reiskostenKm: 0.20 },
    { vanaf: "2026-02-01", salaris100: 3481.00, uurloonORT: 22.24, reiskostenKm: 0.20 },
  ],
  ort: {
    avond: 0.22,
    vroeg: 0.38,
    nacht: 0.44,
    zaterdag: 0.52,
    zondag: 0.60,
  },
  amtZeerintensiefPct: 0.05,
  toeslagBalansvlfPct: 0.0304,
  toeslagVakantieurenPct: 0.0767,
  pensioenPct: 0.1295,
  vakantiegeldPct: 0.08,
  eindejaarsuitkeringPct: 0.0833,
  reisafstandKmEnkel: 33,
  loonheffingKortingschat: 3070,
};

export type ScheduleSalaryForecast = {
  periode: string;
  nettoPrognose: number;
  brutoBetaling: number;
  pensioenpremie: number;
  aantalDiensten: number;
  totaalUren: number;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function getTarief(jaar: number, maand: number) {
  const peilDatum = new Date(jaar, maand - 1, 1);
  let actief = SALARY_CONFIG.tarieven[0];
  for (const entry of SALARY_CONFIG.tarieven) {
    if (peilDatum >= new Date(entry.vanaf)) actief = entry;
  }
  return actief;
}

function parseHour(time?: string) {
  const match = time?.trim().match(/^(\d{1,2})(?::(\d{2}))?/);
  return match ? Number(match[1]) : 9;
}

function durationHours(dienst: DienstRow) {
  if (typeof dienst.duur === "number" && dienst.duur > 0) return dienst.duur;
  const start = parseHour(dienst.startTijd);
  const end = parseHour(dienst.eindTijd);
  if (end > start) return end - start;
  if (end < start) return 24 - start + end;
  return 0;
}

function classifyOrt(dienst: DienstRow): keyof typeof SALARY_CONFIG.ort | null {
  const day = dienst.dag.toLowerCase();
  if (day === "zondag") return "zondag";
  if (day === "zaterdag") return "zaterdag";

  const type = dienst.shiftType.toLowerCase();
  if (type === "vroeg") return "vroeg";
  if (type === "nacht") return "nacht";

  const startHour = parseHour(dienst.startTijd);
  if (startHour >= 20 || startHour < 6) return "nacht";
  if (startHour >= 18) return "avond";
  if (startHour < 9) return "vroeg";
  return null;
}

function countWeekdays(jaar: number, maand: number) {
  const days = new Date(jaar, maand, 0).getDate();
  let count = 0;
  for (let day = 1; day <= days; day += 1) {
    const weekday = new Date(jaar, maand - 1, day).getDay();
    if (weekday > 0 && weekday < 6) count += 1;
  }
  return count;
}

function estimatePayrollTax(yearSalary: number) {
  const brackets = [
    { tot: 38441, tarief: 0.3597 },
    { tot: 76817, tarief: 0.3748 },
    { tot: Number.POSITIVE_INFINITY, tarief: 0.4950 },
  ];
  let tax = 0;
  let previous = 0;

  for (const bracket of brackets) {
    if (yearSalary <= bracket.tot) {
      tax += (yearSalary - previous) * bracket.tarief;
      break;
    }
    tax += (bracket.tot - previous) * bracket.tarief;
    previous = bracket.tot;
  }

  return roundMoney(Math.max(0, tax - SALARY_CONFIG.loonheffingKortingschat));
}

export function calculateScheduleSalaryForecast(diensten: DienstRow[], periode?: string): ScheduleSalaryForecast | null {
  if (!periode || !/^\d{4}-\d{2}$/.test(periode)) return null;

  const [jaar, maand] = periode.split("-").map(Number);
  const monthRows = diensten.filter((dienst) => (
    dienst.status !== "VERWIJDERD" &&
    dienst.startDatum?.slice(0, 7) === periode
  ));

  if (monthRows.length === 0) return null;

  const tarieven = getTarief(jaar, maand);
  const basisLoon = tarieven.salaris100 * SALARY_CONFIG.deeltijdFactor;
  const amtZeerintensief = roundMoney(basisLoon * SALARY_CONFIG.amtZeerintensiefPct);
  const toeslagBalansvlf = roundMoney(basisLoon * SALARY_CONFIG.toeslagBalansvlfPct);
  const reiskosten = roundMoney(countWeekdays(jaar, maand) * 2 * SALARY_CONFIG.reisafstandKmEnkel * tarieven.reiskostenKm);

  let ortTotaal = 0;
  let totaalUren = 0;

  for (const dienst of monthRows) {
    const uren = durationHours(dienst);
    if (uren <= 0) continue;
    totaalUren += uren;

    const ortCategorie = classifyOrt(dienst);
    if (ortCategorie) {
      ortTotaal += roundMoney(uren * tarieven.uurloonORT * SALARY_CONFIG.ort[ortCategorie]);
    }
  }

  const eenmaligTotaal =
    maand === 5
      ? roundMoney((basisLoon + amtZeerintensief + toeslagBalansvlf) * 12 * SALARY_CONFIG.vakantiegeldPct)
      : maand === 12
        ? roundMoney((basisLoon + amtZeerintensief) * 12 * SALARY_CONFIG.eindejaarsuitkeringPct) + 240
        : 0;

  const brutoBetaling = roundMoney(basisLoon + amtZeerintensief + toeslagBalansvlf + ortTotaal + reiskosten + eenmaligTotaal);
  const pensioenpremie = roundMoney((basisLoon + amtZeerintensief + toeslagBalansvlf + ortTotaal) * SALARY_CONFIG.pensioenPct);
  const loonheffingSchat = estimatePayrollTax((brutoBetaling - reiskosten) * 12) / 12;
  const nettoPrognose = roundMoney(brutoBetaling - pensioenpremie - loonheffingSchat);

  return {
    periode,
    nettoPrognose,
    brutoBetaling,
    pensioenpremie,
    aantalDiensten: monthRows.length,
    totaalUren: Math.round(totaalUren * 10) / 10,
  };
}
