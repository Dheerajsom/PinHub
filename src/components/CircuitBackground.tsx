import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";

/* ---------------------------------------------------------------------------
   CircuitBackground
   A fixed, behind-content decorative layer: a faint PCB grid, slow drifting
   colour glows, and a balanced scatter of hairline board silhouettes
   (Raspberry Pi 4, NVIDIA Jetson Nano, STM32 Nucleo, Arduino Uno, ESP32
   DevKit, BBC micro:bit, Teensy, Pico/RP2040). Each board keeps just enough of
   its signature shape — GPIO headers, a finned heatsink, a metal-can antenna,
   an LED matrix, silkscreen part numbers — to be told apart up close, while
   staying low contrast so the catalog reads first. Boards are kept inside the
   frame so nothing clips at the edges, fade hard across the dense centre
   column, and scale down to subtle corner accents on phones.

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

// ---- Arduino Uno ----------------------------------------------------------
// Signature: USB-B + barrel jack overhanging the left edge, the ATmega328P
// DIP, digital + power/analog header rows along the long edges.
function ArduinoUno({ width }: GlyphProps) {
  return (
    <svg viewBox="0 0 168 132" fill="none" style={svgStyle(width)} aria-hidden>
      <rect x={4} y={4} width={160} height={124} rx={8} {...board} />
      {[
        [14, 14],
        [156, 16],
        [14, 118],
        [156, 118],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3.2} {...connector} />
      ))}
      {/* USB-B + barrel jack overhanging the left edge */}
      <rect x={1} y={22} width={17} height={24} rx={1.5} {...connector} />
      <rect x={1} y={92} width={17} height={22} rx={2} {...connector} />
      <circle cx={9.5} cy={103} r={5} {...connector} />
      {/* Reset + ICSP */}
      <rect x={40} y={9} width={9} height={9} rx={1.5} {...connector} />
      <rect x={132} y={70} width={10} height={16} rx={1} {...connector} strokeOpacity={0.4} />
      {/* Digital header (top) + power/analog header (bottom) */}
      <rect x={48} y={8} width={104} height={11} rx={1.5} {...connector} strokeOpacity={0.32} />
      <HRow x={52} y={10} count={10} pitch={5.2} w={2.6} h={2.6} />
      <HRow x={108} y={10} count={8} pitch={5.2} w={2.6} h={2.6} />
      <HRow x={40} y={120} count={8} pitch={5.2} w={2.6} h={2.6} />
      <HRow x={100} y={120} count={6} pitch={5.2} w={2.6} h={2.6} />
      {/* ATmega328P DIP + crystal */}
      <rect x={62} y={66} width={50} height={32} rx={2} {...chip} />
      <Leads x={59} y={70} count={12} pitch={2.4} vertical />
      <Leads x={112} y={70} count={12} pitch={2.4} vertical />
      <Silk x={87} y={84} size={6}>
        ATMEGA328P
      </Silk>
      <rect x={44} y={74} width={12} height={8} rx={4} {...chip} />
      <Silk x={84} y={111} size={6} opacity={0.5}>
        ARDUINO UNO
      </Silk>
    </svg>
  );
}

// ---- BBC micro:bit V2 -----------------------------------------------------
// Signature: 5x5 LED matrix, A/B buttons, the gold edge connector with its
// five large notched pads (P0, P1, P2, 3V, GND) plus the fine 0.1" pads.
function Microbit({ width }: GlyphProps) {
  return (
    <svg viewBox="0 0 150 124" fill="none" style={svgStyle(width)} aria-hidden>
      <rect x={4} y={4} width={142} height={88} rx={11} {...board} />
      <Silk x={75} y={17} size={7}>
        micro:bit
      </Silk>
      {/* A / B buttons */}
      <circle cx={19} cy={50} r={6.5} {...connector} />
      <circle cx={131} cy={50} r={6.5} {...connector} />
      {/* 5x5 LED matrix */}
      {Array.from({ length: 5 }, (_, r) =>
        Array.from({ length: 5 }, (_, c) => (
          <rect
            key={`led-${r}-${c}`}
            x={51 + c * 11.4}
            y={26 + r * 11.4}
            width={3.2}
            height={3.2}
            rx={0.8}
            fill="currentColor"
            fillOpacity={0.55}
          />
        )),
      )}
      {/* Fine edge pads + five large notched pads */}
      <HRow x={12} y={94} count={42} pitch={3.1} w={1} h={4} opacity={0.3} />
      {Array.from({ length: 5 }, (_, i) => (
        <rect
          key={`pad-${i}`}
          x={11 + i * 28.4}
          y={100}
          width={17}
          height={20}
          rx={1.5}
          {...connector}
        />
      ))}
    </svg>
  );
}

