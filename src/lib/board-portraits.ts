// A product portrait is an identification aid. Coordinates are percentages of
// the case or PCB in this view. Header strips are landmarks; selectable pins
// always come from the independently sourced pinout, never from these shapes.
export type PartKind =
  | "chip"
  | "dip"
  | "hole"
  | "ethernet"
  | "lcd"
  | "touch-slider"
  | "dpad"
  | "joystick"
  | "shield"
  | "usb"
  | "jack"
  | "socket"
  | "header"
  | "pads"
  | "button"
  | "screen"
  | "antenna"
  | "sink"
  | "fan"
  | "camera"
  | "matrix"
  | "switches"
  | "digits"
  | "proto"
  | "jst"
  | "contacts";
export type Part = readonly [
  kind: PartKind,
  x: number,
  y: number,
  width: number,
  height: number,
  count?: number,
];
type Outline = "round" | "shield" | "case" | "beagle";
export type BoardPortrait = {
  aspect: number;
  color: string;
  outline: Outline;
  parts: Part[];
};

const black = "#323a40",
  blue = "#246086",
  teal = "#147b82",
  red = "#b53544";
const green = "#397953",
  white = "#e2e6df",
  purple = "#704588";
const usb: Part = ["usb", -1, 31, 15, 38];
const processor: Part = ["chip", 44, 34, 19, 32];
const radio: Part = ["shield", 60, 20, 32, 60];
const battery: Part = ["jst", 16, 1, 20, 25];
function board(aspect: number, color: string, parts: Part[], outline: Outline = "round"): BoardPortrait {
  return { aspect, color, parts, outline };
}

