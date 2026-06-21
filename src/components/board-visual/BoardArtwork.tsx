import { useId } from "react";
import type {
  BoardGeometry,
  PortMark,
  Rect,
} from "@/lib/board-visual-geometry";

// A detailed, technically-recognizable PCB illustration rendered from pure SVG
// geometry: soldermask substrate with edge bevel and sheen, copper routing and
// ground-fill vias, a populated component side (main IC, RF can, crystal,
// regulator, decoupling caps, resistors, LEDs), metal connector shells, and a
// black-plastic header with per-pin sockets aligned to the interactive pads.
//
// Everything here is decorative and hidden from assistive technology — the
// pins are read through the overlay and the synchronized table.
export function BoardArtwork({ geometry }: { geometry: BoardGeometry }) {
  const raw = useId();
  const uid = raw.replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `${name}-${uid}`;

  const { body, accent, headerZones, ports, holes, anchors } = geometry;
  const free = freeRect(geometry);
  const dark = shade(accent, -0.55);
  const mid = shade(accent, -0.2);
  const light = shade(accent, 0.18);
  const silk = "#dfe6ec";
  const copper = "#c6873f";

  const traces = routeTraces(free, headerZones);
  const parts = populate(free);

  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id={id("mask")} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.5" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={id("sheen")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.18" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.32" />
        </linearGradient>
        <linearGradient id={id("metal")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f6f8" />
          <stop offset="0.25" stopColor="#c4ccd4" />
          <stop offset="0.5" stopColor="#9aa3ad" />
          <stop offset="0.75" stopColor="#c4ccd4" />
          <stop offset="1" stopColor="#7c858f" />
        </linearGradient>
        <linearGradient id={id("plastic")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2f37" />
          <stop offset="0.12" stopColor="#161a20" />
          <stop offset="1" stopColor="#05070a" />
        </linearGradient>
        <linearGradient id={id("chip")} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#33383f" />
          <stop offset="0.4" stopColor="#1b1e24" />
          <stop offset="1" stopColor="#0a0c10" />
        </linearGradient>
        <radialGradient id={id("gold")} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="0.5" stopColor="#e7b84f" />
          <stop offset="1" stopColor="#9a6f1e" />
        </radialGradient>
        <pattern
          id={id("vias")}
          width="34"
          height="34"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="6" cy="6" r="1.6" fill="#ffffff" fillOpacity="0.05" />
          <circle cx="23" cy="20" r="1.6" fill="#000000" fillOpacity="0.12" />
        </pattern>
      </defs>

      {/* Board substrate with bevel + soldermask + sheen */}
      <rect
        x={body.x - 3}
        y={body.y - 3}
        width={body.w + 6}
        height={body.h + 6}
        rx={(body.rx ?? 14) + 3}
        fill="#000000"
        fillOpacity={0.35}
      />
      <rect
        x={body.x}
        y={body.y}
        width={body.w}
        height={body.h}
        rx={body.rx ?? 14}
        fill={`url(#${id("mask")})`}
        stroke={shade(accent, -0.7)}
        strokeWidth={2}
      />
      <rect
        x={body.x}
        y={body.y}
        width={body.w}
        height={body.h}
        rx={body.rx ?? 14}
        fill={`url(#${id("vias")})`}
      />
      {/* Silkscreen inner border */}
      <rect
        x={body.x + 10}
        y={body.y + 10}
        width={body.w - 20}
        height={body.h - 20}
        rx={Math.max((body.rx ?? 14) - 6, 4)}
        fill="none"
        stroke={silk}
        strokeOpacity={0.16}
        strokeWidth={1.5}
      />

      {/* Copper routing toward the primary header */}
      <g stroke={copper} strokeOpacity={0.55} fill="none" strokeLinecap="round">
        {traces.map((d, i) => (
          <path key={`tr-${i}`} d={d} strokeWidth={2} />
        ))}
      </g>

      {/* Populated component side */}
      {parts.caps.map((r, i) => (
        <Smd key={`cap-${i}`} r={r} fill="#b98a4a" cap />
      ))}
      {parts.resistors.map((r, i) => (
        <Smd key={`res-${i}`} r={r} fill="#1a1d22" />
      ))}
      {parts.regulator ? (
        <Regulator r={parts.regulator} metalId={id("metal")} />
      ) : null}
      {parts.crystal ? (
        <Crystal r={parts.crystal} metalId={id("metal")} />
      ) : null}
      {parts.module ? (
        <ShieldCan r={parts.module} metalId={id("metal")} />
      ) : null}
      {parts.chip ? (
        <Chip r={parts.chip} chipId={id("chip")} silk={silk} />
      ) : null}
      {parts.leds.map((r, i) => (
        <rect
          key={`led-${i}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          rx={2}
          fill={i % 2 === 0 ? "#36d399" : "#f87171"}
          stroke="#ffffff"
          strokeOpacity={0.3}
        />
      ))}

      {/* Big recognizable connectors with metal shells */}
      {ports.map((port, i) => (
        <ConnectorShell
          key={`port-${i}`}
          port={port}
          metalId={id("metal")}
        />
      ))}

      {/* Header: black-plastic connector body + per-pin sockets */}
      {headerZones.map((zone, i) => (
        <g key={`zone-${i}`}>
          <rect
            x={zone.x}
            y={zone.y}
            width={zone.w}
            height={zone.h}
            rx={zone.rx ?? 6}
            fill={`url(#${id("plastic")})`}
            stroke="#000000"
            strokeOpacity={0.6}
          />
          <rect
            x={zone.x + 1.5}
            y={zone.y + 1.5}
            width={zone.w - 3}
            height={3}
            rx={1.5}
            fill="#ffffff"
            fillOpacity={0.1}
          />
        </g>
      ))}
      {anchors.map((anchor) => (
        <rect
          key={`sock-${anchor.key}`}
          x={anchor.cx - geometry.padR - 2}
          y={anchor.cy - geometry.padR - 2}
          width={(geometry.padR + 2) * 2}
          height={(geometry.padR + 2) * 2}
          rx={4}
          fill="#04060a"
          stroke="#ffffff"
          strokeOpacity={0.08}
        />
      ))}

      {/* Mounting holes with copper annular ring */}
      {holes.map((hole, i) => (
        <g key={`hole-${i}`}>
          <circle cx={hole.x} cy={hole.y} r={hole.r + 4} fill={`url(#${id("gold")})`} />
          <circle
            cx={hole.x}
            cy={hole.y}
            r={hole.r}
            fill="#05070a"
            stroke="#000000"
            strokeOpacity={0.6}
          />
        </g>
      ))}
    </g>
  );
}

// --- component primitives --------------------------------------------------
function Chip({ r, chipId, silk }: { r: Rect; chipId: string; silk: string }) {
  const legs = Math.max(3, Math.round(r.w / 14));
  const legW = r.w / (legs * 2);
  const dot = Math.min(r.w, r.h) * 0.1;
  return (
    <g>
      {/* leads on all four sides */}
      {Array.from({ length: legs }).map((_, i) => {
        const lx = r.x + legW + i * (r.w / legs);
        return (
          <g key={`lg-${i}`} fill="#c9d0d8">
            <rect x={lx} y={r.y - 5} width={legW} height={6} rx={1} />
            <rect x={lx} y={r.y + r.h - 1} width={legW} height={6} rx={1} />
          </g>
        );
      })}
      {Array.from({ length: legs }).map((_, i) => {
        const ly = r.y + legW + i * (r.h / legs);
        return (
          <g key={`lgv-${i}`} fill="#c9d0d8">
            <rect x={r.x - 5} y={ly} width={6} height={legW} rx={1} />
            <rect x={r.x + r.w - 1} y={ly} width={6} height={legW} rx={1} />
          </g>
        );
      })}
      <rect
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        rx={Math.min(r.w, r.h) * 0.12}
        fill={`url(#${chipId})`}
        stroke="#000000"
        strokeOpacity={0.5}
      />
      <circle cx={r.x + dot * 1.6} cy={r.y + dot * 1.6} r={dot} fill={silk} fillOpacity={0.7} />
      <rect
        x={r.x + r.w * 0.2}
        y={r.y + r.h * 0.42}
        width={r.w * 0.6}
        height={r.h * 0.12}
        rx={2}
        fill="#ffffff"
        fillOpacity={0.06}
      />
    </g>
  );
}

function ShieldCan({ r, metalId }: { r: Rect; metalId: string }) {
  // A soldered-down RF/metal can: brushed-metal lid, a crisp inset seam, and
  // four corner solder tabs. No dashes (which read like a selection box).
  const inset = Math.min(r.w, r.h) * 0.14;
  const screw = Math.min(r.w, r.h) * 0.08;
  const corners = [
    [r.x + inset, r.y + inset],
    [r.x + r.w - inset, r.y + inset],
    [r.x + inset, r.y + r.h - inset],
    [r.x + r.w - inset, r.y + r.h - inset],
  ];
  return (
    <g>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={5} fill={`url(#${metalId})`} stroke="#5c646d" />
      <rect
        x={r.x + inset * 0.5}
        y={r.y + inset * 0.5}
        width={r.w - inset}
        height={r.h - inset}
        rx={3}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.18}
      />
      {corners.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={screw} fill="#6b727b" stroke="#3a4049" strokeWidth={0.8} />
      ))}
    </g>
  );
}

