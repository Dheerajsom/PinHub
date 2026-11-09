// Family-level board illustration: the handful of features that make a board
// family recognizable at a glance (an Espressif DevKit's shielded module and
// two buttons beside the USB, a micro:bit's LED matrix, a Nucleo's ST-LINK
// section), laid out in the clear field between the board's mapped connectors.
//
// Rules this file keeps:
// - Features are chosen per *family* from curated metadata already in the
//   catalog (visual template, recorded radio interfaces). Nothing here is a
//   model-specific layout claim, and nothing is an electrical claim: features
//   are decorative, aria-hidden, and never carry a pin.
// - A feature that cannot be backed for a family member is not drawn for it
//   (for example, an RF can is only drawn when the board records a radio, and
//   boards whose radio is not a separate shielded module are excluded).
// - Layout happens only inside the free field, which excludes every header
//   zone, so a feature can never cover a pad. A regression test checks this.
// - Raspberry Pi models are drawn by their dedicated artwork, not here.
//
// Family references (component placement, buttons, debugger sections):
// - Espressif ESP32-DevKitC V4 user guide: EN and Boot buttons either side of
//   the USB port, module with PCB antenna at the opposite end.
//   https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html
// - BBC micro:bit hardware: 5x5 LED matrix and buttons A/B on the front; the
//   processor is on the back. https://tech.microbit.org/hardware/
// - STM32 Nucleo-64 user manual UM1724: ST-LINK section separated from the MCU
//   section, B1 USER (blue) and B2 RESET (black) push-buttons.
//   https://www.st.com/resource/en/user_manual/um1724-stm32-nucleo64-boards-mb1136-stmicroelectronics.pdf
// - TI MSP-EXP430G2ET LaunchPad guide SLAU772: eZ-FET emulation section
//   separated from the target section. https://www.ti.com/lit/ug/slau772/slau772.pdf
// - Arduino UNO / Mega / Nano product pages: reset push-button (UNO and Mega
//   by the USB corner, Nano at the board centre). https://docs.arduino.cc/hardware/
// - NVIDIA Jetson developer kit user guides: compute module under a heatsink
//   and fan on the carrier. https://developer.nvidia.com/embedded/learn/getting-started-jetson

import type { Board, BoardInterface } from "@/lib/boards";
import type { BoardVisual } from "@/lib/board-visuals";
import { raspberryPiModel } from "@/lib/raspberry-pi-models";

export type Side = "left" | "right" | "top" | "bottom";
type Rect = { x: number; y: number; w: number; h: number; rx?: number };

/**
 * A feature placed in "u/v" space: u runs from the family's reference edge
 * (normally the USB edge) to the far end, v runs across the board.
 */
export type FamilyFeature =
  | { kind: "rf-module"; antenna: boolean }
  | { kind: "button"; u: number; v: number; cap: "black" | "blue" | "white"; label?: string }
  | { kind: "led-matrix" }
  | { kind: "debug-section"; label: string; depth: number }
  | { kind: "soc" }
  | { kind: "heatsink" }
  | { kind: "boot-jumpers"; u: number };

export type FamilyArt = {
  /** Stable family id, shown in the coverage inventory. */
  id: string;
  /** Human family name used in the drawing caption. */
  name: string;
  features: FamilyFeature[];
  /** Edge the u axis starts from; defaults to the template's USB edge. */
  from?: Side;
};

const RADIO: BoardInterface[] = ["Wi-Fi", "Bluetooth", "Zigbee", "Thread"];
const hasRadio = (board: Board) => board.interfaces.some((entry) => RADIO.includes(entry));

// Radios integrated without a separately shielded module can, or whose module
// shape we cannot back for the family drawing.
const NO_RF_CAN = new Set([
  "arduino-nano-matter",
  "adafruit-qt-py-esp32-s3",
  "adafruit-qt-py-esp32-c3",
  "adafruit-qt-py-esp32-s2",
  "sparkfun-esp32-thing",
]);

