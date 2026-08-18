import { useId } from "react";
import type {
  BoardGeometry,
  Hole,
  PortMark,
  Rect,
} from "@/lib/board-visual-geometry";

// The board the pads sit on, drawn from pure SVG geometry: soldermask with an
// edge bevel, silkscreen, copper routed from the main IC out to the connector,
// a populated component side, metal connector shells on the edges the catalog
// records, and plated mounting holes.
//
// What is true here and what is illustration: the outline proportions, which
// edge carries the connector, which connectors the board has, and every pad —
// those come from the catalog. Where the regulator sits does not, so the
// component side is arranged by rule, kept to a handful of parts, and the panel
// says as much in a caption underneath. It is here to make the board
// recognizable and to orient the reader — "USB at the bottom, pin 1 top-left" —
// never to specify it.
//
// Everything in here is decorative in the accessibility sense and hidden from
// assistive technology: the pins are read through the pad overlay and the
// synchronized pin schedule.

const SILK = "#dfe6ec";
const COPPER = "#c6873f";

export function BoardArtwork({
  geometry,
  label,
}: {
  geometry: BoardGeometry;
  /** Board name, set into the outline the way a PCB carries its silkscreen. */
  label?: string;
}) {
  const raw = useId();
  const uid = raw.replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `${name}-${uid}`;

  const { body, headerZones, ports, holes, anchors, padR, accent, kind, silk } =
    geometry;

  // The function-grouped sheet makes no claim about a board's shape, so it gets
  // no outline — just a frame around each block of pads.
  if (kind === "group-strips") {
    return (
      <g aria-hidden="true">
        {headerZones.map((zone, index) => (
          <rect
            key={`strip-${index}`}
            x={zone.x}
            y={zone.y}
            width={zone.w}
            height={zone.h}
            rx={zone.rx ?? 10}
            fill="#0f141b"
            stroke="#ffffff"
            strokeOpacity={0.07}
          />
        ))}
      </g>
    );
  }

  // A card-edge board's connector is its own PCB, plated gold — there is no
  // part to draw, and drawing a header there would be wrong.
  const fingers = kind === "edge-connector";
  const dark = shade(accent, -0.58);
  const mid = shade(accent, -0.24);
  const light = shade(accent, 0.14);
  const field = freeField(body, headerZones, ports);
  const parts = populate(field);
  const traces = routeTraces(parts.chip, headerZones, body);

  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id={id("mask")} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.45" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={id("metal")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef1f5" />
          <stop offset="0.3" stopColor="#c2cad3" />
          <stop offset="0.62" stopColor="#8e97a1" />
          <stop offset="1" stopColor="#6d757e" />
        </linearGradient>
        <linearGradient id={id("plastic")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b3038" />
          <stop offset="0.16" stopColor="#14181e" />
          <stop offset="1" stopColor="#04060a" />
        </linearGradient>
        <linearGradient id={id("silicon")} x1="0.1" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#3a4048" />
          <stop offset="0.42" stopColor="#1d2127" />
          <stop offset="1" stopColor="#0b0e12" />
        </linearGradient>
        <radialGradient id={id("gold")} cx="0.36" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="0.55" stopColor="#e3b448" />
          <stop offset="1" stopColor="#8f671b" />
        </radialGradient>
        {/* Ground-plane vias: a quiet, even texture so the soldermask reads as
            a populated plane rather than flat paint. */}
        <pattern
          id={id("vias")}
          width={38}
          height={38}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={9} cy={9} r={1.5} fill="#ffffff" fillOpacity={0.05} />
          <circle cx={28} cy={26} r={1.5} fill="#000000" fillOpacity={0.14} />
        </pattern>
        {/* Copper pour: the cross-hatched ground fill that covers most of a real
            board's free area, at the threshold of visible. */}
        <pattern
          id={id("pour")}
          width={9}
          height={9}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={9}
            stroke={COPPER}
            strokeOpacity={0.11}
            strokeWidth={1}
          />
        </pattern>
        {/* Gold edge fingers, for the boards whose connector is the PCB itself. */}
        <linearGradient id={id("finger")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2d489" />
          <stop offset="0.45" stopColor="#d9ab45" />
          <stop offset="1" stopColor="#9c7526" />
        </linearGradient>
      </defs>

      {/* Substrate: a soft drop shadow, the soldermask, a via texture, and a
          bevel highlight just inside the edge so the board has depth without a
          gloss sheen washing over the whole face. */}
      <rect
        x={body.x - 2}
        y={body.y + 3}
        width={body.w + 4}
        height={body.h + 4}
        rx={(body.rx ?? 14) + 2}
        fill="#000000"
        fillOpacity={0.4}
      />
      <rect
        x={body.x}
        y={body.y}
        width={body.w}
        height={body.h}
        rx={body.rx ?? 14}
        fill={`url(#${id("mask")})`}
        stroke={shade(accent, -0.74)}
        strokeWidth={1.5}
      />
      <rect
        x={body.x}
        y={body.y}
        width={body.w}
        height={body.h}
        rx={body.rx ?? 14}
        fill={`url(#${id("pour")})`}
      />
      <rect
        x={body.x}
        y={body.y}
        width={body.w}
        height={body.h}
        rx={body.rx ?? 14}
        fill={`url(#${id("vias")})`}
      />
      <rect
        x={body.x + 1.5}
        y={body.y + 1.5}
        width={body.w - 3}
        height={body.h - 3}
        rx={Math.max((body.rx ?? 14) - 1.5, 2)}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.12}
        strokeWidth={1.5}
      />

      {/* Silkscreen: the outline the parts sit inside, and the board's own name
          lettered into the clear field. */}
      <rect
        x={body.x + 12}
        y={body.y + 12}
        width={body.w - 24}
        height={body.h - 24}
        rx={Math.max((body.rx ?? 14) - 6, 3)}
        fill="none"
        stroke={SILK}
        strokeOpacity={0.14}
        strokeWidth={1.25}
      />
      {/* Builder-derived silkscreen: connector designators and section rules
          (e.g. the delimiter under a Nucleo's debugger section). */}
      {silk?.lines.map((line, index) => (
        <line
          key={`silk-line-${index}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={SILK}
          strokeOpacity={0.2}
          strokeWidth={1.5}
          strokeDasharray={line.dashed ? "12 9" : undefined}
        />
      ))}
      {silk?.texts.map((entry, index) => (
        <text
          key={`silk-text-${index}`}
          x={entry.x}
          y={entry.y}
          textAnchor="middle"
          fontSize={entry.size}
          fontFamily="var(--font-mono, monospace)"
          fontWeight={700}
          letterSpacing="0.16em"
          fill={SILK}
          fillOpacity={0.28}
        >
          {entry.text}
        </text>
      ))}

      {label && field.w > 150 ? (
        <text
          x={field.x + field.w / 2}
          y={field.y + field.h - 4}
          textAnchor="middle"
          fontSize={clamp(field.w * 0.05, 11, 20)}
          fontFamily="var(--font-mono, monospace)"
          fontWeight={700}
          letterSpacing="0.2em"
          fill={SILK}
          fillOpacity={0.16}
        >
          {label.toUpperCase()}
        </text>
      ) : null}

      {/* Copper: a routed fan from the IC to the connector with a chamfered
          turn, the way a board is actually laid out — a spray of straight
          diagonals reads as a starburst, not as routing. */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {traces.map((trace, index) => (
          <path
            key={`trace-${index}`}
            d={trace}
            stroke={COPPER}
            strokeOpacity={0.4}
            strokeWidth={2}
          />
        ))}
      </g>

      {/* Component side. */}
      {parts.caps.map((rect, index) => (
        <Passive key={`cap-${index}`} rect={rect} kind="cap" />
      ))}
      {parts.resistors.map((rect, index) => (
        <Passive key={`res-${index}`} rect={rect} kind="resistor" />
      ))}
      {parts.regulator ? (
        <Regulator rect={parts.regulator} metal={id("metal")} />
      ) : null}
      {parts.crystal ? (
        <Crystal rect={parts.crystal} metal={id("metal")} />
      ) : null}
      {parts.chip ? <Chip rect={parts.chip} silicon={id("silicon")} /> : null}
      {parts.leds.map((rect, index) => (
        <Led key={`led-${index}`} rect={rect} warm={index % 2 === 1} />
      ))}

      {/* Connectors, on the edges the catalog records. */}
      {ports.map((port, index) => (
        <Connector key={`port-${index}`} port={port} metal={id("metal")} />
      ))}

      {/* Plated mounting holes. */}
      {holes.map((hole, index) => (
        <MountingHole key={`hole-${index}`} hole={hole} gold={id("gold")} />
      ))}

      {/* The connector the pads sit in. A pin header is a black plastic body
          with a socket under every pin; an edge connector is the board itself,
          so it gets gold fingers instead of a part. */}
      {fingers ? (
        <g>
          {anchors.map((anchor) => (
            <rect
              key={`finger-${anchor.key}`}
              x={anchor.cx - padR - 3}
              y={headerZones[0]?.y ?? anchor.cy - padR}
              width={(padR + 3) * 2}
              height={headerZones[0]?.h ?? padR * 2}
              rx={2}
              fill={`url(#${id("finger")})`}
              stroke="#7a5a1c"
              strokeOpacity={0.7}
              strokeWidth={0.8}
            />
          ))}
        </g>
      ) : (
        <>
          {headerZones.map((zone, index) => (
            <g key={`zone-${index}`}>
              <rect
                x={zone.x}
                y={zone.y + 2}
                width={zone.w}
                height={zone.h}
                rx={zone.rx ?? 6}
                fill="#000000"
                fillOpacity={0.45}
              />
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.w}
                height={zone.h}
                rx={zone.rx ?? 6}
                fill={`url(#${id("plastic")})`}
                stroke="#000000"
                strokeOpacity={0.65}
              />
              <rect
                x={zone.x + 2}
                y={zone.y + 2}
                width={Math.max(zone.w - 4, 0)}
                height={2.5}
                rx={1.25}
                fill="#ffffff"
                fillOpacity={0.12}
              />
            </g>
          ))}
          {anchors.map((anchor) => (
            <rect
              key={`socket-${anchor.key}`}
              x={anchor.cx - padR - 2.5}
              y={anchor.cy - padR - 2.5}
              width={(padR + 2.5) * 2}
              height={(padR + 2.5) * 2}
              rx={3}
              fill="#030508"
              fillOpacity={0.5}
              stroke="#ffffff"
              strokeOpacity={0.09}
            />
          ))}
        </>
      )}
    </g>
  );
}

