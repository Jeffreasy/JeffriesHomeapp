/**
 * Agenda Agent - persoonlijke planning en Google Calendar regie.
 *
 * Houdt persoonlijke afspraken los van het werkrooster, maar geeft Brain wel
 * direct de overlap met diensten, pending Calendar-acties en sync-health.
 */

import type { Doc } from "../../_generated/dataModel";
import type { AgentDefinition, ContextOptions } from "../registry";

type PersonalEvent = Doc<"personalEvents">;
type Dienst = Doc<"schedule">;
type Note = Doc<"notes">;
type SyncStatus = Doc<"syncStatus">;
type AgendaConflictLevel = "hard" | "soft" | "info";

const DAY_MS = 86_400_000;
const PENDING_STATUSES = new Set(["PendingCreate", "PendingDelete", "Fout"]);

function amsterdamDate(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * DAY_MS);
  return date.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

function amsterdamDateLabel(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function displayEndDate(event: PersonalEvent): string {
  if (!event.heledag) return event.eindDatum || event.startDatum;
  const raw = event.eindDatum;
  const date = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(date.getTime())) return event.startDatum;
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function eventCoversDate(event: PersonalEvent, datum: string): boolean {
  return event.startDatum <= datum && displayEndDate(event) >= datum;
}

function isVisibleEvent(event: PersonalEvent): boolean {
  return event.status !== "VERWIJDERD";
}

function isUpcomingEvent(event: PersonalEvent, today: string): boolean {
  return isVisibleEvent(event) && event.status !== "Voorbij" && displayEndDate(event) >= today;
}

function sortEvents(a: PersonalEvent, b: PersonalEvent): number {
  const date = a.startDatum.localeCompare(b.startDatum);
  if (date !== 0) return date;
  return (a.startTijd ?? "00:00").localeCompare(b.startTijd ?? "00:00");
}

function timeLabel(event: PersonalEvent): string {
  if (event.heledag) return "Hele dag";
  if (event.startTijd && event.eindTijd) return `${event.startTijd}-${event.eindTijd}`;
  return event.startTijd ?? "Hele dag";
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const a0 = toMinutes(aStart);
  let a1 = toMinutes(aEnd);
  const b0 = toMinutes(bStart);
  let b1 = toMinutes(bEnd);
  if (a1 <= a0) a1 += 1440;
  if (b1 <= b0) b1 += 1440;
  return a0 < b1 && b0 < a1;
}

function detectConflict(event: PersonalEvent, dienst: Dienst): { level: AgendaConflictLevel; message: string; dienst: string } | null {
  if (!eventCoversDate(event, dienst.startDatum)) return null;

  const dienstLabel = `${dienst.shiftType} ${dienst.startTijd}-${dienst.eindTijd}`;
  if (event.heledag || !event.startTijd || !event.eindTijd) {
    return {
      level: "soft",
      message: `Hele dag of zonder tijd naast ${dienstLabel}`,
      dienst: dienstLabel,
    };
  }

  if (rangesOverlap(event.startTijd, event.eindTijd, dienst.startTijd, dienst.eindTijd)) {
    return {
      level: "hard",
      message: `Overlap met ${dienstLabel}`,
      dienst: dienstLabel,
    };
  }

  return {
    level: "info",
    message: `Zelfde dag als ${dienstLabel}, geen overlap`,
    dienst: dienstLabel,
  };
}

function parseCategory(event: PersonalEvent): string {
  const match = event.beschrijving?.match(/\[categorie:(\w+)\]/);
  return match?.[1] ?? "overig";
}

function formatEvent(event: PersonalEvent, notesByEventId: Map<string, number>) {
  return {
    eventId: event.eventId,
    titel: event.titel,
    datum: event.startDatum,
    eindDatum: displayEndDate(event),
    tijd: timeLabel(event),
    locatie: event.locatie,
    status: event.status,
    categorie: parseCategory(event),
    gekoppeldeNotities: notesByEventId.get(event.eventId) ?? 0,
  };
}

function syncHealth(sync: SyncStatus | null) {
  const lastSuccessAt = sync?.lastSuccessAt;
  const ageMs = lastSuccessAt ? Date.now() - new Date(lastSuccessAt).getTime() : null;
  const hoursSinceSuccess = ageMs === null || Number.isNaN(ageMs) ? null : Math.round(ageMs / 36_000) / 100;
  const stale = hoursSinceSuccess === null ? true : hoursSinceSuccess > 3;

  return {
    status: sync?.status ?? "unknown",
    laatsteSucces: lastSuccessAt ?? null,
    laatsteFout: sync?.lastErrorAt ?? null,
    fout: sync?.lastError ?? null,
    urenSindsSucces: hoursSinceSuccess,
    stale,
  };
}

export const agendaAgent: AgentDefinition = {
  id:           "agenda",
  naam:         "Agenda Agent",
  emoji:        "🗓️",
  beschrijving: "Persoonlijke agenda specialist. Beheert Google Calendar afspraken, pending Calendar-acties, dag- en weekplanning, conflicten met diensten en gekoppelde notities.",
  domein:       ["personalEvents", "schedule", "syncStatus", "notes"],
  capabilities: [
    "Afspraken per dag, week en maand samenvatten",
    "Nieuwe afspraken voorbereiden met categorie, tijd en locatie",
    "Bestaande afspraken wijzigen of verwijderen via bevestigde acties",
    "Conflicten en zachte signalen met werkdiensten detecteren",
    "Google Calendar sync-health en pending wachtrij bewaken",
    "Gekoppelde notities bij afspraken zichtbaar maken",
  ],
  tools: [
    {
      naam: "afsprakenOpvragen", type: "query",
      beschrijving: "Persoonlijke afspraken inclusief conflicten ophalen",
      parameters: [
        { naam: "aantalDagen", type: "number", beschrijving: "Aantal dagen vooruit", verplicht: false },
      ],
    },
    {
      naam: "afspraakMaken", type: "mutation",
      beschrijving: "Nieuwe afspraak aanmaken via bevestigde Calendar-flow",
      parameters: [
        { naam: "titel", type: "string", beschrijving: "Titel van de afspraak", verplicht: true },
        { naam: "startDatum", type: "string", beschrijving: "Startdatum YYYY-MM-DD", verplicht: true },
        { naam: "startTijd", type: "string", beschrijving: "Starttijd HH:MM", verplicht: false },
        { naam: "eindDatum", type: "string", beschrijving: "Einddatum YYYY-MM-DD", verplicht: true },
        { naam: "eindTijd", type: "string", beschrijving: "Eindtijd HH:MM", verplicht: false },
      ],
    },
    {
      naam: "afspraakBewerken", type: "mutation",
      beschrijving: "Afspraak wijzigen via exacte eventId",
      parameters: [
        { naam: "eventId", type: "string", beschrijving: "Exacte eventId uit afsprakenOpvragen", verplicht: true },
      ],
    },
    {
      naam: "afspraakVerwijderen", type: "mutation",
      beschrijving: "Afspraak verwijderen via exacte eventId",
      parameters: [
        { naam: "eventId", type: "string", beschrijving: "Exacte eventId uit afsprakenOpvragen", verplicht: true },
      ],
    },
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const today = amsterdamDate();
    const tomorrow = amsterdamDate(1);

    const [allEvents, allSchedule, sync, notes] = await Promise.all([
      ctx.db.query("personalEvents").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("schedule").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("syncStatus").withIndex("by_user_source", (q) => q.eq("userId", userId).eq("source", "personal")).first(),
      ctx.db.query("notes").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
    ]);

    const visibleEvents = allEvents.filter(isVisibleEvent);
    const upcomingEvents = visibleEvents
      .filter((event) => isUpcomingEvent(event, today))
      .sort(sortEvents);
    const pendingEvents = visibleEvents
      .filter((event) => PENDING_STATUSES.has(event.status))
      .sort(sortEvents);
    const activeSchedule = allSchedule.filter((dienst) => dienst.status !== "VERWIJDERD");
    const activeLinkedNotes = notes.filter((note: Note) => !note.isArchived && note.linkedEventId);
    const notesByEventId = new Map<string, number>();
    for (const note of activeLinkedNotes) {
      if (!note.linkedEventId) continue;
      notesByEventId.set(note.linkedEventId, (notesByEventId.get(note.linkedEventId) ?? 0) + 1);
    }

    const conflicts = upcomingEvents
      .flatMap((event) =>
        activeSchedule
          .map((dienst) => ({ event, dienst, conflict: detectConflict(event, dienst) }))
          .filter((item): item is { event: PersonalEvent; dienst: Dienst; conflict: NonNullable<ReturnType<typeof detectConflict>> } => Boolean(item.conflict))
      )
      .sort((a, b) => {
        const order: Record<AgendaConflictLevel, number> = { hard: 0, soft: 1, info: 2 };
        const level = order[a.conflict.level] - order[b.conflict.level];
        if (level !== 0) return level;
        return a.event.startDatum.localeCompare(b.event.startDatum);
      });

    const realConflicts = conflicts.filter((item) => item.conflict.level !== "info");
    const todayEvents = upcomingEvents.filter((event) => eventCoversDate(event, today));
    const tomorrowEvents = upcomingEvents.filter((event) => eventCoversDate(event, tomorrow));
    const categoryCounts = upcomingEvents.reduce<Record<string, number>>((acc, event) => {
      const category = parseCategory(event);
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    }, {});

    if (opts?.lite) {
      return {
        vandaag: {
          datum: today,
          aantal: todayEvents.length,
          eerste: todayEvents[0] ? formatEvent(todayEvents[0], notesByEventId) : null,
        },
        morgen: {
          datum: tomorrow,
          aantal: tomorrowEvents.length,
          eerste: tomorrowEvents[0] ? formatEvent(tomorrowEvents[0], notesByEventId) : null,
        },
        komendeAfspraken: upcomingEvents.length,
        pending: pendingEvents.length,
        conflicten: realConflicts.length,
        sync: syncHealth(sync),
        volgendeAfspraak: upcomingEvents[0] ? formatEvent(upcomingEvents[0], notesByEventId) : null,
      };
    }

    const komendeDagen = Array.from({ length: 14 }, (_, index) => {
      const datum = amsterdamDate(index);
      const afspraken = upcomingEvents.filter((event) => eventCoversDate(event, datum));
      const diensten = activeSchedule.filter((dienst) => dienst.startDatum === datum);
      return {
        datum,
        label: amsterdamDateLabel(datum),
        afspraken: afspraken.map((event) => formatEvent(event, notesByEventId)),
        diensten: diensten.map((dienst) => ({
          titel: dienst.titel,
          type: dienst.shiftType,
          tijd: `${dienst.startTijd}-${dienst.eindTijd}`,
          locatie: dienst.locatie,
        })),
      };
    });

    return {
      vandaag: today,
      morgen: tomorrow,
      sync: syncHealth(sync),
      statistieken: {
        totaalZichtbaar: visibleEvents.length,
        aankomend: upcomingEvents.length,
        vandaag: todayEvents.length,
        morgen: tomorrowEvents.length,
        pending: pendingEvents.length,
        conflicten: realConflicts.length,
        gekoppeldeNotities: activeLinkedNotes.length,
        categorieen: categoryCounts,
      },
      komendeDagen,
      aankomendeAfspraken: upcomingEvents
        .slice(0, 25)
        .map((event) => formatEvent(event, notesByEventId)),
      wachtrij: pendingEvents
        .slice(0, 10)
        .map((event) => formatEvent(event, notesByEventId)),
      conflicten: realConflicts
        .slice(0, 12)
        .map(({ event, conflict }) => ({
          ...formatEvent(event, notesByEventId),
          niveau: conflict.level,
          melding: conflict.message,
        })),
      werkSignalen: conflicts
        .filter((item) => item.conflict.level === "info")
        .slice(0, 8)
        .map(({ event, conflict }) => ({
          ...formatEvent(event, notesByEventId),
          melding: conflict.message,
        })),
      instructie: "Gebruik Agenda voor persoonlijke afspraken. Combineer met Rooster wanneer werkdiensten of salarisrelevante planning nodig is.",
    };
  },
};