// Enclosed or handheld products that share the 40-pin template but are not a
// bare single-board computer.
const ENCLOSED = new Set(["seeed-wio-terminal", "seeed-reterminal"]);

const rf = (board: Board, antenna: boolean): FamilyFeature[] =>
  hasRadio(board) && !NO_RF_CAN.has(board.id) ? [{ kind: "rf-module", antenna }] : [];

/** The family illustration for a board, or null when only the generic one applies. */
export function familyArtFor(board: Board, visual: BoardVisual | undefined): FamilyArt | null {
  if (!visual || raspberryPiModel(board.id)) return null;
  const art = ((): FamilyArt | null => {
    switch (visual.template) {
      case "esp32-devkit":
        return {
          id: "espressif-devkit",
          name: "Espressif DevKit",
          features: [
            ...rf(board, true),
            { kind: "button", u: 0.06, v: 0.18, cap: "black" },
            { kind: "button", u: 0.06, v: 0.82, cap: "black" },
          ],
        };
      case "feather":
        return { id: "adafruit-feather", name: "Adafruit Feather", features: rf(board, true) };
      case "xiao":
        // XIAO radios use a shield can with a chip or external antenna.
        return { id: "xiao-qtpy", name: "XIAO / QT Py", features: rf(board, false) };
      case "arduino-nano":
        if (!board.id.startsWith("arduino-nano")) return null;
        return {
          id: "arduino-nano",
          name: "Arduino Nano",
          // The module takes the far end; the reset button stays clear of
          // the MCU in whichever half the module leaves free.
          features: [...rf(board, true), { kind: "button", u: rf(board, true).length ? 0.5 : 0.3, v: 0.5, cap: "white" }],
        };
      case "arduino-mkr":
        return { id: "arduino-mkr", name: "Arduino MKR", features: rf(board, true) };
      case "module-dip":
        return board.id === "lolin-d1-mini"
          ? { id: "esp8266-d1", name: "ESP-12 module board", features: rf(board, true) }
          : null;
      case "arduino-uno":
      case "arduino-mega":
        return {
          id: "arduino-shield-footprint",
          name: visual.template === "arduino-mega" ? "Mega-footprint board" : "UNO-footprint board",
          from: "left",
          features: [{ kind: "button", u: 0.05, v: 0.14, cap: "white" }],
        };
      case "nucleo-64":
        return {
          id: "st-nucleo-64",
          name: "STM32 Nucleo-64",
          from: "left",
          features: [
            { kind: "debug-section", label: "ST-LINK", depth: 0.27 },
            { kind: "button", u: 0.36, v: 0.2, cap: "blue", label: "USER" },
            { kind: "button", u: 0.36, v: 0.8, cap: "black", label: "RESET" },
          ],
        };
      case "launchpad":
        return {
          id: "ti-launchpad",
          name: "TI LaunchPad",
          from: "left",
          // TI's EK-TM4C123GXL uses ICDI, not the MSP430's eZ-FET.
          // https://www.ti.com/tool/EK-TM4C123GXL
          features: [{ kind: "debug-section", label: board.id === "ti-ek-tm4c123gxl-launchpad" ? "ICDI" : "eZ-FET", depth: 0.3 }],
        };
      case "microbit":
        return {
          id: "bbc-microbit",
          name: "BBC micro:bit",
          features: [
            { kind: "led-matrix" },
            { kind: "button", u: 0.5, v: 0.08, cap: "black", label: "A" },
            { kind: "button", u: 0.5, v: 0.92, cap: "black", label: "B" },
          ],
        };
      case "stm32-pill":
        return board.id === "stm32f103-blue-pill"
          ? {
              id: "stm32-pill",
              name: "STM32 pill",
              features: [
                { kind: "boot-jumpers", u: 0.72 },
                { kind: "button", u: 0.3, v: 0.5, cap: "white" },
              ],
            }
          : {
              id: "stm32-pill",
              name: "STM32 pill",
              features: [
                { kind: "button", u: 0.1, v: 0.25, cap: "black" },
                { kind: "button", u: 0.1, v: 0.75, cap: "black" },
              ],
            };
      case "sbc-40pin":
        if (ENCLOSED.has(board.id)) return null;
        return { id: "sbc-40pin", name: "40-pin single-board computer", features: [{ kind: "soc" }] };
      case "sbc-zero":
        return { id: "sbc-zero", name: "Zero-size single-board computer", features: [{ kind: "soc" }] };
      case "jetson-carrier":
        return { id: "jetson-devkit", name: "NVIDIA Jetson developer kit", features: [{ kind: "heatsink" }] };
      default:
        return null;
    }
  })();
  return art && art.features.length ? art : null;
}