// --- component primitives --------------------------------------------------

// A QFN-style package: lead pads on all four sides, a pin-1 dot, one soft
// highlight across the top. Long DIP legs would read as a 1980s part; this is
// what the main IC on any of these boards actually looks like.
function Chip({ rect, silicon }: { rect: Rect; silicon: string }) {
  const perSide = Math.max(4, Math.min(10, Math.round(rect.w / 22)));
  const leadLen = Math.max(3, rect.w * 0.045);
  const leadW = Math.max(2, (rect.w / perSide) * 0.42);
  const dot = Math.min(rect.w, rect.h) * 0.075;

  return (
    <g>
      {Array.from({ length: perSide }).map((_, index) => {
        const alongX = (rect.w / perSide) * (index + 0.5);
        const alongY = (rect.h / perSide) * (index + 0.5);
        return (
          <g key={`lead-${index}`} fill="#b9c1ca">
            <rect
              x={rect.x + alongX - leadW / 2}
              y={rect.y - leadLen}
              width={leadW}
              height={leadLen}
              rx={1}
            />
            <rect
              x={rect.x + alongX - leadW / 2}
              y={rect.y + rect.h}
              width={leadW}
              height={leadLen}
              rx={1}
            />
            <rect
              x={rect.x - leadLen}
              y={rect.y + alongY - leadW / 2}
              width={leadLen}
              height={leadW}
              rx={1}
            />
            <rect
              x={rect.x + rect.w}
              y={rect.y + alongY - leadW / 2}
              width={leadLen}
              height={leadW}
              rx={1}
            />
          </g>
        );
      })}
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        rx={Math.min(rect.w, rect.h) * 0.08}
        fill={`url(#${silicon})`}
        stroke="#000000"
        strokeOpacity={0.55}
      />
      <rect
        x={rect.x + rect.w * 0.08}
        y={rect.y + rect.h * 0.1}
        width={rect.w * 0.84}
        height={rect.h * 0.16}
        rx={2}
        fill="#ffffff"
        fillOpacity={0.05}
      />
      <circle
        cx={rect.x + dot * 2}
        cy={rect.y + rect.h - dot * 2}
        r={dot}
        fill={SILK}
        fillOpacity={0.55}
      />
    </g>
  );
}

