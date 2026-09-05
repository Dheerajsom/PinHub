"use client";

import { useId, useRef, useState } from "react";
import { clsx } from "clsx";
import type { PinRole } from "@/lib/boards";
import type { BoardGeometry, PinAnchor } from "@/lib/board-visual-geometry";
import { BoardArtwork } from "@/components/board-visual/BoardArtwork";
import {
  PROBE_COLOR,
  pinAccessibleLabel,
  roleColors,
} from "@/components/board-visual/roles";
import {
  LABEL_LINE_STEP,
  stackedFontSize,
  wrapStackedLabel,
} from "@/components/board-visual/label-layout";

const ANNOTATION = "#9fb0c0";

type BoardStageProps = {
  geometry: BoardGeometry;
  title: string;
  /** Board name, lettered into the outline like a PCB's silkscreen. */
  sheetLabel?: string;
  selectedKey: string | null;
  activeKey: string | null; // selected or hovered — drives the live label
  activeRole: PinRole | null;
  /**
   * Label every pad. The panel diagram leaves labels to the probe so the board
   * itself stays readable at postage-stamp size; the roomy inspector and the
   * full-page view turn them all on.
   */
  showAllLabels: boolean;
  /** Anchor keys sharing the probed pin's net. Empty when nothing is probed. */
  netKeys: Set<string>;
  onSelect: (key: string | null) => void;
  onActiveKey: (key: string | null) => void;
  className?: string;
  /** Board-only framing for the compact component viewer; labels live in its readout. */
  compact?: boolean;
};

