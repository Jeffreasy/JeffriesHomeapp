import { expect, test } from "@playwright/test";
import type { LoonstrookRecord } from "../../hooks/useLoonstroken";
import { findLatestLoonstrook } from "../../lib/salaryForecast";

function payslip(periodeLabel: string, uurloon: number): LoonstrookRecord {
  return { periodeLabel, uurloon } as unknown as LoonstrookRecord;
}

test("never calibrates a forecast with a future payslip", () => {
  const records = [payslip("2026-08", 30), payslip("2026-05", 20)];
  expect(findLatestLoonstrook(records, "2026-07")?.periodeLabel).toBe("2026-05");
  expect(findLatestLoonstrook([payslip("2026-08", 30)], "2026-07")).toBeUndefined();
});