// Long modules are viewed with USB to the left. Row lengths vary by footprint.
function moduleBoard(
  aspect: number,
  color: string,
  parts: Part[],
  rows: Part[] = [
    ["pads", 5, 4, 90, 9],
    ["pads", 5, 87, 90, 9],
  ],
): BoardPortrait {
  return board(aspect, color, [...rows, ...parts]);
}
function feather(color: string, ...parts: Part[]) {
  return moduleBoard(
    2.23,
    color,
    [usb, battery, ...parts],
    [
      ["pads", 18, 88, 77, 8],
      ["pads", 39, 4, 56, 8],
    ],
  );
}
function nano(...parts: Part[]) {
  return moduleBoard(2.5, blue, [usb, ...parts]);
}
function xiao(center: PartKind = "shield") {
  return moduleBoard(1.18, black, [
    ["usb", -3, 22, 45, 56],
    [center, 47, 16, 48, 69],
  ]);
}
function qtPy(color: string, ...parts: Part[]) {
  return moduleBoard(1.15, color, [["usb", -3, 22, 43, 55], ...parts]);
}
function devkit(aspect: number, ports: number, mini = false, color = black) {
  const jacks: Part[] =
    ports === 2
      ? [
          ["usb", -1, 17, 12, 25],
          ["usb", -1, 58, 12, 25],
        ]
      : [usb];
  return moduleBoard(aspect, color, [
    ...jacks,
    ["button", 18, 18, 7, 13],
    ["button", 18, 69, 7, 13],
    ["chip", 29, 37, 12, 24],
    ["shield", mini ? 61 : 54, 20, mini ? 25 : 33, 60],
    ["antenna", 88, 22, 11, 55],
  ]);
}
function shieldBoard(aspect: number, color: string, ports: Part[], components: Part[], mega = false) {
  const headers: Part[] = [
    ["header", 25, 4, 33, 7, 10],
    ["header", 62, 4, 29, 7, 8],
    ["header", 44, 89, 23, 7, 8],
    ["header", 71, 89, 20, 7, mega ? 8 : 6],
  ];
  if (mega) headers.push(["header", 93, 12, 5, 74]);
  return board(
    aspect,
    color,
    [...headers, ["hole", 16, 4, 4, 5], ["hole", 16, 88, 4, 5], ...ports, ...components],
    "shield",
  );
}
const barrel: Part = ["jack", -1, 73, 18, 19];
const usbB: Part = ["usb", -2, 12, 23, 22];
const smallUsb: Part = ["usb", -1, 17, 13, 13];
function nucleo(kind: "classic" | "new" | "small" | "144") {
  if (kind === "small")
    return moduleBoard(2.76, white, [
      usb,
      ["chip", 26, 33, 18, 37],
      ["chip", 70, 30, 18, 40],
      ["button", 55, 65, 9, 17],
    ]);
  const parts: Part[] = [
    ["usb", 36, -1, 23, 10],
    ["chip", 41, 13, 15, 10],
    ["header", 5, 35, 5, 58],
    ["header", 90, 35, 5, 58],
    ["header", 17, 44, 6, 41],
    ["header", 77, 42, 6, 47],
    ["chip", 38, 55, 25, 18],
    ["button", 23, 30, 9, 7],
    ["button", 66, 30, 9, 7],
  ];
  if (kind === "144") parts.push(["socket", 66, 82, 20, 17], ["usb", 4, 79, 11, 10]);
  if (kind === "new") parts.push(["jst", 61, 12, 18, 9]);
  return board(kind === "144" ? 0.525 : 0.85, white, parts);
}
function sbc(aspect: number, color: string, parts: Part[]) {
  return board(aspect, color, [
    ["header", 6, 4, 62, 7, 20],
    ["hole", 2, 2, 3, 4],
    ["hole", 2, 90, 3, 4],
    ...parts,
  ]);
}
const ethernet: Part = ["ethernet", 77, 65, 24, 28];
const twinUsb: Part[] = [
  ["socket", 82, 8, 19, 21],
  ["socket", 82, 37, 19, 21],
];
const hdmi: Part = ["usb", 39, 87, 17, 14];
const memory: Part = ["chip", 51, 32, 13, 25];
const soc: Part = ["chip", 29, 38, 20, 26];
function fpga(aspect: number, color: string, extras: Part[]) {
  return board(aspect, color, [["chip", 42, 35, 21, 28], ...extras]);
}
const pmods: Part[] = [
  ["header", 8, 1, 17, 9],
  ["header", 29, 1, 17, 9],
  ["header", 52, 1, 17, 9],
  ["header", 75, 1, 17, 9],
];
function lattice(color: string) {
  return fpga(1, color, [
    ["usb", -1, 41, 12, 14],
    ["proto", 13, 8, 73, 15],
    ["proto", 14, 75, 72, 15],
    ["proto", 83, 27, 9, 45],
    ["chip", 17, 41, 13, 16],
  ]);
}
function nordic(aspect: number, modem = false) {
  return board(aspect, blue, [
    usb,
    ["chip", 18, 39, 14, 22],
    [modem ? "shield" : "chip", 64, 37, 15, 24],
    ["header", 37, 10, 46, 6],
    ["header", 46, 78, 36, 6],
    ["header", 46, 90, 48, 5],
    ["button", 39, 55, 6, 10],
    ["button", 48, 55, 6, 10],
    ["antenna", 85, 23, 11, 23],
  ]);
}
const portraitModels: Record<string, BoardPortrait> = {};
function models(ids: string[], portrait: BoardPortrait) {
  for (const id of ids) portraitModels[id] = portrait;
}

