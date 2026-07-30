import { useId } from "react";
import type { BoardGeometry, PortMark, Rect } from "@/lib/board-visual-geometry";

// The drawing sheet the pads sit on: a pitch grid, the board outline, the
// connector footprint, and the orientation datum. Rendered as a fabrication
// drawing — hairlines, no fills, no gradients.
//
// This used to be a photorealistic PCB: soldermask gradients, a leaded IC,
// decoupling caps, LEDs, copper traces fanning out to the header. All of it was
// invented. The catalog knows a board's proportions and which edge its USB port
// is on; it does not know where the regulator sits, so none of that is drawn
// now. The reader gets a sheet where everything present is true, and the pads
// are the only filled objects on it.
//
// Everything here is decorative in the accessibility sense and hidden from
// assistive technology — the pins are read through the overlay and the
// synchronized pin schedule.

const FRAME = "#93a9bb";
const HAIR = "#5d7183";

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

  const { body, headerZones, ports, pitch, cropBottom, kind } = geometry;
  const outlined = kind !== "group-strips";
  const field = outlined ? freeField(body, headerZones, ports) : null;

  return (
    <g aria-hidden="true">
      <defs>
        {/* Grid step is one drawn pin pitch, so the sheet is dimensioned in the
            unit the connector is actually built on. */}
        <pattern
          id={id("pitch")}
          width={pitch}
          height={pitch}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${pitch} 0 L 0 0 0 ${pitch}`}
            fill="none"
            stroke={HAIR}
            strokeOpacity={0.22}
            strokeWidth={1}
          />
        </pattern>
        <pattern
          id={id("pitch-major")}
          width={pitch * 5}
          height={pitch * 5}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${pitch * 5} 0 L 0 0 0 ${pitch * 5}`}
            fill="none"
            stroke={HAIR}
            strokeOpacity={0.4}
            strokeWidth={1.25}
          />
        </pattern>
      </defs>

      {/* Sheet grid, faded away from the connector so it never competes with
          the pads or their labels. */}
      <rect
        x={0}
        y={0}
        width={geometry.vbw}
        height={geometry.vbh}
        fill={`url(#${id("pitch")})`}
      />
      <rect
        x={0}
        y={0}
        width={geometry.vbw}
        height={geometry.vbh}
        fill={`url(#${id("pitch-major")})`}
      />

      {outlined ? (
        <BoardOutline body={body} cropBottom={cropBottom} />
      ) : null}

      {/* Datum centrelines and the silkscreened board name. Together they turn
          the field inside the outline from dead space into the part of the sheet
          that identifies what is being drawn — which is what a real board uses
          that area for too. */}
      {field ? (
        <>
          <Centrelines body={body} cropBottom={cropBottom} />
          {label ? <Silkscreen field={field} label={label} /> : null}
        </>
      ) : null}

      {/* Connector footprint: the region the header occupies on the board. */}
      {headerZones.map((zone, i) => (
        <g key={`zone-${i}`}>
          <rect
            x={zone.x}
            y={zone.y}
            width={zone.w}
            height={zone.h}
            rx={zone.rx ?? 6}
            fill="#0d1218"
            fillOpacity={0.85}
            stroke={HAIR}
            strokeOpacity={0.75}
            strokeWidth={1.25}
          />
          {/* Centreline through the footprint — a drawing convention, and it
              reads as the row axis the pads are aligned to. */}
          {zone.w >= zone.h ? (
            <line
              x1={zone.x + 8}
              y1={zone.y + zone.h / 2}
              x2={zone.x + zone.w - 8}
              y2={zone.y + zone.h / 2}
              stroke={HAIR}
              strokeOpacity={0.3}
              strokeWidth={1}
              strokeDasharray="14 5 3 5"
            />
          ) : (
            <line
              x1={zone.x + zone.w / 2}
              y1={zone.y + 8}
              x2={zone.x + zone.w / 2}
              y2={zone.y + zone.h - 8}
              stroke={HAIR}
              strokeOpacity={0.3}
              strokeWidth={1}
              strokeDasharray="14 5 3 5"
            />
          )}
        </g>
      ))}

      {ports.map((port, i) => (
        <UsbDatum key={`port-${i}`} port={port} />
      ))}
    </g>
  );
}

