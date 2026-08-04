// Visual geometry metadata for every catalog board.
//
// This file is deliberately separate from `boards.ts`: it carries *physical /
// visual* configuration (board orientation, form factor, where the connector
// sits) while the electrical truth — pin labels, roles, aliases, notes,
// warnings — stays authoritative in `boards.ts`. Nothing here duplicates a pin
// label; the geometry engine in `board-visual-geometry.ts` reads the real pins
// from a board's `pinout` and lays them onto the connector described here.
//
// Boards with genuinely identical form factors share a template (see the
// PRESETS below). Sharing is by physical form, never by pin count alone.

export type BoardForm = "horizontal" | "vertical";

// How the electrical pins are placed onto the artwork:
// - header2x:        interleaved 2xN header (Raspberry-Pi-style top header).
// - edge-dual:       two rows running down the two long edges of a module.
// - shield-split:    grouped Arduino-style headers on the two long edges.
// - edge-connector:  a single row of edge fingers along the bottom.
// - group-strips:    schematic, function-grouped strips (not to physical
//                    scale) for boards whose data is grouped by function and
//                    cannot be resolved to exact physical coordinates.
export type HeaderKind =
  | "header2x"
  | "edge-dual"
  | "shield-split"
  | "edge-connector"
  | "group-strips";

// Where the connector rows are read from. "pins" uses pinout.pins.left/right;
// "groups" uses pinout.groups (group 0 / group 1 for edge-dual).
export type RowSource = "pins" | "groups";

export type UsbEdge = "top" | "bottom" | "left" | "right" | "none";

export type PortKind =
  | "usb-c"
  | "usb-mini"
  | "usb-micro"
  | "usb-a"
  | "hdmi"
  | "ethernet"
  | "jst"
  | "barrel"
  | "audio"
  | "camera";

export type BoardVisual = {
  /** Family/form-factor template id — recorded so the audit can show sharing. */
  template: string;
  form: BoardForm;
  headerKind: HeaderKind;
  /** width / height of the board outline. */
  aspect: number;
  /** Human description of the viewing orientation (used as accessible text). */
  orientation: string;
  usb?: UsbEdge;
  ports?: PortKind[];
  /** edge-dual override: read the two rows from groups instead of pins. */
  source?: RowSource;
  /** True when the layout is schematic / not to physical scale. */
  notToScale?: boolean;
  revisionNote?: string;
  /** Optional PCB accent; defaults to a per-vendor color. */
  accent?: string;
};

type Preset = Omit<BoardVisual, "revisionNote" | "accent">;

