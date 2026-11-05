import type { FamilyLayout } from "@/lib/board-family-art";

// Draws the family features placed by `layoutFamilyArt`. Decorative only: the
// parent artwork group is aria-hidden, and nothing here carries a pin.
// Inks reuse the generic artwork's materials (metal, silicon, silkscreen) so a
// family feature reads as part of the same board, not as a sticker on it.

const SILK = "#dfe6ec";
const COPPER = "#c6873f";
const CAPS = { black: "#1d2127", blue: "#2f6fb5", white: "#e8ebe6" } as const;

export function FamilyArtwork({ layout, metal, silicon }: {
  layout: FamilyLayout;
  /** Gradient ids from the host artwork. */
  metal: string;
  silicon: string;
}) {
  return (
    <g data-family-art="">
      {layout.features.map((feature, index) => {
        switch (feature.kind) {
          case "rf-module":
            return (
              <g key={index} data-feature="rf-module">
                <rect x={feature.rect.x} y={feature.rect.y + 2} width={feature.rect.w} height={feature.rect.h} rx={3} fill="#000" fillOpacity={0.35} />
                <rect x={feature.rect.x} y={feature.rect.y} width={feature.rect.w} height={feature.rect.h} rx={3} fill="#1a2b24" stroke="#000" strokeOpacity={0.5} />
                <rect x={feature.can.x} y={feature.can.y} width={feature.can.w} height={feature.can.h} rx={2.5} fill={`url(#${metal})`} stroke="#5c646d" strokeWidth={0.8} />
                <rect x={feature.can.x + 4} y={feature.can.y + 4} width={Math.max(feature.can.w - 8, 0)} height={Math.max(feature.can.h - 8, 0)} rx={2} fill="none" stroke="#ffffff" strokeOpacity={0.22} />
                {feature.meander ? (
                  <path d={feature.meander} fill="none" stroke={COPPER} strokeOpacity={0.8} strokeWidth={2.4} strokeLinejoin="round" />
                ) : null}
              </g>
            );
          case "button": {
            const { rect } = feature;
            const r = rect.w * 0.3;
            return (
              <g key={index} data-feature="button">
                <rect x={rect.x} y={rect.y + 1.5} width={rect.w} height={rect.h} rx={2} fill="#000" fillOpacity={0.4} />
                <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={2} fill={`url(#${metal})`} stroke="#4b525b" strokeWidth={0.8} />
                <circle cx={rect.x + rect.w / 2} cy={rect.y + rect.h / 2} r={r} fill={CAPS[feature.cap]} stroke="#000" strokeOpacity={0.45} />
                <circle cx={rect.x + rect.w / 2 - r * 0.3} cy={rect.y + rect.h / 2 - r * 0.3} r={r * 0.32} fill="#fff" fillOpacity={0.18} />
                {feature.label ? (
                  <text x={rect.x + rect.w / 2} y={rect.y + rect.h + Math.max(rect.w * 0.45, 11)} textAnchor="middle" fontSize={Math.max(rect.w * 0.38, 10)}
                    fontFamily="var(--font-mono, monospace)" fontWeight={700} fill={SILK} fillOpacity={0.5}>{feature.label}</text>
                ) : null}
              </g>
            );
          }
          case "led-matrix":
            return (
              <g key={index} data-feature="led-matrix">
                {feature.leds.map((led, i) => (
                  <rect key={i} x={led.x} y={led.y} width={led.w} height={led.h} rx={0.8} fill="#f1e5d2" fillOpacity={0.85} stroke="#000" strokeOpacity={0.35} strokeWidth={0.6} />
                ))}
              </g>
            );
          case "debug-section":
            return (
              <g key={index} data-feature="debug-section">
                <line {...feature.rule} stroke={SILK} strokeOpacity={0.32} strokeWidth={1.5} strokeDasharray="12 9" />
                <rect x={feature.chip.x} y={feature.chip.y} width={feature.chip.w} height={feature.chip.h} rx={2} fill={`url(#${silicon})`} stroke="#000" strokeOpacity={0.6} />
                <text x={feature.labelAt.x} y={feature.labelAt.y} textAnchor="middle" dominantBaseline="middle" fontSize={feature.labelAt.size}
                  fontFamily="var(--font-mono, monospace)" fontWeight={700} letterSpacing="0.12em" fill={SILK} fillOpacity={0.4}>{feature.label}</text>
              </g>
            );
          case "soc":
            return (
              <g key={index} data-feature="soc">
                <rect x={feature.rect.x} y={feature.rect.y + 3} width={feature.rect.w} height={feature.rect.h} rx={feature.rect.rx} fill="#000" fillOpacity={0.4} />
                <rect x={feature.rect.x} y={feature.rect.y} width={feature.rect.w} height={feature.rect.h} rx={feature.rect.rx} fill={`url(#${silicon})`} stroke="#000" strokeOpacity={0.6} />
                <rect x={feature.rect.x + feature.rect.w * 0.16} y={feature.rect.y + feature.rect.h * 0.16} width={feature.rect.w * 0.68} height={feature.rect.h * 0.68} rx={4} fill={`url(#${metal})`} fillOpacity={0.85} />
                <rect x={feature.memory.x} y={feature.memory.y} width={feature.memory.w} height={feature.memory.h} rx={feature.memory.rx} fill={`url(#${silicon})`} stroke="#000" strokeOpacity={0.6} />
              </g>
            );
          case "heatsink":
            return (
              <g key={index} data-feature="heatsink">
                <rect x={feature.rect.x} y={feature.rect.y + 4} width={feature.rect.w} height={feature.rect.h} rx={feature.rect.rx} fill="#000" fillOpacity={0.45} />
                <rect x={feature.rect.x} y={feature.rect.y} width={feature.rect.w} height={feature.rect.h} rx={feature.rect.rx} fill="#2a2f35" stroke="#000" strokeOpacity={0.6} />
                {feature.fins.map((fin, i) => (
                  <rect key={i} x={fin.x} y={fin.y} width={fin.w} height={fin.h} rx={1} fill={`url(#${metal})`} fillOpacity={0.55} />
                ))}
                <circle cx={feature.fan.cx} cy={feature.fan.cy} r={feature.fan.r} fill="#121519" stroke="#555d66" strokeWidth={2} />
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <path key={angle} d={`M${feature.fan.cx} ${feature.fan.cy} q ${feature.fan.r * 0.5} ${-feature.fan.r * 0.25} ${feature.fan.r * 0.86} 0`}
                    transform={`rotate(${angle} ${feature.fan.cx} ${feature.fan.cy})`} fill="none" stroke="#6b737c" strokeWidth={3} strokeLinecap="round" />
                ))}
                <circle cx={feature.fan.cx} cy={feature.fan.cy} r={feature.fan.r * 0.22} fill="#2a2f35" />
              </g>
            );
          case "boot-jumpers":
            return (
              <g key={index} data-feature="boot-jumpers">
                {feature.blocks.map((block, i) => (
                  <rect key={`b${i}`} x={block.x} y={block.y} width={block.w} height={block.h} rx={1.5} fill="#0b0d10" stroke="#000" strokeOpacity={0.6} />
                ))}
                {feature.caps.map((cap, i) => (
                  <rect key={`c${i}`} x={cap.x} y={cap.y} width={cap.w} height={cap.h} rx={1.5} fill="#d9b23a" stroke="#7a5f17" strokeWidth={0.8} />
                ))}
              </g>
            );
        }
      })}
    </g>
  );
}