function Crystal({ r, metalId }: { r: Rect; metalId: string }) {
  return (
    <g>
      <rect
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        rx={r.h * 0.45}
        fill={`url(#${metalId})`}
        stroke="#5c646d"
      />
      <rect
        x={r.x + r.w * 0.12}
        y={r.y + r.h * 0.2}
        width={r.w * 0.76}
        height={r.h * 0.6}
        rx={r.h * 0.3}
        fill="#ffffff"
        fillOpacity={0.12}
      />
    </g>
  );
}

function Regulator({ r, metalId }: { r: Rect; metalId: string }) {
  const legs = 3;
  const legW = r.w / (legs * 2);
  return (
    <g>
      {Array.from({ length: legs }).map((_, i) => (
        <rect
          key={i}
          x={r.x + legW + i * (r.w / legs)}
          y={r.y + r.h - 1}
          width={legW}
          height={6}
          rx={1}
          fill="#c9d0d8"
        />
      ))}
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={2} fill="#15181d" stroke="#000" strokeOpacity={0.5} />
      <rect x={r.x} y={r.y} width={r.w} height={r.h * 0.4} rx={2} fill={`url(#${metalId})`} fillOpacity={0.5} />
    </g>
  );
}

function Smd({ r, fill, cap = false }: { r: Rect; fill: string; cap?: boolean }) {
  return (
    <g>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={1.5} fill={fill} />
      {!cap ? (
        <>
          <rect x={r.x} y={r.y} width={r.w * 0.22} height={r.h} fill="#cdd3da" />
          <rect x={r.x + r.w * 0.78} y={r.y} width={r.w * 0.22} height={r.h} fill="#cdd3da" />
        </>
      ) : (
        <rect x={r.x} y={r.y} width={r.w} height={r.h * 0.4} rx={1.5} fill="#ffffff" fillOpacity={0.18} />
      )}
    </g>
  );
}