// --- layout ---------------------------------------------------------------

export type PlacedFeature =
  | { kind: "rf-module"; rect: Rect; can: Rect; antenna: Rect | null; meander: string | null }
  | { kind: "button"; rect: Rect; cap: "black" | "blue" | "white"; label?: string }
  | { kind: "led-matrix"; rect: Rect; leds: Rect[] }
  | { kind: "debug-section"; rect: Rect; rule: { x1: number; y1: number; x2: number; y2: number }; chip: Rect; label: string; labelAt: { x: number; y: number; size: number } }
  | { kind: "soc"; rect: Rect; memory: Rect }
  | { kind: "heatsink"; rect: Rect; fins: Rect[]; fan: { cx: number; cy: number; r: number } }
  | { kind: "boot-jumpers"; rect: Rect; blocks: Rect[]; caps: Rect[] };

export type FamilyLayout = {
  features: PlacedFeature[];
  /** The field still free for the generic passives, or null when the family
   *  art replaces them (a SoC, a heatsink, or a front with no main IC). */
  rest: Rect | null;
};

/** The clear board area: inside the outline, outside every header and port. */
export function freeField(body: Rect, zones: Rect[], ports: Rect[]): Rect {
  const pad = 22;
  let x0 = body.x + pad;
  let y0 = body.y + pad;
  let x1 = body.x + body.w - pad;
  let y1 = body.y + body.h - pad;
  const cx = body.x + body.w / 2;
  const cy = body.y + body.h / 2;

  const push = (region: Rect, gap: number) => {
    const overlaps =
      region.x < body.x + body.w &&
      region.x + region.w > body.x &&
      region.y < body.y + body.h &&
      region.y + region.h > body.y;
    if (!overlaps) return;
    if (region.w >= region.h) {
      if (region.y + region.h / 2 < cy) y0 = Math.max(y0, region.y + region.h + gap);
      else y1 = Math.min(y1, region.y - gap);
    } else if (region.x + region.w / 2 < cx) {
      x0 = Math.max(x0, region.x + region.w + gap);
    } else {
      x1 = Math.min(x1, region.x - gap);
    }
  };

  for (const zone of zones) push(zone, pad);
  for (const port of ports) push(port, 10);

  // A board whose connectors leave no clear field gets no components, rather
  // than components stacked on top of its ports.
  if (x1 - x0 < 46 || y1 - y0 < 46) return { x: cx, y: cy, w: 0, h: 0 };
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Maps u/v fractions of the field onto board coordinates for one edge. */
function frame(field: Rect, from: Side) {
  const vertical = from === "top" || from === "bottom";
  const uLen = vertical ? field.h : field.w;
  const vLen = vertical ? field.w : field.h;
  const point = (u: number, v: number) => {
    switch (from) {
      case "top": return { x: field.x + v * field.w, y: field.y + u * field.h };
      case "bottom": return { x: field.x + v * field.w, y: field.y + (1 - u) * field.h };
      case "left": return { x: field.x + u * field.w, y: field.y + v * field.h };
      case "right": return { x: field.x + (1 - u) * field.w, y: field.y + v * field.h };
    }
  };
  /** Board rect covering u0..u1 along and v0..v1 across. */
  const rect = (u0: number, u1: number, v0: number, v1: number): Rect => {
    const a = point(u0, v0);
    const b = point(u1, v1);
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
  };
  return { uLen, vLen, point, rect, vertical };
}

const r1 = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));

