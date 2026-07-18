import { expect, test } from "@playwright/test";
import {
  normalizeCompanyRelation,
  normalizeCompanyStatus,
  parseTagInput,
} from "../../lib/laventecare/form-normalization";

test("normalizes and deduplicates user-entered tags", () => {
  expect(parseTagInput(" #Pilot,KLANT\npilot, ")).toEqual(["pilot", "klant"]);
});

test("uses safe form defaults for unknown backend vocabulary", () => {
  expect(normalizeCompanyStatus("unknown")).toBe("actief");
  expect(normalizeCompanyRelation("unknown")).toBe("prospect");
  expect(normalizeCompanyRelation("eigen_project")).toBe("eigen_project");
});
