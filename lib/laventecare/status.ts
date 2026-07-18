const CLOSED_LAVENTECARE_STATUSES = new Set([
  "afgerond",
  "done",
  "gesloten",
  "gearchiveerd",
  "omgezet_project",
  "gewonnen",
  "verloren",
  "gediskwalificeerd",
  "geannuleerd",
]);

export function isClosedLaventeCareStatus(status?: string | null) {
  return CLOSED_LAVENTECARE_STATUSES.has((status ?? "").trim().toLowerCase());
}
