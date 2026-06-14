import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";

/* ---------------------------------------------------------------------------
   CircuitBackground
   A fixed, behind-content decorative layer: a faint PCB grid, slow drifting
   colour glows, travelling trace pulses, and a scattering of hairline board
   silhouettes (Raspberry Pi 4, STM32H7 Nucleo, Arduino Uno, ESP32 DevKit,
   Pico/RP2040, micro:bit, BeagleBone). Each board keeps just enough of its
   signature shape — GPIO headers, a metal-can antenna, an edge connector,
   silkscreen part numbers — to be told apart up close, while staying low
   contrast so the catalog reads first.

   Everything here is aria-hidden + pointer-events:none and animation is gated
   behind prefers-reduced-motion (see globals.css).
   --------------------------------------------------------------------------- */

// Tiny silkscreen-style part label.
function Silk({
  x,
  y,
  size,
  children,
  opacity = 0.5,
  anchor = "middle",
}: {
  x: number;
  y: number;
  size: number;
  children: ReactNode;
  opacity?: number;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fill="currentColor"
      fillOpacity={opacity}
      textAnchor={anchor}
      style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}
    >
      {children}
    </text>
  );
}

// A horizontal run of header pins (filled so they scale with the board).
function HRow({
  x,
  y,
  count,
  pitch,
  w = 2.4,
  h = 2.4,
  opacity = 0.5,
}: {
  x: number;
  y: number;
  count: number;
  pitch: number;
  w?: number;
  h?: number;
  opacity?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <rect
          key={i}
          x={x + i * pitch}
          y={y}
          width={w}
          height={h}
          rx={0.4}
          fill="currentColor"
          fillOpacity={opacity}
        />
      ))}
    </>
  );
}

// A vertical run of header pins.
function VRow({
  x,
  y,
  count,
  pitch,
  w = 2.4,
  h = 2.4,
  opacity = 0.5,
}: {
  x: number;
  y: number;
  count: number;
  pitch: number;
  w?: number;
  h?: number;
  opacity?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <rect
          key={i}
          x={x}
          y={y + i * pitch}
          width={w}
          height={h}
          rx={0.4}
          fill="currentColor"
          fillOpacity={opacity}
        />
      ))}
    </>
  );
}

// QFP/DIP lead ticks along an edge.
function Leads({
  x,
  y,
  count,
  pitch,
  vertical,
  length = 2.4,
}: {
  x: number;
  y: number;
  count: number;
  pitch: number;
  vertical?: boolean;
  length?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) =>
        vertical ? (
          <line
            key={i}
            x1={x}
            y1={y + i * pitch}
            x2={x + length}
            y2={y + i * pitch}
            stroke="currentColor"
            strokeOpacity={0.45}
            strokeWidth={0.9}
          />
        ) : (
          <line
            key={i}
            x1={x + i * pitch}
            y1={y}
            x2={x + i * pitch}
            y2={y + length}
            stroke="currentColor"
            strokeOpacity={0.45}
            strokeWidth={0.9}
          />
        ),
      )}
    </>
  );
}

const board = {
  fill: "currentColor",
  fillOpacity: 0.05,
  stroke: "currentColor",
  strokeOpacity: 0.85,
  strokeWidth: 1,
} as const;

const chip = {
  fill: "currentColor",
  fillOpacity: 0.1,
  stroke: "currentColor",
  strokeOpacity: 0.7,
  strokeWidth: 0.9,
} as const;

const connector = {
  fill: "none",
  stroke: "currentColor",
  strokeOpacity: 0.6,
  strokeWidth: 0.9,
} as const;

type GlyphProps = { width: number | string };

function svgStyle(width: number | string): CSSProperties {
  return { width, height: "auto", display: "block" };
}

