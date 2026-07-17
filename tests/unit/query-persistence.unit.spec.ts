import { expect, test } from "@playwright/test";
import { isSensitiveQueryKey, shouldPersistQuery } from "../../lib/query-persistence";

test.describe("query persistence policy", () => {
  test("is opt-in and rejects ordinary private queries", () => {
    expect(shouldPersistQuery(["devices"])).toBe(false);
    expect(shouldPersistQuery(["devices"], {})).toBe(false);
    expect(shouldPersistQuery(["devices"], { persist: true })).toBe(true);
  });

  test("blocks note, contact and focus data even after accidental opt-in", () => {
    const sensitiveKeys = [
      ["notes", "context", "contact"],
      ["/notes", { fields: "summary" }],
      ["contacten", "detail", "contact-id"],
      ["focus-notes-summary", "owner-id"],
      ["focus-note-detail", "note-id"],
      ["focus-lc-actions", "owner-id"],
    ];

    for (const queryKey of sensitiveKeys) {
      expect(isSensitiveQueryKey(queryKey)).toBe(true);
      expect(shouldPersistQuery(queryKey, { persist: true })).toBe(false);
    }
  });
});
