import { expect, test } from "@playwright/test";
import {
  contrastRatio,
  hexContrastRatio,
  solidForegroundToken,
} from "../../lib/ui/colorContrast";

test.describe("color contrast", () => {
  test("computes the WCAG contrast ratio for canonical black and white", () => {
    expect(
      contrastRatio(
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
      ),
    ).toBeCloseTo(21, 5);
    expect(hexContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  test("projects the higher-contrast solid foreground token", () => {
    expect(solidForegroundToken("#eab308")).toBe(
      "var(--color-solid-foreground-dark)",
    );
    expect(solidForegroundToken("#64748b")).toBe(
      "var(--color-solid-foreground-light)",
    );
  });
});