// ---- Raspberry Pi 4 -------------------------------------------------------
// Signature: 40-pin GPIO header, the USB/Ethernet port stack on the right,
// central BCM2711 SoC.
function RaspberryPi4({ width }: GlyphProps) {
  return (
    <svg viewBox="0 0 158 100" fill="none" style={svgStyle(width)} aria-hidden>
      <rect x={2} y={2} width={148} height={96} rx={7} {...board} />
      {[
        [12, 12],
        [140, 12],
        [12, 88],
        [140, 88],
      ].map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={3.4}
          {...connector}
        />
      ))}
      {/* 40-pin GPIO header */}
      <rect x={37} y={8} width={96} height={14} rx={1.5} {...connector} strokeOpacity={0.35} />
      <HRow x={40} y={10} count={20} pitch={4.6} w={2.4} h={2.4} />
      <HRow x={40} y={16} count={20} pitch={4.6} w={2.4} h={2.4} />
      {/* USB + Ethernet stack (overhangs the right edge) */}
      <rect x={149} y={28} width={9} height={16} {...connector} />
      <rect x={149} y={48} width={9} height={13} {...connector} />
      <rect x={149} y={64} width={9} height={13} {...connector} />
      {/* USB-C power + micro-HDMI along the bottom edge */}
      <rect x={40} y={95} width={7} height={5} {...connector} />
      <rect x={52} y={95} width={9} height={5} {...connector} />
      <rect x={66} y={95} width={9} height={5} {...connector} />
      {/* SoC + RAM */}
      <rect x={62} y={42} width={28} height={28} rx={2} {...chip} />
      <Silk x={76} y={58} size={6}>
        BCM2711
      </Silk>
      <rect x={62} y={74} width={22} height={9} rx={1} {...chip} />
      <Silk x={75} y={91} size={5.4} opacity={0.45}>
        Raspberry Pi 4
      </Silk>
    </svg>
  );
}

// ---- STM32H7 Nucleo -------------------------------------------------------
// Signature: detachable ST-LINK header, big central LQFP, Morpho/Arduino
// pin rows down the long edges.
function STM32Nucleo({ width }: GlyphProps) {
  return (
    <svg viewBox="0 0 140 100" fill="none" style={svgStyle(width)} aria-hidden>
      <rect x={2} y={2} width={136} height={96} rx={6} {...board} />
      {/* ST-LINK section + detach break line */}
      <rect x={58} y={1} width={16} height={6} {...connector} />
      <rect x={18} y={10} width={16} height={10} rx={1} {...chip} />
      <Silk x={26} y={18} size={4} opacity={0.5}>
        ST-LINK
      </Silk>
      <line
        x1={8}
        y1={28}
        x2={132}
        y2={28}
        stroke="currentColor"
        strokeOpacity={0.4}
        strokeWidth={0.8}
        strokeDasharray="3 3"
      />
      {/* Central LQFP with leads on all four sides */}
      <rect x={52} y={42} width={36} height={36} rx={1.5} {...chip} />
      <Leads x={56} y={39} count={10} pitch={3} />
      <Leads x={56} y={78} count={10} pitch={3} />
      <Leads x={49} y={46} count={10} pitch={3} vertical />
      <Leads x={88} y={46} count={10} pitch={3} vertical />
      <Silk x={70} y={62} size={6}>
        STM32H7
      </Silk>
      {/* Morpho + Arduino headers down both long edges */}
      <VRow x={8} y={34} count={16} pitch={3.4} />
      <VRow x={13} y={34} count={16} pitch={3.4} />
      <VRow x={124} y={34} count={16} pitch={3.4} />
      <VRow x={129} y={34} count={16} pitch={3.4} />
      {/* User + reset buttons */}
      <rect x={22} y={82} width={8} height={8} rx={1} {...connector} />
      <rect x={110} y={82} width={8} height={8} rx={1} {...connector} />
      <Silk x={70} y={93} size={4.6} opacity={0.45}>
        NUCLEO-H743
      </Silk>
    </svg>
  );
}

