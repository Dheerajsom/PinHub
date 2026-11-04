import type { PinFlag, PinFunction, PinFunctionData, Pinout, PinPeripheral } from "../boards";
import { fn, withPinFunctions, type PinFunctionTable } from "../pin-function-data";

// Planner data for the Espressif ESP32 family. ADC channels, controller counts,
// and pin notes live in one row per chip (ESP-IDF v5.5 soc headers and
// gpio.html, v5.5.1), so a board only states which GPIO sits under each label
// and which pins its Arduino variant uses by default (arduino-esp32 3.3.9).

type EspChip = {
  /** ESP-IDF target directory. */
  soc: string;
  adc: Record<number, string>;
  dac?: Record<number, string>;
  i2c: string[];
  uart: string[];
  spi: string[];
  ledc: number;
  /** HardwareSerial.h SOC_TX0 and SOC_RX0. */
  uart0: { TX: number; RX: number };
  strapping: number[];
  /** "SPI0/1" pins in gpio.html. */
  flash?: number[];
  usb?: number[];
  jtag?: number[];
  inputOnly?: number[];
  mux: string;
  notes: Partial<Record<PinFlag, string>>;
  /** MicroPython v1.27.0 ships an ESP32_GENERIC build for this chip. */
  micropython: boolean;
};