// ---- NVIDIA Jetson Nano Dev Kit -------------------------------------------
// Signature: the big finned heatsink dominating the carrier, the 40-pin GPIO
// header, and the port stack overhanging the right edge.
function JetsonNano({ width }: GlyphProps) {
  return (
    <svg viewBox="0 0 152 120" fill="none" style={svgStyle(width)} aria-hidden>
      <rect x={4} y={4} width={144} height={112} rx={6} {...board} />
      {/* 40-pin GPIO header */}
      <rect x={40} y={8} width={92} height={12} rx={1.5} {...connector} strokeOpacity={0.32} />
      <HRow x={43} y={9} count={20} pitch={4.4} w={2.2} h={2.2} />
      <HRow x={43} y={14} count={20} pitch={4.4} w={2.2} h={2.2} />
      {/* Finned heatsink */}
      <rect x={46} y={40} width={60} height={62} rx={2} {...chip} />
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={`fin-${i}`}
          x1={50}
          y1={46 + i * 7}
          x2={102}
          y2={46 + i * 7}
          stroke="currentColor"
          strokeOpacity={0.45}
          strokeWidth={0.8}
        />
      ))}
      {/* Port stack overhanging the right edge */}
      <rect x={132} y={32} width={17} height={16} {...connector} />
      <rect x={132} y={52} width={17} height={14} {...connector} />
      <rect x={132} y={70} width={17} height={14} {...connector} />
      <rect x={132} y={88} width={17} height={11} {...connector} />
      {/* microSD on the left edge */}
      <rect x={1} y={52} width={12} height={16} rx={1} {...connector} />
      <Silk x={76} y={111} size={6} opacity={0.5}>
        JETSON NANO
      </Silk>
    </svg>
  );
}

// ---- Teensy 4.1 -----------------------------------------------------------
// Signature: a long, narrow board with USB at the top, dense pin rows down
// both edges, the IMXRT MCU, and the SD-card slot at the bottom.
function Teensy({ width }: GlyphProps) {
  return (
    <svg viewBox="0 0 46 132" fill="none" style={svgStyle(width)} aria-hidden>
      <rect x={4} y={6} width={38} height={120} rx={4} {...board} />
      {/* USB-C at the top */}
      <rect x={13} y={1} width={20} height={8} rx={1.5} {...connector} />
      {/* Pin rows down both long edges */}
      <VRow x={5} y={14} count={24} pitch={4.5} w={3} h={2} opacity={0.45} />
      <VRow x={38} y={14} count={24} pitch={4.5} w={3} h={2} opacity={0.45} />
      {/* IMXRT MCU */}
      <rect x={14} y={40} width={18} height={18} rx={2} {...chip} />
      <Silk x={23} y={51} size={4.4}>
        IMXRT
      </Silk>
      {/* SD-card slot */}
      <rect x={13} y={100} width={20} height={11} rx={1} {...chip} />
      <Silk x={23} y={92} size={4.6} opacity={0.5}>
        TEENSY
      </Silk>
    </svg>
  );
}

