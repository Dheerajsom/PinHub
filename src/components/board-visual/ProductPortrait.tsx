import { memo, useId } from "react";
import type { BoardGeometry } from "@/lib/board-visual-geometry";
import { boardPortrait, type PartKind } from "@/lib/board-portraits";

type PartProps = { kind: PartKind; count?: number; w: number; h: number; paint: (id: string) => string };

// Hardware landmarks use a consistent drawing scale. Socket rows and copper
// lands on a portrait have no pin numbers or hit targets.
function Landmark({ kind, w, h, count: specifiedCount, paint }: PartProps) {
  const metal = paint("metal");
  const graphite = paint("chip");
  const inset = Math.min(2.5, w / 8, h / 8);
  const rect = (fill: string, rx = inset, stroke = "#182327") => (
    <rect width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeWidth=".8" />
  );
  switch (kind) {
    case "pads":
    case "header": {
      const horizontal = w >= h;
      const pitch = Math.min(w, h) * 1.18;
      const count = specifiedCount ?? Math.max(1, Math.floor(Math.max(w, h) / pitch));
      const radius = Math.min(w, h, Math.max(w, h) / count) * 0.31;
      return (
        <>
          {kind === "header" && rect(graphite, 1)}
          {Array.from({ length: count }, (_, i) => {
            const x = horizontal ? ((i + 0.5) * w) / count : w / 2;
            const y = horizontal ? h / 2 : ((i + 0.5) * h) / count;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={radius}
                fill="#192124"
                stroke={kind === "pads" ? "#dec38b" : "#89928a"}
                strokeWidth={radius * 0.52}
              />
            );
          })}
        </>
      );
    }
    case "hole":
      return (
        <circle
          cx={w / 2}
          cy={h / 2}
          r={Math.min(w, h) * 0.39}
          fill="#162326"
          stroke="#c3b98a"
          strokeWidth="2"
        />
      );
    case "dip":
      return (
        <>
          {rect(paint("leads"), 1)}
          <rect x="1" y={h * 0.12} width={w - 2} height={h * 0.76} rx="2" fill={graphite} />
          <circle cx={w * 0.1} cy={h * 0.3} r="1.5" fill="#899596" />
        </>
      );
    case "ethernet":
      return (
        <>
          {rect(metal)}
          <path d={`M${w * 0.78} 2v${h - 4}`} stroke="#829192" strokeWidth="2" />
          <rect x={w * 0.84} y={h * 0.1} width={w * 0.09} height={h * 0.14} fill="#9aa369" />
          <rect x={w * 0.84} y={h * 0.75} width={w * 0.09} height={h * 0.14} fill="#ccb477" />
        </>
      );
    case "chip":
      return (
        <>
          {rect(paint("leads"), 1)}
          <rect x={inset} y={inset} width={w - 2 * inset} height={h - 2 * inset} rx="1.5" fill={graphite} />
          <circle cx={inset * 2} cy={inset * 2} r={inset * 0.42} fill="#899596" />
        </>
      );
    case "shield":
    case "usb":
    case "socket":
      return (
        <>
          {rect(metal, kind === "shield" ? 3 : 1.7, "#89999a")}
          <rect
            x={inset}
            y={inset}
            width={w - 2 * inset}
            height={h - 2 * inset}
            rx={inset * 0.7}
            fill="none"
            stroke="#7d8c90"
            strokeWidth=".8"
          />
          {kind === "shield" ? (
            <path
              d={`M${w * 0.2} ${h * 0.67}h${w * 0.36}m-${w * 0.36} 3h${w * 0.24}`}
              stroke="#778283"
              strokeWidth="1"
            />
          ) : (
            <>
              {[0.24, 0.68].map((at) => (
                <rect
                  key={at}
                  x={w * 0.23}
                  y={h * at}
                  width={w * 0.22}
                  height={Math.max(1.3, h * 0.075)}
                  rx=".6"
                  fill="#5a6a71"
                />
              ))}
              <path d={`M${w * 0.85} 2v${h - 4}`} stroke="#f1f3eb" strokeWidth="1.3" />
            </>
          )}
        </>
      );
    case "jack":
    case "jst":
      return (
        <>
          {rect(kind === "jst" ? "#e4ddbf" : graphite)}
          <path
            d={`M${w * 0.13} ${h * 0.13}v${h * 0.74}`}
            stroke={kind === "jst" ? "#8e876e" : "#060b10"}
            strokeWidth={w * 0.1}
          />
        </>
      );
    case "button":
      return (
        <>
          {rect(metal)}
          <rect
            x={w * 0.17}
            y={h * 0.16}
            width={w * 0.66}
            height={h * 0.68}
            rx={Math.min(w, h) * 0.2}
            fill="#434d50"
          />
        </>
      );
    case "antenna":
      return (
        <>
          {rect("#4d4a36", 1)}
          <path
            d={`M${w * 0.13} ${h * 0.86}v-${h * 0.7}h${w * 0.2}v${h * 0.51}h${w * 0.2}v-${h * 0.51}h${w * 0.2}v${h * 0.51}h${w * 0.16}`}
            stroke="#d5bc78"
            strokeWidth={Math.min(w, h) * 0.085}
            fill="none"
          />
        </>
      );
    case "lcd":
      return (
        <>
          {rect("#a86932", 3)}
          <rect x="3" y="3" width={w - 6} height={h - 6} rx="2" fill="#e8a451" />
        </>
      );
    case "screen":
      return (
        <>
          {rect("#161c21", 3)}
          <rect x="3" y="3" width={w - 6} height={h - 6} rx="2" fill={paint("glass")} />
        </>
      );
    case "sink":
    case "fan":
      return (
        <>
          {rect("#232b2c", 3)}
          <rect x="2" y="2" width={w - 4} height={h - 4} fill={paint("fins")} />
          {kind === "fan" && (
            <g transform={`translate(${w / 2} ${h / 2}) scale(${Math.min(w, h) * 0.0044})`}>
              <circle r="100" fill="#111b20" stroke="#667077" strokeWidth="3" />
              {Array.from({ length: 7 }, (_, i) => (
                <path
                  key={i}
                  transform={`rotate(${(i * 360) / 7})`}
                  d="M10 -24Q6 -79 45 -82Q72 -65 80 -43Q43 -53 23 -10Z"
                  fill="#526064"
                />
              ))}
              <circle r="25" fill="#313e42" />
            </g>
          )}
        </>
      );
    case "camera":
    case "dpad":
    case "joystick": {
      const base = kind === "joystick" ? "#3e8ac6" : kind === "dpad" ? "#de883a" : "#252d30";
      return (
        <>
          <rect width={w} height={h} rx={Math.min(w, h) * (kind === "camera" ? 0.2 : 0.48)} fill={base} />
          <ellipse
            cx={w / 2}
            cy={h / 2}
            rx={w * 0.28}
            ry={h * 0.28}
            fill={kind === "camera" ? "#111b27" : base}
            stroke="#717a77"
          />
        </>
      );
    }
    case "matrix": {
      const columns = specifiedCount ?? 12;
      const rows = columns === 5 ? 5 : 8;
      return (
        <g>
          {Array.from({ length: columns * rows }, (_, i) => (
            <rect
              key={i}
              x={(((i % columns) + 0.18) * w) / columns}
              y={((Math.floor(i / columns) + 0.18) * h) / rows}
              width={(w * 0.64) / columns}
              height={(h * 0.64) / rows}
              rx="1"
              fill="#ccaaa0"
            />
          ))}
        </g>
      );
    }
    case "proto":
      return <rect width={w} height={h} fill={paint(kind)} rx="1" />;
    case "switches":
    case "digits": {
      const count = specifiedCount ?? 4;
      const step = w / count;
      return (
        <>
          {rect(graphite, 1)}
          {Array.from({ length: count }, (_, i) => (
            <g key={i} transform={`translate(${i * step} 0) scale(${step / 12} ${h / 20})`}>
              {kind === "digits" ? (
                <path d="M3 3h7l-1 14H2L3 3zm0 7h6" fill="none" stroke="#b68c84" strokeWidth="1.6" />
              ) : (
                <rect x="3" y="4" width="6" height="12" rx="1" fill="#cbd1cd" />
              )}
            </g>
          ))}
        </>
      );
    }
    case "touch-slider":
      return rect("#151819", 2, "#a5a9a0");
    case "contacts":
      return (
        <>
          {rect("#b99b5d", 1)}
          <rect width={w} height={h} fill={paint("contacts")} />
          {[0.09, 0.29, 0.49, 0.69, 0.91].map((x) => (
            <circle
              key={x}
              cx={w * x}
              cy={h * 0.6}
              r={h * 0.27}
              stroke="#d8bd79"
              strokeWidth={h * 0.15}
              fill="#182427"
            />
          ))}
        </>
      );
  }
}