const espChips = {
  "ESP32": {
    soc: "esp32",
    adc: { 0: "ADC2.CH1", 2: "ADC2.CH2", 4: "ADC2.CH0", 12: "ADC2.CH5", 13: "ADC2.CH4", 14: "ADC2.CH6", 15: "ADC2.CH3", 25: "ADC2.CH8", 26: "ADC2.CH9", 27: "ADC2.CH7", 32: "ADC1.CH4", 33: "ADC1.CH5", 34: "ADC1.CH6", 35: "ADC1.CH7", 36: "ADC1.CH0", 37: "ADC1.CH1", 38: "ADC1.CH2", 39: "ADC1.CH3" },
    dac: { 25: "DAC.CH1", 26: "DAC.CH2" },
    i2c: ["I2C0", "I2C1"],
    uart: ["UART0", "UART1", "UART2"],
    spi: ["SPI3", "SPI2"],
    ledc: 8,
    uart0: { TX: 1, RX: 3 },
    strapping: [0, 2, 5, 12, 15],
    flash: [6, 7, 8, 9, 10, 11],
    usb: [1, 3],
    jtag: [12, 13, 14, 15],
    inputOnly: [34, 35, 36, 37, 38, 39],
    mux: "Through IO MUX, RTC IO MUX and the GPIO matrix, peripheral input signals can be from any IO pins, and peripheral output signals can be routed to any IO pins.",
    notes: {
      "strapping": "GPIO0, GPIO2, GPIO5, GPIO12 (MTDI), and GPIO15 (MTDO) are strapping pins.",
      "module-memory": "GPIO6-11 and GPIO16-17 are usually connected to the SPI flash and PSRAM integrated on the module and therefore should not be used for other purposes.",
      "jtag": "GPIO12-15 are usually used for inline debug.",
      "input-only": "GPIO34-39 can only be set as input mode and do not have software-enabled pullup or pulldown functions.",
      "usb": "TXD & RXD are usually used for flashing and debugging.",
      "adc-unavailable-with-wifi": "ADC2 pins cannot be used when Wi-Fi is used.",
    },
    micropython: true,
  },
  "ESP32-S2": {
    soc: "esp32s2",
    adc: { 1: "ADC1.CH0", 2: "ADC1.CH1", 3: "ADC1.CH2", 4: "ADC1.CH3", 5: "ADC1.CH4", 6: "ADC1.CH5", 7: "ADC1.CH6", 8: "ADC1.CH7", 9: "ADC1.CH8", 10: "ADC1.CH9", 11: "ADC2.CH0", 12: "ADC2.CH1", 13: "ADC2.CH2", 14: "ADC2.CH3", 15: "ADC2.CH4", 16: "ADC2.CH5", 17: "ADC2.CH6", 18: "ADC2.CH7", 19: "ADC2.CH8", 20: "ADC2.CH9" },
    dac: { 17: "DAC.CH1", 18: "DAC.CH2" },
    i2c: ["I2C0", "I2C1"],
    uart: ["UART0", "UART1"],
    spi: ["SPI2", "SPI3"],
    ledc: 8,
    uart0: { TX: 43, RX: 44 },
    strapping: [0, 45, 46],
    flash: [26, 27, 28, 29, 30, 31, 32],
    jtag: [39, 40, 41, 42],
    inputOnly: [46],
    mux: "Through IO MUX, RTC IO MUX and the GPIO matrix, peripheral input signals can be from any IO pins, and peripheral output signals can be routed to any IO pins.",
    notes: {
      "strapping": "GPIO0, GPIO45 and GPIO46 are strapping pins.",
      "module-memory": "GPIO26-32 are usually used for SPI flash and PSRAM and not recommended for other uses.",
      "jtag": "GPIO39-42 are usually used for inline debug.",
      "input-only": "GPIO46 is fixed to pull-down and is input only.",
    },
    micropython: true,
  },
  "ESP32-S3": {
    soc: "esp32s3",
    adc: { 1: "ADC1.CH0", 2: "ADC1.CH1", 3: "ADC1.CH2", 4: "ADC1.CH3", 5: "ADC1.CH4", 6: "ADC1.CH5", 7: "ADC1.CH6", 8: "ADC1.CH7", 9: "ADC1.CH8", 10: "ADC1.CH9", 11: "ADC2.CH0", 12: "ADC2.CH1", 13: "ADC2.CH2", 14: "ADC2.CH3", 15: "ADC2.CH4", 16: "ADC2.CH5", 17: "ADC2.CH6", 18: "ADC2.CH7", 19: "ADC2.CH8", 20: "ADC2.CH9" },
    i2c: ["I2C0", "I2C1"],
    uart: ["UART0", "UART1", "UART2"],
    spi: ["SPI2", "SPI3"],
    ledc: 8,
    uart0: { TX: 43, RX: 44 },
    strapping: [0, 3, 45, 46],
    flash: [26, 27, 28, 29, 30, 31, 32],
    usb: [19, 20],
    mux: "Through GPIO matrix, IO MUX, and RTC IO MUX, peripheral input signals can be from any GPIO pin, and peripheral output signals can be routed to any GPIO pin.",
    notes: {
      "strapping": "GPIO0, GPIO3, GPIO45 and GPIO46 are strapping pins.",
      "module-memory": "GPIO26 ~ GPIO32 are usually used for SPI flash and PSRAM and not recommended for other uses. When using Octal flash or Octal PSRAM or both, GPIO33 ~ GPIO37 are connected to SPIIO4 ~ SPIIO7 and SPIDQS.",
      "usb": "GPIO19 and GPIO20 are used by USB-JTAG by default. If they are reconfigured to operate as normal GPIOs, USB-JTAG functionality will be disabled.",
    },
    micropython: true,
  },
  "ESP32-C2": {
    soc: "esp32c2",
    adc: { 0: "ADC1.CH0", 1: "ADC1.CH1", 2: "ADC1.CH2", 3: "ADC1.CH3", 4: "ADC1.CH4", 5: "ADC2.CH0" },
    i2c: ["I2C0"],
    uart: ["UART0", "UART1"],
    spi: ["SPI2"],
    ledc: 6,
    uart0: { TX: 20, RX: 19 },
    strapping: [8, 9],
    flash: [12, 13, 14, 15, 16, 17],
    mux: "Through GPIO matrix and IO MUX, peripheral input signals can be from any IO pins, and peripheral output signals can be routed to any IO pins.",
    notes: {
      "strapping": "GPIO8 and GPIO9 are strapping pins.",
      "module-memory": "GPIO12-17 are usually used for SPI flash and not recommended for other uses.",
    },
    micropython: true,
  },
  "ESP32-C3": {
    soc: "esp32c3",
    adc: { 0: "ADC1.CH0", 1: "ADC1.CH1", 2: "ADC1.CH2", 3: "ADC1.CH3", 4: "ADC1.CH4", 5: "ADC2.CH0" },
    i2c: ["I2C0"],
    uart: ["UART0", "UART1"],
    spi: ["SPI2"],
    ledc: 6,
    uart0: { TX: 21, RX: 20 },
    strapping: [2, 8, 9],
    flash: [12, 13, 14, 15, 16, 17],
    usb: [18, 19],
    mux: "Through GPIO matrix and IO MUX, peripheral input signals can be from any IO pins, and peripheral output signals can be routed to any IO pins.",
    notes: {
      "strapping": "GPIO2, GPIO8 and GPIO9 are strapping pins.",
      "module-memory": "GPIO12 ~ GPIO17 are usually used for SPI flash and are not recommended for other uses.",
      "usb": "GPIO18 and GPIO19 are used by USB-JTAG by default. If they are reconfigured to operate as normal GPIOs, USB-JTAG functionality will be disabled.",
    },
    micropython: true,
  },
  "ESP32-C5": {
    soc: "esp32c5",
    adc: { 1: "ADC1.CH0", 2: "ADC1.CH1", 3: "ADC1.CH2", 4: "ADC1.CH3", 5: "ADC1.CH4", 6: "ADC1.CH5" },
    i2c: ["I2C0"],
    uart: ["UART0", "UART1"],
    spi: ["SPI2"],
    ledc: 6,
    uart0: { TX: 11, RX: 12 },
    strapping: [2, 7, 25, 27, 28],
    flash: [16, 17, 18, 19, 20, 21, 22],
    usb: [13, 14],
    mux: "Through GPIO matrix and IO MUX, peripheral input signals can be from any IO pins, and peripheral output signals can be routed to any IO pins.",
    notes: {
      "strapping": "GPIO2, GPIO7, GPIO25, GPIO27, and GPIO28 are strapping pins.",
      "module-memory": "GPIO16 ~ GPIO22 are usually used for SPI flash and PSRAM, they're not recommended for other uses.",
      "usb": "GPIO13 and GPIO14 are used by USB-JTAG by default. If they are reconfigured to operate as normal GPIOs, USB-JTAG functionality will be disabled.",
    },
    micropython: true,
  },
  "ESP32-C6": {
    soc: "esp32c6",
    adc: { 0: "ADC1.CH0", 1: "ADC1.CH1", 2: "ADC1.CH2", 3: "ADC1.CH3", 4: "ADC1.CH4", 5: "ADC1.CH5", 6: "ADC1.CH6" },
    i2c: ["I2C0"],
    uart: ["UART0", "UART1"],
    spi: ["SPI2"],
    ledc: 6,
    uart0: { TX: 16, RX: 17 },
    strapping: [4, 5, 8, 9, 15],
    flash: [24, 25, 26, 27, 28, 29, 30],
    usb: [12, 13],
    mux: "Through GPIO matrix and IO MUX, peripheral input signals can be from any IO pins, and peripheral output signals can be routed to any IO pins.",
    notes: {
      "strapping": "GPIO4, GPIO5, GPIO8, GPIO9, and GPIO15 are strapping pins.",
      "module-memory": "GPIO24 ~ GPIO30 are usually used for SPI flash and not recommended for other uses.",
      "usb": "GPIO12 and GPIO13 are used by USB-JTAG by default. If they are reconfigured to operate as normal GPIOs, USB-JTAG functionality will be disabled.",
    },
    micropython: true,
  },
  "ESP32-C61": {
    soc: "esp32c61",
    adc: { 1: "ADC1.CH0", 3: "ADC1.CH1", 4: "ADC1.CH2", 5: "ADC1.CH3" },
    i2c: ["I2C0"],
    uart: ["UART0", "UART1", "UART2"],
    spi: ["SPI2"],
    ledc: 6,
    uart0: { TX: 11, RX: 10 },
    strapping: [7, 8, 9],
    flash: [14, 15, 16, 17, 19, 20, 21],
    usb: [12, 13],
    mux: "Through GPIO matrix and IO MUX, peripheral input signals can be from any IO pins, and peripheral output signals can be routed to any IO pins.",
    notes: {
      "strapping": "Some pins are used as strapping pins, which can be used to select in which boot mode to load the chip, etc.",
      "module-memory": "GPIO14 ~ GPIO17 and GPIO19 ~ GPIO21 are usually used for SPI flash and PSRAM, they're not recommended for other uses.",
      "usb": "GPIO12 and GPIO13 are used by USB-JTAG by default. If they are reconfigured to operate as normal GPIOs, USB-JTAG functionality will be disabled.",
    },
    micropython: false,
  },
  "ESP32-H2": {
    soc: "esp32h2",
    adc: { 1: "ADC1.CH0", 2: "ADC1.CH1", 3: "ADC1.CH2", 4: "ADC1.CH3", 5: "ADC1.CH4" },
    i2c: ["I2C0", "I2C1"],
    uart: ["UART0", "UART1"],
    spi: ["SPI2"],
    ledc: 6,
    uart0: { TX: 24, RX: 23 },
    strapping: [2, 3, 8, 9, 25],
    flash: [15, 16, 17, 18, 19, 20, 21],
    usb: [26, 27],
    mux: "Through GPIO matrix and IO MUX, peripheral input signals can be from any IO pins, and peripheral output signals can be routed to any IO pins.",
    notes: {
      "strapping": "GPIO2, GPIO3, GPIO8, GPIO9, and GPIO25 are strapping pins.",
      "module-memory": "GPIO15-21 are usually used for SPI flash and not recommended for other uses.",
      "usb": "GPIO 26 and 27 are used by USB-Serial-JTAG by default. In order to use them as GPIOs, USB-Serial-JTAG will be disabled by the drivers.",
    },
    micropython: false,
  },
  "ESP32-P4": {
    soc: "esp32p4",
    adc: { 16: "ADC1.CH0", 17: "ADC1.CH1", 18: "ADC1.CH2", 19: "ADC1.CH3", 20: "ADC1.CH4", 21: "ADC1.CH5", 22: "ADC1.CH6", 23: "ADC1.CH7", 49: "ADC2.CH0", 50: "ADC2.CH1", 51: "ADC2.CH2", 52: "ADC2.CH3", 53: "ADC2.CH4", 54: "ADC2.CH5" },
    i2c: ["I2C0", "I2C1"],
    uart: ["UART0", "UART1", "UART2", "UART3", "UART4"],
    spi: ["SPI2", "SPI3"],
    ledc: 8,
    uart0: { TX: 37, RX: 38 },
    strapping: [34, 35, 36, 37, 38],
    usb: [24, 25],
    mux: "Through GPIO matrix and IO MUX, peripheral input signals can be from any IO pins, and peripheral output signals can be routed to any IO pins.",
    notes: {
      "strapping": "GPIO34, GPIO35, GPIO36, GPIO37, and GPIO38 are strapping pins.",
      "usb": "GPIO24 and GPIO25 are used by USB-JTAG by default. If they are reconfigured to operate as normal GPIOs, USB-JTAG functionality will be disabled.",
    },
    micropython: true,
  },
} satisfies Record<string, EspChip>;

