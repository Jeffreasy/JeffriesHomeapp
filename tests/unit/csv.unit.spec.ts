import { expect, test } from "@playwright/test";
import { detectCsvDelimiter, parseDelimitedObjects, parseDelimitedRows } from "../../lib/csv";

test("detects semicolon exports", () => {
  expect(detectCsvDelimiter("Datum;Bedrag;Omschrijving\r\n2026-01-01;12,50;Test")).toBe(";");
  expect(parseDelimitedRows("Datum;Bedrag\n2026-01-01;12,50")).toEqual([
    ["Datum", "Bedrag"],
    ["2026-01-01", "12,50"],
  ]);
});

test("keeps quoted multiline fields and escaped quotes in one record", () => {
  const parsed = parseDelimitedObjects(
    'Datum,Omschrijving,Bedrag\r\n2026-01-01,"Eerste regel\r\ntweede ""regel""","12,50"',
  );
  expect(parsed.rows).toEqual([
    { Datum: "2026-01-01", Omschrijving: 'Eerste regel\r\ntweede "regel"', Bedrag: "12,50" },
  ]);
});
