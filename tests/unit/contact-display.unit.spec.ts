import { expect, test } from "@playwright/test";
import { formatDayMonth, relationshipLabel } from "../../lib/contacten/contact-display";

test("formats known relationships and safely clamps month labels", () => {
  expect(relationshipLabel("family")).toBe("Familie");
  expect(relationshipLabel("custom")).toBe("custom");
  expect(formatDayMonth(0, 12)).toBe("12 jan");
  expect(formatDayMonth(13, 12)).toBe("12 dec");
});