// ---- Arduino Uno ----------------------------------------------------------
// Signature: USB-B + barrel jack on the left, female header rows, the DIP
// ATmega328P.
function ArduinoUno({ width }: GlyphProps) {
  return (
    <svg viewBox="0 0 132 100" fill="none" style={svgStyle(width)} aria-hidden>
      <rect x={4} y={4} width={124} height={92} rx={4} {...board} />
      {/* USB-B + barrel jack */}
      <rect x={1} y={14} width={15} height={18} rx={1} {...connector} />
      <rect x={1} y={60} width={16} height={16} rx={3} {...connector} />
      {/* Female header rows (digital + analog/power) */}
      <HRow x={28} y={11} count={18} pitch={5} w={2} h={3} opacity={0.42} />
      <HRow x={30} y={84} count={16} pitch={5} w={2} h={3} opacity={0.42} />
      {/* ATmega328P DIP */}
      <rect x={42} y={44} width={52} height={20} rx={2} {...chip} />
      <circle cx={47} cy={54} r={2} {...connector} />
      <Leads x={45} y={42} count={14} pitch={3.4} />
      <Leads x={45} y={64} count={14} pitch={3.4} />
      <Silk x={70} y={56} size={5}>
        ATmega328P
      </Silk>
      {/* 16 MHz crystal */}
      <rect x={98} y={46} width={11} height={6} rx={2.5} {...connector} />
      <Silk x={100} y={30} size={6} opacity={0.5} anchor="start">
        UNO
      </Silk>
    </svg>
  );
}

// ---- ESP32 DevKit ---------------------------------------------------------
// Signature: ESP32-WROOM metal can with a meander PCB antenna, pin rows down
// both edges, micro-USB at the bottom.
function ESP32Devkit({ width }: GlyphProps) {
  return (
    <svg viewBox="0 0 56 120" fill="none" style={svgStyle(width)} aria-hidden>
      <rect x={4} y={4} width={48} height={112} rx={4} {...board} />
      {/* Meander PCB antenna */}
      <polyline
        points="13,20 13,9 17,9 17,16 21,16 21,9 25,9 25,16 29,16 29,9 33,9 33,16 37,16 37,9 43,9 43,20"
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.6}
        strokeWidth={0.9}
      />
      {/* Shielded module */}
      <rect x={10} y={22} width={36} height={42} rx={2} {...chip} />
      <Silk x={28} y={46} size={6}>
        ESP32
      </Silk>
      {/* EN / BOOT buttons */}
      <rect x={9} y={70} width={8} height={5} rx={1} {...connector} />
      <rect x={39} y={70} width={8} height={5} rx={1} {...connector} />
      {/* Pin rows */}
      <VRow x={5} y={26} count={16} pitch={5.4} w={3} h={2} />
      <VRow x={48} y={26} count={16} pitch={5.4} w={3} h={2} />
      {/* micro-USB */}
      <rect x={20} y={114} width={16} height={6} rx={1} {...connector} />
    </svg>
  );
}

// ---- Raspberry Pi Pico / RP2040 ------------------------------------------
// Signature: castellated edges, central RP2040, micro-USB at the top.
function Pico({ width }: GlyphProps) {
  return (
    <svg viewBox="0 0 46 104" fill="none" style={svgStyle(width)} aria-hidden>
      <rect x={4} y={6} width={38} height={92} rx={6} {...board} />
      {/* micro-USB */}
      <rect x={15} y={1} width={16} height={7} rx={1.5} {...connector} />
      {/* Castellated pads */}
      <VRow x={3} y={14} count={20} pitch={4.1} w={3} h={2} opacity={0.42} />
      <VRow x={40} y={14} count={20} pitch={4.1} w={3} h={2} opacity={0.42} />
      {/* BOOTSEL */}
      <rect x={16} y={24} width={14} height={7} rx={1.5} {...connector} />
      {/* RP2040 + flash */}
      <rect x={14} y={44} width={18} height={18} rx={2} {...chip} />
      <Silk x={23} y={55} size={4.6}>
        RP2040
      </Silk>
      <rect x={16} y={66} width={14} height={7} rx={1} {...chip} />
      <Silk x={23} y={92} size={5} opacity={0.45}>
        PICO
      </Silk>
    </svg>
  );
}

