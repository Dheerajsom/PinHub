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

// Tailwind class strings for HTML chips/badges (legend, popover, table).
export const roleChipStyles: Record<PinRole, string> = {
  power: "border-red-400/50 bg-red-500/15 text-red-100",
  ground: "border-zinc-400/40 bg-zinc-500/20 text-zinc-100",
  gpio: "border-emerald-400/50 bg-emerald-500/15 text-emerald-100",
  i2c: "border-cyan-400/50 bg-cyan-500/15 text-cyan-100",
  spi: "border-amber-400/50 bg-amber-500/15 text-amber-100",
  uart: "border-sky-400/50 bg-sky-500/15 text-sky-100",
  adc: "border-violet-400/50 bg-violet-500/15 text-violet-100",
  dac: "border-rose-400/50 bg-rose-500/15 text-rose-100",
  pwm: "border-fuchsia-400/50 bg-fuchsia-500/15 text-fuchsia-100",
  debug: "border-lime-400/50 bg-lime-500/15 text-lime-100",
  system: "border-orange-400/50 bg-orange-500/15 text-orange-100",
  special: "border-teal-400/50 bg-teal-500/15 text-teal-100",
  reserved: "border-stone-400/50 bg-stone-500/15 text-stone-100",
};

// Solid SVG fill/stroke colors for the pads drawn on the board. These echo the
// chip palette above but as concrete hex so they render identically regardless
// of Tailwind's runtime. `text` is the on-pad number color.
export const roleSvgColors: Record<
  PinRole,
  { fill: string; stroke: string; text: string }
> = {
  power: { fill: "#7f1d2b", stroke: "#fb7185", text: "#fee2e2" },
  ground: { fill: "#3f3f46", stroke: "#a1a1aa", text: "#f4f4f5" },
  gpio: { fill: "#0f5132", stroke: "#34d399", text: "#d1fae5" },
  i2c: { fill: "#0e5566", stroke: "#22d3ee", text: "#cffafe" },
  spi: { fill: "#6b4709", stroke: "#fbbf24", text: "#fef3c7" },
  uart: { fill: "#0c4a6e", stroke: "#38bdf8", text: "#e0f2fe" },
  adc: { fill: "#4c1d95", stroke: "#a78bfa", text: "#ede9fe" },
  dac: { fill: "#7a1733", stroke: "#fb7185", text: "#ffe4e6" },
  pwm: { fill: "#6b1f5e", stroke: "#e879f9", text: "#fae8ff" },
  debug: { fill: "#3f4d09", stroke: "#a3e635", text: "#ecfccb" },
  system: { fill: "#7c2d12", stroke: "#fb923c", text: "#ffedd5" },
  special: { fill: "#115e59", stroke: "#2dd4bf", text: "#ccfbf1" },
  reserved: { fill: "#44403c", stroke: "#a8a29e", text: "#f5f5f4" },
};

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
