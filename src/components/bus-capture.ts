import type { PinRole } from "@/lib/boards";

/**
 * The background's logic-analyzer capture.
 *
 * Every lane is real, protocol-correct traffic rather than a decorative squiggle,
 * so an engineer who stops to read it can decode it:
 *
 *   I2C   a display at 0x3C switched on, a temperature read from 0x48, then
 *         the display's charge pump enabled
 *   SPI   a flash JEDEC ID read (0x9F -> EF 40 18), a data read from address
 *         0 that returns "Pin", then a status-register read
 *   UART  8N1, LSB first: TX sends "AT" and "PinHub", RX answers "OK"
 *   PWM   a duty cycle that breathes from 10% to 90% and back
 *   GPIO  a pulled-up button press with contact bounce on both edges
 *
 * The capture is one strip `CAPTURE_WIDTH` px long that starts and ends idle on
 * every lane, so two copies laid end to end scroll without a seam.
 */

export type Level = 0 | 1;

export interface Wave {
  /** Level before x = 0, which is also the level at x = CAPTURE_WIDTH. */
  initial: Level;
  /** Level changes in ascending x. */
  edges: Array<{ x: number; level: Level }>;
}

export interface Decode {
  x0: number;
  x1: number;
  text: string;
}

export interface Lane {
  name: string;
  role: Extract<PinRole, "i2c" | "spi" | "uart" | "pwm" | "gpio">;
  wave: Wave;
  decodes: Decode[];
}

export const CAPTURE_WIDTH = 2880;

class WaveBuilder {
  private readonly edges: Wave["edges"] = [];
  private level: Level;
  private lastX = -Infinity;

  constructor(private readonly initial: Level) {
    this.level = initial;
  }

  set(x: number, level: Level) {
    if (x < this.lastX) throw new Error(`edge at ${x} precedes ${this.lastX}`);
    this.lastX = x;
    if (level === this.level) return;
    this.level = level;
    this.edges.push({ x, level });
  }

  build(): Wave {
    if (this.level !== this.initial) throw new Error("wave does not end at its idle level");
    return { initial: this.initial, edges: this.edges };
  }
}

const bitsMsbFirst = (byte: number) => Array.from({ length: 8 }, (_, i) => ((byte >> (7 - i)) & 1) as Level);
const bitsLsbFirst = (byte: number) => Array.from({ length: 8 }, (_, i) => ((byte >> i) & 1) as Level);
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const printable = (char: string) => (char === CR ? "CR" : char === LF ? "LF" : `'${char}'`);
const hex = (byte: number) => `0x${byte.toString(16).toUpperCase().padStart(2, "0")}`;

/**
 * One I2C transaction: START, address + R/W, data bytes, STOP. On a write the
 * target ACKs every byte; on a read the controller ACKs each byte it receives
 * except the last, which it NACKs before the STOP.
 */
function i2cTransfer(
  scl: WaveBuilder,
  sda: WaveBuilder,
  decodes: Decode[],
  x: number,
  address: number,
  mode: "W" | "R",
  data: number[],
  half = 6,
) {
  sda.set(x, 0); // START: SDA falls while SCL is high
  let t = x + half;
  scl.set(t, 0);
  const bytes = [(address << 1) | (mode === "R" ? 1 : 0), ...data];
  bytes.forEach((byte, index) => {
    const start = t;
    const ack: Level = mode === "R" && index === bytes.length - 1 ? 1 : 0;
    for (const bit of [...bitsMsbFirst(byte), ack]) {
      sda.set(t + half / 2, bit); // data only moves while SCL is low
      scl.set(t + half, 1);
      scl.set(t + 2 * half, 0);
      t += 2 * half;
    }
    decodes.push({ x0: start, x1: t - 2 * half, text: index === 0 ? `${hex(address)} ${mode}` : hex(byte) });
  });
  sda.set(t + half / 2, 0);
  scl.set(t + half, 1);
  sda.set(t + 2 * half, 1); // STOP: SDA rises while SCL is high
}

/** SPI mode 0 (CPOL 0, CPHA 0), MSB first: data moves on the falling edge. */
function spiTransfer(
  cs: WaveBuilder,
  sck: WaveBuilder,
  mosi: WaveBuilder,
  miso: WaveBuilder,
  decodes: { mosi: Decode[]; miso: Decode[] },
  x: number,
  out: number[],
  back: Array<number | null>,
  half = 5,
) {
  cs.set(x, 0);
  let t = x + 2 * half;
  out.forEach((outByte, index) => {
    const start = t;
    const inByte = back[index];
    const outBits = bitsMsbFirst(outByte);
    const inBits = inByte === null || inByte === undefined ? null : bitsMsbFirst(inByte);
    for (let bit = 0; bit < 8; bit += 1) {
      mosi.set(t, outBits[bit]);
      miso.set(t, inBits ? inBits[bit] : 1); // undriven MISO idles on its pull-up
      sck.set(t + half, 1);
      sck.set(t + 2 * half, 0);
      t += 2 * half;
    }
    // Command and address bytes are decoded on MOSI; dummy bytes clocked out
    // while the target answers are not.
    if (inByte === null || inByte === undefined) decodes.mosi.push({ x0: start, x1: t, text: hex(outByte) });
    if (inByte !== null && inByte !== undefined) decodes.miso.push({ x0: start, x1: t, text: hex(inByte) });
  });
  mosi.set(t, 1);
  miso.set(t, 1);
  cs.set(t + 2 * half, 1);
}