// See the catalog's model-specific product pages and pinout drawings. Layouts
// shared below retain only features common to the named physical variants.
models(
  ["arduino-uno-rev3"],
  shieldBoard(
    1.29,
    teal,
    [usbB, barrel],
    [
      ["dip", 39, 57, 46, 16],
      ["chip", 22, 25, 11, 15],
    ],
  ),
);
models(["arduino-uno-r4-minima"], shieldBoard(1.29, teal, [smallUsb, barrel], [processor]));
models(
  ["arduino-uno-r4-wifi"],
  shieldBoard(
    1.29,
    teal,
    [smallUsb, barrel],
    [
      ["shield", 21, 18, 19, 25],
      ["matrix", 51, 36, 34, 33, 12],
      ["chip", 32, 62, 15, 17],
    ],
  ),
);
models(
  ["arduino-uno-q"],
  shieldBoard(
    1.29,
    blue,
    [smallUsb],
    [
      ["shield", 18, 59, 18, 24],
      ["chip", 41, 19, 21, 27],
      ["matrix", 45, 58, 43, 22],
    ],
  ),
);
models(["arduino-leonardo"], shieldBoard(1.29, teal, [smallUsb, barrel], [processor]));
models(["arduino-zero"], shieldBoard(1.29, teal, [smallUsb, ["usb", -1, 40, 13, 13], barrel], [processor]));
models(["arduino-mega-2560-rev3"], shieldBoard(1.9, teal, [usbB, barrel], [processor], true));
models(
  ["arduino-giga-r1-wifi"],
  shieldBoard(
    1.9,
    blue,
    [smallUsb, ["socket", -1, 46, 16, 18], barrel],
    [processor, ["shield", 17, 66, 15, 15]],
    true,
  ),
);
models(
  ["arduino-due"],
  shieldBoard(1.9, teal, [smallUsb, ["usb", -1, 41, 12, 13], barrel], [processor], true),
);
models(["arduino-nano"], nano(processor, ["button", 74, 36, 13, 27]));
models(
  ["arduino-nano-every"],
  moduleBoard(2.5, teal, [usb, ["chip", 40, 34, 16, 34], ["button", 72, 38, 10, 25]]),
);
models(
  ["arduino-nano-r4"],
  moduleBoard(2.5, blue, [usb, ["chip", 34, 22, 26, 55], ["button", 68, 36, 8, 20], ["jst", 84, 26, 15, 48]]),
);
models(["arduino-nano-33-iot", "arduino-nano-rp2040-connect"], nano(["chip", 29, 34, 16, 32], radio));
models(
  ["arduino-nano-33-ble", "arduino-nano-33-ble-sense", "arduino-nano-33-ble-sense-rev2"],
  nano(["button", 40, 40, 9, 20], radio),
);
models(
  ["arduino-nano-esp32"],
  moduleBoard(2.5, teal, [
    usb,
    ["button", 26, 35, 9, 21],
    ["shield", 43, 24, 32, 51],
    ["antenna", 78, 25, 16, 48],
  ]),
);
models(["arduino-nano-matter"], nano(["chip", 38, 32, 16, 35], ["shield", 68, 28, 22, 43]));
models(["arduino-micro"], moduleBoard(2.66, teal, [usb, processor, ["button", 79, 31, 12, 34]]));
models(["arduino-pro-mini"], moduleBoard(1.83, blue, [processor, ["button", 76, 37, 13, 26]]));
models(["arduino-mkr-zero"], moduleBoard(2.46, teal, [usb, processor, ["shield", 65, 25, 29, 48]]));
models(
  ["arduino-mkr-wifi-1010", "arduino-mkr-1000-wifi"],
  moduleBoard(2.46, teal, [usb, ["chip", 34, 32, 16, 35], radio]),
);
models(
  ["arduino-mkr-wan-1310"],
  moduleBoard(2.72, teal, [
    usb,
    ["chip", 33, 36, 13, 28],
    ["shield", 59, 26, 24, 52],
    ["button", 84, 48, 7, 14],
  ]),
);
models(["arduino-portenta-h7"], moduleBoard(2.45, black, [usb, processor, ["chip", 72, 31, 17, 37]]));
models(
  ["arduino-nicla-sense-me"],
  moduleBoard(1, black, [
    ["usb", -2, 40, 25, 28],
    ["shield", 60, 16, 25, 28],
    ["chip", 44, 54, 22, 22],
  ]),
);

