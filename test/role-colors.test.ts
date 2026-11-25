import { describe, expect, it } from "vitest";
import { PROBE_COLOR, roleColors } from "@/components/board-visual/roles";

/** OKLCH hue in degrees, enough to tell cyan from blue. */
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const c = parseInt(hex.slice(index, index + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
}

describe("role palette", () => {
  it("never reuses the probe colour, which marks the probed pin alone", () => {
    // The I2C edge was #22d3ee, so an I2C pad's ring read as "probed".
    for (const [role, steps] of Object.entries(roleColors)) {
      for (const value of Object.values(steps)) expect(value.toLowerCase(), role).not.toBe(PROBE_COLOR.toLowerCase());
    }
  });

  it("keeps the I2C role clearly off the probe's cyan hue", () => {
    const distance = Math.abs(hue(roleColors.i2c.edge) - hue(PROBE_COLOR));
    expect(Math.min(distance, 360 - distance)).toBeGreaterThan(40);
  });
});