// A single engineering-drawing dimension line — witness ticks, arrowheads, and
// a centred measurement — drawn beneath the hero board for an authentic
// blueprint touch. It spans 100% of the board width so it stays aligned at any
// size.
function DimensionLine({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 200 22"
      width="100%"
      style={{ display: "block", height: "auto", marginTop: "2%" }}
      aria-hidden
    >
      {/* witness (extension) lines */}
      <line x1={3} y1={1} x2={3} y2={15} stroke="currentColor" strokeOpacity={0.9} strokeWidth={0.9} />
      <line x1={197} y1={1} x2={197} y2={15} stroke="currentColor" strokeOpacity={0.9} strokeWidth={0.9} />
      {/* dimension line, broken either side of the label */}
      <line x1={3} y1={9} x2={84} y2={9} stroke="currentColor" strokeOpacity={0.9} strokeWidth={0.9} />
      <line x1={116} y1={9} x2={197} y2={9} stroke="currentColor" strokeOpacity={0.9} strokeWidth={0.9} />
      {/* arrowheads */}
      <path d="M3 9 L11 6.4 L11 11.6 Z" fill="currentColor" fillOpacity={0.9} />
      <path d="M197 9 L189 6.4 L189 11.6 Z" fill="currentColor" fillOpacity={0.9} />
      <text
        x={100}
        y={12}
        fontSize={9}
        textAnchor="middle"
        fill="currentColor"
        fillOpacity={1}
        style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
      >
        {label}
      </text>
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
  // Depth tier: blur + cast shadow that places the board near (sharp, lit) or
  // far (soft, receding) for a cinematic sense of depth.
  filter: string;
  // Supporting boards are desktop-only; phones keep just the hero.
  hideOnMobile?: boolean;
  // The hero board carries a single dimension-line callout.
  annotation?: { label: string };
};

// One cohesive cyanotype-blue ink, separated by depth and opacity rather than
// by hue, so the backdrop reads as a single engineering drawing instead of
// confetti: a bright, sharp hero in the lit lower-left, with quieter, blurred
// supporting boards receding into the corners.
const HERO_FILTER =
  "drop-shadow(0 3px 16px rgba(0,0,0,0.55)) drop-shadow(0 0 12px rgba(170,202,234,0.3))";
const NEAR_FILTER =
  "blur(0.4px) drop-shadow(0 2px 12px rgba(0,0,0,0.5)) drop-shadow(0 0 9px rgba(150,186,224,0.22))";
const MID_FILTER = "blur(0.7px) drop-shadow(0 1px 8px rgba(0,0,0,0.5))";
const FAR_FILTER = "blur(1.2px)";

// A balanced blueprint scatter: two anchored heroes (Raspberry Pi lower-left,
// Jetson lower-right) framed by supporting boards that fill the upper corners
// and side gutters, with a few small, soft accents receding into depth. Every
// board is kept inside the frame so nothing clips awkwardly at the edges, and
// the dense centre column is reserved for one faint, far board only.
const placements: Placement[] = [
  // ---- Left side ----------------------------------------------------------
  {
    key: "pi4",
    Glyph: RaspberryPi4,
    color: "#aecdef",
    // vw-led clamp so the hero scales down to a tasteful corner accent on
    // phones while still reaching full size on desktop.
    width: "clamp(160px, 40vw, 340px)",
    pos: { bottom: "13%", left: "1%" },
    rest: 0.74,
    tilt: -3,
    duration: 46,
    delay: 0,
    filter: HERO_FILTER,
    annotation: { label: "85.0" },
  },
  {
    key: "arduino",
    Glyph: ArduinoUno,
    color: "#8aa6cb",
    width: "clamp(150px, 16vw, 260px)",
    pos: { top: "7%", left: "1.5%" },
    rest: 0.62,
    tilt: -6,
    variant: "pinhub-float-c",
    duration: 54,
    delay: 2,
    filter: NEAR_FILTER,
    hideOnMobile: true,
  },
  {
    key: "microbit",
    Glyph: Microbit,
    color: "#7790b2",
    width: "clamp(104px, 11vw, 158px)",
    pos: { top: "45%", left: "8%" },
    rest: 0.5,
    tilt: 6,
    variant: "pinhub-float-b",
    duration: 60,
    delay: 5,
    filter: MID_FILTER,
    hideOnMobile: true,
  },
  // ---- Right side ---------------------------------------------------------
  {
    key: "jetson",
    Glyph: JetsonNano,
    color: "#a3c0e3",
    width: "clamp(196px, 21vw, 320px)",
    pos: { bottom: "15%", right: "1%" },
    rest: 0.66,
    tilt: -5,
    variant: "pinhub-float-b",
    duration: 50,
    delay: 1.2,
    filter: NEAR_FILTER,
    // Desktop-only: on phones the top-right Nucleo frames this corner instead,
    // so the two bottom heroes never collide on a narrow screen.
    hideOnMobile: true,
  },
  {
    key: "stm32",
    Glyph: STM32Nucleo,
    color: "#88a0bf",
    width: "clamp(150px, 30vw, 286px)",
    pos: { top: "6%", right: "1.5%" },
    rest: 0.6,
    tilt: 7,
    variant: "pinhub-float-c",
    duration: 56,
    delay: 3.5,
    filter: MID_FILTER,
  },
  {
    key: "teensy",
    Glyph: Teensy,
    color: "#7089ab",
    width: "clamp(40px, 4.5vw, 64px)",
    pos: { top: "60%", right: "13%" },
    rest: 0.36,
    tilt: 9,
    duration: 52,
    delay: 6.5,
    filter: FAR_FILTER,
    hideOnMobile: true,
  },
  {
    key: "esp32",
    Glyph: ESP32Devkit,
    color: "#6f86a6",
    width: "clamp(80px, 8vw, 124px)",
    pos: { top: "33%", right: "9%" },
    rest: 0.38,
    tilt: 6,
    variant: "pinhub-float-c",
    duration: 58,
    delay: 4,
    filter: FAR_FILTER,
    hideOnMobile: true,
  },
  // ---- Centre (one faint, far board only) ---------------------------------
  {
    key: "pico",
    Glyph: Pico,
    color: "#6b839f",
    width: "clamp(62px, 6vw, 100px)",
    pos: { bottom: "24%", left: "30%" },
    rest: 0.3,
    tilt: -12,
    variant: "pinhub-float-b",
    duration: 50,
    delay: 4.5,
    filter: FAR_FILTER,
    hideOnMobile: true,
  },
];

// Boards live fully only in the outer gutters and side panels; the dense
// centre results column fades them hard so text never fights an outline.
const centerDimMask =
  "linear-gradient(to right, #000 0%, #000 14%, rgba(0,0,0,0.16) 34%, rgba(0,0,0,0.16) 64%, #000 82%, #000 100%)";

export function CircuitBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-45 sm:opacity-60 lg:opacity-100"
      aria-hidden
    >
      {/* Fine + coarse drafting grid */}
      <div className="absolute inset-0 pinhub-grid" />

      {/* Cool cyanotype wash: a key light under the lower-left Pi hero, a
          softer fill under the lower-right Jetson hero, and a deep navy fog
          receding across the top so the upper corners settle into depth. */}
      <div
        className="pinhub-glow absolute -bottom-[4%] -left-[8%] size-[54vw] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(125,180,224,0.18), transparent 62%)",
        }}
      />
      <div
        className="pinhub-glow absolute -bottom-[6%] -right-[8%] size-[48vw] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(110,162,210,0.13), transparent 62%)",
          animationDelay: "12s",
        }}
      />
      <div
        className="pinhub-glow absolute -top-[14%] left-1/2 size-[60vw] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(40,70,110,0.13), transparent 60%)",
          animationDelay: "8s",
        }}
      />

      {/* Board plates, faded hard across the central results column. */}
      <div
        className="absolute inset-0"
        style={{
          WebkitMaskImage: centerDimMask,
          maskImage: centerDimMask,
        }}
      >
        {placements.map(
          ({
            key,
            Glyph,
            color,
            width,
            pos,
            rest,
            tilt,
            variant,
            duration,
            delay,
            filter,
            hideOnMobile,
            annotation,
          }) => (
            <div
              key={key}
              className={clsx(
                "pinhub-rise absolute",
                hideOnMobile && "hidden lg:block",
              )}
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
                    filter,
                  } as CSSProperties
                }
              >
                <Glyph width="100%" />
                {annotation ? (
                  <div className="hidden lg:block" style={{ color: "#d6ecff" }}>
                    <DimensionLine label={annotation.label} />
                  </div>
                ) : null}
              </div>
            </div>
          ),
        )}
      </div>

      {/* Cinematic vignette: keeps the lit lower band clear for both heroes and
          sinks only the outer edges and corners into depth. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 62%, transparent 0%, transparent 58%, rgba(7,8,11,0.4) 84%, rgba(7,8,11,0.66) 100%)",
        }}
      />

      {/* Bottom fade so the footer stays legible */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0b0c0f] to-transparent" />
    </div>
  );
}
