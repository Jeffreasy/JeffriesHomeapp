import { expect, test } from "@playwright/test";
import type { Device } from "../../lib/api";
import {
  createLampAmbientStyle,
  deriveLampPresentation,
  ensureVisibleLampAccent,
} from "../../lib/lampPresentation";
import { hexToRgb, kelvinToHex, rgbToHex } from "../../lib/utils";
import { contrastRatio, type RgbColor } from "../../lib/ui/colorContrast";

function createDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: "lamp-1",
    name: "Testlamp",
    device_type: "light",
    room_id: null,
    ip_address: null,
    current_state: {
      on: true,
      brightness: 62,
      color_temp: 2700,
      r: 0,
      g: 0,
      b: 0,
    },
    status: "online",
    last_seen: null,
    commissioned_at: "",
    manufacturer: "WiZ",
    model: null,
    ...overrides,
  };
}

const LAMP_SURFACES: readonly RgbColor[] = [
  { r: 10, g: 10, b: 15 },
  { r: 18, g: 18, b: 26 },
  { r: 26, g: 26, b: 38 },
];

function compositeColor(foreground: RgbColor, background: RgbColor, alpha: number) {
  return {
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
  };
}


test.describe("lamp presentation", () => {
  test("Kelvin and RGB helpers always return valid clamped hex colours", () => {
    expect(kelvinToHex(2200)).toMatch(/^#[0-9a-f]{6}$/);
    expect(kelvinToHex(6500)).toMatch(/^#[0-9a-f]{6}$/);
    expect(kelvinToHex(2200)).not.toBe(kelvinToHex(6500));
    expect(rgbToHex(-20, 260, 15.6)).toBe("#00ff10");
  });

  test("offline stale-on payloads remain neutral and never glow as active", () => {
    const presentation = deriveLampPresentation(
      createDevice({ status: "offline" }),
    );

    expect(presentation).toMatchObject({
      isOnline: false,
      isOn: false,
      mode: "offline",
      statusLabel: "Offline",
      accent: "#64748b",
    });
    expect(presentation.ambientStyle["--lamp-ambient-shadow"]).toBe(
      "rgba(100, 116, 139, 0)",
    );
  });

  test("pending optimistic state is explicitly distinguished from reported state", () => {
    const presentation = deriveLampPresentation(createDevice(), {
      pending: true,
    });

    expect(presentation.deliveryPhase).toBe("pending");
    expect(presentation.statusLabel).toBe("Wordt toegepast...");
    expect(presentation.detailLabel).toContain("bevestiging volgt");
    expect(presentation.ambientStyle["--lamp-brightness"]).toBe("62%");
  });

  test("dark selected colours are lifted to a visible, valid UI accent", () => {
    const safeBlue = ensureVisibleLampAccent("#000010");

    expect(safeBlue).toMatch(/^#[0-9a-f]{6}$/);
    expect(safeBlue).not.toBe("#000010");

    const presentation = deriveLampPresentation(
      createDevice({
        current_state: {
          on: true,
          brightness: 40,
          color_temp: 2700,
          r: 0,
          g: 0,
          b: 16,
        },
      }),
    );
    expect(presentation.mode).toBe("color");
    expect(presentation.accent).toBe(safeBlue);
  });
  test("selected accent remains distinguishable from its own tinted surface", () => {
    for (const accent of ["#040c50", "#000966"]) {
      const safeAccent = hexToRgb(ensureVisibleLampAccent(accent));

      for (const surface of LAMP_SURFACES) {
        for (const alpha of [0.08, 0.14, 0.28]) {
          expect(
            contrastRatio(safeAccent, compositeColor(safeAccent, surface, alpha)),
            `${accent} at ${String(alpha)} on a canonical lamp surface`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  test("ambient styles expose only valid runtime CSS colour values", () => {
    const style = createLampAmbientStyle("#ff8800", true);

    expect(style["--lamp-accent"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(style["--lamp-text"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(style["--lamp-ambient-soft"]).toMatch(/^rgba\(\d+, \d+, \d+, 0\.08\)$/);
    expect(style["--lamp-ambient-border"]).toMatch(/^rgba\(\d+, \d+, \d+, 0\.3\)$/);
    expect(style["--lamp-brightness"]).toBe("100%");
  });

  test("ambient text remains WCAG AA across every tinted control surface", () => {
    const accents = ["#000010", "#64748b", "#847c98", "#ff8800", "#ffffff"] as const;

    for (const active of [false, true]) {
      const alphas = active ? [0.08, 0.14, 0.28] : [0.025, 0.05];
      for (const accent of accents) {
        const style = createLampAmbientStyle(accent, active);
        const textColor = hexToRgb(style["--lamp-text"]);
        const renderedAccent = hexToRgb(style["--lamp-accent"]);

        for (const surface of LAMP_SURFACES) {
          for (const alpha of alphas) {
            const background = compositeColor(renderedAccent, surface, alpha);
            expect(
              contrastRatio(textColor, background),
              `${accent} at ${String(alpha)} on a canonical lamp surface`,
            ).toBeGreaterThanOrEqual(4.75);
          }
        }
      }
    }
  });
});
