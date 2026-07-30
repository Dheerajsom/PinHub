"use client";

import { useId, useRef, useState } from "react";
import { clsx } from "clsx";
import type { PinRole } from "@/lib/boards";
import type { BoardGeometry, PinAnchor } from "@/lib/board-visual-geometry";
import { BoardArtwork } from "@/components/board-visual/BoardArtwork";
import {
  hatchedRoles,
  pinAccessibleLabel,
  roleColors,
} from "@/components/board-visual/roles";
import {
  LABEL_LINE_STEP,
  stackedFontSize,
  wrapStackedLabel,
} from "@/components/board-visual/label-layout";

// The live-probe colour. Every role hue is held at the same lightness, which
// leaves brightness free to mean exactly one thing on this sheet: this is what
// you are touching. So the probe is not another hue — it is white, and weight.
const PROBE = "#eaf6ff";
const ANNOTATION = "#93a9bb";

type BoardStageProps = {
  geometry: BoardGeometry;
  title: string;
  /** Board name, lettered into the outline like a PCB's silkscreen. */
  sheetLabel?: string;
  selectedKey: string | null;
  activeKey: string | null; // selected or hovered — drives the live label
  activeRole: PinRole | null;
  /** Anchor keys sharing the probed pin's net. Empty when nothing is probed. */
  netKeys: Set<string>;
  onSelect: (key: string | null) => void;
  onActiveKey: (key: string | null) => void;
  className?: string;
};