type EspChipName = keyof typeof espChips;

type EspBoardSpec = {
  chip: EspChipName;
  /** arduino-esp32 variants/<variant>/pins_arduino.h. */
  variant: string;
  /** Catalog pin label to GPIO number. */
  pins: Record<string, number>;
  /** The variant's TX and RX, SDA and SCL, and SPI pins. */
  uart: { TX: number; RX: number };
  i2c: { SDA: number; SCL: number };
  spi: { SCK: number; MOSI: number; MISO: number; CS: number };
  /** PIN_RGB_LED in the variant. */
  led?: number;
  /** Another bus the pin map names on this board: GPIO to "UART2.TX". */
  extra?: Record<number, string>;
  /** Module with Octal flash or PSRAM, so GPIO33 to GPIO37 are taken. */
  octal?: boolean;
  /** GPIO16 and GPIO17 carry the module's PSRAM. */
  psram?: boolean;
  /** ESP32-PICO-V3-02: GPIO6 to GPIO11 are not all flash pins, so GPIO7 and GPIO8 are free. */
  picoV3?: boolean;
};

export const espressifBoards = {
  "adafruit-esp32-s3-feather": {
    chip: "ESP32-S3",
    variant: "adafruit_feather_esp32s3",
    pins: { "A0": 18, "A1": 17, "A2": 16, "A3": 15, "A4": 14, "A5": 8, "SCK": 36, "MO / MOSI": 35, "MI / MISO": 37, "RX": 38, "TX": 39, "D13": 13, "D12": 12, "D11": 11, "D10": 10, "D9": 9, "D6": 6, "D5": 5, "SCL": 4, "SDA": 3 },
    uart: { TX: 39, RX: 38 },
    i2c: { SDA: 3, SCL: 4 },
    spi: { SCK: 36, MOSI: 35, MISO: 37, CS: 42 },
  },
  "adafruit-feather-esp32-s2": {
    chip: "ESP32-S2",
    variant: "adafruit_feather_esp32s2",
    pins: { "A0": 18, "A1": 17, "A2": 16, "A3": 15, "A4": 14, "A5": 8, "SCK": 36, "MO / MOSI": 35, "MI / MISO": 37, "RX": 38, "TX": 39, "D13": 13, "D12": 12, "D11": 11, "D10": 10, "D9": 9, "D6": 6, "D5": 5, "SCL": 4, "SDA": 3 },
    uart: { TX: 39, RX: 38 },
    i2c: { SDA: 3, SCL: 4 },
    spi: { SCK: 36, MOSI: 35, MISO: 37, CS: 42 },
  },
  "adafruit-feather-esp32-v2": {
    chip: "ESP32",
    variant: "adafruit_feather_esp32_v2",
    pins: { "A0 / DAC2": 26, "A1 / DAC1": 25, "A2": 34, "A3": 39, "A4": 36, "A5": 4, "SCK": 5, "MO / MOSI": 19, "MI / MISO": 21, "RX": 7, "TX": 8, "I37": 37, "D13": 13, "D12": 12, "D27": 27, "D33": 33, "D15": 15, "D32": 32, "D14": 14, "SCL": 20, "SDA": 22 },
    uart: { TX: 8, RX: 7 },
    i2c: { SDA: 22, SCL: 20 },
    spi: { SCK: 5, MOSI: 19, MISO: 21, CS: 33 },
    picoV3: true,
  },
  "adafruit-metro-esp32-s3": {
    chip: "ESP32-S3",
    variant: "adafruit_metro_esp32s3",
    pins: { "RX / D0": 41, "TX / D1": 40, "D2": 2, "D3": 3, "D4": 4, "D5": 5, "D6": 6, "D7": 7, "D8": 8, "D9": 9, "D10": 10, "D11": 11, "D12": 12, "D13": 13, "A0": 14, "A1": 15, "A2": 16, "A3": 17, "A4": 18, "A5": 1, "SDA": 47, "SCL": 48, "SCK": 39, "MOSI": 42, "MISO": 21 },
    uart: { TX: 40, RX: 41 },
    i2c: { SDA: 47, SCL: 48 },
    spi: { SCK: 39, MOSI: 42, MISO: 21, CS: 45 },
  },
  "adafruit-qt-py-esp32-c3": {
    chip: "ESP32-C3",
    variant: "adafruit_qtpy_esp32c3",
    pins: { "A0": 4, "A1": 3, "A2": 1, "A3": 0, "SDA": 5, "SCL": 6, "TX": 21, "MO / MOSI": 7, "MI / MISO": 8, "SCK": 10, "RX": 20 },
    uart: { TX: 21, RX: 20 },
    i2c: { SDA: 5, SCL: 6 },
    spi: { SCK: 10, MOSI: 7, MISO: 8, CS: 6 },
  },
  "adafruit-qt-py-esp32-s2": {
    chip: "ESP32-S2",
    variant: "adafruit_qtpy_esp32s2",
    pins: { "A0": 18, "A1": 17, "A2": 9, "A3": 8, "SDA": 7, "SCL": 6, "TX": 5, "MO / MOSI": 35, "MI / MISO": 37, "SCK": 36, "RX": 16 },
    uart: { TX: 5, RX: 16 },
    i2c: { SDA: 7, SCL: 6 },
    spi: { SCK: 36, MOSI: 35, MISO: 37, CS: 42 },
  },
  "adafruit-qt-py-esp32-s3": {
    chip: "ESP32-S3",
    variant: "adafruit_qtpy_esp32s3_nopsram",
    pins: { "A0": 18, "A1": 17, "A2": 9, "A3": 8, "SDA": 7, "SCL": 6, "TX": 5, "MO / MOSI": 35, "MI / MISO": 37, "SCK": 36, "RX": 16 },
    uart: { TX: 5, RX: 16 },
    i2c: { SDA: 7, SCL: 6 },
    spi: { SCK: 36, MOSI: 35, MISO: 37, CS: 42 },
  },
  "arduino-nano-esp32": {
    chip: "ESP32-S3",
    variant: "arduino_nano_nora",
    pins: { "D13 / SCK": 48, "A0 / D17": 1, "A1 / D18": 2, "A2 / D19": 3, "A3 / D20": 4, "A4 / D21 / SDA": 11, "A5 / D22 / SCL": 12, "A6 / D23": 13, "A7 / D24": 14, "D12 / CIPO": 47, "D11 / COPI": 38, "D10": 21, "D9": 18, "D8": 17, "D7": 10, "D6": 9, "D5": 8, "D4": 7, "D3": 6, "D2": 5, "D0 / RX0": 44, "D1 / TX0": 43 },
    uart: { TX: 43, RX: 44 },
    i2c: { SDA: 11, SCL: 12 },
    spi: { SCK: 48, MOSI: 38, MISO: 47, CS: 21 },
  },
  "esp32-c3-devkitc-02": {
    chip: "ESP32-C3",
    variant: "esp32c3",
    pins: { "GPIO4": 4, "GPIO5": 5, "GPIO6": 6, "GPIO7": 7, "GPIO8": 8, "GPIO9": 9, "GPIO0": 0, "GPIO1": 1, "GPIO2": 2, "GPIO3": 3, "GPIO10": 10, "RX / GPIO20": 20, "TX / GPIO21": 21, "GPIO18": 18, "GPIO19": 19 },
    uart: { TX: 21, RX: 20 },
    i2c: { SDA: 8, SCL: 9 },
    spi: { SCK: 4, MOSI: 6, MISO: 5, CS: 7 },
    led: 8,
  },
  "esp32-c3-devkitm-1": {
    chip: "ESP32-C3",
    variant: "esp32c3",
    pins: { "IO2": 2, "IO3": 3, "IO0": 0, "IO1": 1, "IO10": 10, "TX / GPIO21": 21, "RX / GPIO20": 20, "IO9": 9, "IO8": 8, "IO7": 7, "IO6": 6, "IO5": 5, "IO4": 4, "IO18": 18, "IO19": 19 },
    uart: { TX: 21, RX: 20 },
    i2c: { SDA: 8, SCL: 9 },
    spi: { SCK: 4, MOSI: 6, MISO: 5, CS: 7 },
    led: 8,
  },
  "esp32-c5-devkitc-1": {
    chip: "ESP32-C5",
    variant: "esp32c5",
    pins: { "GPIO2": 2, "GPIO3": 3, "GPIO0": 0, "GPIO1": 1, "GPIO6": 6, "GPIO7": 7, "GPIO8": 8, "GPIO9": 9, "GPIO10": 10, "GPIO26": 26, "GPIO25": 25, "TX": 11, "RX": 12, "GPIO24": 24, "GPIO23": 23, "GPIO27": 27, "GPIO4": 4, "GPIO5": 5, "GPIO28": 28, "GPIO14": 14, "GPIO13": 13 },
    uart: { TX: 11, RX: 12 },
    i2c: { SDA: 0, SCL: 1 },
    spi: { SCK: 10, MOSI: 8, MISO: 9, CS: 6 },
    led: 27,
  },
  "esp32-c6-devkitc-1": {
    chip: "ESP32-C6",
    variant: "esp32c6",
    pins: { "GPIO4": 4, "GPIO5": 5, "GPIO6": 6, "GPIO7": 7, "GPIO0": 0, "GPIO1": 1, "GPIO8": 8, "GPIO10": 10, "GPIO11": 11, "GPIO2": 2, "GPIO3": 3, "TX / GPIO16": 16, "RX / GPIO17": 17, "GPIO15": 15, "GPIO23": 23, "GPIO22": 22, "GPIO21": 21, "GPIO20": 20, "GPIO19": 19, "GPIO18": 18, "GPIO9": 9, "GPIO13": 13, "GPIO12": 12 },
    uart: { TX: 16, RX: 17 },
    i2c: { SDA: 23, SCL: 22 },
    spi: { SCK: 21, MOSI: 19, MISO: 20, CS: 18 },
    led: 8,
  },
  "esp32-c6-devkitm-1": {
    chip: "ESP32-C6",
    variant: "esp32c6",
    pins: { "GPIO2": 2, "GPIO3": 3, "GPIO4": 4, "GPIO5": 5, "GPIO0": 0, "GPIO1": 1, "GPIO8": 8, "GPIO6": 6, "GPIO7": 7, "GPIO14": 14, "TX / GPIO16": 16, "RX / GPIO17": 17, "GPIO23": 23, "GPIO22": 22, "GPIO21": 21, "GPIO20": 20, "GPIO19": 19, "GPIO18": 18, "GPIO15": 15, "GPIO9": 9, "GPIO13": 13, "GPIO12": 12 },
    uart: { TX: 16, RX: 17 },
    i2c: { SDA: 23, SCL: 22 },
    spi: { SCK: 21, MOSI: 19, MISO: 20, CS: 18 },
    led: 8,
  },
  "esp32-c61-devkitc-1": {
    chip: "ESP32-C61",
    variant: "esp32c61",
    pins: { "GPIO4": 4, "GPIO5": 5, "GPIO6": 6, "GPIO7": 7, "GPIO0": 0, "GPIO1": 1, "GPIO8": 8, "GPIO29": 29, "GPIO2": 2, "GPIO3": 3, "TX / GPIO11": 11, "RX / GPIO10": 10, "GPIO24": 24, "GPIO23": 23, "GPIO22": 22, "GPIO28": 28, "GPIO27": 27, "GPIO26": 26, "GPIO25": 25, "GPIO9": 9, "GPIO13": 13, "GPIO12": 12 },
    uart: { TX: 11, RX: 10 },
    i2c: { SDA: 23, SCL: 22 },
    spi: { SCK: 28, MOSI: 26, MISO: 27, CS: 25 },
    led: 8,
  },
  "esp32-devkit-v1": {
    chip: "ESP32",
    variant: "esp32",
    pins: { "VP": 36, "VN": 39, "D34": 34, "D35": 35, "D32": 32, "D33": 33, "D25": 25, "D26": 26, "D27": 27, "D14": 14, "D12": 12, "D13": 13, "D23": 23, "D22": 22, "TX0": 1, "RX0": 3, "D21": 21, "D19": 19, "D18": 18, "D5": 5, "TX2": 17, "RX2": 16, "D4": 4, "D2": 2, "D15": 15 },
    uart: { TX: 1, RX: 3 },
    i2c: { SDA: 21, SCL: 22 },
    spi: { SCK: 18, MOSI: 23, MISO: 19, CS: 5 },
    extra: { 16: "UART2.RX", 17: "UART2.TX" },
  },
  "esp32-h2-devkitm-1": {
    chip: "ESP32-H2",
    variant: "esp32h2",
    pins: { "GPIO0": 0, "GPIO1": 1, "GPIO2": 2, "GPIO3": 3, "GPIO13": 13, "GPIO14": 14, "GPIO4": 4, "GPIO5": 5, "TX / GPIO24": 24, "RX / GPIO23": 23, "GPIO10": 10, "GPIO11": 11, "GPIO25": 25, "GPIO12": 12, "GPIO8": 8, "GPIO22": 22, "GPIO9 / BOOT": 9, "GPIO27 / USB_D+": 27, "GPIO26 / USB_D-": 26 },
    uart: { TX: 24, RX: 23 },
    i2c: { SDA: 12, SCL: 22 },
    spi: { SCK: 10, MOSI: 25, MISO: 11, CS: 0 },
    led: 8,
  },
  "esp32-p4-function-ev-board": {
    chip: "ESP32-P4",
    variant: "esp32p4",
    pins: { "GPIO7": 7, "GPIO8": 8, "GPIO23": 23, "GPIO37": 37, "GPIO38": 38, "GPIO21": 21, "GPIO22": 22, "GPIO20": 20, "GPIO6": 6, "GPIO5": 5, "GPIO4": 4, "GPIO3": 3, "GPIO2": 2, "GPIO36": 36, "GPIO32": 32, "GPIO33": 33, "GPIO26": 26, "GPIO54": 54, "GPIO48": 48, "GPIO53": 53, "GPIO46": 46, "GPIO47": 47, "GPIO27": 27 },
    uart: { TX: 37, RX: 38 },
    i2c: { SDA: 7, SCL: 8 },
    spi: { SCK: 36, MOSI: 32, MISO: 33, CS: 26 },
  },
  "esp32-s2-devkitm-1": {
    chip: "ESP32-S2",
    variant: "esp32s2",
    pins: { "GPIO0": 0, "GPIO1": 1, "GPIO2": 2, "GPIO3": 3, "GPIO4": 4, "GPIO5": 5, "GPIO6": 6, "GPIO7": 7, "GPIO8": 8, "GPIO9": 9, "GPIO10": 10, "GPIO11": 11, "GPIO12": 12, "GPIO13": 13, "GPIO14": 14, "GPIO15": 15, "GPIO16": 16, "GPIO17": 17, "GPIO46": 46, "GPIO45": 45, "RX / GPIO44": 44, "TX / GPIO43": 43, "GPIO42": 42, "GPIO41": 41, "GPIO40": 40, "GPIO39": 39, "GPIO38": 38, "GPIO37": 37, "GPIO36": 36, "GPIO35": 35, "GPIO34": 34, "GPIO33": 33, "GPIO21": 21, "GPIO20": 20, "GPIO19": 19, "GPIO18": 18 },
    uart: { TX: 43, RX: 44 },
    i2c: { SDA: 8, SCL: 9 },
    spi: { SCK: 36, MOSI: 35, MISO: 37, CS: 34 },
    led: 18,
    extra: { 17: "UART1.TX", 18: "UART1.RX" },
  },
  "esp32-s2-saola-1": {
    chip: "ESP32-S2",
    variant: "esp32s2",
    pins: { "GPIO0": 0, "GPIO1": 1, "GPIO2": 2, "GPIO3": 3, "GPIO4": 4, "GPIO5": 5, "GPIO6": 6, "GPIO7": 7, "GPIO8": 8, "GPIO9": 9, "GPIO10": 10, "GPIO11": 11, "GPIO12": 12, "GPIO13": 13, "GPIO14": 14, "GPIO15": 15, "GPIO16": 16, "GPIO17": 17, "GPIO46": 46, "GPIO45": 45, "GPIO44": 44, "GPIO43": 43, "GPIO42": 42, "GPIO41": 41, "GPIO40": 40, "GPIO39": 39, "GPIO38": 38, "GPIO37": 37, "GPIO36": 36, "GPIO35": 35, "GPIO34": 34, "GPIO33": 33, "GPIO26": 26, "GPIO21": 21, "GPIO20": 20, "GPIO19": 19, "GPIO18": 18 },
    uart: { TX: 43, RX: 44 },
    i2c: { SDA: 8, SCL: 9 },
    spi: { SCK: 36, MOSI: 35, MISO: 37, CS: 34 },
    led: 18,
  },
  "esp32-s3-devkitc-1": {
    chip: "ESP32-S3",
    variant: "esp32s3",
    pins: { "GPIO4": 4, "GPIO5": 5, "GPIO6": 6, "GPIO7": 7, "GPIO15": 15, "GPIO16": 16, "GPIO17": 17, "GPIO18": 18, "GPIO8": 8, "GPIO3": 3, "GPIO46": 46, "GPIO9": 9, "GPIO10": 10, "GPIO11": 11, "GPIO12": 12, "GPIO13": 13, "GPIO14": 14, "TX / GPIO43": 43, "RX / GPIO44": 44, "GPIO1": 1, "GPIO2": 2, "GPIO42": 42, "GPIO41": 41, "GPIO40": 40, "GPIO39": 39, "GPIO38": 38, "GPIO37": 37, "GPIO36": 36, "GPIO35": 35, "GPIO0": 0, "GPIO45": 45, "GPIO48": 48, "GPIO47": 47, "GPIO21": 21, "GPIO20": 20, "GPIO19": 19 },
    uart: { TX: 43, RX: 44 },
    i2c: { SDA: 8, SCL: 9 },
    spi: { SCK: 12, MOSI: 11, MISO: 13, CS: 10 },
    led: 48,
    octal: true,
  },
  "esp32-s3-devkitm-1": {
    chip: "ESP32-S3",
    variant: "esp32s3",
    pins: { "GPIO0": 0, "GPIO1": 1, "GPIO2": 2, "GPIO3": 3, "GPIO4": 4, "GPIO5": 5, "GPIO6": 6, "GPIO7": 7, "GPIO8": 8, "GPIO9": 9, "GPIO10": 10, "GPIO11": 11, "GPIO12": 12, "GPIO13": 13, "GPIO14": 14, "GPIO15": 15, "GPIO16": 16, "GPIO17": 17, "GPIO18": 18, "GPIO46": 46, "GPIO45": 45, "RX / GPIO44": 44, "TX / GPIO43": 43, "GPIO42": 42, "GPIO41": 41, "GPIO40": 40, "GPIO39": 39, "GPIO38": 38, "GPIO21": 21, "GPIO20": 20, "GPIO19": 19, "GPIO48": 48, "GPIO47": 47 },
    uart: { TX: 43, RX: 44 },
    i2c: { SDA: 8, SCL: 9 },
    spi: { SCK: 12, MOSI: 11, MISO: 13, CS: 10 },
    led: 48,
  },
  "esp8684-devkitm-1": {
    chip: "ESP32-C2",
    variant: "esp32c2",
    pins: { "GPIO2": 2, "GPIO3": 3, "GPIO0": 0, "GPIO1": 1, "GPIO10": 10, "TX / GPIO20": 20, "RX / GPIO19": 19, "GPIO9": 9, "GPIO8": 8, "GPIO7": 7, "GPIO6": 6, "GPIO5": 5, "GPIO4": 4, "GPIO18": 18 },
    uart: { TX: 20, RX: 19 },
    i2c: { SDA: 8, SCL: 9 },
    spi: { SCK: 4, MOSI: 6, MISO: 5, CS: 7 },
  },
  "lilygo-t-display-s3": {
    chip: "ESP32-S3",
    variant: "lilygo_t_display_s3",
    pins: { "GPIO1": 1, "GPIO2": 2, "GPIO3": 3, "GPIO10": 10, "GPIO11": 11, "GPIO12": 12, "GPIO13": 13, "GPIO43": 43, "GPIO44": 44, "GPIO18": 18, "GPIO17": 17, "GPIO21": 21, "GPIO16": 16 },
    uart: { TX: 43, RX: 44 },
    i2c: { SDA: 18, SCL: 17 },
    spi: { SCK: 12, MOSI: 11, MISO: 13, CS: 10 },
    extra: { 17: "UART1.TX", 18: "UART1.RX" },
  },
  "lolin-s2-mini": {
    chip: "ESP32-S2",
    variant: "lolin_s2_mini",
    pins: { "GPIO14": 14, "GPIO12": 12, "GPIO13": 13, "GPIO15": 15, "GPIO16": 16, "GPIO17": 17, "TX / GPIO43": 43, "RX / GPIO44": 44, "GPIO5": 5, "GPIO6": 6, "GPIO7": 7, "GPIO8": 8, "GPIO11": 11, "GPIO10": 10, "GPIO9": 9, "GPIO18": 18, "GPIO35": 35, "GPIO33": 33, "GPIO38": 38, "GPIO37": 37, "GPIO36": 36 },
    uart: { TX: 39, RX: 37 },
    i2c: { SDA: 33, SCL: 35 },
    spi: { SCK: 7, MOSI: 11, MISO: 9, CS: 12 },
    extra: { 5: "I2C1.SDA", 6: "I2C1.SCL" },
  },
  "seeed-xiao-esp32c3": {
    chip: "ESP32-C3",
    variant: "XIAO_ESP32C3",
    pins: { "D0 / A0": 2, "D1 / A1": 3, "D2 / A2": 4, "D3 / A3": 5, "D4 / SDA": 6, "D5 / SCL": 7, "D6 / TX": 21, "D10 / MOSI": 10, "D9 / MISO": 9, "D8 / SCK": 8, "D7 / RX": 20 },
    uart: { TX: 21, RX: 20 },
    i2c: { SDA: 6, SCL: 7 },
    spi: { SCK: 8, MOSI: 10, MISO: 9, CS: 20 },
  },
  "seeed-xiao-esp32c5": {
    chip: "ESP32-C5",
    variant: "XIAO_ESP32C5",
    pins: { "D0 / A0": 1, "D1": 0, "D2": 25, "D3": 7, "D4 / SDA": 23, "D5 / SCL": 24, "D6 / TX": 11, "D10 / MOSI": 10, "D9 / MISO": 9, "D8 / SCK": 8, "D7 / RX": 12 },
    uart: { TX: 11, RX: 12 },
    i2c: { SDA: 23, SCL: 24 },
    spi: { SCK: 8, MOSI: 10, MISO: 9, CS: 7 },
  },
  "seeed-xiao-esp32c6": {
    chip: "ESP32-C6",
    variant: "XIAO_ESP32C6",
    pins: { "D0 / A0": 0, "D1 / A1": 1, "D2 / A2": 2, "D3": 21, "D4 / SDA": 22, "D5 / SCL": 23, "D6 / TX": 16, "D10 / MOSI": 18, "D9 / MISO": 20, "D8 / SCK": 19, "D7 / RX": 17 },
    uart: { TX: 16, RX: 17 },
    i2c: { SDA: 22, SCL: 23 },
    spi: { SCK: 19, MOSI: 18, MISO: 20, CS: 21 },
  },
  "seeed-xiao-esp32s3": {
    chip: "ESP32-S3",
    variant: "XIAO_ESP32S3",
    pins: { "D0 / A0": 1, "D1 / A1": 2, "D2 / A2": 3, "D3 / A3": 4, "D4 / SDA": 5, "D5 / SCL": 6, "D6 / TX": 43, "D10 / MOSI": 9, "D9 / MISO": 8, "D8 / SCK": 7, "D7 / RX / CS": 44 },
    uart: { TX: 43, RX: 44 },
    i2c: { SDA: 5, SCL: 6 },
    spi: { SCK: 7, MOSI: 9, MISO: 8, CS: 44 },
  },
  "seeed-xiao-esp32s3-sense": {
    chip: "ESP32-S3",
    variant: "XIAO_ESP32S3",
    pins: { "D0 / A0": 1, "D1 / A1": 2, "D2 / A2": 3, "D3 / A3": 4, "D4 / SDA": 5, "D5 / SCL": 6, "D6 / TX": 43, "D10 / MOSI": 9, "D9 / MISO": 8, "D8 / SCK": 7, "D7 / RX / CS": 44 },
    uart: { TX: 43, RX: 44 },
    i2c: { SDA: 5, SCL: 6 },
    spi: { SCK: 7, MOSI: 9, MISO: 8, CS: 44 },
  },
  "sparkfun-esp32-thing": {
    chip: "ESP32",
    variant: "esp32thing",
    pins: { "GPIO0": 0, "GPIO4": 4, "GPIO5": 5, "GPIO18": 18, "GPIO19": 19, "GPIO21": 21, "GPIO3 / RX0": 3, "GPIO1 / TX0": 1, "GPIO22": 22, "GPIO23": 23, "GPIO25": 25, "GPIO26": 26, "GPIO27": 27, "GPIO36 / SVP": 36, "GPIO39 / SVN": 39, "GPIO34": 34, "GPIO35": 35, "GPIO32": 32, "GPIO33": 33, "GPIO13": 13, "GPIO12": 12, "GPIO14": 14, "GPIO16": 16, "GPIO17": 17 },
    uart: { TX: 1, RX: 3 },
    i2c: { SDA: 21, SCL: 22 },
    spi: { SCK: 18, MOSI: 23, MISO: 19, CS: 2 },
    extra: { 16: "UART2.RX", 17: "UART2.TX" },
  },
  "sparkfun-thing-plus-esp32-wroom-usbc": {
    chip: "ESP32",
    variant: "esp32thing_plus_c",
    pins: { "SDA / GPIO21": 21, "SCL / GPIO22": 22, "D4 / GPIO14": 14, "D6 / GPIO32": 32, "D8 / GPIO15": 15, "D10 / GPIO33": 33, "D11 / GPIO27": 27, "D12 / GPIO12": 12, "LED / GPIO13": 13, "FREE / GPIO4": 4, "TX / GPIO17": 17, "RX / GPIO16": 16, "POCI / GPIO19": 19, "PICO / GPIO23": 23, "SCK / GPIO18": 18, "A5 / GPIO35": 35, "A4 / GPIO36": 36, "A3 / GPIO39": 39, "A2 / GPIO34": 34, "A1 / GPIO25": 25, "A0 / GPIO26": 26 },
    uart: { TX: 17, RX: 16 },
    i2c: { SDA: 21, SCL: 22 },
    spi: { SCK: 18, MOSI: 23, MISO: 19, CS: 15 },
  },
} satisfies Record<string, EspBoardSpec>;

