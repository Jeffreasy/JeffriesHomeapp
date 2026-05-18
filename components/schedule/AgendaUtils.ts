import { type PersonalEvent } from "@/hooks/usePersonalEvents";
import { getDisplayEndDate } from "@/hooks/usePersonalEvents";

export function getAmsterdamTodayIso() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

export function addDaysIso(baseIso: string, days: number) {
  const date = new Date(`${baseIso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatDateLabel(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

export function formatDateTime(value?: string) {
  if (!value) return "Nog niet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Onbekend";
  return date.toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function eventCoversDate(event: PersonalEvent, datum: string) {
  return event.startDatum <= datum && getDisplayEndDate(event) >= datum;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Onbekende fout";
}

export function parseCategory(event: PersonalEvent) {
  const match = event.beschrijving?.match(/\[categorie:(\w+)\]/);
  return match?.[1] ?? "overig";
}
