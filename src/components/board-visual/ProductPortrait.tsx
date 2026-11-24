import { memo, useId } from "react";
import type { BoardGeometry } from "@/lib/board-visual-geometry";
import { boardPortrait, type BoardPortrait, type PartKind } from "@/lib/board-portraits";

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
    case "test-pads":
    case "header-2x":
    case "header": {
      const horizontal = w >= h;
      const exposed = kind === "pads" || kind === "test-pads";
      const rows = kind === "header-2x" ? 2 : 1;
      const pitch = Math.min(w, h) / rows * 1.18;
      const count = specifiedCount ?? Math.max(1, Math.floor(Math.max(w, h) / pitch));
      const radius = Math.min(Math.min(w, h) / rows, Math.max(w, h) / count) * 0.31;
      return (
        <>
          {!exposed && rect(graphite, 1)}
          {Array.from({ length: count * rows }, (_, i) => {
            const along = ((i % count) + 0.5) / count;
            const across = (Math.floor(i / count) + 0.5) / rows;
            const x = w * (horizontal ? along : across);
            const y = h * (horizontal ? across : along);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={radius}
                fill="#192124"
                stroke={exposed ? "#dec38b" : "#89928a"}
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
      return <>
        {rect(metal)}
        <rect x={inset} y={inset} width={w - 2 * inset} height={h * .58} rx="1.2" fill="none" stroke="#f0f2eb" strokeWidth="1" />
        <path d={`M${w * .18} ${h * .97}v-${h * .19}h${w * .17}v-${h * .09}h${w * .3}v${h * .09}h${w * .17}v${h * .19}Z`} fill="#233037" stroke="#6e8083" />
        <rect x={w * .24} y={h * .86} width={w * .52} height={h * .08} fill={paint("contacts")} />
        <rect x={w * .05} y={h * .80} width={w * .08} height={h * .1} fill="#92ae73" />
        <rect x={w * .87} y={h * .80} width={w * .08} height={h * .1} fill="#d4ba70" />
      </>;
    case "chip":
    case "bga":
    case "memory":
      return (
        <>
          <rect x="-1.7" y="-1.7" width={w + 3.4} height={h + 3.4} rx="1.5" fill="none" stroke="#d8dbbd" strokeWidth=".7" opacity=".8" />
          {rect(kind === "chip" ? paint("leads") : "#17262d", 1)}
          <rect x={inset} y={inset} width={w - 2 * inset} height={h - 2 * inset} rx="1.5" fill={graphite} stroke="#536063" strokeWidth=".5" />
          {kind === "bga" && <rect x={w * .18} y={h * .21} width={w * .64} height={h * .58} rx="1" fill="#263239" stroke="#5d6b71" strokeWidth=".6" />}
          <circle cx={inset * 2} cy={inset * 2} r={inset * 0.42} fill="#899596" />
        </>
      );
    case "mezzanine":
    case "ribbon": {
      const vertical = h > w;
      const length = vertical ? h : w;
      const depth = vertical ? w : h;
      return <g transform={vertical ? `translate(${w} 0) rotate(90)` : undefined}>
        <rect width={length} height={depth} rx="1" fill={kind === "ribbon" ? "#e3dfcf" : "#343a3e"} stroke="#9b9c91" strokeWidth=".7" />
        <rect x="1" y="1" width={length - 2} height={depth * .42} fill={paint("contacts")} />
        <rect x="2" y={depth * .58} width={length - 4} height={depth * .38} fill={kind === "ribbon" ? "#303a40" : paint("contacts")} />
      </g>;
    }
    case "hdmi":
    case "usb-c":
    case "microsd":
      return <>
        {rect(metal, kind === "usb-c" ? Math.min(w, h) * .22 : 1.3, "#71868c")}
        <rect x={inset} y={inset} width={w - 2 * inset} height={h - 2 * inset} rx={inset * .7} fill="none" stroke="#ebeeee" strokeWidth=".8" />
        {kind === "microsd" ? (
          <path d={`M${w * .13} ${h * .19}h${w * .45}v${h * .07}H${w * .22}m0 ${h * .48}h${w * .4}`} fill="none" stroke="#77898c" strokeWidth="1.3" />
        ) : (
          <>
            <path d={`M${w * .12} ${h * .29}h${w * .13}m${w * .50} 0h${w * .13}`} stroke="#56666d" strokeWidth={Math.max(1, h * .07)} />
            <rect x={w * .09} y={h * .78} width={w * .82} height={h * .14} rx={h * .06} fill="#283239" />
            <path d={`M${w * .22} ${h * .85}h${w * .56}`} stroke={kind === "hdmi" ? "#c4a36f" : "#9cafb0"} strokeWidth=".9" />
          </>
        )}
      </>;
    case "shield":
      return <>
        {rect(metal, 3, "#96a0a2")}
        <rect x={inset} y={inset} width={w - 2 * inset} height={h - 2 * inset} rx="2" fill="none" stroke="#f4f5ed" strokeWidth="1" />
        {[.2, .5, .8].map(at => <g key={at} fill="#738087">
          <rect x=".4" y={h * at} width={inset * .7} height={h * .05} />
          <rect x={w - inset} y={h * at} width={inset * .7} height={h * .05} />
        </g>)}
        <path d={`M${w * .2} ${h * .71}h${w * .30}m-${w * .3} 2h${w * .20}`} stroke="#778283" fill="none" />
      </>;
    case "usb":
    case "socket":
      return <>
        {rect(metal, 1.8, "#81949a")}
        <path d={`M2 ${h * .58}V2h${w - 4}v${h * .56}`} fill="none" stroke="#e6eae8" strokeWidth="1.1" />
        {[.25, .62].map(at => <rect key={at} x={w * at} y={h * .28} width={w * .13} height={h * .12} rx=".7" fill="#5a6970" />)}
        <rect x={w * .08} y={h * .75} width={w * .84} height={h * .18} rx="1.1" fill="#263139" />
        <rect x={w * .15} y={h * .82} width={w * .70} height={h * .055} rx=".8" fill="#a9b8bf" />
      </>;
    case "jack":
      return <>
        {rect(graphite)}
        <path d={`M2 ${h * .67}V2h${w - 4}v${h * .65}`} stroke="#718085" fill="none" />
        <ellipse cx={w * .5} cy={h * .80} rx={w * .34} ry={h * .13} fill="#101a22" stroke="#9badae" strokeWidth="1.2" />
      </>;
    case "jst":
      return <>
        {rect("#e2ddc9", 1.4, "#a9aa9e")}
        <rect x={w * .13} y={h * .22} width={w * .74} height={h * .57} fill="#787b71" />
        <path d={`M${w * .22} ${h * .46}h${w * .56}`} stroke="#e5dfca" strokeWidth={Math.max(1, h * .12)} />
        <rect x={w * .30} y={h * .78} width={w * .4} height={h * .19} fill="#f4f0e4" />
      </>;
    case "jst-sh":
      return <>
        {rect("#434a4d", 1.2, "#243034")}
        <rect x={w * .08} y={h * .06} width={w * .84} height={h * .43} rx="1" fill={metal} />
        <rect x={w * .1} y={h * .58} width={w * .8} height={h * .35} rx=".7" fill="#151e24" />
        {[.24, .41, .58, .75].map(at => <rect key={at} x={w * at} y={h * .69} width={w * .04} height={h * .13} fill="#c3b798" />)}
      </>;
    case "button":
      return <>
        {rect(metal)}
        <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * .35} fill="#343d40" stroke="#778285" strokeWidth=".9" />
        <path d={`M1 ${h * .17}h${w * .13}m${w * .69} ${h * .65}h${w * .12}`} stroke="#616c6f" />
      </>;
    case "crystal":
      return <>
        {rect("#353e43", h * .30)}
        <rect x="1" y="1" width={w - 2} height={h - 2} rx={Math.min(w,h) * .35} fill={metal} stroke="#dfe4df" />
      </>;
    case "capacitor":
      return <>
        <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * .49} fill="#343f47" />
        <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * .39} fill={metal} stroke="#8d9d9e" />
        <path d={`M${w * .33} ${h * .36}l${w * .33} ${h * .28}m-${w * .33} 0l${w * .33} -${h * .28}`} stroke="#758689" strokeWidth=".65" />
      </>;
    case "led":
      return <>{rect(metal, .5)}<rect x={w * .13} y={h * .17} width={w * .74} height={h * .66} rx=".6" fill="#c5b37a" /></>;
    case "rf-socket": {
      const radius = Math.min(w, h) * .38;
      return <>
        {rect("#c9bb96", .7)}
        <circle cx={w / 2} cy={h / 2} r={radius} fill="#ece8d9" stroke="#b69a5e" strokeWidth={radius * .38} />
        <circle cx={w / 2} cy={h / 2} r={radius * .21} fill="#b4995a" />
      </>;
    }
    case "ceramic-antenna":
      return <>
        {rect(metal, .8)}
        <rect x={w * .08} y={h * .13} width={w * .84} height={h * .74} fill="#b8ab94" />
      </>;
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
    case "dpad":
      return <g transform={`scale(${w / 40} ${h / 40})`}>
        <ellipse cx="20" cy="20" rx="19" ry="19" fill="#db863c" stroke="#a45d26" />
        <circle cx="20" cy="20" r="7" fill="#ed9d53" stroke="#a8642b" />
        {[0, 90, 180, 270].map(angle => <path key={angle} d="m17 9 3-4 3 4" transform={`rotate(${angle} 20 20)`} fill="none" stroke="#85481f" strokeWidth="1.5" />)}
      </g>;
    case "camera": {
      const radius = Math.min(w, h) * .38;
      return <>
        {rect(graphite, radius * .38)}
        <g transform={`translate(${w / 2} ${h / 2})`}>
          <circle r={radius} fill="#20272c" stroke="#5c6870" strokeWidth={radius * .12} />
          <circle r={radius * .69} fill="#111b27" stroke="#53656c" strokeWidth={radius * .08} />
          <circle r={radius * .40} fill={paint("glass")} />
          <circle cx={-radius * .2} cy={-radius * .22} r={radius * .11} fill="#91b1bf" />
        </g>
      </>;
    }
    case "joystick":
      return <>
        <rect width={w} height={h} rx={Math.min(w, h) * .48} fill="#3e8ac6" />
        <ellipse cx={w / 2} cy={h / 2} rx={w * .28} ry={h * .28} fill="#3e8ac6" stroke="#717a77" />
      </>;
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

// Small passive banks alongside packages give scale to the assembly. Keep
// these illustrative details clear of every curated footprint and board edge.
function PackageDetails({ model, height, paint }: { model: BoardPortrait; height: number; paint: (id: string) => string }) {
  const footprints = model.parts.map(([kind, x, y, w, h]) => ({
    kind, x: x * 3.2, y: y * height / 100, w: w * 3.2, h: h * height / 100,
  }));
  const banks = footprints.flatMap(({ kind, x, y, w, h }) => {
    if (!["chip", "bga", "memory", "dip", "shield"].includes(kind)) return [];
    const length = Math.min(w, 39);
    return [
      { x, y: y - 7, w: length, h: 4 },
      { x: x + w - length, y: y + h + 3, w: length, h: 4 },
    ];
  }).filter(bank => bank.x > 3 && bank.y > 3 && bank.x + bank.w < 317 && bank.y + bank.h < height - 3 &&
    footprints.every(part => bank.x + bank.w + 1 <= part.x || bank.x >= part.x + part.w + 1 ||
      bank.y + bank.h + 1 <= part.y || bank.y >= part.y + part.h + 1));
  // Short package escapes end at vias. They describe the PCB finish only;
  // the interactive net overlay is drawn separately from the real pin data.
  return <>
    {footprints.filter(part => ["chip", "bga", "memory"].includes(part.kind)).map(({ x, y, w, h }, i) => (
      <g key={i} transform={`translate(${x + w} ${y + h * .18})`} stroke="#a3c2ad" strokeWidth=".6" opacity=".34">
        {Array.from({ length: 5 }, (_, j) => {
          const along = Math.min(12, 310 - x - w) - j * .65;
          if (along < 4) return null;
          const top = j * Math.min(2.6, h * .12);
          return <g key={j}>
            <path d={`M0 ${top}h${along * .48}l3 -3h${along * .52}`} fill="none" />
            <circle cx={along + 3} cy={top - 3} r=".8" fill="#182b30" />
          </g>;
        })}
      </g>
    ))}
    {banks.map(({ x, y, w, h }, i) => <rect key={i} x={x} y={y} width={w} height={h} fill={paint("passives")} />)}
  </>;
}

function packageMark(id: string, kind: PartKind): string | undefined {
  if (kind === "shield") {
    if (id.startsWith("seeed-xiao-")) return "Seeed Studio";
    if (id.startsWith("esp32-") || id.startsWith("esp8684-")) return "ESPRESSIF";
  }
  if (kind === "dip" && id === "arduino-uno-rev3") return "ATMEGA328P";
  if (kind === "chip" && id.startsWith("stm32-nucleo-")) return "ST";
  if (kind === "chip" && id.startsWith("digilent-")) return "XILINX";
}

// Port artwork is drawn looking toward the bottom edge. Turn its opening
// toward the board edge recorded by the part's position.
const edgeConnectors = new Set<PartKind>(["usb", "usb-c", "socket", "ethernet", "hdmi", "jack", "microsd", "jst", "jst-sh"]);
function portPlacement(kind: PartKind, x: number, y: number, w: number, h: number, boardHeight: number) {
  if (edgeConnectors.has(kind)) {
    const right = 320 - x - w;
    const bottom = boardHeight - y - h;
    const edge = Math.min(x, y, right, bottom);
    if (edge === x) return { w: h, h: w, transform: `translate(${w} 0) rotate(90)` };
    if (edge === right) return { w: h, h: w, transform: `translate(0 ${h}) rotate(-90)` };
    if (edge === y) return { w, h, transform: `translate(${w} ${h}) rotate(180)` };
  }
  return { w, h, transform: undefined };
}

export const ProductDrawing = memo(function ProductDrawing({
  id,
  mapped = false,
  textRotation = 0,
}: {
  id: string;
  mapped?: boolean;
  textRotation?: number;
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
          <stop offset=".16" stopColor="#afbcc1" />
          <stop offset=".49" stopColor="#d8e0df" />
          <stop offset=".78" stopColor="#b1bdc1" />
          <stop offset="1" stopColor="#798b91" />
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
        <pattern id={key("passives")} width="6.5" height="4" patternUnits="userSpaceOnUse">
          <rect width="3.9" height="4" rx=".5" fill="#c8ccc4" />
          <rect x=".4" y=".8" width="3.1" height="2.4" fill="#a18b65" />
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
        {model.outline !== "case" && <PackageDetails model={model} height={h} paint={paint} />}
        {id === "orange-pi-5" && (
          <g fill="#e8edf0" fontFamily="monospace">
            <text x={w * .588} y={h * .32} fontSize="8" fontWeight="bold">Orange Pi 5</text>
            <text x={w * .586} y={h * .372} fontSize="4.6">V1.3.2</text>
            <text x={w * .493} y={h * .105} fontSize="4.2">UART</text>
            <text x={w * .32} y={h * .832} fontSize="4">HDMI</text>
          </g>
        )}
        {model.parts.map(([kind, x, y, width, height, detail], i) => {
          if (mapped && kind === "pads") return null;
          const mark = typeof detail === "string" ? detail : packageMark(id, kind);
          const pw = w * width / 100;
          const ph = h * height / 100;
          const port = portPlacement(kind, w * x / 100, h * y / 100, pw, ph, h);
          const markWidth = textRotation ? ph : pw;
          const markHeight = textRotation ? pw : ph;
          const modelLine = kind === "shield" && id.startsWith("seeed-xiao-")
            ? `XIAO ${id.slice("seeed-xiao-".length).replace("-sense", "").toUpperCase()}`
            : kind === "shield" && mark === "ESPRESSIF" ? id.split("-").slice(0, 2).join("-").replace(/-devkit.*/i, "").toUpperCase() : undefined;
          return (
            <g key={i} data-landmark={kind} transform={`translate(${(w * x) / 100} ${(h * y) / 100})`}>
              <g transform={port.transform}><Landmark
                kind={kind}
                count={typeof detail === "number" ? detail : undefined}
                w={port.w}
                h={port.h}
                paint={paint}
              /></g>
              {mark && (
                <g transform={`translate(${pw / 2} ${ph / 2}) rotate(${textRotation})`}>
                <text
                  y={modelLine ? -markHeight * .09 : 0}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(markWidth * 1.35 / mark.length, markHeight * .18)}
                  fontFamily="monospace"
                  fill={kind === "shield" ? "#43525a" : "#c5cdca"}
                >
                  {mark}
                </text>
                {modelLine && <text y={markHeight * .15} textAnchor="middle" fontFamily="monospace" fontSize={Math.min(markWidth * 1.36 / modelLine.length, markHeight * .16)} fill="#43525a">{modelLine}</text>}
                </g>
              )}
            </g>
          );
        })}
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

export function MappedProductArtwork({ id, geometry }: { id: string; geometry: BoardGeometry }) {
  const model = boardPortrait(id);
  if (!model) return null;
  const h = 320 / model.aspect;
  const { x, y, w, h: height } = geometry.body;
  const rotate =
    geometry.usbEdge === "bottom" ? `translate(0 320) rotate(-90)` : `translate(${h} 0) rotate(90)`;
  const transform = geometry.kind === "edge-dual"
    ? `scale(${w / h} ${height / 320}) ${rotate}`
    : `scale(${w / 320} ${height / h})`;
  return (
    <g aria-hidden="true">
      <g transform={`translate(${x} ${y}) ${transform}`}>
        <ProductDrawing id={id} mapped textRotation={geometry.kind === "edge-dual" ? (geometry.usbEdge === "bottom" ? 90 : -90) : 0} />
      </g>
      {model.topHeader && geometry.headerZones.map(zone => (
        <rect key={zone.x} x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx={zone.rx} fill="#252d31" stroke="#8e9984" strokeWidth="2" />
      ))}
    </g>
  );
}
