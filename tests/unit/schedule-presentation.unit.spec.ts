import { expect, test } from "@playwright/test";
import {
  conflictPresentation,
  scheduleToneVars,
  shiftPresentation,
  statusPresentation,
  teamPresentation,
  tonePresentation,
} from "../../components/schedule/schedulePresentation";

test.describe("schedule presentation", () => {
  test("shift and team categories never borrow status semantics", () => {
    const categoryTones = [
      shiftPresentation("Vroeg").tone,
      shiftPresentation("Laat").tone,
      shiftPresentation("Dienst").tone,
      shiftPresentation("onbekend").tone,
      teamPresentation("Rood").tone,
      teamPresentation("A").tone,
      teamPresentation("Overig").tone,
    ];

    expect(categoryTones).toEqual([
      "accent",
      "info",
      "neutral",
      "info",
      "info",
      "accent",
      "neutral",
    ]);
    expect(categoryTones).not.toContain("success");
    expect(categoryTones).not.toContain("warning");
    expect(categoryTones).not.toContain("danger");
  });

  test("conflicts and lifecycle statuses retain operational semantics", () => {
    expect(conflictPresentation("hard").tone).toBe("danger");
    expect(conflictPresentation("soft").tone).toBe("warning");
    expect(conflictPresentation("none").tone).toBe("info");
    expect(statusPresentation("PendingDelete").tone).toBe("danger");
    expect(statusPresentation("Bezig").tone).toBe("success");
    expect(statusPresentation()).toEqual(tonePresentation("neutral"));
  });

  test("runtime presentation exposes semantic CSS variables only", () => {
    for (const tone of ["neutral", "accent", "info", "success", "warning", "danger"] as const) {
      const presentation = tonePresentation(tone);
      expect(presentation.color).toMatch(/^var\(--color-[a-z-]+\)$/);
      expect(presentation.surface).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
      expect(scheduleToneVars(tone)).toEqual({ "--schedule-accent": presentation.color });
    }
  });
});