export type EspressifBoardId = keyof typeof espressifBoards;

const octalGpios = [33, 34, 35, 36, 37];

function espFlags(chip: EspChip, spec: EspBoardSpec, gpio: number): PinFlag[] {
  const flags: PinFlag[] = [];
  if (chip.strapping.includes(gpio)) flags.push("strapping");
  if (chip.usb?.includes(gpio)) flags.push("usb");
  if (chip.jtag?.includes(gpio)) flags.push("jtag");
  if (chip.inputOnly?.includes(gpio)) flags.push("input-only");
  if (
    (chip.flash?.includes(gpio) && !spec.picoV3) ||
    (spec.octal && octalGpios.includes(gpio)) ||
    (spec.psram && (gpio === 16 || gpio === 17))
  ) {
    flags.push("module-memory");
  }
  if (spec.led === gpio) flags.push("onboard-led");
  if (chip.notes["adc-unavailable-with-wifi"] && chip.adc[gpio]?.startsWith("ADC2")) {
    flags.push("adc-unavailable-with-wifi");
  }
  return flags;
}

/** A variant's bus pins as functions, only when both ends of the bus are on the header. */
function defaultBuses(chip: EspChip, spec: EspBoardSpec): Map<number, PinFunction[]> {
  const onHeader = new Set(Object.values(spec.pins));
  const rows = new Map<number, PinFunction[]>();
  const add = (gpio: number, item: PinFunction) =>
    rows.set(gpio, [...(rows.get(gpio) ?? []), item]);
  const uart =
    spec.uart.TX === chip.uart0.TX && spec.uart.RX === chip.uart0.RX ? "UART0" : "UART1";
  if (onHeader.has(spec.uart.TX) && onHeader.has(spec.uart.RX)) {
    add(spec.uart.TX, fn("UART", uart, "TX", true));
    add(spec.uart.RX, fn("UART", uart, "RX", true));
  }
  if (onHeader.has(spec.i2c.SDA) && onHeader.has(spec.i2c.SCL)) {
    add(spec.i2c.SDA, fn("I2C", "I2C0", "SDA", true));
    add(spec.i2c.SCL, fn("I2C", "I2C0", "SCL", true));
  }
  const { SCK, MOSI, MISO, CS } = spec.spi;
  if (onHeader.has(SCK) && onHeader.has(MOSI) && onHeader.has(MISO)) {
    for (const [signal, gpio] of [["SCK", SCK], ["MOSI", MOSI], ["MISO", MISO]] as const) {
      add(gpio, fn("SPI", chip.spi[0], signal, true));
    }
    if (onHeader.has(CS)) add(CS, fn("SPI", chip.spi[0], "CS", true));
  }
  for (const [gpio, token] of Object.entries(spec.extra ?? {})) {
    const [instance, signal] = token.split(".");
    add(Number(gpio), fn(instance.replace(/\d+$/, "") as PinPeripheral, instance, signal));
  }
  return rows;
}

