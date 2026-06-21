import type { BoardGeometry } from "@/lib/board-visual-geometry";

// Renders the static, simplified board illustration: PCB outline, connector
// silhouettes, a processor block, mounting holes and the recognizable big
// connectors (USB / Ethernet / HDMI ...). Entirely decorative — hidden from
// assistive technology, which reads the pins via the overlay and the table.
export function BoardArtwork({ geometry }: { geometry: BoardGeometry }) {
  const { body, accent, headerZones, ports, chip, holes } = geometry;
  return (
    <g aria-hidden="true">
      {/* PCB body */}
      <rect
        x={body.x}
        y={body.y}
        width={body.w}
        height={body.h}
        rx={body.rx ?? 14}
        fill={accent}
        fillOpacity={0.9}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={2}
      />
      <rect
        x={body.x}
        y={body.y}
        width={body.w}
        height={body.h}
        rx={body.rx ?? 14}
        fill="url(#pcb-sheen)"
      />

      {/* Processor / module block */}
      {chip ? (
        <g>
          <rect
            x={chip.x}
            y={chip.y}
            width={chip.w}
            height={chip.h}
            rx={chip.rx ?? 6}
            fill="#0b0d12"
            fillOpacity={0.78}
            stroke="rgba(255,255,255,0.16)"
          />
          <rect
            x={chip.x + chip.w * 0.18}
            y={chip.y + chip.h * 0.22}
            width={chip.w * 0.64}
            height={chip.h * 0.56}
            rx={3}
            fill="rgba(255,255,255,0.05)"
          />
        </g>
      ) : null}

      {/* Big recognizable connectors */}
      {ports.map((port, i) => (
        <rect
          key={`${port.kind}-${i}`}
          x={port.x}
          y={port.y}
          width={port.w}
          height={port.h}
          rx={port.rx ?? 3}
          fill="#9aa3ad"
          fillOpacity={0.55}
          stroke="rgba(255,255,255,0.25)"
        />
      ))}

      {/* Connector silhouettes behind the pads */}
      {headerZones.map((zone, i) => (
        <rect
          key={`zone-${i}`}
          x={zone.x}
          y={zone.y}
          width={zone.w}
          height={zone.h}
          rx={zone.rx ?? 6}
          fill="#05070a"
          fillOpacity={0.55}
          stroke="rgba(255,255,255,0.1)"
        />
      ))}

      {/* Mounting holes */}
      {holes.map((hole, i) => (
        <circle
          key={`hole-${i}`}
          cx={hole.x}
          cy={hole.y}
          r={hole.r}
          fill="#05070a"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={2}
        />
      ))}
    </g>
  );
}