// ---- BBC micro:bit --------------------------------------------------------
// Signature: 5x5 LED matrix, A/B buttons, the gold edge connector.
function MicroBit({ width }: GlyphProps) {
  const leds: ReactNode[] = [];
  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      leds.push(
        <rect
          key={`${r}-${c}`}
          x={43 + c * 9}
          y={20 + r * 8}
          width={4}
          height={6}
          rx={0.6}
          fill="currentColor"
          fillOpacity={0.5}
        />,
      );
    }
  }
  return (
    <svg viewBox="0 0 126 108" fill="none" style={svgStyle(width)} aria-hidden>
      <rect x={3} y={3} width={120} height={78} rx={9} {...board} />
      <Silk x={63} y={13} size={6.5} opacity={0.55}>
        micro:bit
      </Silk>
      {leds}
      {/* A / B buttons */}
      <circle cx={20} cy={44} r={7} {...connector} />
      <circle cx={106} cy={44} r={7} {...connector} />
      <Silk x={20} y={46.5} size={6}>
        A
      </Silk>
      <Silk x={106} y={46.5} size={6}>
        B
      </Silk>
      {/* nRF52 */}
      <rect x={54} y={62} width={18} height={12} rx={1.5} {...chip} />
      <Silk x={63} y={70} size={4}>
        nRF52
      </Silk>
      {/* Gold edge connector */}
      {[
        [12, "0"],
        [38, "1"],
        [64, "2"],
        [88, "3V"],
        [108, "GND"],
      ].map(([x, label]) => (
        <g key={String(label)}>
          <rect
            x={Number(x)}
            y={82}
            width={14}
            height={24}
            rx={1}
            {...connector}
            strokeOpacity={0.5}
          />
          <circle cx={Number(x) + 7} cy={99} r={3.4} {...connector} />
          <Silk x={Number(x) + 7} y={90} size={4.4} opacity={0.5}>
            {label}
          </Silk>
        </g>
      ))}
      <HRow x={28} y={104} count={18} pitch={4.2} w={1.6} h={2} opacity={0.4} />
    </svg>
  );
}

// ---- BeagleBone -----------------------------------------------------------
// Signature: the twin 46-pin P8/P9 headers down both long edges, RJ45 +
// USB-A, central AM3358.
function BeagleBone({ width }: GlyphProps) {
  return (
    <svg viewBox="0 0 152 100" fill="none" style={svgStyle(width)} aria-hidden>
      <rect x={2} y={2} width={148} height={96} rx={4} {...board} />
      {/* Twin long headers */}
      <HRow x={18} y={9} count={23} pitch={5.2} />
      <HRow x={18} y={13.5} count={23} pitch={5.2} />
      <HRow x={18} y={84} count={23} pitch={5.2} />
      <HRow x={18} y={88.5} count={23} pitch={5.2} />
      {/* RJ45 Ethernet + USB-A host */}
      <rect x={1} y={26} width={15} height={20} rx={1} {...connector} />
      <rect x={136} y={56} width={15} height={14} rx={1} {...connector} />
      {/* microSD */}
      <rect x={20} y={50} width={16} height={9} rx={1} {...connector} />
      {/* AM3358 SoC */}
      <rect x={66} y={42} width={24} height={24} rx={2} {...chip} />
      <Silk x={78} y={56} size={5}>
        AM3358
      </Silk>
      <Silk x={78} y={76} size={4.6} opacity={0.45}>
        BeagleBone
      </Silk>
    </svg>
  );
}

// A self-contained PCB bus: signals leave an origin connector pad, route
// orthogonally through vias, and a bright "packet" comet travels the full
// length and lands on the destination pad — so every trace clearly goes
// somewhere. pathLength={100} normalises the dash so all comets move at the
// same apparent speed regardless of how long the trace is.
type Trace = {
  d: string;
  from: [number, number];
  to: [number, number];
  vias?: [number, number][];
  delay?: number;
};

