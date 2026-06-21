"use client";

import { useRef, useState } from "react";
import { clsx } from "clsx";
import type { PinRole } from "@/lib/boards";
import type { BoardGeometry, PinAnchor } from "@/lib/board-visual-geometry";
import { BoardArtwork } from "@/components/board-visual/BoardArtwork";
import { pinAccessibleLabel, roleSvgColors } from "@/components/board-visual/roles";

type BoardStageProps = {
  geometry: BoardGeometry;
  title: string;
  selectedKey: string | null;
  activeKey: string | null; // selected or hovered — drives the live label
  activeRole: PinRole | null;
  showAllLabels: boolean;
  onSelect: (key: string | null) => void;
  onActiveKey: (key: string | null) => void;
  className?: string;
};

export function BoardStage({
  geometry,
  title,
  selectedKey,
  activeKey,
  activeRole,
  showAllLabels,
  onSelect,
  onActiveKey,
  className,
}: BoardStageProps) {
  const padRefs = useRef<Array<SVGGElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState(0);
  const { anchors, vbw, vbh, padR } = geometry;

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
        <linearGradient id="pcb-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      <BoardArtwork geometry={geometry} />

      {/* Leader lines + labels: all in expanded mode, only the active pin
          otherwise. Drawn before pads so pads sit on top. */}
      <g>
        {anchors.map((anchor) => {
          const show = showAllLabels || anchor.key === activeKey;
          if (!show) return null;
          const dimmed =
            activeRole !== null && anchor.pin.role !== activeRole;
          return (
            <LeaderLabel
              key={`lbl-${anchor.key}`}
              anchor={anchor}
              active={anchor.key === activeKey}
              dimmed={dimmed}
              showAll={showAllLabels}
            />
          );
        })}
        {anchors.map((anchor) => {
          if (anchor.key !== activeKey) return null;
          return (
            <line
              key={`lead-${anchor.key}`}
              x1={anchor.cx}
              y1={anchor.cy}
              x2={anchor.labelX}
              y2={anchor.labelY}
              className="bv-leader"
              stroke="#22d3ee"
              strokeWidth={3}
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
        {anchors.map((anchor, i) => {
          const colors = roleSvgColors[anchor.pin.role];
          const isSelected = anchor.key === selectedKey;
          const isActive = anchor.key === activeKey;
          const dimmed = activeRole !== null && anchor.pin.role !== activeRole;
          return (
            <g
              key={anchor.key}
              ref={(el) => {
                padRefs.current[i] = el;
              }}
              role="button"
              tabIndex={i === focusIndex ? 0 : -1}
              aria-pressed={isSelected}
              aria-label={pinAccessibleLabel(anchor.pin)}
              className="bv-pad cursor-pointer outline-none"
              style={{ opacity: dimmed ? 0.32 : 1 }}
              onFocus={() => {
                setFocusIndex(i);
                onActiveKey(anchor.key);
              }}
              onBlur={() => onActiveKey(selectedKey)}
              onPointerEnter={() => onActiveKey(anchor.key)}
              onPointerLeave={() => onActiveKey(selectedKey)}
              onClick={() => onSelect(isSelected ? null : anchor.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(isSelected ? null : anchor.key);
                }
              }}
            >
              {/* Generous invisible hit area for touch/mouse. */}
              <circle cx={anchor.cx} cy={anchor.cy} r={padR + 9} fill="transparent" />
              {(isSelected || isActive) && (
                <circle
                  cx={anchor.cx}
                  cy={anchor.cy}
                  r={padR + 6}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth={3}
                  className="bv-pad-ring"
                />
              )}
              <circle
                cx={anchor.cx}
                cy={anchor.cy}
                r={padR}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={2.5}
              />
              <text
                x={anchor.cx}
                y={anchor.cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontFamily="var(--font-mono, monospace)"
                fontWeight={700}
                fill={colors.text}
              >
                {anchor.pin.position}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function LeaderLabel({
  anchor,
  active,
  dimmed,
  showAll,
}: {
  anchor: PinAnchor;
  active: boolean;
  dimmed: boolean;
  showAll: boolean;
}) {
  const colors = roleSvgColors[anchor.pin.role];
  const text = anchor.pin.label;
  const fontSize = anchor.rotateLabel ? 17 : 18;
  const fill = active ? "#e0fbff" : colors.text;
  const opacity = dimmed ? 0.3 : 1;

  // Connector line from pad edge toward the rail (skipped for the active pin,
  // which gets its own bright cyan leader on top).
  const guide =
    showAll && !active ? (
      <line
        x1={anchor.cx}
        y1={anchor.cy}
        x2={anchor.labelX}
        y2={anchor.labelY}
        stroke="rgba(148,163,184,0.4)"
        strokeWidth={1.5}
      />
    ) : null;

  const transform = anchor.rotateLabel
    ? `rotate(-90 ${anchor.labelX} ${anchor.labelY})`
    : undefined;

  return (
    <g opacity={opacity}>
      {guide}
      <text
        x={anchor.labelX}
        y={anchor.labelY}
        transform={transform}
        textAnchor={anchor.rotateLabel ? "start" : anchor.labelAnchor}
        dominantBaseline="central"
        fontSize={fontSize}
        fontFamily="var(--font-mono, monospace)"
        fontWeight={active ? 700 : 600}
        fill={fill}
        className="bv-label"
      >
        {text}
      </text>
    </g>
  );
}
