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

// A single engineering-drawing dimension line — witness ticks, arrowheads, and
// a centred measurement — drawn beneath the hero board for an authentic
// blueprint touch. It spans 100% of the board width so it stays aligned at any
// size.
function DimensionLine({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 200 22"
      width="100%"
      height="auto"
      style={{ display: "block", marginTop: "2%" }}
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
  "drop-shadow(0 3px 16px rgba(0,0,0,0.55)) drop-shadow(0 0 12px rgba(170,202,234,0.28))";
const MID_FILTER = "blur(0.9px) drop-shadow(0 1px 8px rgba(0,0,0,0.5))";
const FAR_FILTER = "blur(1.6px)";

const placements: Placement[] = [
  {
    key: "pi4",
    Glyph: RaspberryPi4,
    color: "#a9c8e8",
    width: "clamp(200px, 23vw, 360px)",
    pos: { bottom: "18%", left: "-3%" },
    rest: 0.7,
    tilt: -4,
    duration: 46,
    delay: 0,
    filter: HERO_FILTER,
    annotation: { label: "85.0" },
  },
  {
    key: "stm32",
    Glyph: STM32Nucleo,
    color: "#8198b6",
    width: "clamp(190px, 19vw, 300px)",
    pos: { top: "5%", right: "-3%" },
    rest: 0.5,
    tilt: 8,
    variant: "pinhub-float-b",
    duration: 52,
    delay: 3,
    filter: MID_FILTER,
    hideOnMobile: true,
  },
  {
    key: "esp32",
    Glyph: ESP32Devkit,
    color: "#6f86a6",
    width: "clamp(86px, 9vw, 140px)",
    pos: { top: "31%", right: "7%" },
    rest: 0.34,
    tilt: 6,
    variant: "pinhub-float-c",
    duration: 56,
    delay: 6,
    filter: FAR_FILTER,
    hideOnMobile: true,
  },
  {
    key: "pico",
    Glyph: Pico,
    color: "#6f86a6",
    width: "clamp(70px, 7vw, 116px)",
    pos: { top: "27%", left: "-1%" },
    rest: 0.36,
    tilt: -12,
    variant: "pinhub-float-b",
    duration: 50,
    delay: 4.5,
    filter: FAR_FILTER,
    hideOnMobile: true,
  },
];

// Boards live fully only in the outer gutters; the dense centre column fades
// them hard so text never fights an outline.
const centerDimMask =
  "linear-gradient(to right, #000 0%, #000 8%, rgba(0,0,0,0.18) 30%, rgba(0,0,0,0.18) 70%, #000 90%, #000 100%)";

export function CircuitBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-[0.45] sm:opacity-80 lg:opacity-100"
      aria-hidden
    >
      {/* Fine + coarse drafting grid */}
      <div className="absolute inset-0 pinhub-grid" />

      {/* Cool cyanotype wash: a key light pooling under the lower-left hero and
          a deep navy fog receding in the upper-right. */}
      <div
        className="pinhub-glow absolute -bottom-[4%] -left-[8%] size-[56vw] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(125,180,224,0.18), transparent 62%)",
        }}
      />
      <div
        className="pinhub-glow absolute -right-[10%] -top-[12%] size-[50vw] rounded-full blur-3xl"
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

      {/* Cinematic vignette: lifts the lower-left hero, sinks the corners. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 115% at 26% 72%, transparent 0%, transparent 54%, rgba(7,8,11,0.42) 82%, rgba(7,8,11,0.7) 100%)",
        }}
      />

      {/* Bottom fade so the footer stays legible */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0b0c0f] to-transparent" />
    </div>
  );
}