models(
  [
    "adafruit-feather-rp2040",
    "adafruit-feather-rp2350",
    "adafruit-feather-m0-express",
    "adafruit-feather-m4-express",
  ],
  feather(black, processor, ["chip", 74, 38, 12, 22]),
);
models(
  ["adafruit-feather-esp32-v2", "adafruit-feather-esp32-s2", "adafruit-esp32-s3-feather"],
  feather(black, radio),
);
models(["adafruit-feather-nrf52840-express"], feather(blue, radio));
models(["adafruit-kb2040"], moduleBoard(1.85, black, [usb, processor, ["jst", 82, 33, 17, 34]]));
models(
  ["adafruit-itsybitsy-m4", "adafruit-itsybitsy-rp2040"],
  moduleBoard(1.96, black, [usb, processor, ["chip", 70, 32, 12, 21]]),
);
models(
  ["adafruit-qt-py-esp32-s2", "adafruit-qt-py-esp32-c3", "adafruit-qt-py-esp32-s3"],
  qtPy(purple, ["chip", 48, 35, 22, 29], ["antenna", 77, 25, 19, 48]),
);
models(["adafruit-qt-py-rp2040"], qtPy(black, ["chip", 52, 32, 27, 35]));
models(["adafruit-metro-m4-express"], shieldBoard(1.29, purple, [smallUsb, barrel], [processor]));
models(
  ["adafruit-metro-esp32-s3"],
  shieldBoard(1.29, black, [smallUsb, barrel], [radio, ["socket", 29, 55, 19, 21]]),
);
models(["adafruit-grand-central-m4-express"], shieldBoard(1.9, black, [smallUsb, barrel], [processor], true));
models(
  [
    "seeed-xiao-samd21",
    "seeed-xiao-rp2040",
    "seeed-xiao-rp2350",
    "seeed-xiao-esp32s3",
    "seeed-xiao-esp32c3",
    "seeed-xiao-esp32c6",
    "seeed-xiao-nrf52840",
    "seeed-xiao-nrf52840-sense",
    "seeed-xiao-mg24",
    "seeed-xiao-nrf54l15",
    "seeed-xiao-nrf54lm20a",
    "seeed-xiao-esp32c5",
    "seeed-xiao-ra4m1",
  ],
  xiao(),
);
models(["seeed-xiao-esp32s3-sense"], xiao("camera"));
models(["esp32-devkit-v1", "esp32-devkitc", "nodemcu-devkit-v1"], devkit(1.94, 1));
models(
  ["esp32-s3-devkitc-1", "esp32-c6-devkitc-1", "esp32-c61-devkitc-1", "esp32-c5-devkitc-1"],
  devkit(2.45, 2),
);
models(["esp32-s3-devkitm-1", "esp32-c6-devkitm-1", "esp32-h2-devkitm-1"], devkit(2.2, 2, true));
models(["esp32-c3-devkitm-1", "esp32-s2-devkitm-1", "esp8684-devkitm-1"], devkit(1.93, 1, true));
models(["esp32-c3-devkitc-02", "esp32-s2-saola-1"], devkit(2.02, 1));
models(
  ["esp32-p4-function-ev-board"],
  board(1.37, black, [
    ["usb", -1, 21, 11, 17],
    ["usb", -1, 44, 11, 17],
    ["socket", 80, 72, 21, 26],
    processor,
    ["jst", 38, 4, 28, 8],
    ["header", 8, 83, 53, 7],
  ]),
);

models(
  [
    "stm32-nucleo-f401re",
    "stm32-nucleo-f103rb",
    "stm32-nucleo-f446re",
    "stm32-nucleo-l476rg",
    "stm32-nucleo-g071rb",
    "stm32-nucleo-f411re",
    "stm32-nucleo-f072rb",
    "stm32-nucleo-f091rc",
    "stm32-nucleo-f303re",
    "stm32-nucleo-f334r8",
    "stm32-nucleo-l053r8",
    "stm32-nucleo-l073rz",
    "stm32-nucleo-l152re",
  ],
  nucleo("classic"),
);
models(
  [
    "stm32-nucleo-g431rb",
    "stm32-nucleo-g474re",
    "stm32-nucleo-g0b1re",
    "stm32-nucleo-c031c6",
    "stm32-nucleo-h503rb",
  ],
  nucleo("new"),
);
models(["stm32-nucleo-h753zi"], nucleo("144"));
models(["stm32-nucleo-l432kc", "stm32-nucleo-g431kb", "stm32-nucleo-f303k8"], nucleo("small"));
models(
  ["stm32f4-discovery"],
  board(0.68, green, [
    ["usb", 38, -1, 23, 11],
    ["chip", 40, 15, 18, 12],
    ["chip", 34, 52, 31, 21],
    ["header", 3, 38, 7, 59],
    ["header", 90, 38, 7, 59],
    ["button", 24, 41, 9, 7],
    ["button", 67, 41, 9, 7],
  ]),
);
models(
  ["stm32f103-blue-pill"],
  moduleBoard(2.31, blue, [usb, processor, ["header", 72, 26, 17, 19], ["button", 69, 61, 10, 16]]),
);
models(
  ["weact-black-pill-stm32f411"],
  moduleBoard(2.55, black, [usb, processor, ["button", 23, 21, 7, 15], ["button", 23, 63, 7, 15]]),
);
models(["nordic-nrf52840-dk", "nordic-nrf52-dk", "nordic-nrf5340-dk"], nordic(1.87));
models(["nordic-nrf9160-dk"], nordic(2.36, true));