function TraceCluster({
  traces,
  bus,
  className,
  style,
}: {
  traces: Trace[];
  bus?: { x: number; y: number; w: number; h: number };
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      className={clsx("absolute", className)}
      style={style}
      aria-hidden
    >
      {/* Origin connector / bus bar that the traces fan out from. */}
      {bus ? (
        <rect
          x={bus.x}
          y={bus.y}
          width={bus.w}
          height={bus.h}
          rx={2}
          fill="currentColor"
          fillOpacity={0.07}
          stroke="currentColor"
          strokeOpacity={0.4}
          strokeWidth={1}
        />
      ) : null}

      {traces.map(({ d, from, to, vias, delay = 0 }, i) => (
        <g key={i}>
          {/* Static copper trace. */}
          <path
            d={d}
            stroke="currentColor"
            strokeOpacity={0.28}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Soft halo behind the travelling packet. */}
          <path
            d={d}
            pathLength={100}
            stroke="currentColor"
            strokeOpacity={0.22}
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="14 150"
            className="pinhub-trace"
            style={{ animationDelay: `${delay}s` }}
          />
          {/* Bright packet that runs origin -> destination, then pauses. */}
          <path
            d={d}
            pathLength={100}
            stroke="currentColor"
            strokeOpacity={0.9}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="14 150"
            className="pinhub-trace"
            style={{ animationDelay: `${delay}s` }}
          />
          {/* Vias where the trace changes layer/direction. */}
          {vias?.map(([cx, cy], v) => (
            <circle
              key={v}
              cx={cx}
              cy={cy}
              r={2}
              stroke="currentColor"
              strokeOpacity={0.32}
              strokeWidth={1}
            />
          ))}
          {/* Origin solder pad. */}
          <circle cx={from[0]} cy={from[1]} r={2.4} fill="currentColor" fillOpacity={0.6} />
          {/* Destination pad: ring + drilled centre, the packet's landing point. */}
          <circle cx={to[0]} cy={to[1]} r={3} stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.1} />
          <circle cx={to[0]} cy={to[1]} r={1.2} fill="currentColor" fillOpacity={0.6} />
        </g>
      ))}
    </svg>
  );
}

type Placement = {
  key: string;
  Glyph: (props: GlyphProps) => ReactNode;
  color: string;
  width: string;
  pos: CSSProperties;
  rest: number;
  tilt: number;
  variant?: "pinhub-float-b" | "pinhub-float-c";
  duration: number;
  delay: number;
};

// Cool, low-saturation hues — distinct enough to read as different boards
// without turning the backdrop into confetti.
const placements: Placement[] = [
  {
    key: "pi4",
    Glyph: RaspberryPi4,
    color: "#34d399",
    width: "clamp(210px, 22vw, 340px)",
    pos: { top: "6%", right: "-4%" },
    rest: 0.42,
    tilt: -6,
    duration: 30,
    delay: 0,
  },
  {
    key: "stm32",
    Glyph: STM32Nucleo,
    color: "#38bdf8",
    width: "clamp(190px, 20vw, 310px)",
    pos: { top: "29%", left: "-5%" },
    rest: 0.42,
    tilt: 7,
    variant: "pinhub-float-b",
    duration: 34,
    delay: 2,
  },
  {
    key: "microbit",
    Glyph: MicroBit,
    color: "#fbbf24",
    width: "clamp(140px, 14vw, 220px)",
    pos: { top: "6%", left: "3%" },
    rest: 0.36,
    tilt: 5,
    variant: "pinhub-float-c",
    duration: 28,
    delay: 1.2,
  },
  {
    key: "arduino",
    Glyph: ArduinoUno,
    color: "#2dd4bf",
    width: "clamp(160px, 17vw, 270px)",
    pos: { bottom: "5%", left: "1%" },
    rest: 0.42,
    tilt: -5,
    variant: "pinhub-float-c",
    duration: 32,
    delay: 0.6,
  },
  {
    key: "esp32",
    Glyph: ESP32Devkit,
    color: "#a5b4fc",
    width: "clamp(82px, 8vw, 132px)",
    pos: { top: "40%", right: "2.5%" },
    rest: 0.42,
    tilt: 9,
    variant: "pinhub-float-b",
    duration: 26,
    delay: 1.8,
  },
  {
    key: "beaglebone",
    Glyph: BeagleBone,
    color: "#94a3b8",
    width: "clamp(180px, 18vw, 300px)",
    // Pulled out of the opaque right detail panel into the lower-centre dead
    // zone so it actually reads (and survives narrow widths where the right
    // gutter collapses).
    pos: { bottom: "6%", left: "26%" },
    rest: 0.4,
    tilt: -4,
    duration: 38,
    delay: 0.3,
  },
  {
    key: "pico",
    Glyph: Pico,
    color: "#5eead4",
    width: "clamp(64px, 6.5vw, 108px)",
    pos: { top: "60%", left: "0.5%" },
    rest: 0.4,
    tilt: -12,
    variant: "pinhub-float-b",
    duration: 24,
    delay: 2.4,
  },
  {
    key: "stm32-2",
    Glyph: STM32Nucleo,
    color: "#7dd3fc",
    width: "clamp(78px, 8vw, 136px)",
    pos: { top: "1%", left: "45%" },
    rest: 0.24,
    tilt: 14,
    variant: "pinhub-float-c",
    duration: 36,
    delay: 1,
  },
];

