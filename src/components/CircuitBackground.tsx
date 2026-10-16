import type { ReactNode } from "react";
import { benchHeaders, type BenchPin } from "@/components/bench-boards";
import { roleColors } from "@/components/board-visual/roles";

/**
 * A static bench of popular catalog boards, drawn top-down in the desktop
 * gutters: Raspberry Pi 5 and an ESP32 DevKit V1 on the left; a Pi Zero 2 W,
 * an STM32 "Blue Pill" and a Raspberry Pi Pico on the right.
 *
 * The header pins are the subject. Every pad is filled with its pin-role hue
 * from roles.ts and carries its catalog label, and both come from
 * bench-boards.ts, which a unit test holds to the catalog. The rest of each
 * board is quieter illustration: outline proportions, connector edges and the
 * main ICs, so the board is recognizable at a glance. Nothing moves.
 */
export function CircuitBackground() {
  return (
    <div className="ph-bench pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="ph-bench-base absolute inset-0" />
      <svg className="absolute h-0 w-0" focusable="false">
        <BenchDefs />
      </svg>

      <svg className="ph-bench-side ph-bench-left" viewBox="0 0 520 1000" fill="none">
        <Board x={-122} y={58}>
          <RaspberryPi5 />
        </Board>
        <Board x={34} y={585}>
          <Esp32DevKit />
        </Board>
      </svg>

      <svg className="ph-bench-side ph-bench-right" viewBox="0 0 520 1000" fill="none">
        <Board x={362} y={46}>
          <PiZero2W />
        </Board>
        <Board x={374} y={426}>
          <BluePill />
        </Board>
        <Board x={372} y={738}>
          <Pico />
        </Board>
      </svg>

      <div className="ph-bench-vignette absolute inset-0" />
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Shared materials                                                          */
/* ------------------------------------------------------------------------ */

const SILK = "#dfe6ec";
const COPPER = "#c6873f";

function BenchDefs() {
  return (
    <defs>
      <linearGradient id="phb-pcb-green" x1="0" y1="0" x2="0.8" y2="1">
        <stop stopColor="#1d5a3c" />
        <stop offset="0.55" stopColor="#14462f" />
        <stop offset="1" stopColor="#0d3322" />
      </linearGradient>
      <linearGradient id="phb-pcb-blue" x1="0" y1="0" x2="0.8" y2="1">
        <stop stopColor="#1b4b8a" />
        <stop offset="0.55" stopColor="#153a6c" />
        <stop offset="1" stopColor="#0e2a50" />
      </linearGradient>
      <linearGradient id="phb-pcb-black" x1="0" y1="0" x2="0.8" y2="1">
        <stop stopColor="#20262d" />
        <stop offset="1" stopColor="#12161b" />
      </linearGradient>
      <linearGradient id="phb-metal" x1="0" y1="0" x2="0.35" y2="1">
        <stop stopColor="#d9dfe3" />
        <stop offset="0.45" stopColor="#99a3aa" />
        <stop offset="1" stopColor="#5d676e" />
      </linearGradient>
      <linearGradient id="phb-chip" x1="0" y1="0" x2="0.3" y2="1">
        <stop stopColor="#30363b" />
        <stop offset="1" stopColor="#14181b" />
      </linearGradient>
      <linearGradient id="phb-gold" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#ecd27a" />
        <stop offset="1" stopColor="#9c7a2e" />
      </linearGradient>
      <filter id="phb-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="16" stdDeviation="14" floodColor="#000" floodOpacity="0.55" />
      </filter>
      <filter id="phb-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.6" />
      </filter>
    </defs>
  );
}

function Board({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <g className="ph-bench-board" transform={`translate(${x} ${y})`}>
      {children}
    </g>
  );
}

function Pcb({ w, h, rx, fill, edge }: { w: number; h: number; rx: number; fill: string; edge: string }) {
  return (
    <g filter="url(#phb-shadow)">
      <rect width={w} height={h} rx={rx} fill={`url(#${fill})`} stroke={edge} strokeOpacity="0.55" strokeWidth="1.5" />
      <rect x="3.5" y="3.5" width={w - 7} height={h - 7} rx={Math.max(rx - 3, 1)} stroke="#ffffff" strokeOpacity="0.06" />
    </g>
  );
}

function Hole({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="10" fill="url(#phb-gold)" opacity="0.7" />
      <circle cx={x} cy={y} r="6" fill="#06090b" />
    </g>
  );
}

function Metal({ x, y, w, h, rx = 3 }: { x: number; y: number; w: number; h: number; rx?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="url(#phb-metal)" stroke="#e6ecef" strokeOpacity="0.35" />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx={Math.max(rx - 2, 1)} stroke="#2a3238" strokeOpacity="0.35" />
    </g>
  );
}

function Chip({ x, y, w, h, label, sub, size = 9 }: {
  x: number; y: number; w: number; h: number; label?: string; sub?: string; size?: number;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill="url(#phb-chip)" stroke="#5b666d" strokeOpacity="0.55" />
      <circle cx={x + 6} cy={y + h - 6} r="1.8" fill="#4a545a" />
      {label ? (
        <text x={x + w / 2} y={y + h / 2 + (sub ? -1 : size / 3)} textAnchor="middle" className="ph-bench-mark" fontSize={size}>
          {label}
        </text>
      ) : null}
      {sub ? (
        <text x={x + w / 2} y={y + h / 2 + size * 0.95} textAnchor="middle" className="ph-bench-mark ph-bench-mark-sub" fontSize={size * 0.68}>
          {sub}
        </text>
      ) : null}
    </g>
  );
}

function Ffc({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="2" fill="#d9cfb2" fillOpacity="0.85" />
      <rect x={x + 5} y={y + h * 0.35} width={w - 10} height={h * 0.32} fill="#2b2a24" />
    </g>
  );
}

function Traces({ d }: { d: string }) {
  return <path d={d} stroke={COPPER} strokeOpacity="0.32" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />;
}

function Silk({ x, y, children, size = 11, anchor = "start" }: {
  x: number; y: number; children: ReactNode; size?: number; anchor?: "start" | "middle" | "end";
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} className="ph-bench-silk" fontSize={size} fill={SILK}>
      {children}
    </text>
  );
}

/* ------------------------------------------------------------------------ */
/* Pins — the part of each board that matters                                */
/* ------------------------------------------------------------------------ */

type PinColumnProps = {
  pins: BenchPin[];
  x: number;
  /** y of the first pin in `pins`, and the signed step to the next one. */
  y: number;
  step: number;
  label?: "left" | "right";
  /** Distance from the pad centre to the label. */
  labelGap?: number;
  pad?: "header" | "castellated";
};

function PinColumn({ pins, x, y, step, label, labelGap = 12, pad = "header" }: PinColumnProps) {
  return (
    <g>
      <g filter="url(#phb-glow)" className="ph-bench-glow">
        {pins.map((pin, i) => (
          <rect key={i} x={x - 4.5} y={y + i * step - 4.5} width="9" height="9" rx="2" fill={roleColors[pin.role].edge} />
        ))}
      </g>
      {pins.map((pin, i) => {
        const cy = y + i * step;
        const color = roleColors[pin.role];
        return (
          <g key={i}>
            {pad === "castellated" ? <circle cx={x} cy={cy} r="5.2" fill="url(#phb-gold)" opacity="0.55" /> : null}
            <rect x={x - 3.7} y={cy - 3.7} width="7.4" height="7.4" rx="1.4" fill={color.edge} />
            <rect x={x - 1.6} y={cy - 1.6} width="3.2" height="3.2" rx="0.6" fill={color.fill} opacity="0.85" />
            {label ? (
              <text
                x={label === "right" ? x + labelGap : x - labelGap}
                y={cy + 2.5}
                textAnchor={label === "right" ? "start" : "end"}
                className="ph-bench-pin"
                fill={color.ink}
              >
                {pin.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

function HeaderBlock({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect x={x} y={y} width={w} height={h} rx="2" fill="#0a0c0d" stroke="#414b50" strokeOpacity="0.7" />;
}

/* ------------------------------------------------------------------------ */
/* Boards, drawn at 5 px per millimetre                                       */
/* ------------------------------------------------------------------------ */

/** Raspberry Pi 5 turned portrait: 40-pin header up the right edge, pin 1 at the top. */
function RaspberryPi5() {
  const header = benchHeaders["raspberry-pi-5"];
  return (
    <g>
      <Pcb w={280} h={425} rx={15} fill="phb-pcb-green" edge="#6aa77f" />
      <Traces d="M156 131H200V60H244M156 150H214V110H244M117 170V188M190 248V300M140 240V262M222 222H244M64 57H78V92M60 126H78M60 196H78" />
      {[[17.5, 17.5], [262.5, 17.5], [17.5, 307.5], [262.5, 307.5]].map(([cx, cy]) => <Hole key={`${cx}-${cy}`} x={cx} y={cy} />)}

      <Ffc x={72} y={-2} w={118} h={15} />
      <Metal x={-8} y={40} w={38} h={34} rx={10} />
      <Metal x={-8} y={108} w={32} h={38} rx={4} />
      <Metal x={-8} y={178} w={32} h={38} rx={4} />

      <Metal x={78} y={92} w={78} h={78} rx={6} />
      <text x={117} y={128} textAnchor="middle" className="ph-bench-mark ph-bench-mark-ink" fontSize="11">BCM2712</text>
      <text x={117} y={142} textAnchor="middle" className="ph-bench-mark ph-bench-mark-ink ph-bench-mark-sub" fontSize="7">BROADCOM</text>
      <Chip x={78} y={188} w={78} h={50} label="LPDDR4X" size={8} />
      <Chip x={172} y={104} w={30} h={30} />
      <Chip x={164} y={196} w={50} h={50} label="RP1" size={11} />
      <Ffc x={30} y={256} w={92} h={14} />
      <Ffc x={140} y={268} w={78} h={13} />
      <circle cx={42} cy={22} r="3" fill="#ef4444" opacity="0.75" />
      <circle cx={52} cy={22} r="3" fill="#4ade80" opacity="0.75" />
      <Silk x={30} y={300} size={12}>Raspberry Pi 5</Silk>

      <Metal x={20} y={322} w={66} h={112} />
      <Metal x={106} y={322} w={66} h={112} />
      <Metal x={188} y={318} w={84} h={116} />
      {[20, 106].map((x) => (
        <g key={x}>
          <rect x={x + 9} y={340} width={48} height={28} rx="2" fill="#11161a" />
          <rect x={x + 9} y={386} width={48} height={28} rx="2" fill="#11161a" />
          <rect x={x + 14} y={350} width={38} height={7} fill={x === 106 ? "#2563eb" : "#e5e7eb"} opacity="0.7" />
          <rect x={x + 14} y={396} width={38} height={7} fill={x === 106 ? "#2563eb" : "#e5e7eb"} opacity="0.7" />
        </g>
      ))}
      <rect x={200} y={344} width={60} height={62} rx="2" fill="#11161a" />
      <rect x={202} y={410} width={9} height={6} fill="#4ade80" opacity="0.7" />
      <rect x={249} y={410} width={9} height={6} fill="#fbbf24" opacity="0.7" />

      <HeaderBlock x={249.5} y={35.5} w={25.5} h={254} />
      <PinColumn pins={header.left} x={256} y={41.85} step={12.7} label="left" labelGap={13} />
      <PinColumn pins={header.right} x={268.5} y={41.85} step={12.7} label="right" labelGap={19} />
    </g>
  );
}

/** Raspberry Pi Zero 2 W turned portrait: header down the left edge, pin 1 at the bottom. */
function PiZero2W() {
  const header = benchHeaders["raspberry-pi-zero-2-w"];
  return (
    <g>
      <Pcb w={150} h={325} rx={15} fill="phb-pcb-green" edge="#6aa77f" />
      <Traces d="M110 196V230M82 168H64M82 150H70V120M138 118H124V88M110 116V140" />
      {[[17.5, 17.5], [132.5, 17.5], [17.5, 307.5], [132.5, 307.5]].map(([cx, cy]) => <Hole key={`${cx}-${cy}`} x={cx} y={cy} />)}
      <Ffc x={46} y={-2} w={68} h={14} />
      <Metal x={84} y={62} w={50} h={54} />
      <Chip x={82} y={140} w={56} h={56} label="RP3A0" size={9} />
      <Metal x={118} y={236} w={36} h={54} rx={4} />
      <Metal x={126} y={98} w={28} h={40} />
      <Metal x={126} y={36} w={28} h={40} />
      <Metal x={46} y={304} w={62} h={22} />
      <circle cx={112} cy={222} r="2.6" fill="#4ade80" opacity="0.75" />
      <Silk x={82} y={226} size={9}>Zero 2 W</Silk>

      <HeaderBlock x={5} y={35.5} w={25.5} h={254} />
      <PinColumn pins={header.left} x={24} y={283.15} step={-12.7} label="right" labelGap={12} />
      <PinColumn pins={header.right} x={11.5} y={283.15} step={-12.7} label="left" labelGap={18} />
    </g>
  );
}

/** STM32F103 "Blue Pill", USB at the top as the catalog records it. */
function BluePill() {
  const header = benchHeaders["stm32f103-blue-pill"];
  return (
    <g>
      <Pcb w={114} h={265} rx={4} fill="phb-pcb-blue" edge="#6b9be0" />
      <Traces d="M57 20V48M44 122H26M70 122H88M57 160V170M44 92L30 80M70 152L88 166" />
      <Metal x={40} y={-6} w={34} h={26} />
      <rect x={34} y={48} width={8} height={5} rx="1" fill="#ef4444" opacity="0.75" />
      <rect x={72} y={48} width={8} height={5} rx="1" fill="#4ade80" opacity="0.75" />
      <Metal x={46} y={66} w={22} h={11} rx={5} />
      <g transform="translate(57 122) rotate(45)">
        <rect x={-22} y={-22} width={44} height={44} fill="#9aa4aa" opacity="0.45" />
        <rect x={-18} y={-18} width={36} height={36} rx="2" fill="url(#phb-chip)" stroke="#5b666d" strokeOpacity="0.6" />
        <text y={2.5} textAnchor="middle" className="ph-bench-mark" fontSize="7">STM32</text>
      </g>
      <Metal x={50} y={172} w={14} h={14} rx={2} />
      <circle cx={57} cy={179} r="3.6" fill="#1b1f22" />
      {[202, 220].map((y) => (
        <g key={y}>
          {[44, 57, 70].map((x) => <rect key={x} x={x - 2} y={y - 2} width={4} height={4} fill="url(#phb-gold)" />)}
          <rect x={39} y={y - 4.5} width={23} height={9} rx="1.5" fill="#facc15" opacity="0.8" />
        </g>
      ))}
      {[40, 51, 62, 73].map((x) => <rect key={x} x={x - 2.5} y={248} width={5} height={5} fill="url(#phb-gold)" opacity="0.8" />)}

      <HeaderBlock x={12.5} y={5.5} w={13} h={254} />
      <HeaderBlock x={88.6} y={5.5} w={13} h={254} />
      <PinColumn pins={header.left} x={18.9} y={11.85} step={12.7} label="left" labelGap={13} />
      <PinColumn pins={header.right} x={95.1} y={11.85} step={12.7} label="right" labelGap={13} />
    </g>
  );
}

/** Raspberry Pi Pico, USB at the top; castellated pads on both long edges. */
function Pico() {
  const header = benchHeaders["raspberry-pi-pico"];
  return (
    <g>
      <Pcb w={105} h={255} rx={4} fill="phb-pcb-green" edge="#6aa77f" />
      <Traces d="M52 17V40M52 80V105M35 122H20M70 122H86M52 140V165" />
      <Metal x={36} y={-5} w={33} h={22} />
      <rect x={22} y={32} width={16} height={16} rx="2" fill="#c8ccc4" opacity="0.7" />
      <circle cx={30} cy={40} r="5" fill="#f1f1ea" opacity="0.85" />
      <rect x={66} y={34} width={7} height={4} rx="1" fill="#4ade80" opacity="0.75" />
      <Chip x={40} y={60} w={26} h={18} />
      <Chip x={35} y={102} w={35} h={35} label="RP2040" size={7} />
      <Metal x={44} y={162} w={17} h={10} rx={4} />
      <Silk x={52} y={210} size={9} anchor="middle">Pico</Silk>
      {[42, 52, 62].map((x) => <circle key={x} cx={x} cy={244} r="2.6" fill="url(#phb-gold)" opacity="0.8" />)}

      <PinColumn pins={header.left} x={7} y={6.85} step={12.7} label="left" labelGap={12} pad="castellated" />
      <PinColumn pins={header.right} x={98} y={6.85} step={12.7} label="right" labelGap={12} pad="castellated" />
    </g>
  );
}

/** ESP32 DevKit V1 (30-pin), antenna at the top, USB at the bottom. */
function Esp32DevKit() {
  const header = benchHeaders["esp32-devkit-v1"];
  return (
    <g>
      <Pcb w={141.5} h={258} rx={5} fill="phb-pcb-black" edge="#6c7883" />
      <Traces d="M71 122V150M43 140H22M98 164H120M71 178V236M56 228H44" />
      <rect x={26} y={-4} width={90} height={30} rx="2" fill="#0d1311" stroke="#4b5a55" strokeOpacity="0.6" />
      <path d="M34 18V4H46V18H58V4H70V18H82V4H94V18H106V4" stroke="url(#phb-gold)" strokeOpacity="0.7" strokeWidth="2" />
      <Metal x={28} y={26} w={86} h={96} />
      <text x={71} y={70} textAnchor="middle" className="ph-bench-mark ph-bench-mark-ink" fontSize="8">ESP-WROOM-32</text>
      <text x={71} y={82} textAnchor="middle" className="ph-bench-mark ph-bench-mark-ink ph-bench-mark-sub" fontSize="6">ESPRESSIF</text>
      <Chip x={30} y={134} w={26} h={16} />
      <Chip x={84} y={150} w={28} h={28} />
      <rect x={60} y={190} width={7} height={4} rx="1" fill="#ef4444" opacity="0.75" />
      <rect x={76} y={190} width={7} height={4} rx="1" fill="#60a5fa" opacity="0.75" />
      <Silk x={71} y={212} size={7.5} anchor="middle">ESP32 DEVKIT V1</Silk>
      <Metal x={24} y={226} w={18} h={18} rx={2} />
      <Metal x={100} y={226} w={18} h={18} rx={2} />
      <circle cx={33} cy={235} r="4" fill="#1b1f22" />
      <circle cx={109} cy={235} r="4" fill="#1b1f22" />
      <Metal x={52} y={236} w={38} h={26} />

      <HeaderBlock x={7.1} y={53.6} w={13} h={190.6} />
      <HeaderBlock x={121.4} y={53.6} w={13} h={190.6} />
      <PinColumn pins={header.left} x={13.6} y={60} step={12.7} label="left" labelGap={13} />
      <PinColumn pins={header.right} x={127.9} y={60} step={12.7} label="right" labelGap={13} />
    </g>
  );
}