models(["teensy-40"], moduleBoard(2, green, [usb, processor, ["button", 78, 35, 11, 25]]));
models(["teensy-32"], moduleBoard(2, green, [usb, ["chip", 45, 21, 29, 56], ["button", 83, 34, 11, 28]]));
models(["teensy-lc"], moduleBoard(2, green, [usb, ["chip", 56, 30, 21, 42], ["button", 84, 37, 9, 24]]));
models(
  ["teensy-41"],
  moduleBoard(3.38, green, [
    usb,
    ["chip", 32, 27, 16, 46],
    ["button", 71, 22, 8, 19],
    ["socket", 83, 28, 17, 46],
  ]),
);
models(
  ["sparkfun-redboard-qwiic"],
  shieldBoard(1.29, red, [smallUsb, barrel], [processor, ["jst", 67, 59, 12, 14]]),
);
models(
  ["sparkfun-redboard-turbo"],
  shieldBoard(1.29, red, [smallUsb, barrel], [processor, ["chip", 64, 50, 9, 10]]),
);
models(
  ["sparkfun-redboard-artemis-atp"],
  shieldBoard(
    1.96,
    red,
    [smallUsb],
    [
      ["shield", 24, 32, 21, 28],
      ["chip", 65, 50, 11, 16],
      ["jst", 79, 33, 12, 11],
    ],
    true,
  ),
);
models(["sparkfun-pro-micro", "sparkfun-pro-micro-rp2040"], moduleBoard(1.85, red, [usb, processor]));
models(
  ["sparkfun-esp32-thing"],
  moduleBoard(2.3, red, [usb, battery, processor, ["antenna", 83, 20, 13, 57]]),
);
models(["sparkfun-thing-plus-rp2040"], feather(red, processor, ["socket", 72, 28, 21, 42]));
models(["sparkfun-thing-plus-esp32-wroom-usbc"], feather(red, radio));
models(["particle-argon", "particle-boron"], feather("#365966", radio, ["button", 33, 51, 8, 14]));
models(
  ["particle-photon-2"],
  moduleBoard(2.23, black, [
    usb,
    ["button", 26, 30, 7, 15],
    ["shield", 47, 25, 25, 50],
    ["antenna", 78, 25, 14, 46],
  ]),
);
models(["lolin-d1-mini"], moduleBoard(1.34, blue, [usb, processor]));
models(["lolin-s2-mini"], moduleBoard(1.34, purple, [usb, processor, ["antenna", 76, 25, 18, 52]]));
models(
  ["lilygo-t-display-s3"],
  board(2.64, black, [usb, ["screen", 13, 6, 82, 83], ["button", 5, 78, 5, 12]]),
);
models(
  ["waveshare-rp2040-zero", "waveshare-rp2350-zero"],
  moduleBoard(1.31, blue, [
    ["usb", -2, 24, 38, 51],
    ["chip", 48, 35, 23, 30],
    ["button", 77, 20, 13, 17],
    ["button", 77, 64, 13, 17],
  ]),
);
models(
  ["waveshare-rp2350-plus"],
  moduleBoard(2.43, blue, [usb, processor, ["button", 21, 23, 8, 15], ["button", 21, 62, 8, 15]]),
);
models(["milkv-duo"], moduleBoard(2.43, green, [usb, processor, ["chip", 72, 28, 11, 40]]));
models(
  ["milkv-duo-s-v12"],
  board(1.19, green, [
    ["header", 6, 3, 86, 7],
    ["header", 6, 90, 86, 7],
    ["socket", -1, 16, 30, 36],
    ["usb", -1, 62, 22, 23],
    ["chip", 51, 34, 22, 25],
    ["jst", 70, 12, 22, 9],
  ]),
);
models(
  ["silabs-xg24-explorer-kit"],
  moduleBoard(1.9, black, [
    usb,
    processor,
    ["header", 53, 21, 36, 8],
    ["header", 53, 72, 36, 8],
    ["antenna", 82, 39, 13, 20],
  ]),
);
models(
  ["ti-msp-exp430g2et-launchpad"],
  board(1.22, red, [
    ["usb", 14, -1, 16, 16],
    ["chip", 42, 12, 15, 19],
    ["header", 12, 46, 6, 43],
    ["header", 82, 46, 6, 43],
    ["dip", 34, 47, 22, 38],
    ["button", 7, 85, 9, 10],
  ]),
);
models(
  ["ti-lp-mspm0g3507"],
  board(1.93, red, [
    usb,
    ["chip", 23, 38, 15, 28],
    ["chip", 67, 35, 15, 28],
    ["header", 48, 8, 43, 8],
    ["header", 48, 83, 43, 8],
    ["button", 79, 59, 6, 10],
  ]),
);
models(
  ["ti-ek-tm4c123gxl-launchpad"],
  board(0.83, red, [
    ["usb", 15, -1, 18, 10],
    ["chip", 39, 12, 20, 15],
    ["chip", 38, 55, 23, 19],
    ["header", 6, 41, 8, 48],
    ["header", 86, 41, 8, 48],
    ["button", 13, 89, 9, 7],
    ["button", 77, 89, 9, 7],
  ]),
);
models(
  ["nxp-frdm-kl25z"],
  board(1.50, black, [
    ["usb", -1, 17, 13, 16],
    ["usb", -1, 65, 13, 16],
    processor,
    ["header", 20, 5, 32, 7, 10], ["header", 55, 5, 24, 7, 8],
    ["header", 28, 89, 24, 7, 8], ["header", 55, 89, 24, 7, 8],
    ["touch-slider", 81, 17, 16, 68],
  ]),
);