function ConnectorShell({ port, metalId }: { port: PortMark; metalId: string }) {
  const ivory = port.kind === "jst";
  const barrel = port.kind === "barrel";
  if (ivory) {
    return (
      <rect x={port.x} y={port.y} width={port.w} height={port.h} rx={port.rx ?? 3} fill="#e7e2d2" stroke="#b8b09a" />
    );
  }
  if (barrel) {
    return (
      <g>
        <rect x={port.x} y={port.y} width={port.w} height={port.h} rx={port.h * 0.4} fill="#0a0c10" stroke="#2a2f37" />
        <rect x={port.x + port.w * 0.35} y={port.y + port.h * 0.2} width={port.w * 0.3} height={port.h * 0.6} rx={2} fill="#3a4049" />
      </g>
    );
  }
  return (
    <g>
      <rect
        x={port.x}
        y={port.y}
        width={port.w}
        height={port.h}
        rx={port.rx ?? 3}
        fill={`url(#${metalId})`}
        stroke="#5c646d"
      />
      <rect
        x={port.x + port.w * 0.16}
        y={port.y + port.h * 0.28}
        width={port.w * 0.68}
        height={port.h * 0.44}
        rx={2}
        fill="#0a0c10"
        fillOpacity={0.85}
      />
    </g>
  );
}

// --- layout helpers --------------------------------------------------------