/** UART 8N1, LSB first, idle high, one idle bit between frames. */
function uartSend(line: WaveBuilder, decodes: Decode[], x: number, text: string, bit = 11) {
  let t = x;
  for (const char of text) {
    const code = char.charCodeAt(0);
    line.set(t, 0); // start bit
    bitsLsbFirst(code).forEach((value, i) => line.set(t + (1 + i) * bit, value));
    line.set(t + 9 * bit, 1); // stop bit
    decodes.push({ x0: t + bit, x1: t + 9 * bit, text: printable(char) });
    t += 11 * bit;
  }
}

function buildCapture(): Lane[] {
  const scl = new WaveBuilder(1);
  const sda = new WaveBuilder(1);
  const sdaDecodes: Decode[] = [];
  i2cTransfer(scl, sda, sdaDecodes, 140, 0x3c, "W", [0x00, 0xaf]);
  i2cTransfer(scl, sda, sdaDecodes, 1120, 0x48, "R", [0x19, 0x60]);
  i2cTransfer(scl, sda, sdaDecodes, 1960, 0x3c, "W", [0x00, 0x8d, 0x14]);

  const cs = new WaveBuilder(1);
  const sck = new WaveBuilder(0);
  const mosi = new WaveBuilder(1);
  const miso = new WaveBuilder(1);
  const spiDecodes = { mosi: [] as Decode[], miso: [] as Decode[] };
  spiTransfer(cs, sck, mosi, miso, spiDecodes, 560, [0x9f, 0x00, 0x00, 0x00], [null, 0xef, 0x40, 0x18]);
  spiTransfer(cs, sck, mosi, miso, spiDecodes, 1380, [0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], [null, null, null, null, 0x50, 0x69, 0x6e]);
  spiTransfer(cs, sck, mosi, miso, spiDecodes, 2420, [0x05, 0x00], [null, 0x00]);

  const tx = new WaveBuilder(1);
  const rx = new WaveBuilder(1);
  const txDecodes: Decode[] = [];
  const rxDecodes: Decode[] = [];
  uartSend(tx, txDecodes, 100, `AT${CR}${LF}`);
  uartSend(rx, rxDecodes, 680, `OK${CR}${LF}`);
  uartSend(tx, txDecodes, 1300, `PinHub${LF}`);
  uartSend(rx, rxDecodes, 2280, `OK${CR}${LF}`);

  const pwm = new WaveBuilder(0);
  const period = 48;
  for (let k = 0; k < CAPTURE_WIDTH / period; k += 1) {
    const duty = 0.5 - 0.4 * Math.cos((2 * Math.PI * k) / (CAPTURE_WIDTH / period));
    pwm.set(k * period, 1);
    pwm.set(k * period + Math.round(duty * period), 0);
  }

  const button = new WaveBuilder(1);
  for (const [x, level] of [[2500, 0], [2503, 1], [2507, 0], [2509, 1], [2514, 0], [2760, 1], [2763, 0], [2768, 1]] as const) {
    button.set(x, level);
  }

  return [
    { name: "SCL", role: "i2c", wave: scl.build(), decodes: [] },
    { name: "SDA", role: "i2c", wave: sda.build(), decodes: sdaDecodes },
    { name: "CS", role: "spi", wave: cs.build(), decodes: [] },
    { name: "SCK", role: "spi", wave: sck.build(), decodes: [] },
    { name: "MOSI", role: "spi", wave: mosi.build(), decodes: spiDecodes.mosi },
    { name: "MISO", role: "spi", wave: miso.build(), decodes: spiDecodes.miso },
    { name: "TX", role: "uart", wave: tx.build(), decodes: txDecodes },
    { name: "RX", role: "uart", wave: rx.build(), decodes: rxDecodes },
    { name: "PWM", role: "pwm", wave: pwm.build(), decodes: [] },
    { name: "GPIO", role: "gpio", wave: button.build(), decodes: [] },
  ];
}

export const captureLanes: Lane[] = buildCapture();

/** Level of a wave at x (an edge at x has already happened). */
export function levelAt(wave: Wave, x: number): Level {
  let level = wave.initial;
  for (const edge of wave.edges) {
    if (edge.x > x) break;
    level = edge.level;
  }
  return level;
}

/** SVG path for a wave, drawn between y = high and y = low over the full strip. */
export function wavePath(wave: Wave, high: number, low: number): string {
  const y = (level: Level) => (level ? high : low);
  let d = `M0 ${y(wave.initial)}`;
  for (const edge of wave.edges) d += `H${edge.x}V${y(edge.level)}`;
  return `${d}H${CAPTURE_WIDTH}`;
}

/**
 * Vertical position of each lane as a percentage of the viewport: lanes in one
 * bus sit close, buses are separated by a wider gap. The first band is left
 * clear because the page header covers it.
 */
export function laneTops(lanes: Lane[], top = 16, bottom = 94): number[] {
  const busGap = 1.8;
  const steps = lanes.slice(1).map((lane, i) => (lane.role === lanes[i].role ? 1 : busGap));
  const unit = (bottom - top) / steps.reduce((sum, step) => sum + step, 0);
  const tops = [top];
  for (const step of steps) tops.push(tops[tops.length - 1] + step * unit);
  return tops.map((value) => Math.round(value * 100) / 100);
}