// ---------------------------------------------------------------------------
// Family templates. Each preset is shared by boards with the same physical
// form factor and connector placement.
// ---------------------------------------------------------------------------
const PRESETS = {
  sbc: {
    template: "sbc-40pin",
    form: "horizontal",
    headerKind: "header2x",
    aspect: 1.5,
    usb: "none",
    ports: ["ethernet", "usb-a", "hdmi", "audio"],
    orientation: "Component side up, 40-pin GPIO header along the top edge",
  },
  sbcZero: {
    template: "sbc-zero",
    form: "horizontal",
    headerKind: "header2x",
    aspect: 2.3,
    usb: "bottom",
    ports: ["camera", "hdmi"],
    orientation: "Component side up, 40-pin GPIO header along the top edge",
  },
  jetson: {
    template: "jetson-carrier",
    form: "horizontal",
    headerKind: "header2x",
    aspect: 1.35,
    usb: "none",
    ports: ["ethernet", "usb-a", "hdmi"],
    orientation:
      "Carrier board component side up, 40-pin header along the top edge",
  },
  pico: {
    template: "pico",
    form: "vertical",
    headerKind: "edge-dual",
    aspect: 0.42,
    usb: "top",
    ports: ["usb-micro"],
    orientation: "USB at top, component side up, castellated edges left/right",
  },
  esp32Devkit: {
    template: "esp32-devkit",
    form: "vertical",
    headerKind: "edge-dual",
    aspect: 0.4,
    usb: "bottom",
    ports: ["usb-micro"],
    orientation: "USB at the bottom, component side up, headers on both edges",
  },
  moduleDip: {
    template: "module-dip",
    form: "vertical",
    headerKind: "edge-dual",
    aspect: 0.42,
    usb: "top",
    ports: ["usb-micro"],
    orientation: "USB at top, component side up, headers on both long edges",
  },
  feather: {
    template: "feather",
    form: "vertical",
    headerKind: "edge-dual",
    aspect: 0.46,
    usb: "top",
    ports: ["usb-c", "jst"],
    orientation: "USB at top, JST battery at top-left, component side up",
  },
  xiao: {
    template: "xiao",
    form: "vertical",
    headerKind: "edge-dual",
    aspect: 0.72,
    usb: "top",
    ports: ["usb-c"],
    orientation: "USB-C at top, component side up, 7 pads down each long edge",
  },
  nano: {
    template: "arduino-nano",
    form: "vertical",
    headerKind: "edge-dual",
    aspect: 0.4,
    usb: "top",
    ports: ["usb-micro"],
    orientation: "USB at top, component side up, headers on both long edges",
  },
  mkr: {
    template: "arduino-mkr",
    form: "vertical",
    headerKind: "edge-dual",
    aspect: 0.34,
    usb: "top",
    ports: ["usb-micro", "jst"],
    orientation: "USB at top, component side up, headers on both long edges",
  },
  stm32Pill: {
    template: "stm32-pill",
    form: "vertical",
    headerKind: "edge-dual",
    aspect: 0.34,
    usb: "top",
    ports: ["usb-micro"],
    orientation: "USB at top, component side up, 2x20 headers on both edges",
  },
  arduinoUno: {
    template: "arduino-uno",
    form: "horizontal",
    headerKind: "shield-split",
    aspect: 1.3,
    usb: "left",
    ports: ["usb-a", "barrel"],
    orientation: "Component side up, shield headers along the long edges",
  },
  arduinoMega: {
    template: "arduino-mega",
    form: "horizontal",
    headerKind: "shield-split",
    aspect: 1.9,
    usb: "left",
    ports: ["usb-a", "barrel"],
    orientation: "Component side up, shield headers along the long edges",
  },
  nucleo: {
    template: "nucleo-64",
    form: "horizontal",
    headerKind: "shield-split",
    aspect: 1.45,
    usb: "top",
    orientation: "Component side up, Arduino + Morpho headers on the long edges",
  },
  devKit: {
    template: "arduino-footprint-dk",
    form: "horizontal",
    headerKind: "shield-split",
    aspect: 1.3,
    usb: "top",
    orientation: "Component side up, Arduino-style headers on the long edges",
  },
  launchpad: {
    template: "launchpad",
    form: "horizontal",
    headerKind: "shield-split",
    aspect: 1.05,
    usb: "top",
    orientation: "Component side up, BoosterPack headers on the long edges",
  },
  microbit: {
    template: "microbit",
    form: "horizontal",
    headerKind: "edge-connector",
    aspect: 1.24,
    usb: "top",
    ports: ["usb-micro"],
    orientation: "Front side up, gold edge connector along the bottom",
  },
  grouped: {
    template: "grouped-schematic",
    form: "vertical",
    headerKind: "group-strips",
    aspect: 1.6,
    notToScale: true,
    orientation:
      "Signals grouped by function — schematic layout, not to physical scale",
  },
} satisfies Record<string, Preset>;

function preset(
  key: keyof typeof PRESETS,
  overrides?: Partial<BoardVisual>,
): BoardVisual {
  return { ...PRESETS[key], ...overrides };
}

