import { expect, test } from "@playwright/test";
import { contractHoursForCalendarMonth, weeksStartingInMonth } from "../../lib/contract";

test("uses one calendar-week contract norm", () => {
  expect(weeksStartingInMonth("2026-07")).toBe(4);
  expect(contractHoursForCalendarMonth("2026-07", 16)).toBe(64);
  expect(weeksStartingInMonth("invalid")).toBe(0);
});