// On dual-edge modules USB defines the rotation. Use the catalog's real pads
// in place of the portrait's decorative edge strips.
function packageMark(id: string, kind: PartKind): string | undefined {
  if (kind === "shield") {
    if (id.startsWith("seeed-xiao-")) return "Seeed Studio";
    if (id.startsWith("esp32-") || id.startsWith("esp8684-")) return "ESPRESSIF";
  }
  if (kind === "dip" && id === "arduino-uno-rev3") return "ATMEGA328P";
  if (kind === "chip" && id.startsWith("stm32-nucleo-")) return "ST";
  if (kind === "chip" && id.startsWith("digilent-")) return "XILINX";
}

export const ProductDrawing = memo(function ProductDrawing({
  id,
  mapped = false,
}: {
  id: string;
  mapped?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const model = boardPortrait(id);
  if (!model) return null;
  const w = 320,
    h = w / model.aspect;
  const paint = (key: string) => `url(#portrait-${uid}-${key})`;
  const key = (s: string) => `portrait-${uid}-${s}`;
  const radius =
    Math.min(w, h) * (model.outline === "case" ? 0.115 : model.outline === "beagle" ? 0.12 : 0.045);
  const outline =
    model.outline === "shield"
      ? `M4 0H${w * 0.9}l6 6h${w * 0.1 - 10}v${h * 0.73}l-6 6v${h * 0.27 - 16}H4Q0 ${h - 4} 0 ${h - 8}V5Q0 0 4 0Z`
      : undefined;
  return (
    <g aria-hidden="true" data-product-artwork={id}>
      <defs>
        <linearGradient id={key("metal")} x2=".28" y2="1">
          <stop stopColor="#e9edeb" />
          <stop offset=".45" stopColor="#c2cccf" />
          <stop offset="1" stopColor="#85969b" />
        </linearGradient>
        <linearGradient id={key("chip")} x2=".5" y2="1">
          <stop stopColor="#485055" />
          <stop offset="1" stopColor="#1a2229" />
        </linearGradient>
        <linearGradient id={key("glass")} x2="1" y2=".75">
          <stop stopColor="#405661" />
          <stop offset=".48" stopColor="#22343e" />
          <stop offset="1" stopColor="#15232c" />
        </linearGradient>
        <linearGradient id={key("mask")} x2=".45" y2="1">
          <stop stopColor="#fff" stopOpacity=".1" />
          <stop offset="1" stopColor="#00151c" stopOpacity=".2" />
        </linearGradient>
        <pattern id={key("leads")} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="#354249" />
          <path d="M0 0h2v2H0z" fill="#b4bdba" />
        </pattern>
        <pattern id={key("fins")} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M1 0v6" stroke="#657275" strokeWidth="2" />
        </pattern>
        <pattern id={key("proto")} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.6" stroke="#b5b6a8" fill="#202928" />
        </pattern>
        <pattern id={key("contacts")} width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M2 0v8" stroke="#ead191" strokeWidth="4" />
        </pattern>
      </defs>
      <g strokeLinejoin="round">
        {outline ? (
          <>
            <path d={outline} fill={model.color} />
            <path d={outline} fill={paint("mask")} stroke="#82908a" />
          </>
        ) : (
          <>
            <rect width={w} height={h} rx={radius} fill={model.color} />
            <rect width={w} height={h} rx={radius} fill={paint("mask")} stroke="#899790" strokeWidth="1.2" />
          </>
        )}
        {id.startsWith("stm32-nucleo-") && model.aspect < 1 && (
          <g stroke="#85989a" fill="#475c61">
            <path d={`M0 ${h * 0.28}h${w}`} strokeDasharray="5 4" fill="none" />
            <text x={w * 0.12} y={h * 0.24} fontSize="11" stroke="none" fontFamily="monospace">
              ST-LINK
            </text>
          </g>
        )}
        {model.parts.map(([kind, x, y, width, height, count], i) =>
          mapped && kind === "pads" ? null : (
            <g key={i} transform={`translate(${(w * x) / 100} ${(h * y) / 100})`}>
              <Landmark
                kind={kind}
                count={count}
                w={(w * width) / 100}
                h={(h * height) / 100}
                paint={paint}
              />
              {packageMark(id, kind) && (
                <text
                  x={(w * width) / 200}
                  y={(h * height) / 190}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min((w * width) / 1000, (h * height) / 600)}
                  fontFamily="monospace"
                  fill={kind === "shield" ? "#43525a" : "#c5cdca"}
                >
                  {packageMark(id, kind)}
                </text>
              )}
            </g>
          ),
        )}
      </g>
    </g>
  );
});

export function ProductPortrait({ id, name }: { id: string; name: string }) {
  const model = boardPortrait(id);
  if (!model) return null;
  return (
    <figure className="product-portrait">
      <svg
        role="img"
        aria-label={`Simplified illustration of ${name}`}
        viewBox={`-15 -12 350 ${320 / model.aspect + 24}`}
      >
        <ProductDrawing id={id} />
      </svg>
      <figcaption>{name}</figcaption>
    </figure>
  );
}

export function ModuleArtwork({ id, geometry }: { id: string; geometry: BoardGeometry }) {
  const model = boardPortrait(id);
  if (!model) return null;
  const h = 320 / model.aspect;
  const { x, y, w, h: height } = geometry.body;
  const rotate =
    geometry.usbEdge === "bottom" ? `translate(0 320) rotate(-90)` : `translate(${h} 0) rotate(90)`;
  return (
    <g transform={`translate(${x} ${y}) scale(${w / h} ${height / 320}) ${rotate}`}>
      <ProductDrawing id={id} mapped />
    </g>
  );
}