// ---------------------------------------------------------------------------
// Per-board assignment. Every catalog board id maps to exactly one visual.
// ---------------------------------------------------------------------------
export const boardVisuals: Record<string, BoardVisual> = {
  // --- Raspberry Pi & 40-pin SBCs -----------------------------------------
  "raspberry-pi-5": preset("sbc", { ports: ["ethernet", "usb-a", "hdmi"] }),
  "raspberry-pi-4-model-b": preset("sbc"),
  "raspberry-pi-3-model-b-plus": preset("sbc"),
  "raspberry-pi-3-model-a-plus": preset("sbc", {
    aspect: 1.35,
    ports: ["usb-a", "hdmi", "camera"],
  }),
  "raspberry-pi-400": preset("sbc", {
    aspect: 2.6,
    ports: ["usb-a", "hdmi", "ethernet"],
    revisionNote: "Header sits on the rear edge of the keyboard unit.",
  }),
  "raspberry-pi-500": preset("sbc", {
    aspect: 2.6,
    ports: ["usb-a", "hdmi", "ethernet"],
    revisionNote: "Header sits on the rear edge of the keyboard unit.",
  }),
  "raspberry-pi-2-model-b": preset("sbc"),
  "raspberry-pi-1-model-b-plus": preset("sbc"),
  "raspberry-pi-zero-2-w": preset("sbcZero"),
  "raspberry-pi-zero-w": preset("sbcZero"),
  "raspberry-pi-zero": preset("sbcZero"),
  "banana-pi-bpi-m5": preset("sbc"),
  "banana-pi-bpi-m2-zero": preset("sbcZero"),
  "odroid-c4": preset("sbc"),
  "pine64-rockpro64": preset("sbc", { aspect: 1.6, ports: ["ethernet", "usb-a", "hdmi"] }),
  "libre-computer-le-potato": preset("sbc"),
  "orange-pi-5": preset("sbc"),
  "radxa-zero-3w": preset("sbcZero"),
  "radxa-zero-3e": preset("sbcZero", { ports: ["ethernet", "hdmi"] }),
  "radxa-rock-5b": preset("sbc"),
  "odroid-n2-plus": preset("sbc"),
  "odroid-m1": preset("sbc"),
  "pine64-quartz64-model-b": preset("sbc"),
  "khadas-vim4": preset("sbc", { aspect: 1.3 }),
  "seeed-reterminal": preset("sbc", {
    aspect: 1.5,
    ports: ["ethernet", "usb-a"],
    revisionNote:
      "40-pin expansion header is exposed on the rear of the HMI enclosure.",
  }),
  "beagley-ai": preset("sbc"),
  "seeed-beaglebone-green": preset("grouped", { accent: "#0f766e" }),
  "seeed-wio-terminal": preset("sbc", {
    aspect: 1.1,
    ports: ["usb-c"],
    revisionNote:
      "Raspberry-Pi-style 40-pin port is on the bottom edge of the handheld.",
  }),

  // --- Jetson carriers -----------------------------------------------------
  "jetson-orin-nano-dev-kit": preset("jetson"),
  "nvidia-jetson-nano-dev-kit": preset("jetson"),
  "nvidia-jetson-xavier-nx-dev-kit": preset("jetson"),

  // --- RP2040 / Pico family -----------------------------------------------
  "raspberry-pi-pico": preset("pico"),
  "raspberry-pi-pico-w": preset("pico"),
  "raspberry-pi-pico-2": preset("pico"),
  "raspberry-pi-pico-2-w": preset("pico"),

  // --- ESP32 DevKits -------------------------------------------------------
  "esp32-devkit-v1": preset("esp32Devkit"),
  "esp32-devkitc": preset("esp32Devkit", {
    source: "groups",
    revisionNote:
      "J2 and J3 follow the official ESP32-DevKitC V4 header numbering.",
  }),
  "esp32-s3-devkitc-1": preset("esp32Devkit"),
  "esp32-c3-devkitm-1": preset("esp32Devkit", { aspect: 0.36 }),
  "esp32-c6-devkitc-1": preset("esp32Devkit"),
  "esp32-h2-devkitm-1": preset("esp32Devkit", { ports: ["usb-c"] }),
  "esp32-s2-saola-1": preset("esp32Devkit", { aspect: 0.36 }),
  "nodemcu-devkit-v1": preset("esp32Devkit", { aspect: 0.46 }),

  // --- XIAO / QT Py tiny castellated --------------------------------------
  "seeed-xiao-rp2040": preset("xiao"),
  "seeed-xiao-esp32s3": preset("xiao"),
  "seeed-xiao-samd21": preset("xiao"),
  "seeed-xiao-nrf52840": preset("xiao"),
  "seeed-xiao-esp32c3": preset("xiao"),
  "seeed-xiao-esp32c6": preset("xiao"),
  "adafruit-qt-py-esp32-s3": preset("xiao"),
  "adafruit-qt-py-esp32-c3": preset("xiao"),
  "adafruit-qt-py-rp2040": preset("xiao"),

  // --- Adafruit Feather ----------------------------------------------------
  "adafruit-feather-rp2040": preset("feather"),
  "adafruit-feather-m4-express": preset("feather"),
  "adafruit-feather-nrf52840-express": preset("feather"),
  "adafruit-esp32-s3-feather": preset("feather"),

  // --- Arduino Nano family -------------------------------------------------
  "arduino-nano": preset("nano"),
  "arduino-nano-every": preset("nano"),
  "arduino-nano-33-iot": preset("nano"),
  "arduino-nano-rp2040-connect": preset("nano"),
  "arduino-nano-33-ble-sense": preset("nano"),
  "arduino-nano-esp32": preset("nano", { ports: ["usb-c"] }),

  // --- Arduino MKR family --------------------------------------------------
  "arduino-mkr-zero": preset("mkr"),
  "arduino-mkr-wifi-1010": preset("mkr"),
  "arduino-mkr-wan-1310": preset("mkr"),

  // --- STM32 pills ---------------------------------------------------------
  "stm32f103-blue-pill": preset("stm32Pill", { accent: "#1d4ed8" }),
  "weact-black-pill-stm32f411": preset("stm32Pill", {
    accent: "#27272a",
    ports: ["usb-c"],
  }),

  // --- Teensy / Pro Micro / ESP32 Thing (DIP modules) ---------------------
  "teensy-32": preset("grouped", { accent: "#166534" }),
  "teensy-40": preset("moduleDip", { aspect: 0.46, ports: ["usb-micro"] }),
  "teensy-lc": preset("moduleDip", { aspect: 0.46, ports: ["usb-micro"] }),
  "sparkfun-pro-micro-rp2040": preset("moduleDip", {
    aspect: 0.5,
    ports: ["usb-c"],
  }),
  "arduino-pro-mini": preset("grouped", { accent: "#0e7c86" }),
  "sparkfun-esp32-thing": preset("moduleDip", { aspect: 0.4 }),
  "lolin-d1-mini": preset("moduleDip", { aspect: 0.78 }),

  // --- MilkV Duo (grouped left/right edges → edge-dual) -------------------
  "milkv-duo": preset("moduleDip", { aspect: 0.42, source: "groups" }),

  // --- Arduino UNO-footprint shields --------------------------------------
  "arduino-uno-rev3": preset("arduinoUno"),
  "arduino-uno-r4-wifi": preset("arduinoUno", { ports: ["usb-c", "barrel"] }),
  "arduino-uno-r4-minima": preset("arduinoUno", { ports: ["usb-c", "barrel"] }),
  "arduino-leonardo": preset("grouped", { accent: "#0e7c86" }),
  "arduino-zero": preset("grouped", { accent: "#0e7c86" }),
  "arduino-micro": preset("grouped", { accent: "#0e7c86" }),

  // --- Arduino Mega-footprint shields -------------------------------------
  "arduino-mega-2560-rev3": preset("arduinoMega"),
  "arduino-due": preset("arduinoMega", { ports: ["usb-micro", "barrel"] }),

  // --- Nucleo-64 -----------------------------------------------------------
  "stm32-nucleo-f401re": preset("nucleo", { accent: "#155e75" }),
  "stm32-nucleo-f103rb": preset("nucleo", { accent: "#155e75" }),
  "stm32-nucleo-f446re": preset("nucleo", { accent: "#155e75" }),
  "stm32-nucleo-l476rg": preset("nucleo", { accent: "#155e75" }),
  "stm32-nucleo-g071rb": preset("nucleo", { accent: "#155e75" }),

  // --- Nordic / Arduino-footprint dev kits --------------------------------
  "nordic-nrf52840-dk": preset("devKit", { accent: "#1d4ed8" }),
  "nordic-nrf5340-dk": preset("devKit", { accent: "#1d4ed8" }),
  "nordic-nrf52-dk": preset("devKit", { accent: "#1d4ed8" }),

  // --- TI MSP430 LaunchPad (two BoosterPack rows) -------------------------
  "ti-msp-exp430g2et-launchpad": preset("launchpad", { accent: "#b91c1c" }),

  // --- micro:bit -----------------------------------------------------------
  "bbc-microbit-v2": preset("microbit", { accent: "#0d9488" }),

  // --- Function-grouped / schematic (not to physical scale) ---------------
  "teensy-41": preset("grouped", { accent: "#166534" }),
  "beaglebone-black": preset("grouped", { accent: "#7e22ce" }),
  "beaglebone-ai-64": preset("grouped", { accent: "#7e22ce" }),
  "adafruit-metro-esp32-s3": preset("grouped"),
  "adafruit-metro-m4-express": preset("grouped"),
  "adafruit-grand-central-m4-express": preset("grouped"),
  "arduino-giga-r1-wifi": preset("grouped", { accent: "#0e7c86" }),
  "sparkfun-redboard-artemis-atp": preset("grouped", { accent: "#b91c1c" }),
  "sparkfun-redboard-turbo": preset("grouped", { accent: "#b91c1c" }),
  "sparkfun-thing-plus-rp2040": preset("grouped", { accent: "#b91c1c" }),
  "sparkfun-thing-plus-esp32-wroom-usbc": preset("grouped", {
    accent: "#b91c1c",
  }),
  "particle-photon-2": preset("grouped", { accent: "#0ea5e9" }),
  "particle-boron": preset("grouped", { accent: "#0ea5e9" }),
  "particle-argon": preset("grouped", { accent: "#0ea5e9" }),
  "adafruit-itsybitsy-m4": preset("grouped"),
  "adafruit-itsybitsy-rp2040": preset("grouped"),
  "lolin-s2-mini": preset("grouped"),
  "waveshare-rp2040-zero": preset("grouped"),
  "lilygo-t-display-s3": preset("grouped"),
  "ti-lp-mspm0g3507": preset("grouped", { accent: "#b91c1c" }),
  "silabs-xg24-explorer-kit": preset("grouped", { accent: "#1d4ed8" }),

  // --- Lattice Semiconductor FPGA boards ------------------------------------
  // MachXO2 / MachXO3D family
  "lattice-machxo2-breakout": preset("grouped", {
    accent: "#6d28d9",
    ports: ["usb-mini"],
  }),
  "lattice-machxo3d-breakout": preset("grouped", {
    accent: "#6d28d9",
    ports: ["usb-mini"],
    revisionNote: "UG FPGA-UG-02084 v0.90 (Jul 2019) was preliminary; check for updated revisions.",
  }),
  // iCE40 / CrossLink-NX families
  "lattice-icestick": preset("grouped", {
    accent: "#6d28d9",
    ports: ["usb-a"],
  }),
  "lattice-machxo3l-starter": preset("grouped", {
    accent: "#6d28d9",
    ports: ["usb-mini"],
  }),
  "lattice-crosslink-nx-eval": preset("grouped", {
    accent: "#6d28d9",
    ports: ["usb-micro"],
  }),

  // --- Industry / education boards (July 2026 research batch) --------------
  "nxp-frdm-kl25z": preset("grouped", {
    accent: "#0066a1",
    revisionNote:
      "Rev. E headers are shown as connector groups in ascending designator order.",
  }),
  "digilent-nexys-a7-100t": preset("grouped", {
    accent: "#b45309",
    revisionNote:
      "Five Pmod ports are grouped by connector; JXADC is the dual analog/digital port.",
  }),
  "terasic-de10-lite": preset("grouped", {
    accent: "#166534",
    revisionNote:
      "JP1 and the four Arduino R3 headers are grouped by physical connector.",
  }),
  // Coral has a Raspberry-Pi-style 40-pin header along the top edge.
  "google-coral-dev-board": preset("sbc", {
    accent: "#ea8600",
    ports: ["ethernet", "usb-a", "hdmi", "usb-c"],
  }),
  // The remaining boards have official pin references linked but no in-app
  // map yet, so only artwork renders; presets match their physical form.
  "stm32f4-discovery": preset("devKit", {
    accent: "#155e75",
    ports: ["usb-micro"],
  }),
  "ti-ek-tm4c123gxl-launchpad": preset("launchpad", { accent: "#b91c1c" }),
  "digilent-arty-a7": preset("devKit", { accent: "#b45309" }),
  "digilent-basys-3": preset("devKit", {
    accent: "#b45309",
    usb: "left",
    ports: ["usb-micro", "usb-a"],
  }),
  "arduino-portenta-h7": preset("mkr", { accent: "#0e7c86", ports: ["usb-c"] }),
  "nordic-nrf9160-dk": preset("devKit", { accent: "#1d4ed8" }),

  // --- RISC-V frontier boards (July 2026 research batch) -------------------
  "starfive-visionfive-2": preset("sbc", {
    accent: "#1d4ed8",
    ports: ["ethernet", "usb-a", "hdmi", "usb-c"],
    revisionNote:
      "Header is physically Raspberry-Pi-shaped; GPIO numbering is StarFive's, not BCM.",
  }),
  // Single row of 18 pins on a handheld — rendered as a function-grouped strip
  // rather than a two-row header.
  "flipper-zero": preset("grouped", {
    accent: "#ff8200",
    ports: ["usb-c"],
    revisionNote: "Map follows the F7 (STM32WB55) main-board firmware target.",
  }),
  // Espressif documents J1 as a flat 1-40 list, so it renders as a grouped
  // strip rather than an interleaved 2xN header.
  "esp32-p4-function-ev-board": preset("grouped", {
    accent: "#334155",
    ports: ["usb-c", "camera"],
    revisionNote: "Header table follows board revision v1.52.",
  }),
  "radxa-rock-3a": preset("sbc", {
    ports: ["ethernet", "usb-a", "hdmi", "usb-c"],
    revisionNote:
      "Hardware V1.3/V1.31 header; V1.2 differs on pins 7, 16, 17, 22, 27, 28, and 37.",
  }),

  // --- Officially documented boards (August 2026 research batch) ---------
  "arduino-nicla-sense-me": preset("grouped", {
    accent: "#0e7c86",
    ports: ["usb-micro", "jst"],
    revisionNote:
      "SKU ABX00050; J1, J2, and the mixed-voltage debug fins are grouped by connector.",
  }),
  "milkv-duo-s-v12": preset("grouped", {
    accent: "#3f4654",
    ports: ["usb-c", "usb-a", "ethernet", "camera"],
    revisionNote:
      "Hardware V1.2+; J3 pin 9 is GND. Connectors are grouped and not drawn to scale.",
  }),
  "esp32-c5-devkitc-1": preset("grouped", {
    accent: "#334155",
    ports: ["usb-c"],
    revisionNote:
      "Header map is for board v1.2, production order PW-2025-04-0446 and later.",
  }),
};