export function BoardStage({
  geometry,
  title,
  sheetLabel,
  selectedKey,
  activeKey,
  activeRole,
  netKeys,
  onSelect,
  onActiveKey,
  className,
}: BoardStageProps) {
  const padRefs = useRef<Array<SVGGElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState(0);
  const raw = useId();
  const uid = raw.replace(/[^a-zA-Z0-9]/g, "");
  const { anchors, vbw, vbh, padR } = geometry;

  // Every pad carries its label. Each layout reserves rail space for them, so
  // withholding labels until hover left most of the sheet empty and turned the
  // drawing into a strip of numbered dots you had to probe to identify.
  const stacked = geometry.kind === "group-strips";
  // Stacked labels are fitted to the column so long signal names stay whole
  // rather than being clipped or truncated.
  const stackedFont = stackedFontSize(geometry.pitch);

  // Pin 1 gets a square pad — the silkscreen convention for the corner pin, and
  // the one mark that tells a reader which way round the connector is.
  const pinOne = anchors.find((anchor) => anchor.pin.position === 1) ?? null;

  const netPath = netKeys.size > 1 ? buildNetPath(anchors, netKeys) : null;

  function focusPad(index: number) {
    const next = (index + anchors.length) % anchors.length;
    setFocusIndex(next);
    padRefs.current[next]?.focus();
  }

  return (
    <svg
      viewBox={`0 0 ${vbw} ${vbh}`}
      role="group"
      aria-label={title}
      className={clsx("bv-stage h-full w-full", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Reserved pins are hatched, not tinted: hatch is the drafting mark for
            a restricted region, and it separates reserved from ground by shape
            since both are deliberately chromaless. */}
        <pattern
          id={`hatch-${uid}`}
          width={6}
          height={6}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width={6} height={6} fill={roleColors.reserved.fill} />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={6}
            stroke={roleColors.reserved.edge}
            strokeOpacity={0.55}
            strokeWidth={2}
          />
        </pattern>
      </defs>

      <BoardArtwork geometry={geometry} label={sheetLabel} />

      {/* Function-block titles for the schematic group-strips sheet. */}
      {stacked
        ? groupTitles(anchors, padR).map((entry) => (
            <text
              key={`grp-${entry.label}`}
              x={entry.x}
              y={entry.y}
              fontSize={16}
              fontWeight={500}
              fontFamily="var(--font-technical, monospace)"
              fill={ANNOTATION}
              letterSpacing="0.16em"
              aria-hidden="true"
            >
              {entry.label.toUpperCase()}
            </text>
          ))
        : null}

      {/* Pin 1 index mark. A square pad alone is easy to miss at a glance, and
          "which end is pin 1" is the question that decides whether a jumper
          lands on 3V3 or on a GPIO. */}
      {pinOne && !stacked ? (
        <PinOneMark anchor={pinOne} padR={padR} />
      ) : null}

      {/* The net: a hairline stitched between every pad on the probed pin's
          net. Drawn beneath the pads so it reads as wiring, not as chrome. */}
      {netPath ? (
        <path
          className="bv-net-path"
          d={netPath}
          fill="none"
          stroke={PROBE}
          strokeOpacity={0.5}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {/* Signal labels for every pad, plus a brighter leader for the probed one.
          Drawn before the pads so the pads sit on top. */}
      <g>
        {anchors.map((anchor) => {
          return (
            <LeaderLabel
              key={`lbl-${anchor.key}`}
              anchor={anchor}
              active={anchor.key === activeKey}
              onNet={netKeys.has(anchor.key)}
              dimmed={activeRole !== null && anchor.pin.role !== activeRole}
              stacked={stacked}
              stackedFont={stackedFont}
              columnWidth={geometry.pitch}
            />
          );
        })}
        {anchors.map((anchor) => {
          if (anchor.key !== activeKey || stacked) return null;
          return (
            <line
              key={`lead-${anchor.key}`}
              x1={anchor.cx}
              y1={anchor.cy}
              x2={anchor.labelX}
              y2={anchor.labelY}
              className="bv-leader"
              stroke={PROBE}
              strokeWidth={1.75}
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* Interactive pads (roving tab order + arrow keys). */}
      <g
        onKeyDown={(event) => {
          if (anchors.length === 0) return;
          if (["ArrowRight", "ArrowDown"].includes(event.key)) {
            event.preventDefault();
            focusPad(focusIndex + 1);
          } else if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            focusPad(focusIndex - 1);
          } else if (event.key === "Home") {
            event.preventDefault();
            focusPad(0);
          } else if (event.key === "End") {
            event.preventDefault();
            focusPad(anchors.length - 1);
          }
        }}
      >
        {anchors.map((anchor, i) => (
          <Pad
            key={anchor.key}
            ref={(el) => {
              padRefs.current[i] = el;
            }}
            anchor={anchor}
            padR={padR}
            square={anchor.key === pinOne?.key}
            hatchId={`hatch-${uid}`}
            selected={anchor.key === selectedKey}
            active={anchor.key === activeKey}
            onNet={netKeys.has(anchor.key)}
            dimmed={activeRole !== null && anchor.pin.role !== activeRole}
            tabIndex={i === focusIndex ? 0 : -1}
            onFocus={() => {
              setFocusIndex(i);
              onActiveKey(anchor.key);
            }}
            onBlur={() => onActiveKey(selectedKey)}
            onPointerEnter={() => onActiveKey(anchor.key)}
            onPointerLeave={() => onActiveKey(selectedKey)}
            onToggle={() =>
              onSelect(anchor.key === selectedKey ? null : anchor.key)
            }
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * A caret aimed at pin 1, with the numeral behind it.
 *
 * It approaches from whichever direction is free of label rails: a row running
 * down a board edge has its rail beside it, so the mark comes from above; a row
 * running along the top or bottom has its rail above or below, so the mark comes
 * from the side. Either way it lands inside the outline and never on a pad.
 */
function PinOneMark({ anchor, padR }: { anchor: PinAnchor; padR: number }) {
  const gap = padR + 13;
  const size = padR * 0.62;
  const fromAbove = anchor.side === "left" || anchor.side === "right";

  // Tip nearest the pad, base and numeral stepping away from it.
  const tipX = fromAbove ? anchor.cx : anchor.cx - gap;
  const tipY = fromAbove ? anchor.cy - gap : anchor.cy;
  const baseX = fromAbove ? tipX : tipX - size;
  const baseY = fromAbove ? tipY - size : tipY;

  const points = fromAbove
    ? [
        [tipX, tipY],
        [baseX - size * 0.8, baseY],
        [baseX + size * 0.8, baseY],
      ]
    : [
        [tipX, tipY],
        [baseX, baseY - size * 0.8],
        [baseX, baseY + size * 0.8],
      ];

  return (
    <g aria-hidden="true">
      <polygon
        points={points.map(([x, y]) => `${round(x)},${round(y)}`).join(" ")}
        fill={ANNOTATION}
        fillOpacity={0.9}
      />
      <text
        x={fromAbove ? baseX : baseX - 7}
        y={fromAbove ? baseY - 10 : baseY}
        textAnchor={fromAbove ? "middle" : "end"}
        dominantBaseline="central"
        fontSize={padR * 0.92}
        fontFamily="var(--font-technical, monospace)"
        fontWeight={700}
        fill={ANNOTATION}
      >
        1
      </text>
    </g>
  );
}

/**
 * A plated-through-hole pad: annular ring in the role's colour, the pin's
 * physical position on it, and a square outline for pin 1.
 */
function Pad({
  ref,
  anchor,
  padR,
  square,
  hatchId,
  selected,
  active,
  onNet,
  dimmed,
  tabIndex,
  onFocus,
  onBlur,
  onPointerEnter,
  onPointerLeave,
  onToggle,
}: {
  ref: (el: SVGGElement | null) => void;
  anchor: PinAnchor;
  padR: number;
  square: boolean;
  hatchId: string;
  selected: boolean;
  active: boolean;
  onNet: boolean;
  dimmed: boolean;
  tabIndex: number;
  onFocus: () => void;
  onBlur: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onToggle: () => void;
}) {
  const color = roleColors[anchor.pin.role];
  const fill = hatchedRoles.has(anchor.pin.role) ? `url(#${hatchId})` : color.fill;
  const { cx, cy } = anchor;
  // Three digits do not fit inside a pad at the two-digit size.
  const digits = String(anchor.pin.position).length;
  const numberSize = digits >= 3 ? padR * 0.72 : padR * 0.98;

  return (
    <g
      ref={ref}
      role="button"
      tabIndex={tabIndex}
      aria-pressed={selected}
      aria-label={pinAccessibleLabel(anchor.pin)}
      className="bv-pad cursor-pointer outline-none"
      style={{ opacity: dimmed ? 0.26 : 1 }}
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      {/* Generous invisible hit area for touch/mouse. */}
      <circle cx={cx} cy={cy} r={padR + 9} fill="transparent" />

      {/* Net membership: a quiet halo on every pad the probe reaches. */}
      {onNet && !active ? (
        <circle
          cx={cx}
          cy={cy}
          r={padR + 4.5}
          fill="none"
          stroke={PROBE}
          strokeOpacity={0.45}
          strokeWidth={1.5}
        />
      ) : null}

      {/* The live pad — the one the readout is describing — gets the solid ring.
          A pad that is only held gets a dashed one: while a pin is held you can
          still hover others, and two identical rings leave no way to tell which
          pad the readout belongs to. */}
      {active ? (
        <circle
          cx={cx}
          cy={cy}
          r={padR + 6}
          fill="none"
          stroke={PROBE}
          strokeWidth={2.5}
          className="bv-pad-ring"
        />
      ) : selected ? (
        <circle
          cx={cx}
          cy={cy}
          r={padR + 6}
          fill="none"
          stroke={PROBE}
          strokeOpacity={0.7}
          strokeWidth={2}
          strokeDasharray="4 4"
        />
      ) : null}

      {square ? (
        <rect
          className="bv-pad-body"
          x={cx - padR}
          y={cy - padR}
          width={padR * 2}
          height={padR * 2}
          rx={2}
          fill={fill}
          stroke={color.edge}
          strokeWidth={2}
        />
      ) : (
        <circle
          className="bv-pad-body"
          cx={cx}
          cy={cy}
          r={padR}
          fill={fill}
          stroke={color.edge}
          strokeWidth={2}
        />
      )}

      {/* Annular ring — the plating around the drill. */}
      <circle
        cx={cx}
        cy={cy}
        r={padR * 0.58}
        fill="none"
        stroke={color.edge}
        strokeOpacity={0.55}
        strokeWidth={1}
      />

      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={numberSize}
        fontFamily="var(--font-technical, monospace)"
        fontWeight={700}
        fill={color.ink}
        style={{ pointerEvents: "none" }}
      >
        {anchor.pin.position}
      </text>
    </g>
  );
}

// Finds, per group, the top-left of its strip so a title can sit above it.
function groupTitles(
  anchors: PinAnchor[],
  padR: number,
): Array<{ label: string; x: number; y: number }> {
  const byGroup = new Map<string, { minX: number; minY: number }>();
  for (const a of anchors) {
    if (!a.group) continue;
    const entry = byGroup.get(a.group);
    if (!entry) {
      byGroup.set(a.group, { minX: a.cx, minY: a.cy });
    } else {
      entry.minX = Math.min(entry.minX, a.cx);
      entry.minY = Math.min(entry.minY, a.cy);
    }
  }
  return [...byGroup.entries()].map(([label, { minX, minY }]) => ({
    label,
    x: minX - padR,
    y: minY - padR - 14,
  }));
}

/**
 * Polyline through every pad on the probed net.
 *
 * Members are walked along the connector's long axis so the line advances
 * steadily instead of doubling back — on a 2xN header the eight grounds are
 * split across two rows, and joining them in raw anchor order would drag one
 * long line back across the whole drawing.
 */
function buildNetPath(anchors: PinAnchor[], netKeys: Set<string>): string | null {
  const members = anchors.filter((anchor) => netKeys.has(anchor.key));
  if (members.length < 2) return null;
  // Ringing out a rail with a dozen taps draws a scribble rather than a net, so
  // past that point the pad halos carry the highlight on their own.
  if (members.length > 12) return null;

  const xs = members.map((m) => m.cx);
  const ys = members.map((m) => m.cy);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const alongX = spanX >= spanY;

  const sorted = [...members].sort((a, b) =>
    alongX ? a.cx - b.cx || a.cy - b.cy : a.cy - b.cy || a.cx - b.cx,
  );

  return sorted
    .map((m, i) => `${i === 0 ? "M" : "L"} ${round(m.cx)} ${round(m.cy)}`)
    .join(" ");
}

function round(v: number): number {
  return Math.round(v * 10) / 10;
}

function LeaderLabel({
  anchor,
  active,
  onNet,
  dimmed,
  stacked,
  stackedFont,
  columnWidth,
}: {
  anchor: PinAnchor;
  active: boolean;
  onNet: boolean;
  dimmed: boolean;
  stacked: boolean;
  stackedFont: number;
  columnWidth: number;
}) {
  const color = roleColors[anchor.pin.role];
  const fill = active || onNet ? PROBE : color.ink;
  const opacity = dimmed ? 0.26 : 1;

  // Connector line from the pad toward the rail (skipped for the probed pin,
  // which gets its own brighter leader drawn on top).
  const guide =
    !active && !stacked ? (
      <line
        x1={anchor.cx}
        y1={anchor.cy}
        x2={anchor.labelX}
        y2={anchor.labelY}
        stroke={ANNOTATION}
        strokeOpacity={0.32}
        strokeWidth={1}
      />
    ) : null;

  if (stacked) {
    // Function-grouped sheets stack a label under its pad, wrapped to the column
    // so a name like "18 / A4" reads as two short lines instead of one wide one.
    const lines = wrapStackedLabel(anchor.pin.label, columnWidth, stackedFont);
    return (
      <g opacity={opacity} aria-hidden="true">
        <text
          x={anchor.labelX}
          y={anchor.labelY}
          textAnchor="middle"
          fontSize={stackedFont}
          fontFamily="var(--font-technical, monospace)"
          fontWeight={active ? 700 : 500}
          fill={fill}
          className="bv-label"
        >
          {lines.map((line, i) => (
            <tspan
              key={line + i}
              x={anchor.labelX}
              dy={i === 0 ? 0 : stackedFont * LABEL_LINE_STEP}
            >
              {line}
            </tspan>
          ))}
        </text>
      </g>
    );
  }

  const transform = anchor.rotateLabel
    ? `rotate(-90 ${anchor.labelX} ${anchor.labelY})`
    : undefined;

  return (
    <g opacity={opacity} aria-hidden="true">
      {guide}
      <text
        x={anchor.labelX}
        y={anchor.labelY}
        transform={transform}
        textAnchor={anchor.labelAnchor}
        dominantBaseline="central"
        fontSize={anchor.rotateLabel ? 17 : 18}
        fontFamily="var(--font-technical, monospace)"
        fontWeight={active ? 700 : 500}
        fill={fill}
        className="bv-label"
      >
        {anchor.pin.label}
      </text>
    </g>
  );
}
