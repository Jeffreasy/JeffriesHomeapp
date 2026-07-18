import { expect, test } from "@playwright/test";
import {
  getOverlayStackSnapshot,
  registerOverlay,
} from "../../lib/overlays/overlay-manager";

test("critical overlays remain logically topmost when standard overlays open later", () => {
  const closeFirst = registerOverlay("standard-first");
  const closeCritical = registerOverlay("critical", "critical");
  const closeLater = registerOverlay("standard-later");

  try {
    expect(getOverlayStackSnapshot()).toEqual([
      "standard-first",
      "standard-later",
      "critical",
    ]);
  } finally {
    closeLater();
    closeCritical();
    closeFirst();
  }
});