export function layoutFamilyArt(art: FamilyArt, field: Rect, usb: Side | "none" | undefined): FamilyLayout | null {
  if (field.w < 60 || field.h < 60) return null;
  const from: Side = art.from ?? (usb && usb !== "none" ? usb : "top");
  const f = frame(field, from);
  const short = Math.min(field.w, field.h);
  const placed: PlacedFeature[] = [];
  // The part of the field (in u) still free for generic parts.
  let uStart = 0;
  let uEnd = 1;
  let replaces = false;

  for (const feature of art.features) {
    switch (feature.kind) {
      case "rf-module": {
        const along = Math.min(f.uLen * 0.42, f.vLen * 1.3);
        const across = f.vLen * 0.84;
        const u0 = 1 - along / f.uLen;
        const v0 = (1 - across / f.vLen) / 2;
        const rect = f.rect(u0, 1, v0, 1 - v0);
        const antennaShare = feature.antenna ? 0.3 : 0;
        const can = f.rect(u0 + 0.02 * (along / f.uLen), 1 - antennaShare * (along / f.uLen), v0 + 0.04, 1 - v0 - 0.04);
        let antenna: Rect | null = null;
        let meander: string | null = null;
        if (feature.antenna) {
          antenna = f.rect(1 - antennaShare * (along / f.uLen), 1, v0, 1 - v0);
          // A PCB antenna's copper meander, drawn across the antenna keep-out.
          const steps = 6;
          const uA = 1 - antennaShare * (along / f.uLen) * 0.72;
          const uB = 1 - antennaShare * (along / f.uLen) * 0.22;
          const points = [] as string[];
          for (let i = 0; i <= steps; i += 1) {
            const v = v0 + 0.1 + (i / steps) * (1 - 2 * v0 - 0.2);
            const a = f.point(i % 2 ? uB : uA, v);
            const b = f.point(i % 2 ? uA : uB, v);
            points.push(`${r1(a.x)} ${r1(a.y)}`, `${r1(b.x)} ${r1(b.y)}`);
          }
          meander = `M${points.join(" L")}`;
        }
        placed.push({ kind: "rf-module", rect, can, antenna, meander });
        uEnd = Math.min(uEnd, u0 - 0.04);
        break;
      }
      case "button": {
        const size = clamp(short * 0.13, 16, 40);
        const c = f.point(feature.u, feature.v);
        placed.push({
          kind: "button",
          rect: { x: r1(c.x - size / 2), y: r1(c.y - size / 2), w: size, h: size },
          cap: feature.cap,
          label: feature.label,
        });
        break;
      }
      case "led-matrix": {
        const side = short * 0.62;
        const c = f.point(0.5, 0.5);
        const rect = { x: c.x - side / 2, y: c.y - side / 2, w: side, h: side };
        const cell = side / 5;
        const leds: Rect[] = [];
        for (let row = 0; row < 5; row += 1) {
          for (let col = 0; col < 5; col += 1) {
            leds.push({ x: r1(rect.x + col * cell + cell * 0.36), y: r1(rect.y + row * cell + cell * 0.24), w: r1(cell * 0.28), h: r1(cell * 0.52) });
          }
        }
        placed.push({ kind: "led-matrix", rect, leds });
        replaces = true;
        break;
      }
      case "debug-section": {
        const rect = f.rect(0, feature.depth, 0, 1);
        const a = f.point(feature.depth, 0);
        const b = f.point(feature.depth, 1);
        const chipSide = Math.min(f.uLen * feature.depth * 0.42, f.vLen * 0.3);
        const cc = f.point(feature.depth * 0.5, 0.62);
        const label = f.point(feature.depth * 0.5, 0.24);
        placed.push({
          kind: "debug-section",
          rect,
          rule: { x1: a.x, y1: a.y, x2: b.x, y2: b.y },
          chip: { x: r1(cc.x - chipSide / 2), y: r1(cc.y - chipSide / 2), w: chipSide, h: chipSide },
          label: feature.label,
          labelAt: { x: label.x, y: label.y, size: clamp(short * 0.07, 11, 20) },
        });
        uStart = Math.max(uStart, feature.depth + 0.16);
        break;
      }
      case "soc": {
        const side = short * 0.5;
        const c = f.point(0.5, 0.42);
        const rect = { x: c.x - side / 2, y: c.y - side / 2, w: side, h: side, rx: 6 };
        const memory = f.vertical
          ? { x: rect.x + side + side * 0.18, y: rect.y + side * 0.12, w: side * 0.42, h: side * 0.76, rx: 3 }
          : { x: rect.x + side * 0.12, y: rect.y + side + side * 0.14, w: side * 0.76, h: side * 0.36, rx: 3 };
        placed.push({ kind: "soc", rect, memory });
        replaces = true;
        break;
      }
      case "heatsink": {
        const w = field.w * 0.62;
        const h = field.h * 0.7;
        const rect = { x: field.x + (field.w - w) / 2, y: field.y + (field.h - h) / 2, w, h, rx: 8 };
        const count = 13;
        const fins = Array.from({ length: count }, (_, i) => ({
          x: r1(rect.x + 10 + (i * (w - 20)) / count),
          y: rect.y + 8,
          w: r1(((w - 20) / count) * 0.45),
          h: h - 16,
        }));
        const r = Math.min(w, h) * 0.32;
        placed.push({ kind: "heatsink", rect, fins, fan: { cx: rect.x + w / 2, cy: rect.y + h / 2, r } });
        replaces = true;
        break;
      }
      case "boot-jumpers": {
        const blockAlong = clamp(short * 0.12, 12, 30);
        const blockAcross = blockAlong * 2.6;
        const blocks: Rect[] = [0.28, 0.72].map((v) => {
          const c = f.point(feature.u, v);
          return f.vertical
            ? { x: r1(c.x - blockAcross / 2), y: r1(c.y - blockAlong / 2), w: blockAcross, h: blockAlong }
            : { x: r1(c.x - blockAlong / 2), y: r1(c.y - blockAcross / 2), w: blockAlong, h: blockAcross };
        });
        const caps = blocks.map((block) => f.vertical
          ? { x: block.x, y: block.y - 2, w: block.w * 0.64, h: block.h + 4 }
          : { x: block.x - 2, y: block.y, w: block.w + 4, h: block.h * 0.64 });
        const all = blocks.reduce((acc, block) => ({
          x: Math.min(acc.x, block.x - 2), y: Math.min(acc.y, block.y - 2),
          w: 0, h: 0,
        }), { x: Infinity, y: Infinity, w: 0, h: 0 });
        const maxX = Math.max(...blocks.map((block) => block.x + block.w + 2));
        const maxY = Math.max(...blocks.map((block) => block.y + block.h + 2));
        placed.push({ kind: "boot-jumpers", rect: { x: all.x, y: all.y, w: maxX - all.x, h: maxY - all.y }, blocks, caps });
        break;
      }
    }
  }

  // Anything that does not fit inside the field is dropped, never shrunk onto
  // a connector.
  const features = placed.filter((feature) =>
    inside(feature.rect, field) && (feature.kind !== "soc" || inside(feature.memory, field)));
  if (!features.length) return null;
  const rest = replaces || uEnd - uStart < 0.2 ? null : f.rect(uStart, uEnd, 0, 1);
  return { features, rest };
}

/** True when two rects overlap, with `gap` of clearance. */
export function overlaps(a: Rect, b: Rect, gap = 0): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

function inside(rect: Rect, field: Rect): boolean {
  return (
    rect.x >= field.x - 1 &&
    rect.y >= field.y - 1 &&
    rect.x + rect.w <= field.x + field.w + 1 &&
    rect.y + rect.h <= field.y + field.h + 1
  );
}