/**
 * Board outline. When `cropBottom` is set the drawing is a detail view of the
 * connector strip, so the bottom is closed with a break line — the standard way
 * a drawing says "this part continues, it is just not on this sheet".
 */
function BoardOutline({
  body,
  cropBottom,
}: {
  body: Rect;
  cropBottom?: boolean;
}) {
  const rx = body.rx ?? 14;
  const bottom = body.y + body.h;

  if (!cropBottom) {
    // Just the outline. An inset keepout ring used to be drawn here because it
    // looks like a fab drawing, but the catalog has no keepout data — so it was
    // a claim the sheet could not back, which is the one thing this drawing does
    // not do.
    return (
      <rect
        x={body.x}
        y={body.y}
        width={body.w}
        height={body.h}
        rx={rx}
        fill="#0c1219"
        fillOpacity={0.6}
        stroke={FRAME}
        strokeOpacity={0.5}
        strokeWidth={1.75}
      />
    );
  }

  return (
    <g>
      <path
        d={[
          `M ${body.x} ${bottom}`,
          `L ${body.x} ${body.y + rx}`,
          `Q ${body.x} ${body.y} ${body.x + rx} ${body.y}`,
          `L ${body.x + body.w - rx} ${body.y}`,
          `Q ${body.x + body.w} ${body.y} ${body.x + body.w} ${body.y + rx}`,
          `L ${body.x + body.w} ${bottom}`,
        ].join(" ")}
        fill="#0c1219"
        fillOpacity={0.6}
        stroke={FRAME}
        strokeOpacity={0.5}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <BreakLine x1={body.x} x2={body.x + body.w} y={bottom} />
    </g>
  );
}

/**
 * The board region left clear by the connector footprints — where the
 * centrelines cross and the silkscreen sits. Vertical footprints (rows running
 * down a board edge) trim the field horizontally, horizontal ones trim it
 * vertically.
 */
function freeField(body: Rect, zones: Rect[], ports: Rect[]): Rect | null {
  const pad = 20;
  let x0 = body.x + pad;
  let y0 = body.y + pad;
  let x1 = body.x + body.w - pad;
  let y1 = body.y + body.h - pad;
  const cx = body.x + body.w / 2;
  const cy = body.y + body.h / 2;

  // Ports are trimmed alongside the footprints so the silkscreen never runs into
  // the orientation datum's caption.
  for (const zone of [...zones, ...ports]) {
    const inside =
      zone.x < body.x + body.w &&
      zone.x + zone.w > body.x &&
      zone.y < body.y + body.h &&
      zone.y + zone.h > body.y;
    if (!inside) continue;
    if (zone.w >= zone.h) {
      if (zone.y + zone.h / 2 < cy) y0 = Math.max(y0, zone.y + zone.h + pad);
      else y1 = Math.min(y1, zone.y - pad);
    } else {
      if (zone.x + zone.w / 2 < cx) x0 = Math.max(x0, zone.x + zone.w + pad);
      else x1 = Math.min(x1, zone.x - pad);
    }
  }

  const w = x1 - x0;
  const h = y1 - y0;
  // Below this there is not enough clear board to letter without crowding the
  // pads, so the field is left plain.
  if (w < 150 || h < 70) return null;
  return { x: x0, y: y0, w, h };
}

/** Horizontal and vertical datum axes, in the dash-dot weight drawings use. */
function Centrelines({ body, cropBottom }: { body: Rect; cropBottom?: boolean }) {
  // A cropped view has no true vertical centre, so only the row axis is drawn.
  const cy = body.y + body.h / 2;
  const cx = body.x + body.w / 2;
  return (
    <g
      stroke={HAIR}
      strokeOpacity={0.34}
      strokeWidth={1}
      strokeDasharray="22 6 4 6"
    >
      <line x1={body.x - 10} y1={cy} x2={body.x + body.w + 10} y2={cy} />
      {cropBottom ? null : (
        <line x1={cx} y1={body.y - 10} x2={cx} y2={body.y + body.h + 10} />
      )}
    </g>
  );
}