export function BoardStage({
  geometry,
  title,
  sheetLabel,
  selectedKey,
  activeKey,
  activeRole,
  showAllLabels,
  netKeys,
  onSelect,
  onActiveKey,
  className,
  compact = false,
}: BoardStageProps) {
  const padRefs = useRef<Array<SVGGElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState(0);
  const raw = useId();
  const uid = raw.replace(/[^a-zA-Z0-9]/g, "");
  const { anchors, vbw, vbh, padR } = geometry;

  // The schematic sheet has no rails to run labels out to, so its labels are
  // stacked under each pad and are always drawn.
  const stacked = geometry.kind === "group-strips";
  const stackedFont = stackedFontSize(geometry.pitch);
  const labelled = showAllLabels || stacked;

  // Pin 1 gets a square pad — the silkscreen convention for the corner pin, and
  // the one mark that tells a reader which way round the connector is. A board
  // with several physical connectors repeats position 1, so each connector
  // carries its own square.
  const netPath = netKeys.size > 1 ? buildNetPath(anchors, netKeys) : null;
  // A 40-pin header shown at phone width leaves each pad about 16 physical
  // pixels across, so the invisible hit area is grown to tile the row: as much
  // of the gap as can be claimed without a tap landing on two pins at once.
  const hitR = geometry.artworkId
    ? geometry.pitch * 0.48
    : Math.max(padR + 9, geometry.pitch * 0.48);

  function focusPad(index: number) {
    const next = (index + anchors.length) % anchors.length;
    setFocusIndex(next);
    padRefs.current[next]?.focus();
  }

  return (
    <svg
      viewBox={compact
        ? `${geometry.body.x - 24} ${geometry.body.y - 24} ${geometry.body.w + 48} ${geometry.body.h + 55}`
        : `0 0 ${vbw} ${vbh}`}
      role="group"
      aria-label={title}
      className={clsx("bv-stage h-full w-full", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      <BoardArtwork geometry={geometry} label={sheetLabel} />

      {/* Function-block titles for the schematic sheet. */}
      {stacked
        ? groupTitles(anchors, padR).map((entry) => (
            <text
              key={`grp-${entry.label}`}
              x={entry.x}
              y={entry.y}
              fontSize={16}
              fontWeight={600}
              fontFamily="var(--font-sans, sans-serif)"
              fill={ANNOTATION}
              letterSpacing="0.14em"
              aria-hidden="true"
            >
              {entry.label.toUpperCase()}
            </text>
          ))
        : null}

      {/* The net: a hairline stitched between every pad on the probed pin's net,
          drawn beneath the pads so it reads as wiring rather than as chrome. */}
      {netPath && !compact ? (
        <path
          className="bv-net-path"
          d={netPath}
          fill="none"
          stroke={PROBE_COLOR}
          strokeOpacity={0.45}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {/* Signal labels, with a leader from the pad out to the rail. Drawn before
          the pads so the pads sit on top of their own leaders. */}
      <g>
        {anchors.map((anchor) => {
          const active = anchor.key === activeKey;
          if (compact || (!labelled && !active)) return null;
          return (
            <LeaderLabel
              key={`lbl-${anchor.key}`}
              anchor={anchor}
              active={active}
              onNet={netKeys.has(anchor.key)}
              dimmed={activeRole !== null && anchor.pin.role !== activeRole}
              showLeader={labelled && !active}
              stacked={stacked}
              stackedFont={stackedFont}
              columnWidth={geometry.pitch}
            />
          );
        })}
        {anchors.map((anchor) =>
          anchor.key === activeKey && !stacked && !compact ? (
            <line
              key={`lead-${anchor.key}`}
              x1={anchor.cx}
              y1={anchor.cy}
              x2={anchor.labelX}
              y2={anchor.labelY}
              className="bv-leader"
              stroke={PROBE_COLOR}
              strokeWidth={2.25}
              strokeLinecap="round"
            />
          ) : null,
        )}
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
        {anchors.map((anchor, index) => (
          <Pad
            key={anchor.key}
            ref={(element) => {
              padRefs.current[index] = element;
            }}
            anchor={anchor}
            padR={padR}
            hitR={hitR}
            square={anchor.pin.position === 1}
            selected={anchor.key === selectedKey}
            active={anchor.key === activeKey}
            onNet={netKeys.has(anchor.key)}
            dimmed={activeRole !== null && anchor.pin.role !== activeRole}
            tabIndex={index === focusIndex ? 0 : -1}
            uid={uid}
            realistic={Boolean(geometry.artworkId)}
            onFocus={() => {
              setFocusIndex(index);
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
 * One pin: the pad you probe. A filled disc in the role's colour with the pin's
 * physical position on it, a square for pin 1, a cyan ring when it is live, and
 * a quieter ring when it merely shares the probed pin's net.
 */
function Pad({
  ref,
  anchor,
  padR,
  hitR,
  square,
  selected,
  active,
  onNet,
  dimmed,
  tabIndex,
  uid,
  realistic,
  onFocus,
  onBlur,
  onPointerEnter,
  onPointerLeave,
  onToggle,
}: {
  ref: (element: SVGGElement | null) => void;
  anchor: PinAnchor;
  padR: number;
  /** Radius of the invisible touch/click area around the pad. */
  hitR: number;
  square: boolean;
  selected: boolean;
  active: boolean;
  onNet: boolean;
  dimmed: boolean;
  tabIndex: number;
  uid: string;
  realistic?: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onToggle: () => void;
}) {
  const colors = roleColors[anchor.pin.role];
  // Every pad emits its own gradient definition, so include the stable anchor
  // key as well as the role. Repeated power/GPIO roles must not create
  // duplicate SVG IDs or ambiguous url(#...) references.
  const gradientId = `pad-${anchor.pin.role}-${anchor.key}-${uid}`.replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  );

  return (
    <g
      ref={ref}
      role="button"
      tabIndex={tabIndex}
      aria-pressed={selected}
      aria-label={pinAccessibleLabel(anchor.pin)}
      className="bv-pad cursor-pointer outline-none"
      style={{ opacity: dimmed ? 0.28 : 1 }}
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
      {!realistic ? <defs>
        <radialGradient id={gradientId} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor={colors.edge} stopOpacity={0.45} />
          <stop offset="0.55" stopColor={colors.fill} />
          <stop offset="1" stopColor={colors.fill} />
        </radialGradient>
      </defs> : null}

      {/* Generous invisible hit area for touch and mouse. */}
      <circle cx={anchor.cx} cy={anchor.cy} r={hitR} fill="transparent" />

      {onNet && !active ? (
        <circle
          cx={anchor.cx}
          cy={anchor.cy}
          r={padR + 4}
          fill="none"
          stroke={PROBE_COLOR}
          strokeOpacity={0.45}
          strokeWidth={1.5}
        />
      ) : null}
      {active || selected ? (
        <circle
          cx={anchor.cx}
          cy={anchor.cy}
          r={padR + 6}
          fill="none"
          stroke={PROBE_COLOR}
          strokeWidth={3}
          className="bv-pad-ring"
        />
      ) : null}

      {realistic ? (
        <g pointerEvents="none">
          <rect className="bv-pad-body" x={anchor.cx - padR - 2} y={anchor.cy - padR - 2} width={padR * 2 + 4} height={padR * 2 + 4} rx="2" fill="#171f18" stroke={active || selected ? PROBE_COLOR : "#69735b"} />
          <rect x={anchor.cx - padR * 0.66} y={anchor.cy - padR * 0.66} width={padR * 1.32} height={padR * 1.32} rx={square ? 0 : 1} fill={active || selected ? "#97eff5" : "#d6bc6e"} stroke="#efdb9b" strokeWidth="1" />
          <path d={`M${anchor.cx - padR * 0.6} ${anchor.cy - padR * 0.45}h${padR * 1.1}`} stroke="#fff1b4" strokeWidth="1" />
        </g>
      ) : square ? (
        <rect
          className="bv-pad-body"
          x={anchor.cx - padR}
          y={anchor.cy - padR}
          width={padR * 2}
          height={padR * 2}
          rx={3}
          fill={`url(#${gradientId})`}
          stroke={colors.edge}
          strokeWidth={2.25}
        />
      ) : (
        <circle
          className="bv-pad-body"
          cx={anchor.cx}
          cy={anchor.cy}
          r={padR}
          fill={`url(#${gradientId})`}
          stroke={colors.edge}
          strokeWidth={2.25}
        />
      )}

      <text
        x={anchor.cx}
        y={anchor.cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={padR * 0.95}
        fontFamily="var(--font-mono, monospace)"
        fontWeight={700}
        fill={realistic ? "#15241b" : colors.ink}
        pointerEvents="none"
      >
        {anchor.pin.position}
      </text>
    </g>
  );
}

function LeaderLabel({
  anchor,
  active,
  onNet,
  dimmed,
  showLeader,
  stacked,
  stackedFont,
  columnWidth,
}: {
  anchor: PinAnchor;
  active: boolean;
  onNet: boolean;
  dimmed: boolean;
  showLeader: boolean;
  stacked: boolean;
  stackedFont: number;
  columnWidth: number;
}) {
  const colors = roleColors[anchor.pin.role];
  const fill = active ? "#eaf8ff" : onNet ? PROBE_COLOR : colors.ink;
  const opacity = dimmed ? 0.3 : 1;

  if (stacked) {
    const lines = wrapStackedLabel(anchor.pin.label, columnWidth, stackedFont);
    return (
      <g opacity={opacity} className="bv-label">
        {lines.map((line, index) => (
          <text
            key={`${anchor.key}-${index}`}
            x={anchor.labelX}
            y={anchor.labelY + index * stackedFont * LABEL_LINE_STEP}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={stackedFont}
            fontFamily="var(--font-mono, monospace)"
            fontWeight={active ? 700 : 600}
            fill={fill}
          >
            {line}
          </text>
        ))}
      </g>
    );
  }

  return (
    <g opacity={opacity}>
      {showLeader ? <Leader anchor={anchor} /> : null}
      <text
        x={anchor.labelX}
        y={anchor.labelY}
        transform={
          anchor.rotateLabel
            ? `rotate(-90 ${anchor.labelX} ${anchor.labelY})`
            : undefined
        }
        textAnchor={anchor.labelAnchor}
        dominantBaseline="central"
        fontSize={anchor.rotateLabel ? 17 : 18}
        fontFamily="var(--font-mono, monospace)"
        fontWeight={active ? 700 : 600}
        fill={fill}
        className="bv-label"
      >
        {anchor.pin.label}
      </text>
    </g>
  );
}

/**
 * The line tying a label to its pad. A short run is drawn whole; a long one —
 * the far rail on a full board — would otherwise rule twenty lines across the
 * artwork, so it is reduced to a tick at each end and the column alignment
 * carries the rest.
 */
function Leader({ anchor }: { anchor: PinAnchor }) {
  const dx = anchor.labelX - anchor.cx;
  const dy = anchor.labelY - anchor.cy;
  const length = Math.hypot(dx, dy);
  const stroke = { stroke: ANNOTATION, strokeOpacity: 0.32, strokeWidth: 1.25 };

  if (length < 220) {
    return (
      <line
        x1={anchor.cx}
        y1={anchor.cy}
        x2={anchor.labelX}
        y2={anchor.labelY}
        {...stroke}
      />
    );
  }

  const tick = 26 / length;
  return (
    <>
      <line
        x1={anchor.cx}
        y1={anchor.cy}
        x2={anchor.cx + dx * tick}
        y2={anchor.cy + dy * tick}
        {...stroke}
      />
      <line
        x1={anchor.labelX - dx * tick}
        y1={anchor.labelY - dy * tick}
        x2={anchor.labelX}
        y2={anchor.labelY}
        {...stroke}
      />
    </>
  );
}

/** Per group, the top-left of its strip, so a title can sit above it. */
function groupTitles(
  anchors: PinAnchor[],
  padR: number,
): Array<{ label: string; x: number; y: number }> {
  const byGroup = new Map<string, { minX: number; minY: number }>();
  for (const anchor of anchors) {
    if (!anchor.group) continue;
    const entry = byGroup.get(anchor.group);
    if (!entry) {
      byGroup.set(anchor.group, { minX: anchor.cx, minY: anchor.cy });
    } else {
      entry.minX = Math.min(entry.minX, anchor.cx);
      entry.minY = Math.min(entry.minY, anchor.cy);
    }
  }
  return [...byGroup.entries()].map(([label, { minX, minY }]) => ({
    label,
    x: minX - padR,
    y: minY - padR - 14,
  }));
}

/** A polyline through every pad on the probed net, in connector order. */
function buildNetPath(anchors: PinAnchor[], keys: Set<string>): string | null {
  const points = anchors
    .filter((anchor) => keys.has(anchor.key))
    .map((anchor) => `${Math.round(anchor.cx)} ${Math.round(anchor.cy)}`);
  if (points.length < 2) return null;
  return `M ${points.join(" L ")}`;
}