function Crystal({ rect, metal }: { rect: Rect; metal: string }) {
  return (
    <g>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        rx={rect.h * 0.42}
        fill={`url(#${metal})`}
        stroke="#5c646d"
        strokeWidth={0.8}
      />
      <rect
        x={rect.x + rect.w * 0.14}
        y={rect.y + rect.h * 0.22}
        width={rect.w * 0.72}
        height={rect.h * 0.26}
        rx={rect.h * 0.13}
        fill="#ffffff"
        fillOpacity={0.16}
      />
    </g>
  );
}

function Regulator({ rect, metal }: { rect: Rect; metal: string }) {
  const legW = rect.w * 0.16;
  return (
    <g>
      {[0.16, 0.5, 0.84].map((t) => (
        <rect
          key={t}
          x={rect.x + rect.w * t - legW / 2}
          y={rect.y + rect.h - 1}
          width={legW}
          height={rect.h * 0.32}
          rx={1}
          fill="#b9c1ca"
        />
      ))}
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        rx={2}
        fill="#15181d"
        stroke="#000000"
        strokeOpacity={0.5}
      />
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h * 0.34}
        rx={2}
        fill={`url(#${metal})`}
        fillOpacity={0.4}
      />
    </g>
  );
}

function Passive({ rect, kind }: { rect: Rect; kind: "cap" | "resistor" }) {
  return (
    <g>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        rx={1.5}
        fill={kind === "cap" ? "#b08347" : "#15181d"}
      />
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w * 0.2}
        height={rect.h}
        fill="#c8ced6"
      />
      <rect
        x={rect.x + rect.w * 0.8}
        y={rect.y}
        width={rect.w * 0.2}
        height={rect.h}
        fill="#c8ced6"
      />
    </g>
  );
}