// The board region that is clear of header/connector zones — where we place
// the populated components.
function freeRect(geometry: BoardGeometry): Rect {
  const { body, headerZones } = geometry;
  const pad = 18;
  let x0 = body.x + pad;
  let y0 = body.y + pad;
  let x1 = body.x + body.w - pad;
  let y1 = body.y + body.h - pad;
  const cx = body.x + body.w / 2;
  const cy = body.y + body.h / 2;

  for (const z of headerZones) {
    // Ignore zones that fall outside the body (e.g. group-strips render their
    // strips below the small board artwork).
    const inside =
      z.x < body.x + body.w && z.x + z.w > body.x && z.y < body.y + body.h && z.y + z.h > body.y;
    if (!inside) continue;
    const horizontal = z.w >= z.h;
    if (horizontal) {
      if (z.y + z.h / 2 < cy) y0 = Math.max(y0, z.y + z.h + pad);
      else y1 = Math.min(y1, z.y - pad);
    } else {
      if (z.x + z.w / 2 < cx) x0 = Math.max(x0, z.x + z.w + pad);
      else x1 = Math.min(x1, z.x - pad);
    }
  }
  // Guard against degenerate regions.
  if (x1 - x0 < 40) {
    x0 = body.x + body.w * 0.3;
    x1 = body.x + body.w * 0.7;
  }
  if (y1 - y0 < 40) {
    y0 = body.y + body.h * 0.3;
    y1 = body.y + body.h * 0.7;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

type Population = {
  chip: Rect | null;
  module: Rect | null;
  crystal: Rect | null;
  regulator: Rect | null;
  caps: Rect[];
  resistors: Rect[];
  leds: Rect[];
};

function populate(free: Rect): Population {
  const { x, y, w, h } = free;
  if (w < 24 || h < 24) {
    return { chip: null, module: null, crystal: null, regulator: null, caps: [], resistors: [], leds: [] };
  }
  const m = Math.min(w, h);
  const chipS = clamp(m * 0.42, 40, 220);
  const u = clamp(chipS * 0.14, 5, 22);

  const chip: Rect = {
    x: x + w * 0.5 - chipS / 2,
    y: y + h * 0.5 - chipS / 2,
    w: chipS,
    h: chipS,
  };

  const tall = h > w * 1.2;
  const canModule: Rect = tall
    ? { x: x + w * 0.5 - chipS * 0.42, y: y + h * 0.16 - chipS * 0.22, w: chipS * 0.84, h: chipS * 0.5 }
    : { x: x + w * 0.16 - chipS * 0.22, y: y + h * 0.5 - chipS * 0.3, w: chipS * 0.62, h: chipS * 0.7 };

  const crystal: Rect = tall
    ? { x: x + w * 0.5 - u * 1.6, y: y + h * 0.8, w: u * 3.2, h: u * 1.5 }
    : { x: x + w * 0.82 - u * 1.6, y: y + h * 0.32 - u * 0.75, w: u * 3.2, h: u * 1.5 };

  const regulator: Rect = tall
    ? { x: x + w * 0.74, y: y + h * 0.34, w: u * 2.4, h: u * 1.8 }
    : { x: x + w * 0.2, y: y + h * 0.8, w: u * 2.4, h: u * 1.8 };

  // Decoupling caps hugging the chip.
  const caps: Rect[] = Array.from({ length: 4 }).map((_, i) => ({
    x: chip.x + chip.w * (0.18 + i * 0.21),
    y: chip.y + chip.h + u * 0.8,
    w: u * 1.5,
    h: u * 0.8,
  }));

  const resistors: Rect[] = Array.from({ length: 3 }).map((_, i) => ({
    x: tall ? x + w * 0.16 + i * (u * 2.2) : x + w * 0.74 + (i % 2) * (u * 2.2),
    y: tall ? y + h * 0.34 + i * 0 : y + h * 0.7 + Math.floor(i / 2) * (u * 1.4),
    w: u * 1.8,
    h: u * 0.8,
  }));

  const leds: Rect[] = Array.from({ length: 2 }).map((_, i) => ({
    x: x + w * 0.86,
    y: y + h * 0.82 + i * (u * 1.6),
    w: u * 1.1,
    h: u * 1.1,
  }));

  return { chip, module: canModule, crystal, regulator, caps, resistors, leds };
}

// A small fan of copper traces from the chip toward each header zone, so both
// edges of a dual-edge module look routed (not just one side).
function routeTraces(free: Rect, zones: Rect[]): string[] {
  const chipCx = free.x + free.w / 2;
  const chipCy = free.y + free.h / 2;
  const paths: string[] = [];
  // Limit how many zones we route into so dense group-strips stay clean.
  for (const zone of zones.slice(0, 2)) {
    const horizontal = zone.w >= zone.h;
    const count = 6;
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / (count + 1);
      if (horizontal) {
        const tx = zone.x + zone.w * t;
        const ty = zone.y + zone.h / 2;
        const midY = (chipCy + ty) / 2;
        paths.push(`M ${chipCx} ${chipCy} L ${chipCx + (tx - chipCx) * 0.3} ${midY} L ${tx} ${ty}`);
      } else {
        const tx = zone.x + zone.w / 2;
        const ty = zone.y + zone.h * t;
        const midX = (chipCx + tx) / 2;
        paths.push(`M ${chipCx} ${chipCy} L ${midX} ${chipCy + (ty - chipCy) * 0.3} L ${tx} ${ty}`);
      }
    }
  }
  return paths;
}

// --- color helper ----------------------------------------------------------
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function shade(hex: string, amt: number): string {
  const c = hex.replace("#", "");
  const full = c.length === 3 ? c.split("").map((ch) => ch + ch).join("") : c;
  const num = parseInt(full, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round((target - r) * p) + r;
  g = Math.round((target - g) * p) + g;
  b = Math.round((target - b) * p) + b;
  return `rgb(${r}, ${g}, ${b})`;
}
