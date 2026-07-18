import type { NoteRecord } from "@/hooks/useNotes";

/**
 * Carries the refetched server version after a note update conflict. Keeping
 * this domain error outside the editor lets callers preserve conflict handling
 * without eagerly loading the full editor bundle.
 */
export class NoteConflictError extends Error {
  freshNote: NoteRecord | null;

  constructor(freshNote: NoteRecord | null) {
    super("Notitie is elders gewijzigd");
    this.name = "NoteConflictError";
    this.freshNote = freshNote;
  }
}
