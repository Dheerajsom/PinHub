import type { CSSProperties } from "react";
import type { PinRole } from "@/lib/boards";

// Human-readable role names. Kept in one place so the legend, pads, popovers,
// table, and accessible labels all stay in sync.
export const roleLabels: Record<PinRole, string> = {
  power: "Power",
  ground: "Ground",
  gpio: "GPIO",
  i2c: "I2C",
  spi: "SPI",
  uart: "UART",
  adc: "ADC",
  dac: "DAC",
  pwm: "PWM",
  debug: "Debug",
  system: "System",
  special: "Alt",
  reserved: "Reserved",
};

/**
 * One palette for every surface — SVG pads, HTML chips, table badges.
 *
 * The thirteen role hues are sampled from OKLCH at a *fixed lightness and
 * chroma per ramp*, varying only in hue angle, then baked to sRGB hex (with
 * chroma reduced per-hue where sRGB could not hold it). Uniform lightness is
 * the point: with the old full-saturation Tailwind hues, yellow and cyan
 * shouted while violet receded, so a connector read as confetti and no role
 * carried more weight than any other by accident. Here every role is equally
 * loud, which leaves contrast free to mean something — the live probe is the
 * only thing on the sheet allowed to be brighter than a role.
 *
 * Hue angles keep the conventions this audience already reads: power is red,
 * ground is deliberately chromaless, GPIO is green.
 *
 *   ink   L 0.865  label text on the drawing sheet
 *   edge  L 0.735  pad ring, chip border
 *   fill  L 0.335  pad body
 *   wash  L 0.265  chip background
 */
export const roleColors: Record<
  PinRole,
  { ink: string; edge: string; fill: string; wash: string }
> = {
  power: { ink: "#fec1bb", edge: "#f98078", fill: "#572522", wash: "#391b19" },
  ground: { ink: "#b8c2cc", edge: "#a4aab1", fill: "#34373a", wash: "#242527" },
  gpio: { ink: "#8eeca3", edge: "#58c375", fill: "#134121", wash: "#122c18" },
  i2c: { ink: "#40ecfd", edge: "#0ebfce", fill: "#003f45", wash: "#002b30" },
  spi: { ink: "#fbcb61", edge: "#d4a004", fill: "#473300", wash: "#302305" },
  uart: { ink: "#acd8ff", edge: "#4cb1fe", fill: "#0c3a5a", wash: "#0f273b" },
  adc: { ink: "#cdcdff", edge: "#a19bfe", fill: "#33305b", wash: "#23223c" },
  dac: { ink: "#febdd8", edge: "#ef7eb3", fill: "#53243b", wash: "#371b28" },
  pwm: { ink: "#f2bcff", edge: "#d288e3", fill: "#47294e", wash: "#2f1d34" },
  debug: { ink: "#bee27c", edge: "#94b944", fill: "#2e3d0a", wash: "#20290d" },
  system: { ink: "#fec59f", edge: "#f08d40", fill: "#532a08", wash: "#371e0c" },
  special: { ink: "#56efd3", edge: "#0bc4a9", fill: "#014137", wash: "#012d25" },
  reserved: { ink: "#d9d1c7", edge: "#b0a89d", fill: "#393632", wash: "#272522" },
};

// Reserved pins are drawn with a diagonal hatch rather than a solid fill. Hatch
// is the drafting convention for a restricted region, and it separates reserved
// from ground by *shape* — both are intentionally chromaless, so hue alone could
// not tell them apart.
export const hatchedRoles = new Set<PinRole>(["reserved"]);

export const roleOrder: PinRole[] = [
  "power",
  "ground",
  "gpio",
  "pwm",
  "i2c",
  "spi",
  "uart",
  "adc",
  "dac",
  "debug",
  "system",
  "special",
  "reserved",
];

// Legend grouping. The families are how an engineer already thinks about a
// header — what powers it, what switches, what talks, what measures, what to
// leave alone — so grouping the chips this way turns a thirteen-swatch row into
// five short scannable runs.
export const roleFamilies: Array<{ label: string; roles: PinRole[] }> = [
  { label: "Rails", roles: ["power", "ground"] },
  { label: "Digital", roles: ["gpio", "pwm"] },
  { label: "Buses", roles: ["i2c", "spi", "uart"] },
  { label: "Analog", roles: ["adc", "dac"] },
  { label: "Flagged", roles: ["debug", "system", "special", "reserved"] },
];

/** How many pins carry each role, for the legend's per-chip counts. */
export function countRoles(pins: Array<{ role: PinRole }>): Map<PinRole, number> {
  const counts = new Map<PinRole, number>();
  for (const pin of pins) {
    counts.set(pin.role, (counts.get(pin.role) ?? 0) + 1);
  }
  return counts;
}

/** Inline style for an HTML role chip, driven by the same palette as the pads. */
export function roleChipStyle(role: PinRole): CSSProperties {
  const color = roleColors[role];
  return {
    color: color.ink,
    backgroundColor: color.wash,
    borderColor: color.edge,
  };
}

// Builds the spoken/AT label for a pin, e.g.
// "Pin 3, GPIO2, I2C, aliases SDA1" (the pin's note, when present, is appended).
export function pinAccessibleLabel(pin: {
  position: number;
  label: string;
  role: PinRole;
  aliases?: string[];
  note?: string;
}): string {
  const parts = [
    `Pin ${pin.position}`,
    pin.label,
    roleLabels[pin.role],
  ];
  if (pin.aliases?.length) {
    parts.push(`aliases ${pin.aliases.join(", ")}`);
  }
  if (pin.note) {
    parts.push(pin.note);
  }
  return parts.join(", ");
}