models(["banana-pi-bpi-m5"], sbc(1.52, blue, [soc, memory, ...twinUsb, ethernet, hdmi]));
models(
  ["banana-pi-bpi-m2-zero"],
  sbc(2.17, blue, [
    soc,
    ["usb", 17, 85, 16, 16],
    ["usb", 58, 89, 11, 12],
    ["usb", 77, 89, 11, 12],
    ["jst", 92, 25, 6, 43],
  ]),
);
models(
  ["orange-pi-zero-2w"],
  sbc(2.17, blue, [soc, memory, ["usb", 19, 82, 17, 19], ["usb", 60, 88, 11, 13], ["usb", 80, 88, 11, 13]]),
);
models(
  ["radxa-zero-3w"],
  sbc(2.17, green, [soc, memory, ["usb", 16, 84, 14, 17], ["usb", 58, 86, 12, 15], ["usb", 79, 86, 12, 15]]),
);
models(
  ["radxa-zero-3e"],
  sbc(2.17, green, [
    ["socket", -1, 28, 24, 56],
    soc,
    memory,
    ["usb", 58, 86, 12, 15],
    ["usb", 79, 86, 12, 15],
  ]),
);
models(
  ["radxa-rock-3a"],
  sbc(1.54, green, [soc, memory, ...twinUsb, ethernet, hdmi, ["usb", 7, 85, 12, 16]]),
);
models(
  ["radxa-rock-5b"],
  sbc(1.39, green, [["shield", 27, 31, 25, 30], memory, ...twinUsb, ethernet, hdmi, ["usb", 12, 84, 14, 17]]),
);
models(["orange-pi-3b"], sbc(1.52, blue, [soc, memory, ...twinUsb, ethernet, hdmi]));
models(
  ["orange-pi-5"],
  sbc(1.61, teal, [
    soc,
    memory,
    ["socket", 82, 7, 19, 20],
    ["socket", 82, 35, 19, 20],
    ethernet,
    hdmi,
    ["jst", 9, 29, 6, 34],
  ]),
);
models(
  ["orange-pi-5-plus"],
  sbc(1.6, blue, [
    soc,
    memory,
    ["socket", 80, 5, 21, 21],
    ["socket", 80, 31, 21, 21],
    ["socket", 80, 59, 21, 17],
    ["socket", 80, 81, 21, 17],
    hdmi,
  ]),
);
models(["libre-computer-le-potato"], sbc(1.52, white, [soc, memory, ...twinUsb, ethernet, hdmi]));
models(
  ["libre-computer-alta", "libre-computer-solitude"],
  sbc(1.52, white, [["sink", 23, 29, 32, 39], ...twinUsb, ethernet, hdmi, ["usb", 9, 87, 12, 14]]),
);
models(["libre-computer-tritium-h5"], sbc(1.52, white, [soc, memory, ...twinUsb, ethernet, hdmi]));
models(["odroid-c4"], sbc(1.52, red, [["sink", 21, 26, 47, 54], ...twinUsb, ethernet, hdmi]));
models(
  ["odroid-m1"],
  sbc(1.46, green, [["chip", 34, 31, 21, 29], ["header", 9, 81, 53, 7], ...twinUsb, ethernet, hdmi]),
);
models(
  ["odroid-n2-plus"],
  sbc(1.78, blue, [soc, memory, ...twinUsb, ethernet, hdmi, ["jack", 7, 78, 12, 22]]),
);
models(
  ["pine64-rockpro64"],
  sbc(1.68, blue, [soc, memory, ["header", 9, 83, 45, 9], ...twinUsb, ethernet, hdmi]),
);
models(["pine64-quartz64-model-b"], sbc(1.52, black, [soc, memory, ...twinUsb, ethernet, hdmi]));
models(
  ["khadas-vim4"],
  sbc(1.44, black, [soc, memory, ["socket", 2, 73, 17, 24], ["socket", 78, 73, 20, 25], hdmi]),
);
models(
  ["starfive-visionfive-2"],
  sbc(1.41, black, [
    soc,
    memory,
    ["socket", 79, 5, 21, 20],
    ["socket", 79, 29, 21, 20],
    ["socket", 79, 54, 21, 20],
    ["socket", 79, 78, 21, 20],
    hdmi,
  ]),
);
models(["beagley-ai"], sbc(1.52, black, [["shield", 28, 36, 22, 29], memory, ...twinUsb, ethernet, hdmi]));
models(
  ["beaglebone-black"],
  board(
    1.58,
    black,
    [
      ["header", 14, 6, 72, 9],
      ["header", 14, 85, 72, 9],
      soc,
      memory,
      ["socket", -1, 48, 23, 30],
      ["socket", 86, 32, 15, 22],
    ],
    "beagle",
  ),
);
models(
  ["seeed-beaglebone-green"],
  board(
    1.58,
    green,
    [
      ["header", 14, 5, 72, 11, 23],
      ["header", 14, 84, 72, 11, 23],
      soc,
      memory,
      ["ethernet", -1, 27, 23, 33],
      ["socket", -1, 67, 17, 20],
      ["jst", 88, 34, 11, 18],
      ["jst", 88, 58, 11, 18],
    ],
    "beagle",
  ),
);
models(
  ["beaglebone-ai-64"],
  board(
    1.21,
    black,
    [
      ["header", 9, 6, 78, 8],
      ["header", 9, 87, 78, 8],
      ["sink", 26, 25, 47, 48],
      ethernet,
      ["socket", 82, 17, 19, 24],
    ],
    "beagle",
  ),
);
models(
  ["google-coral-dev-board"],
  sbc(1.51, green, [["fan", 19, 21, 45, 61], ["socket", 81, 15, 20, 25], ethernet, hdmi]),
);
models(
  ["nvidia-jetson-nano-dev-kit"],
  sbc(1.27, green, [["sink", 12, 19, 57, 64], ...twinUsb, ethernet, hdmi]),
);
models(
  ["jetson-orin-nano-dev-kit", "nvidia-jetson-xavier-nx-dev-kit"],
  sbc(1.27, black, [["fan", 13, 18, 55, 65], ...twinUsb, ethernet, hdmi]),
);
models(
  ["nvidia-jetson-agx-orin-devkit"],
  board(
    1.1,
    "#777e80",
    [
      ["sink", 5, 4, 90, 88],
      ["fan", 22, 18, 56, 62],
    ],
    "case",
  ),
);
models(
  ["seeed-wio-terminal"],
  board(
    1.26,
    "#e7eae4",
    [
      ["screen", 4, 5, 92, 77],
      ["joystick", 82, 83, 10, 12],
    ],
    "case",
  ),
);
models(
  ["seeed-reterminal"],
  board(
    1.47,
    "#dcded8",
    [
      ["screen", 3, 3, 94, 81],
      ["button", 48, 89, 8, 5],
      ["button", 58, 89, 8, 5],
      ["button", 68, 89, 8, 5],
      ["button", 78, 89, 8, 5],
    ],
    "case",
  ),
);
models(
  ["flipper-zero"],
  board(
    2.5,
    "#eee9d9",
    [
      ["lcd", 16, 21, 45, 51],
      ["dpad", 67, 18, 21, 52],
      ["button", 89, 72, 6, 14],
    ],
    "case",
  ),
);
models(
  ["bbc-microbit-v2"],
  board(1.27, black, [
    ["matrix", 34, 13, 32, 44, 5],
    ["button", 9, 33, 13, 16],
    ["button", 77, 33, 13, 16],
    ["contacts", 1, 77, 98, 23],
  ]),
);
models(["lattice-machxo2-breakout"], lattice(green));
models(["lattice-machxo3d-breakout"], lattice(black));
models(["lattice-machxo3l-starter"], lattice(black));
models(
  ["lattice-crosslink-nx-eval"],
  fpga(1.48, black, [
    smallUsb,
    ["header", 84, 23, 9, 56],
    ["header", 24, 81, 50, 10],
    ["header", 12, 5, 54, 6],
    ["chip", 19, 36, 12, 17],
  ]),
);
models(
  ["lattice-icestick"],
  board(3.25, green, [
    ["usb", -4, 25, 23, 50],
    processor,
    ["header", 36, 6, 43, 8],
    ["header", 36, 85, 43, 8],
    ["header", 87, 22, 12, 56, 6],
  ]),
);
models(["digilent-cmod-a7-35t"], moduleBoard(3.93, blue, [usb, processor, ["header", 89, 19, 10, 62, 6]]));
const navigationButtons: Part[] = [
  ["button", 71, 55, 4, 6],
  ["button", 71, 63, 4, 6],
  ["button", 71, 71, 4, 6],
  ["button", 65, 63, 4, 6],
  ["button", 77, 63, 4, 6],
];
const sidePmods: Part[] = [
  ["header", -1, 22, 9, 20, 6],
  ["header", -1, 53, 9, 20, 6],
  ["header", 92, 22, 9, 20, 6],
  ["header", 92, 53, 9, 20, 6],
];
models(
  ["digilent-nexys-a7-100t"],
  fpga(1.42, blue, [
    ...sidePmods,
    ...navigationButtons,
    ["digits", 13, 60, 39, 13, 8],
    ["switches", 8, 84, 83, 10, 16],
    ["socket", 44, -2, 22, 16],
    ["ethernet", 71, -1, 15, 20],
    smallUsb,
  ]),
);
models(
  ["digilent-basys-3"],
  fpga(1.47, blue, [
    ...sidePmods,
    ...navigationButtons,
    ["digits", 14, 59, 26, 14, 4],
    ["switches", 7, 83, 86, 13, 16],
    ["socket", 38, -3, 24, 21],
    ["usb", 68, 0, 12, 19],
    ["usb", 20, -1, 8, 7],
  ]),
);
function arty(hasEthernet: boolean) {
  const ports: Part[] = [smallUsb, barrel];
  if (hasEthernet) ports.push(["ethernet", -1, 39, 16, 22]);
  return fpga(1.28, white, [
    ...pmods,
    ...ports,
    ["header", 52, 22, 42, 6],
    ["header", 60, 77, 34, 6],
    ["switches", 33, 88, 31, 10, 4],
    ["button", 66, 88, 5, 7],
    ["button", 74, 88, 5, 7],
    ["button", 82, 88, 5, 7],
    ["button", 90, 88, 5, 7],
  ]);
}
models(["digilent-arty-a7"], arty(true));
models(["digilent-arty-s7-50"], arty(false));
models(
  ["digilent-zybo-z7-20"],
  board(1.45, green, [
    ["sink", 41, 36, 17, 24],
    ["ethernet", 18, -1, 15, 25],
    ["usb", 35, -1, 13, 13],
    ["usb", 77, -1, 13, 13],
    ["socket", -1, 69, 14, 15],
    ["switches", 18, 68, 21, 13, 4],
    ["header", -1, 44, 9, 18, 6],
    ["header", 92, 65, 9, 20, 6],
    ["header", 15, 86, 13, 15, 6],
    ["header", 33, 86, 13, 15, 6],
    ["header", 53, 86, 13, 15, 6],
    ["header", 71, 86, 13, 15, 6],
  ]),
);
models(
  ["terasic-de10-lite"],
  fpga(1.58, blue, [
    ["header", 30, 4, 62, 8],
    ["digits", 10, 75, 41, 17, 6],
    ["switches", 57, 81, 37, 11, 10],
    smallUsb,
    ["socket", 83, 37, 17, 24],
  ]),
);

export function boardPortrait(id: string): BoardPortrait | undefined {
  return Object.hasOwn(portraitModels, id) ? portraitModels[id] : undefined;
}