// Default PCB accent by vendor, used when a visual does not specify one.
const vendorAccents: Record<string, string> = {
  "Raspberry Pi": "#15803d",
  Arduino: "#0e7c86",
  Adafruit: "#1f2937",
  Espressif: "#334155",
  Seeed: "#0f766e",
  "Seeed Studio": "#0f766e",
  SparkFun: "#b91c1c",
  "Pine64": "#166534",
  PINE64: "#166534",
  Hardkernel: "#9a3412",
  NVIDIA: "#3f6212",
  STMicroelectronics: "#155e75",
  "Nordic Semiconductor": "#1d4ed8",
  "Texas Instruments": "#b91c1c",
  Particle: "#0ea5e9",
  "Lattice Semiconductor": "#6d28d9",
  PJRC: "#166534",
  "BBC micro:bit": "#0d9488",
  "Micro:bit Educational Foundation": "#0d9488",
  BeagleBoard: "#7e22ce",
  "BeagleBoard.org": "#7e22ce",
  Digilent: "#b45309",
  "NXP Semiconductors": "#0066a1",
  Terasic: "#166534",
  "Google Coral": "#ea8600",
};

export function accentForBoard(boardId: string, vendor: string): string {
  return (
    boardVisuals[boardId]?.accent ?? vendorAccents[vendor] ?? "#3f4654"
  );
}