/** The board name, set wide and faint like a soldermask silkscreen. */
function Silkscreen({ field, label }: { field: Rect; label: string }) {
  const text = label.toUpperCase();
  const tracking = 0.14;
  // Fit to the clear field: mono advance is ~0.62em, plus the tracking.
  const byWidth = (field.w * 0.94) / (text.length * (0.62 + tracking));
  const size = Math.max(13, Math.min(field.h * 0.42, byWidth, 58));

  return (
    <text
      x={field.x + field.w / 2}
      y={field.y + field.h / 2}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="var(--font-technical, monospace)"
      fontSize={size}
      fontWeight={700}
      letterSpacing={`${tracking}em`}
      fill={FRAME}
      fillOpacity={0.17}
    >
      {text}
    </text>
  );
}

/** The zigzag break line used where a view is cut short. */
function BreakLine({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const amp = 7;
  const step = 26;
  const parts: string[] = [`M ${x1} ${y}`];
  let x = x1;
  let up = true;
  while (x < x2 - step) {
    const nx = Math.min(x + step, x2);
    parts.push(`L ${nx - step / 2} ${y + (up ? -amp : amp)}`, `L ${nx} ${y}`);
    x = nx;
    up = !up;
  }
  parts.push(`L ${x2} ${y}`);
  return (
    <path
      d={parts.join(" ")}
      fill="none"
      stroke={FRAME}
      strokeOpacity={0.45}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  );
}

/**
 * The orientation datum: a hairline outline on the board edge the USB port sits
 * on, labelled so the reader can line the sheet up with the board in their hand.
 */
function UsbDatum({ port }: { port: PortMark }) {
  const vertical = port.side === "left" || port.side === "right";
  const cx = port.x + port.w / 2;
  const cy = port.y + port.h / 2;
  const gap = 22;

  // The caption reads *into* the board, not out of it. Outside the outline it
  // would either fall off the sheet (a left-edge port sits on the sheet margin)
  // or land in a label rail; the field inside the outline is always clear.
  const caption = {
    top: { x: cx, y: port.y + port.h + gap, rotate: 0 },
    bottom: { x: cx, y: port.y - gap, rotate: 0 },
    left: { x: port.x + port.w + gap, y: cy, rotate: -90 },
    right: { x: port.x - gap, y: cy, rotate: -90 },
  }[port.side];

  return (
    <g>
      <rect
        x={port.x}
        y={port.y}
        width={port.w}
        height={port.h}
        rx={port.rx ?? 4}
        fill="#0d1218"
        stroke={FRAME}
        strokeOpacity={0.7}
        strokeWidth={1.5}
      />
      {/* Shell mouth, so the datum reads as a connector rather than a tab. */}
      <rect
        x={port.x + (vertical ? port.w * 0.3 : port.w * 0.14)}
        y={port.y + (vertical ? port.h * 0.14 : port.h * 0.3)}
        width={vertical ? port.w * 0.4 : port.w * 0.72}
        height={vertical ? port.h * 0.72 : port.h * 0.4}
        rx={2}
        fill="none"
        stroke={HAIR}
        strokeOpacity={0.6}
        strokeWidth={1}
      />
      <text
        x={caption.x}
        y={caption.y}
        textAnchor="middle"
        dominantBaseline="central"
        transform={
          caption.rotate ? `rotate(${caption.rotate} ${caption.x} ${caption.y})` : undefined
        }
        fontFamily="var(--font-technical, monospace)"
        fontSize={15}
        fontWeight={500}
        letterSpacing="0.18em"
        fill={FRAME}
        fillOpacity={0.85}
      >
        USB
      </text>
    </g>
  );
}
