import type { NoteRecord } from "@/hooks/useNotes";

export function getNoteDateKey(note: NoteRecord): string {
  const source = note.deadline || note.aangemaakt;
  if (!source) return "";
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return source.slice(0, 10);
  return date.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

export function getLinkedEventId(note: NoteRecord): string | null {
  return note.linkedEventId || note.linked_event_id || null;
}

export function groupNotesByDate(notes: NoteRecord[]): Map<string, NoteRecord[]> {
  const map = new Map<string, NoteRecord[]>();
  for (const note of notes) {
    const key = getNoteDateKey(note);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(note);
  }
  for (const dayNotes of map.values()) {
    dayNotes.sort(compareNotesForAgenda);
  }
  return map;
}

export function groupNotesByEventId(notes: NoteRecord[]): Map<string, NoteRecord[]> {
  const map = new Map<string, NoteRecord[]>();
  for (const note of notes) {
    const eventId = getLinkedEventId(note);
    if (!eventId) continue;
    if (!map.has(eventId)) map.set(eventId, []);
    map.get(eventId)!.push(note);
  }
  for (const eventNotes of map.values()) {
    eventNotes.sort(compareNotesForAgenda);
  }
  return map;
}

export function compareNotesForAgenda(a: NoteRecord, b: NoteRecord): number {
  const aPinned = a.isPinned || a.is_pinned;
  const bPinned = b.isPinned || b.is_pinned;
  if (aPinned !== bPinned) return aPinned ? -1 : 1;
  return noteSortTime(a).localeCompare(noteSortTime(b));
}

function noteSortTime(note: NoteRecord): string {
  return note.deadline || note.aangemaakt || note.gewijzigd || "";
}