function Led({ rect, warm }: { rect: Rect; warm: boolean }) {
  return (
    <g>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        rx={1.5}
        fill={warm ? "#f87171" : "#4ade80"}
        fillOpacity={0.9}
      />
      <rect
        x={rect.x + rect.w * 0.24}
        y={rect.y + rect.h * 0.2}
        width={rect.w * 0.52}
        height={rect.h * 0.3}
        rx={1}
        fill="#ffffff"
        fillOpacity={0.5}
      />
    </g>
  );
}

// Connector shells. At this size the three materials these come in — shielded
// metal, black plastic, ivory nylon — identify a port faster than its outline
// does, so the shell is what gets drawn.
function Connector({ port, metal }: { port: PortMark; metal: string }) {
  const horizontal = port.side === "top" || port.side === "bottom";
  const cavity: Rect = horizontal
    ? {
        x: port.x + port.w * 0.18,
        y: port.y + port.h * 0.3,
        w: port.w * 0.64,
        h: port.h * 0.4,
      }
    : {
        x: port.x + port.w * 0.3,
        y: port.y + port.h * 0.18,
        w: port.w * 0.4,
        h: port.h * 0.64,
      };

  if (port.kind === "jst") {
    return (
      <g>
        <rect
          x={port.x}
          y={port.y}
          width={port.w}
          height={port.h}
          rx={2}
          fill="#e7e2d2"
          stroke="#b0a894"
          strokeWidth={0.8}
        />
        <rect
          x={cavity.x}
          y={cavity.y}
          width={cavity.w}
          height={cavity.h}
          rx={1}
          fill="none"
          stroke="#b0a894"
          strokeWidth={0.8}
        />
      </g>
    );
  }

  if (port.kind === "barrel") {
    return (
      <g>
        <rect
          x={port.x}
          y={port.y}
          width={port.w}
          height={port.h}
          rx={Math.min(port.w, port.h) * 0.35}
          fill="#0a0c10"
          stroke="#2b313a"
        />
        <circle
          cx={port.x + port.w / 2}
          cy={port.y + port.h / 2}
          r={Math.min(port.w, port.h) * 0.22}
          fill="#3a4049"
        />
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
        fill={`url(#${metal})`}
        stroke="#5c646d"
        strokeWidth={0.8}
      />
      <rect
        x={cavity.x}
        y={cavity.y}
        width={cavity.w}
        height={cavity.h}
        rx={1.5}
        fill="#080a0e"
        fillOpacity={0.88}
      />
    </g>
  );
}

function MountingHole({ hole, gold }: { hole: Hole; gold: string }) {
  return (
    <g>
      <circle cx={hole.x} cy={hole.y} r={hole.r + 4} fill={`url(#${gold})`} />
      <circle
        cx={hole.x}
        cy={hole.y}
        r={hole.r}
        fill="#05070a"
        stroke="#000000"
        strokeOpacity={0.55}
      />
    </g>
  );
}

// --- layout ----------------------------------------------------------------

/** The clear board area: inside the outline, outside every header and port. */
function freeField(body: Rect, zones: Rect[], ports: PortMark[]): Rect {
  const pad = 22;
  let x0 = body.x + pad;
  let y0 = body.y + pad;
  let x1 = body.x + body.w - pad;
  let y1 = body.y + body.h - pad;
  const cx = body.x + body.w / 2;
  const cy = body.y + body.h / 2;

  const push = (region: Rect, gap: number) => {
    const overlaps =
      region.x < body.x + body.w &&
      region.x + region.w > body.x &&
      region.y < body.y + body.h &&
      region.y + region.h > body.y;
    if (!overlaps) return;
    if (region.w >= region.h) {
      if (region.y + region.h / 2 < cy) {
        y0 = Math.max(y0, region.y + region.h + gap);
      } else {
        y1 = Math.min(y1, region.y - gap);
      }
    } else if (region.x + region.w / 2 < cx) {
      x0 = Math.max(x0, region.x + region.w + gap);
    } else {
      x1 = Math.min(x1, region.x - gap);
    }
  };

  for (const zone of zones) push(zone, pad);
  for (const port of ports) push(port, 10);

  // A board whose connectors leave no clear field gets no components, rather
  // than components stacked on top of its ports.
  if (x1 - x0 < 46 || y1 - y0 < 46) {
    return { x: cx, y: cy, w: 0, h: 0 };
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

type Parts = {
  chip: Rect | null;
  crystal: Rect | null;
  regulator: Rect | null;
  caps: Rect[];
  resistors: Rect[];
  leds: Rect[];
};

const noParts: Parts = {
  chip: null,
  crystal: null,
  regulator: null,
  caps: [],
  resistors: [],
  leds: [],
};

// Places a small, fixed cast of parts in the clear field. Deterministic, and
// deliberately sparse: a densely faked component side is what turns an
// illustration into a claim. Anything that will not fit inside the field is
// dropped rather than shrunk to fit.
function populate(field: Rect): Parts {
  if (field.w < 80 || field.h < 80) return noParts;

  const short = Math.min(field.w, field.h);
  const chipSize = clamp(short * 0.44, 34, 180);
  const unit = clamp(chipSize * 0.13, 4, 17);
  const cx = field.x + field.w / 2;
  const cy = field.y + field.h / 2;
  const tall = field.h > field.w * 1.15;

  const chip: Rect = {
    x: cx - chipSize / 2,
    y: cy - chipSize / 2,
    w: chipSize,
    h: chipSize,
  };

  // Decoupling caps sit in a neat row beside the IC, along the field's long
  // axis so they never crowd the leads.
  const caps: Rect[] = Array.from({ length: 3 }).map((_, index) =>
    tall
      ? {
          x: cx - unit * 3.4 + index * unit * 2.4,
          y: chip.y + chipSize + unit * 1.6,
          w: unit * 1.6,
          h: unit * 0.9,
        }
      : {
          x: chip.x + chipSize + unit * 1.6,
          y: cy - unit * 2.4 + index * unit * 1.9,
          w: unit * 1.6,
          h: unit * 0.9,
        },
  );

  const crystal: Rect | null =
    short > 110
      ? { x: chip.x - unit * 3.6, y: cy - unit * 0.8, w: unit * 2.6, h: unit * 1.6 }
      : null;

  const regulator: Rect | null =
    short > 130
      ? {
          x: field.x + field.w * 0.12,
          y: field.y + field.h * (tall ? 0.84 : 0.76),
          w: unit * 2.2,
          h: unit * 1.6,
        }
      : null;

  const resistors: Rect[] =
    short > 120
      ? Array.from({ length: 2 }).map((_, index) => ({
          x: field.x + field.w * 0.12 + index * unit * 2.2,
          y: field.y + field.h * 0.12,
          w: unit * 1.7,
          h: unit * 0.8,
        }))
      : [];

  const leds: Rect[] =
    short > 100
      ? Array.from({ length: 2 }).map((_, index) => ({
          x: field.x + field.w - unit * 2.2,
          y: field.y + field.h * 0.76 + index * unit * 1.8,
          w: unit,
          h: unit,
        }))
      : [];

  const keep = (rect: Rect | null): Rect | null =>
    rect && inside(rect, field) ? rect : null;

  return {
    chip: keep(chip),
    crystal: keep(crystal),
    regulator: keep(regulator),
    caps: caps.filter((rect) => inside(rect, field)),
    resistors: resistors.filter((rect) => inside(rect, field)),
    leds: leds.filter((rect) => inside(rect, field)),
  };
}

function inside(rect: Rect, field: Rect): boolean {
  return (
    rect.x >= field.x - 1 &&
    rect.y >= field.y - 1 &&
    rect.x + rect.w <= field.x + field.w + 1 &&
    rect.y + rect.h <= field.y + field.h + 1
  );
}

// Copper from the IC out to each pad row: a straight run off the package, one
// 45° chamfer, then a straight run into the header.
function routeTraces(chip: Rect | null, zones: Rect[], body: Rect): string[] {
  if (!chip) return [];
  const paths: string[] = [];
  const chipCx = chip.x + chip.w / 2;
  const chipCy = chip.y + chip.h / 2;
  const count = 7;

  // Up to four connector rows get copper: every kind draws at most two except
  // the Nucleo-144's four stacked Zio headers, which each deserve their fan.
  for (const zone of zones.slice(0, 4)) {
    const horizontal = zone.w >= zone.h;
    for (let index = 0; index < count; index += 1) {
      const t = (index + 1) / (count + 1);
      if (horizontal) {
        const tx = zone.x + zone.w * t;
        const ty = zone.y + zone.h / 2 < chipCy ? zone.y + zone.h : zone.y;
        const startX = chip.x + chip.w * t;
        const startY = ty < chipCy ? chip.y : chip.y + chip.h;
        const span = Math.abs(ty - startY);
        const run = Math.min(span * 0.4, body.h * 0.12);
        const dir = ty < startY ? -1 : 1;
        const chamfer = Math.min(Math.abs(tx - startX), run * 0.9);
        const sign = tx >= startX ? 1 : -1;
        paths.push(
          `M ${round(startX)} ${round(startY)} ` +
            `L ${round(startX)} ${round(startY + dir * run)} ` +
            `L ${round(startX + sign * chamfer)} ${round(startY + dir * (run + chamfer))} ` +
            `L ${round(tx)} ${round(ty)}`,
        );
      } else {
        const ty = zone.y + zone.h * t;
        const tx = zone.x + zone.w / 2 < chipCx ? zone.x + zone.w : zone.x;
        const startY = chip.y + chip.h * t;
        const startX = tx < chipCx ? chip.x : chip.x + chip.w;
        const span = Math.abs(tx - startX);
        const run = Math.min(span * 0.4, body.w * 0.12);
        const dir = tx < startX ? -1 : 1;
        const chamfer = Math.min(Math.abs(ty - startY), run * 0.9);
        const sign = ty >= startY ? 1 : -1;
        paths.push(
          `M ${round(startX)} ${round(startY)} ` +
            `L ${round(startX + dir * run)} ${round(startY)} ` +
            `L ${round(startX + dir * (run + chamfer))} ${round(startY + sign * chamfer)} ` +
            `L ${round(tx)} ${round(ty)}`,
        );
      }
    }
  }
  return paths;
}

// --- helpers ---------------------------------------------------------------

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

/** Lightens (amt > 0) or darkens (amt < 0) a hex color toward white or black. */
function shade(hex: string, amt: number): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;
  const num = Number.parseInt(full, 16);
  const target = amt < 0 ? 0 : 255;
  const ratio = Math.abs(amt);
  const channel = (shift: number) => {
    const value = (num >> shift) & 255;
    return Math.round((target - value) * ratio) + value;
  };
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}