/** The pin function table for an ESP32-family board. */
export function espFunctionTable(spec: EspBoardSpec): PinFunctionTable {
  const chip: EspChip = espChips[spec.chip];
  const buses = defaultBuses(chip, spec);
  const table: PinFunctionTable = {};
  for (const [label, gpio] of Object.entries(spec.pins)) {
    const functions = [...(buses.get(gpio) ?? [])];
    const adc = chip.adc[gpio];
    if (adc) {
      const [instance, signal] = adc.split(".");
      functions.push(fn("ADC", instance, signal));
    }
    const dac = chip.dac?.[gpio];
    if (dac) {
      const [instance, signal] = dac.split(".");
      functions.push(fn("DAC", instance, signal));
    }
    table[label] = {
      mcu: { name: `GPIO${gpio}`, gpio },
      ...(functions.length ? { functions } : {}),
    };
    const flags = espFlags(chip, spec, gpio);
    if (flags.length) table[label].flags = flags;
  }
  return table;
}

const idfDocs = "https://docs.espressif.com/projects/esp-idf/en/v5.5.1";
const idfSoc = "https://github.com/espressif/esp-idf/blob/v5.5/components/soc";
const arduinoEsp32 = "https://github.com/espressif/arduino-esp32/blob/3.3.9";

/** Pin function data for an ESP32-family board: flag notes are only those its pins use. */
export function espFunctionData(spec: EspBoardSpec, table: PinFunctionTable): PinFunctionData {
  const chip: EspChip = espChips[spec.chip];
  const used = new Set(Object.values(table).flatMap((row) => row.flags ?? []));
  const flagNotes: PinFunctionData["flagNotes"] = {};
  for (const flag of used) {
    flagNotes[flag] =
      flag === "onboard-led"
        ? `arduino-esp32 variants/${spec.variant}/pins_arduino.h: “#define PIN_RGB_LED ${spec.led}”. The onboard RGB LED is driven from this pin.`
        : `Espressif: “${chip.notes[flag]}”`;
  }
  const leds = Array.from({ length: chip.ledc }, (_, channel) => `CH${channel}`);
  const micropythonBusIds = Object.fromEntries([
    ...chip.i2c.map((name, index) => [name, index]),
    ...chip.uart.map((name, index) => [name, index]),
    ...chip.spi.map((name) => [name, name === "SPI2" ? 1 : 2]),
  ]);
  return {
    sources: [
      {
        label: `ESP-IDF v5.5.1 GPIO & RTC GPIO (${spec.chip}): pin table and notes`,
        url: `${idfDocs}/${chip.soc}/api-reference/peripherals/gpio.html`,
        type: "Docs",
      },
      {
        label: `ESP-IDF v5.5 ${chip.soc} soc/adc_channel.h: ADC channel GPIOs`,
        url: `${idfSoc}/${chip.soc}/include/soc/adc_channel.h`,
        type: "Docs",
      },
      ...(chip.dac
        ? [
            {
              label: `ESP-IDF v5.5 ${chip.soc} soc/dac_channel.h: DAC channel GPIOs`,
              url: `${idfSoc}/${chip.soc}/include/soc/dac_channel.h`,
              type: "Docs" as const,
            },
          ]
        : []),
      {
        label: `ESP-IDF v5.5 ${chip.soc} soc/soc_caps.h: I2C, UART, SPI, and LEDC counts`,
        url: `${idfSoc}/${chip.soc}/include/soc/soc_caps.h`,
        type: "Docs",
      },
      {
        label: `arduino-esp32 3.3.9 variants/${spec.variant}/pins_arduino.h: default UART, I2C, and SPI pins`,
        url: `${arduinoEsp32}/variants/${spec.variant}/pins_arduino.h`,
        type: "Docs",
      },
      {
        label: "arduino-esp32 3.3.9 HardwareSerial.h: UART0 default pins",
        url: `${arduinoEsp32}/cores/esp32/HardwareSerial.h`,
        type: "Docs",
      },
    ],
    mux: {
      model: "matrix",
      note: `Espressif: “${chip.mux}” ADC${chip.dac ? " and DAC" : ""} channels stay on their fixed pins.`,
      routable: [
        { peripheral: "I2C", instances: chip.i2c, signals: ["SDA", "SCL"] },
        { peripheral: "SPI", instances: chip.spi, signals: ["SCK", "MOSI", "MISO", "CS"] },
        { peripheral: "UART", instances: [...chip.uart].reverse(), signals: ["TX", "RX"] },
        { peripheral: "PWM", instances: ["LEDC"], signals: leds },
      ],
    },
    flagNotes,
    exports: chip.micropython ? ["c-header", "micropython", "json"] : ["c-header", "json"],
    ...(chip.micropython ? { micropythonBusIds } : {}),
  };
}

/** The planner fields for one ESP32-family board in the catalog. */
export function espressifPinFunctions(
  boardId: EspressifBoardId,
  pinout: Pinout,
): { pinout: Pinout; pinFunctions: PinFunctionData } {
  const spec: EspBoardSpec = espressifBoards[boardId];
  const table = espFunctionTable(spec);
  return { pinout: withPinFunctions(pinout, table), pinFunctions: espFunctionData(spec, table) };
}
