import type { QueryKey, QueryMeta } from "@tanstack/react-query";

/**
 * IndexedDB is durable browser storage. Homeapp query data is private by
 * default, so persistence is opt-in through `meta.persist === true`.
 *
 * The deny-list remains as a second line of defence: an accidentally opted-in
 * notes/contact/focus query still cannot be written to disk.
 */
const SENSITIVE_QUERY_PREFIXES = [
  "/notes",
  "notes",
  "contacten",
  "focus-note",
  "focus-notes",
  "focus-lc-actions",
  "/personal-events",
  "/schedule",
  "/sync",
  "sync-status",
  "/loonstroken",
  "/salary",
  "laventecare",
  "/transactions",
  "/habits",
] as const;

export function isSensitiveQueryKey(queryKey: QueryKey): boolean {
  const first = queryKey[0];
  return (
    typeof first === "string" &&
    SENSITIVE_QUERY_PREFIXES.some((prefix) => first.startsWith(prefix))
  );
}

export function shouldPersistQuery(queryKey: QueryKey, meta?: QueryMeta): boolean {
  return meta?.persist === true && !isSensitiveQueryKey(queryKey);
}