// Keep the gutters fully lively but ease the silhouettes back across the
// central results column so dense text never fights a board outline.
const centerDimMask =
  "linear-gradient(to right, #000 0%, #000 12%, rgba(0,0,0,0.3) 32%, rgba(0,0,0,0.3) 68%, #000 88%, #000 100%)";

export function CircuitBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-[0.55] sm:opacity-80 lg:opacity-100"
      aria-hidden
    >
      {/* Faint PCB grid */}
      <div className="absolute inset-0 pinhub-grid" />

      {/* Drifting colour glows for depth */}
      <div
        className="pinhub-glow absolute -left-[10%] -top-[15%] size-[55vw] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.16), transparent 65%)",
        }}
      />
      <div
        className="pinhub-glow absolute -right-[12%] top-[32%] size-[52vw] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.13), transparent 65%)",
          animationDelay: "6s",
        }}
      />
      <div
        className="pinhub-glow absolute bottom-[-15%] left-[22%] size-[48vw] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(251,191,36,0.10), transparent 65%)",
          animationDelay: "12s",
        }}
      />

      {/* Traces + board silhouettes, gently dimmed across the middle so the
          dense results column stays readable while the edges stay lively. */}
      <div
        className="absolute inset-0"
        style={{
          WebkitMaskImage: centerDimMask,
          maskImage: centerDimMask,
        }}
      >
        {/* Travelling PCB buses in the gutters: each packet leaves the bus bar
            on the left and lands on a destination pad on the right. */}
        <TraceCluster
          className="left-[2%] top-[19%] w-[clamp(200px,24vw,420px)] text-cyan-300"
          bus={{ x: 4, y: 28, w: 8, h: 92 }}
          traces={[
            { d: "M12 38 H58 V64 H116 V52 H184", from: [12, 38], to: [184, 52], vias: [[58, 64], [116, 52]], delay: 0 },
            { d: "M12 74 H38 V108 H96 V100 H184", from: [12, 74], to: [184, 100], vias: [[38, 108], [96, 100]], delay: 1.1 },
            { d: "M12 110 H30 V150 H84 V140 H184", from: [12, 110], to: [184, 140], vias: [[30, 150], [84, 140]], delay: 2.2 },
          ]}
        />
        <TraceCluster
          className="bottom-[11%] right-[1%] w-[clamp(200px,24vw,420px)] text-emerald-300"
          bus={{ x: 188, y: 30, w: 8, h: 122 }}
          traces={[
            { d: "M188 42 H128 V72 H66 V60 H16", from: [188, 42], to: [16, 60], vias: [[128, 72], [66, 60]], delay: 0.6 },
            { d: "M188 92 H150 V128 H86 V116 H16", from: [188, 92], to: [16, 116], vias: [[150, 128], [86, 116]], delay: 1.7 },
            { d: "M188 142 H118 V168 H58", from: [188, 142], to: [58, 168], vias: [[118, 168]], delay: 2.8 },
          ]}
        />

        {/* Board silhouettes */}
        {placements.map(({ key, Glyph, color, width, pos, rest, tilt, variant, duration, delay }) => (
          <div
            key={key}
            className="pinhub-rise absolute"
            style={{ ...pos, "--rest-opacity": rest } as CSSProperties}
          >
            <div
              className={clsx("pinhub-float", variant)}
              style={
                {
                  color,
                  width,
                  "--tilt": `${tilt}deg`,
                  animationDuration: `${duration}s`,
                  animationDelay: `${delay}s`,
                  // Faint same-colour halo lifts the hairline silhouette off
                  // the PCB grid so it reads as a board, not stray lines.
                  filter: "drop-shadow(0 0 7px currentColor)",
                } as CSSProperties
              }
            >
              <Glyph width="100%" />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom fade so the footer stays legible */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0b0c0f] to-transparent" />
    </div>
  );
}
