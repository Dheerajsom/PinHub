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
 * A role is identified by hue, and the hues are the ones this audience already
 * reads off a breakout board: power red, ground grey, GPIO green, I2C cyan,
 * SPI amber, UART blue. Each role gets four steps at the same relative
 * position on its ramp, so thirteen roles read as one system rather than
 * thirteen unrelated colors:
 *
 *   ink   text on a dark ground — the pad number, the chip label
 *   edge  the pad ring and chip border, the role's identity at a glance
 *   fill  the pad body
 *   wash  the chip background
 *
 * Interaction is deliberately *not* in this palette: the probe is cyan and
 * nothing else on the board is, so "what am I touching" never competes with
 * "what is this pin".
 */
export const roleColors: Record<
  PinRole,
  { ink: string; edge: string; fill: string; wash: string }
> = {
  power: { ink: "#fecaca", edge: "#f87171", fill: "#7f1d2b", wash: "#2a1216" },
  ground: { ink: "#e4e4e7", edge: "#a1a1aa", fill: "#3f3f46", wash: "#232327" },
  gpio: { ink: "#a7f3d0", edge: "#34d399", fill: "#0f5132", wash: "#0d2a20" },
  i2c: { ink: "#a5f3fc", edge: "#22d3ee", fill: "#0e5566", wash: "#0a2b33" },
  spi: { ink: "#fde68a", edge: "#fbbf24", fill: "#6b4709", wash: "#2c2109" },
  uart: { ink: "#bae6fd", edge: "#38bdf8", fill: "#0c4a6e", wash: "#0b2436" },
  adc: { ink: "#ddd6fe", edge: "#a78bfa", fill: "#4c1d95", wash: "#211a3c" },
  dac: { ink: "#fecdd3", edge: "#fb7185", fill: "#7a1733", wash: "#2c111c" },
  pwm: { ink: "#f5d0fe", edge: "#e879f9", fill: "#6b1f5e", wash: "#2b1230" },
  debug: { ink: "#d9f99d", edge: "#a3e635", fill: "#3f4d09", wash: "#1d260a" },
  system: { ink: "#fed7aa", edge: "#fb923c", fill: "#7c2d12", wash: "#2c1509" },
  special: { ink: "#99f6e4", edge: "#2dd4bf", fill: "#115e59", wash: "#0a2b2a" },
  reserved: { ink: "#e7e5e4", edge: "#a8a29e", fill: "#44403c", wash: "#26241f" },
};

/** The one interaction color on the board: probe ring, leader line, live label. */
export const PROBE_COLOR = "#22d3ee";

// Legend order: rails first, then the digital and bus roles in the order they
// appear on a datasheet's pin table, then the ones that mean "read the note".
export const roleOrder: PinRole[] = [
  "power",
  "ground",
  "gpio",
  "i2c",
  "spi",
  "uart",
  "adc",
  "dac",
  "pwm",
  "debug",
  "system",
  "special",
  "reserved",
];

/** How many pins carry each role, for the legend's accessible descriptions. */
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
