import type {
  Pin,
  PinFlag,
  PinFunction,
  PinFunctionData,
  PinMcu,
  PinPeripheral,
  Pinout,
} from "./boards";

// Peripheral-mux data for the pin planner pilot. Every row is transcribed from
// the machine-readable files listed in each board's `sources` (pinned to a
// release tag or commit), never inferred from silkscreen labels or aliases.
// See docs/pin-planner-2026-09-26.md for how to add a board.

type PinFunctionRow = {
  mcu: PinMcu;
  functions?: PinFunction[];
  flags?: PinFlag[];
};

/** Pin function rows keyed by the catalog pin label they apply to. */
export type PinFunctionTable = Record<string, PinFunctionRow>;

function fn(
  peripheral: PinPeripheral,
  instance: string,
  signal: string,
  isDefault = false,
): PinFunction {
  return isDefault
    ? { peripheral, instance, signal, default: true }
    : { peripheral, instance, signal };
}

function withRow(pin: Pin, row: PinFunctionRow | undefined): Pin {
  if (!row) return { ...pin };
  return {
    ...pin,
    mcu: { ...row.mcu },
    ...(row.functions?.length
      ? { functions: row.functions.map((item) => ({ ...item })) }
      : {}),
    ...(row.flags?.length ? { flags: [...row.flags] } : {}),
  };
}

/**
 * A copy of `pinout` with pin function rows attached. Several boards share one
 * pinout object across different chips (the UNO header also serves the
 * RA4M1-based UNO R4), so a board's functions never go onto the shared object.
 * Every table key must name exactly one pin, or the catalog fails to load.
 */
export function withPinFunctions(
  pinout: Pinout,
  table: PinFunctionTable,
): Pinout {
  const pins = pinout.pins
    ? [...pinout.pins.left, ...pinout.pins.right]
    : (pinout.groups ?? []).flatMap((group) => group.pins);
  for (const label of Object.keys(table)) {
    const matches = pins.filter((pin) => pin.label === label).length;
    if (matches !== 1) {
      throw new Error(
        `Pin function row "${label}" matches ${matches} pins on "${pinout.connector}"; it must match exactly one.`,
      );
    }
  }
  const apply = (pin: Pin) => withRow(pin, table[pin.label]);
  return {
    ...pinout,
    notes: [...pinout.notes],
    ...(pinout.pins
      ? {
          pins: {
            left: pinout.pins.left.map(apply),
            right: pinout.pins.right.map(apply),
          },
        }
      : {}),
    ...(pinout.groups
      ? {
          groups: pinout.groups.map((group) => ({
            ...group,
            pins: group.pins.map(apply),
          })),
        }
      : {}),
  };
}

// --- Raspberry Pi Pico (RP2040) ---------------------------------------------
// Generated from pico-sdk 2.3.1 io_bank0.h FUNCSEL values (SPI RX/TX/SCLK/SS_N
// as MISO/MOSI/SCK/CS, which MicroPython's rp2 port confirms), ADC inputs from
// hardware/adc.h, and defaults from boards/pico.h.

export const picoFunctionTable: PinFunctionTable = {
  GP0: { mcu: { name: "GPIO0", gpio: 0 }, functions: [fn("I2C", "I2C0", "SDA"), fn("SPI", "SPI0", "MISO"), fn("UART", "UART0", "TX", true), fn("PWM", "PWM0", "A")] },
  GP1: { mcu: { name: "GPIO1", gpio: 1 }, functions: [fn("I2C", "I2C0", "SCL"), fn("SPI", "SPI0", "CS"), fn("UART", "UART0", "RX", true), fn("PWM", "PWM0", "B")] },
  GP2: { mcu: { name: "GPIO2", gpio: 2 }, functions: [fn("I2C", "I2C1", "SDA"), fn("SPI", "SPI0", "SCK"), fn("PWM", "PWM1", "A")] },
  GP3: { mcu: { name: "GPIO3", gpio: 3 }, functions: [fn("I2C", "I2C1", "SCL"), fn("SPI", "SPI0", "MOSI"), fn("PWM", "PWM1", "B")] },
  GP4: { mcu: { name: "GPIO4", gpio: 4 }, functions: [fn("I2C", "I2C0", "SDA", true), fn("SPI", "SPI0", "MISO"), fn("UART", "UART1", "TX"), fn("PWM", "PWM2", "A")] },
  GP5: { mcu: { name: "GPIO5", gpio: 5 }, functions: [fn("I2C", "I2C0", "SCL", true), fn("SPI", "SPI0", "CS"), fn("UART", "UART1", "RX"), fn("PWM", "PWM2", "B")] },
  GP6: { mcu: { name: "GPIO6", gpio: 6 }, functions: [fn("I2C", "I2C1", "SDA"), fn("SPI", "SPI0", "SCK"), fn("PWM", "PWM3", "A")] },
  GP7: { mcu: { name: "GPIO7", gpio: 7 }, functions: [fn("I2C", "I2C1", "SCL"), fn("SPI", "SPI0", "MOSI"), fn("PWM", "PWM3", "B")] },
  GP8: { mcu: { name: "GPIO8", gpio: 8 }, functions: [fn("I2C", "I2C0", "SDA"), fn("SPI", "SPI1", "MISO"), fn("UART", "UART1", "TX"), fn("PWM", "PWM4", "A")] },
  GP9: { mcu: { name: "GPIO9", gpio: 9 }, functions: [fn("I2C", "I2C0", "SCL"), fn("SPI", "SPI1", "CS"), fn("UART", "UART1", "RX"), fn("PWM", "PWM4", "B")] },
  GP10: { mcu: { name: "GPIO10", gpio: 10 }, functions: [fn("I2C", "I2C1", "SDA"), fn("SPI", "SPI1", "SCK"), fn("PWM", "PWM5", "A")] },
  GP11: { mcu: { name: "GPIO11", gpio: 11 }, functions: [fn("I2C", "I2C1", "SCL"), fn("SPI", "SPI1", "MOSI"), fn("PWM", "PWM5", "B")] },
  GP12: { mcu: { name: "GPIO12", gpio: 12 }, functions: [fn("I2C", "I2C0", "SDA"), fn("SPI", "SPI1", "MISO"), fn("UART", "UART0", "TX"), fn("PWM", "PWM6", "A")] },
  GP13: { mcu: { name: "GPIO13", gpio: 13 }, functions: [fn("I2C", "I2C0", "SCL"), fn("SPI", "SPI1", "CS"), fn("UART", "UART0", "RX"), fn("PWM", "PWM6", "B")] },
  GP14: { mcu: { name: "GPIO14", gpio: 14 }, functions: [fn("I2C", "I2C1", "SDA"), fn("SPI", "SPI1", "SCK"), fn("PWM", "PWM7", "A")] },
  GP15: { mcu: { name: "GPIO15", gpio: 15 }, functions: [fn("I2C", "I2C1", "SCL"), fn("SPI", "SPI1", "MOSI"), fn("PWM", "PWM7", "B")] },
  GP16: { mcu: { name: "GPIO16", gpio: 16 }, functions: [fn("I2C", "I2C0", "SDA"), fn("SPI", "SPI0", "MISO", true), fn("UART", "UART0", "TX"), fn("PWM", "PWM0", "A")] },
  GP17: { mcu: { name: "GPIO17", gpio: 17 }, functions: [fn("I2C", "I2C0", "SCL"), fn("SPI", "SPI0", "CS", true), fn("UART", "UART0", "RX"), fn("PWM", "PWM0", "B")] },
  GP18: { mcu: { name: "GPIO18", gpio: 18 }, functions: [fn("I2C", "I2C1", "SDA"), fn("SPI", "SPI0", "SCK", true), fn("PWM", "PWM1", "A")] },
  GP19: { mcu: { name: "GPIO19", gpio: 19 }, functions: [fn("I2C", "I2C1", "SCL"), fn("SPI", "SPI0", "MOSI", true), fn("PWM", "PWM1", "B")] },
  GP20: { mcu: { name: "GPIO20", gpio: 20 }, functions: [fn("I2C", "I2C0", "SDA"), fn("SPI", "SPI0", "MISO"), fn("UART", "UART1", "TX"), fn("PWM", "PWM2", "A")] },
  GP21: { mcu: { name: "GPIO21", gpio: 21 }, functions: [fn("I2C", "I2C0", "SCL"), fn("SPI", "SPI0", "CS"), fn("UART", "UART1", "RX"), fn("PWM", "PWM2", "B")] },
  GP22: { mcu: { name: "GPIO22", gpio: 22 }, functions: [fn("I2C", "I2C1", "SDA"), fn("SPI", "SPI0", "SCK"), fn("PWM", "PWM3", "A")] },
  GP26: { mcu: { name: "GPIO26", gpio: 26 }, functions: [fn("I2C", "I2C1", "SDA"), fn("SPI", "SPI1", "SCK"), fn("PWM", "PWM5", "A"), fn("ADC", "ADC", "CH0")] },
  GP27: { mcu: { name: "GPIO27", gpio: 27 }, functions: [fn("I2C", "I2C1", "SCL"), fn("SPI", "SPI1", "MOSI"), fn("PWM", "PWM5", "B"), fn("ADC", "ADC", "CH1")] },
  GP28: { mcu: { name: "GPIO28", gpio: 28 }, functions: [fn("I2C", "I2C0", "SDA"), fn("SPI", "SPI1", "MISO"), fn("UART", "UART0", "TX"), fn("PWM", "PWM6", "A"), fn("ADC", "ADC", "CH2")] },
};

export const picoFunctionData: PinFunctionData = {
  sources: [
    {
      label: "pico-sdk 2.3.1 io_bank0.h: RP2040 GPIO function select",
      url: "https://github.com/raspberrypi/pico-sdk/blob/2.3.1/src/rp2040/hardware_regs/include/hardware/regs/io_bank0.h",
      type: "Docs",
    },
    {
      label: "pico-sdk 2.3.1 boards/pico.h: default UART, I2C, and SPI pins",
      url: "https://github.com/raspberrypi/pico-sdk/blob/2.3.1/src/boards/include/boards/pico.h",
      type: "Docs",
    },
    {
      label: "pico-sdk 2.3.1 hardware/adc.h: ADC inputs 0 to 3 are GPIO26 to GPIO29",
      url: "https://github.com/raspberrypi/pico-sdk/blob/2.3.1/src/rp2_common/hardware_adc/include/hardware/adc.h",
      type: "Docs",
    },
    {
      label: "MicroPython v1.27.0 rp2 machine_spi.c: SPI TX is MOSI, RX is MISO",
      url: "https://github.com/micropython/micropython/blob/v1.27.0/ports/rp2/machine_spi.c",
      type: "Docs",
    },
    {
      label: "MicroPython v1.27.0 rp2 machine_i2c.c: I2C bus ids",
      url: "https://github.com/micropython/micropython/blob/v1.27.0/ports/rp2/machine_i2c.c",
      type: "Docs",
    },
    {
      label: "MicroPython v1.27.0 rp2 machine_uart.c: UART bus ids",
      url: "https://github.com/micropython/micropython/blob/v1.27.0/ports/rp2/machine_uart.c",
      type: "Docs",
    },
  ],
  mux: {
    model: "fixed",
    note: "Each RP2040 GPIO selects one function from its row of the IO_BANK0 function-select table, so a bus can only use pins that table lists for it.",
  },
  flagNotes: {},
  exports: ["c-header", "micropython", "json"],
  micropythonBusIds: { I2C0: 0, I2C1: 1, SPI0: 0, SPI1: 1, UART0: 0, UART1: 1 },
};

// --- ESP32-DevKitC V4 (ESP32) -----------------------------------------------
// GPIO identities from the DevKitC header tables; ADC/DAC channels from
// ESP-IDF v5.4 soc/adc_channel.h and dac_channel.h; IO_MUX SPI and UART pins
// from spi_pins.h and uart_pins.h; I2C0 defaults from arduino-esp32 3.3.9
// (Wire is bus 0, SDA 21, SCL 22). Flags quote the ESP-IDF GPIO table notes.

export const esp32DevKitCFunctionTable: PinFunctionTable = {
  VP: { mcu: { name: "GPIO36", gpio: 36 }, functions: [fn("ADC", "ADC1", "CH0")], flags: ["input-only"] },
  VN: { mcu: { name: "GPIO39", gpio: 39 }, functions: [fn("ADC", "ADC1", "CH3")], flags: ["input-only"] },
  IO34: { mcu: { name: "GPIO34", gpio: 34 }, functions: [fn("ADC", "ADC1", "CH6")], flags: ["input-only"] },
  IO35: { mcu: { name: "GPIO35", gpio: 35 }, functions: [fn("ADC", "ADC1", "CH7")], flags: ["input-only"] },
  IO32: { mcu: { name: "GPIO32", gpio: 32 }, functions: [fn("ADC", "ADC1", "CH4")] },
  IO33: { mcu: { name: "GPIO33", gpio: 33 }, functions: [fn("ADC", "ADC1", "CH5")] },
  IO25: { mcu: { name: "GPIO25", gpio: 25 }, functions: [fn("ADC", "ADC2", "CH8"), fn("DAC", "DAC", "CH1")], flags: ["adc-unavailable-with-wifi"] },
  IO26: { mcu: { name: "GPIO26", gpio: 26 }, functions: [fn("ADC", "ADC2", "CH9"), fn("DAC", "DAC", "CH2")], flags: ["adc-unavailable-with-wifi"] },
  IO27: { mcu: { name: "GPIO27", gpio: 27 }, functions: [fn("ADC", "ADC2", "CH7")], flags: ["adc-unavailable-with-wifi"] },
  IO14: { mcu: { name: "GPIO14", gpio: 14 }, functions: [fn("SPI", "SPI2", "SCK", true), fn("ADC", "ADC2", "CH6")], flags: ["jtag", "adc-unavailable-with-wifi"] },
  IO12: { mcu: { name: "GPIO12", gpio: 12 }, functions: [fn("SPI", "SPI2", "MISO", true), fn("ADC", "ADC2", "CH5")], flags: ["strapping", "jtag", "adc-unavailable-with-wifi"] },
  IO13: { mcu: { name: "GPIO13", gpio: 13 }, functions: [fn("SPI", "SPI2", "MOSI", true), fn("ADC", "ADC2", "CH4")], flags: ["jtag", "adc-unavailable-with-wifi"] },
  IO23: { mcu: { name: "GPIO23", gpio: 23 }, functions: [fn("SPI", "SPI3", "MOSI", true)] },
  IO22: { mcu: { name: "GPIO22", gpio: 22 }, functions: [fn("I2C", "I2C0", "SCL", true)] },
  TX: { mcu: { name: "GPIO1", gpio: 1 }, functions: [fn("UART", "UART0", "TX", true)], flags: ["usb"] },
  RX: { mcu: { name: "GPIO3", gpio: 3 }, functions: [fn("UART", "UART0", "RX", true)], flags: ["usb"] },
  IO21: { mcu: { name: "GPIO21", gpio: 21 }, functions: [fn("I2C", "I2C0", "SDA", true)] },
  IO19: { mcu: { name: "GPIO19", gpio: 19 }, functions: [fn("SPI", "SPI3", "MISO", true)] },
  IO18: { mcu: { name: "GPIO18", gpio: 18 }, functions: [fn("SPI", "SPI3", "SCK", true)] },
  IO5: { mcu: { name: "GPIO5", gpio: 5 }, functions: [fn("SPI", "SPI3", "CS", true)], flags: ["strapping"] },
  IO17: { mcu: { name: "GPIO17", gpio: 17 }, functions: [fn("UART", "UART2", "TX", true)], flags: ["module-memory"] },
  IO16: { mcu: { name: "GPIO16", gpio: 16 }, functions: [fn("UART", "UART2", "RX", true)], flags: ["module-memory"] },
  IO4: { mcu: { name: "GPIO4", gpio: 4 }, functions: [fn("ADC", "ADC2", "CH0")], flags: ["adc-unavailable-with-wifi"] },
  IO0: { mcu: { name: "GPIO0", gpio: 0 }, functions: [fn("ADC", "ADC2", "CH1")], flags: ["strapping", "boot", "adc-unavailable-with-wifi"] },
  IO2: { mcu: { name: "GPIO2", gpio: 2 }, functions: [fn("ADC", "ADC2", "CH2")], flags: ["strapping", "adc-unavailable-with-wifi"] },
  IO15: { mcu: { name: "GPIO15", gpio: 15 }, functions: [fn("SPI", "SPI2", "CS", true), fn("ADC", "ADC2", "CH3")], flags: ["strapping", "jtag", "adc-unavailable-with-wifi"] },
};

const espIdfSoc =
  "https://github.com/espressif/esp-idf/blob/v5.4/components/soc/esp32/include/soc";

export const esp32DevKitCFunctionData: PinFunctionData = {
  sources: [
    {
      label: "ESP-IDF v5.4 GPIO & RTC GPIO (ESP32): pin table and notes",
      url: "https://docs.espressif.com/projects/esp-idf/en/v5.4/esp32/api-reference/peripherals/gpio.html",
      type: "Docs",
    },
    {
      label: "ESP32-DevKitC V4 user guide: J2/J3 header tables",
      url: "https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html",
      type: "Manual",
    },
    { label: "ESP-IDF v5.4 soc/adc_channel.h: ADC1 and ADC2 channel GPIOs", url: `${espIdfSoc}/adc_channel.h`, type: "Docs" },
    { label: "ESP-IDF v5.4 soc/dac_channel.h: DAC channel GPIOs", url: `${espIdfSoc}/dac_channel.h`, type: "Docs" },
    { label: "ESP-IDF v5.4 soc/spi_pins.h: SPI2 and SPI3 IO_MUX pins", url: `${espIdfSoc}/spi_pins.h`, type: "Docs" },
    { label: "ESP-IDF v5.4 soc/uart_pins.h: UART direct pins", url: `${espIdfSoc}/uart_pins.h`, type: "Docs" },
    { label: "ESP-IDF v5.4 soc/soc_caps.h: I2C, UART, SPI, and LEDC counts; input-only GPIOs", url: `${espIdfSoc}/soc_caps.h`, type: "Docs" },
    {
      label: "arduino-esp32 3.3.9 variants/esp32/pins_arduino.h: default SDA and SCL",
      url: "https://github.com/espressif/arduino-esp32/blob/3.3.9/variants/esp32/pins_arduino.h",
      type: "Docs",
    },
    {
      label: "arduino-esp32 3.3.9 Wire.cpp: Wire is I2C bus 0",
      url: "https://github.com/espressif/arduino-esp32/blob/3.3.9/libraries/Wire/src/Wire.cpp",
      type: "Docs",
    },
    {
      label: "MicroPython v1.27.0 esp32 machine_hw_spi.c: SPI(1) is SPI2, SPI(2) is SPI3",
      url: "https://github.com/micropython/micropython/blob/v1.27.0/ports/esp32/machine_hw_spi.c",
      type: "Docs",
    },
  ],
  mux: {
    model: "matrix",
    note: "Espressif: “Through IO MUX, RTC IO MUX and the GPIO matrix, peripheral input signals can be from any IO pins, and peripheral output signals can be routed to any IO pins.” ADC and DAC channels stay on their fixed pins.",
    routable: [
      { peripheral: "I2C", instances: ["I2C0", "I2C1"], signals: ["SDA", "SCL"] },
      { peripheral: "SPI", instances: ["SPI3", "SPI2"], signals: ["SCK", "MOSI", "MISO", "CS"] },
      { peripheral: "UART", instances: ["UART2", "UART1", "UART0"], signals: ["TX", "RX"] },
      {
        peripheral: "PWM",
        instances: ["LEDC"],
        signals: ["CH0", "CH1", "CH2", "CH3", "CH4", "CH5", "CH6", "CH7"],
      },
    ],
  },
  flagNotes: {
    strapping:
      "Espressif: “GPIO0, GPIO2, GPIO5, GPIO12 (MTDI), and GPIO15 (MTDO) are strapping pins.”",
    "module-memory":
      "Espressif: “GPIO6-11 and GPIO16-17 are usually connected to the SPI flash and PSRAM integrated on the module and therefore should not be used for other purposes.”",
    jtag: "Espressif: “GPIO12-15 are usually used for inline debug.”",
    "input-only":
      "Espressif: “GPIO34-39 can only be set as input mode and do not have software-enabled pullup or pulldown functions.”",
    usb: "Espressif: “TXD & RXD are usually used for flashing and debugging.”",
    boot: "Espressif: the J3 header table lists IO0 as “Boot”, and the Boot button is the “Download button. Holding down Boot and then pressing EN initiates Firmware Download mode for downloading firmware through the serial port.”",
    "adc-unavailable-with-wifi":
      "Espressif: “ADC2 pins cannot be used when Wi-Fi is used.”",
  },
  exports: ["c-header", "micropython", "json"],
  micropythonBusIds: { I2C0: 0, I2C1: 1, SPI2: 1, SPI3: 2, UART0: 0, UART1: 1, UART2: 2 },
};

// --- Arduino UNO Rev3 (ATmega328P) ------------------------------------------
// Port pins, PWM timer outputs, SPI, I2C (Wire), and analog inputs from
// ArduinoCore-avr 1.8.8 variants/standard/pins_arduino.h (boards.txt: the UNO
// uses variant "standard"). Serial, Wire, SPI, and PWM pins are cross-checked
// against the Arduino language reference tables for the UNO R3.

export const unoRev3FunctionTable: PinFunctionTable = {
  "D0 / RX": { mcu: { name: "PD0", arduino: "0" }, functions: [fn("UART", "Serial", "RX")], flags: ["usb"] },
  "D1 / TX": { mcu: { name: "PD1", arduino: "1" }, functions: [fn("UART", "Serial", "TX")], flags: ["usb"] },
  D2: { mcu: { name: "PD2", arduino: "2" } },
  D3: { mcu: { name: "PD3", arduino: "3" }, functions: [fn("PWM", "TIMER2", "B")] },
  D4: { mcu: { name: "PD4", arduino: "4" } },
  D5: { mcu: { name: "PD5", arduino: "5" }, functions: [fn("PWM", "TIMER0", "B")] },
  D6: { mcu: { name: "PD6", arduino: "6" }, functions: [fn("PWM", "TIMER0", "A")] },
  D7: { mcu: { name: "PD7", arduino: "7" } },
  D8: { mcu: { name: "PB0", arduino: "8" } },
  D9: { mcu: { name: "PB1", arduino: "9" }, functions: [fn("PWM", "TIMER1", "A")] },
  "D10 / CS": { mcu: { name: "PB2", arduino: "10" }, functions: [fn("SPI", "SPI", "CS"), fn("PWM", "TIMER1", "B")] },
  "D11 / COPI": { mcu: { name: "PB3", arduino: "11" }, functions: [fn("SPI", "SPI", "MOSI"), fn("PWM", "TIMER2", "A")] },
  "D12 / CIPO": { mcu: { name: "PB4", arduino: "12" }, functions: [fn("SPI", "SPI", "MISO")] },
  "D13 / SCK": { mcu: { name: "PB5", arduino: "13" }, functions: [fn("SPI", "SPI", "SCK")], flags: ["onboard-led"] },
  A0: { mcu: { name: "PC0", arduino: "A0" }, functions: [fn("ADC", "ADC", "CH0")] },
  A1: { mcu: { name: "PC1", arduino: "A1" }, functions: [fn("ADC", "ADC", "CH1")] },
  A2: { mcu: { name: "PC2", arduino: "A2" }, functions: [fn("ADC", "ADC", "CH2")] },
  A3: { mcu: { name: "PC3", arduino: "A3" }, functions: [fn("ADC", "ADC", "CH3")] },
  "A4 / SDA": { mcu: { name: "PC4", arduino: "A4" }, functions: [fn("I2C", "Wire", "SDA"), fn("ADC", "ADC", "CH4")] },
  "A5 / SCL": { mcu: { name: "PC5", arduino: "A5" }, functions: [fn("I2C", "Wire", "SCL"), fn("ADC", "ADC", "CH5")] },
};

const arduinoReference =
  "https://github.com/arduino/reference-en/blob/b367b025a1eb/Language";

export const unoRev3FunctionData: PinFunctionData = {
  sources: [
    {
      label: "ArduinoCore-avr 1.8.8 variants/standard/pins_arduino.h: ports, PWM timers, SPI, I2C, analog inputs",
      url: "https://github.com/arduino/ArduinoCore-avr/blob/1.8.8/variants/standard/pins_arduino.h",
      type: "Docs",
    },
    {
      label: "ArduinoCore-avr 1.8.8 boards.txt: the UNO uses variant standard (ATmega328P)",
      url: "https://github.com/arduino/ArduinoCore-avr/blob/1.8.8/boards.txt",
      type: "Docs",
    },
    { label: "Arduino reference: Serial pins by board", url: `${arduinoReference}/Functions/Communication/Serial.adoc`, type: "Docs" },
    { label: "Arduino reference: Wire (I2C) pins by board", url: `${arduinoReference}/Functions/Communication/Wire.adoc`, type: "Docs" },
    { label: "Arduino reference: SPI pins by board", url: `${arduinoReference}/Functions/Communication/SPI.adoc`, type: "Docs" },
    { label: "Arduino reference: analogWrite() PWM pins by board", url: `${arduinoReference}/Functions/Analog%20IO/analogWrite.adoc`, type: "Docs" },
    { label: "Arduino reference: LED_BUILTIN", url: `${arduinoReference}/Variables/Constants/ledbuiltin.adoc`, type: "Docs" },
  ],
  mux: {
    model: "fixed",
    note: "Each ATmega328P peripheral signal is wired to one port pin, so Serial, Wire (I2C), SPI, and each PWM output have exactly the pins the UNO core variant lists.",
  },
  flagNotes: {
    usb: "Arduino: “On older boards (Uno, Nano, Mini, and Mega), pins 0 and 1 are used for communication with the computer. Connecting anything to these pins can interfere with that communication, including causing failed uploads to the board.”",
    "onboard-led":
      "Arduino: “The constant LED_BUILTIN is the number of the pin to which the on-board LED is connected.” The UNO core variant defines LED_BUILTIN as 13.",
  },
  exports: ["c-header", "arduino", "json"],
};

// --- Raspberry Pi 5 J8 header (RP1) -----------------------------------------
// The functions Raspberry Pi's GPIO documentation lists for the 40-pin header,
// with instance and signal names from the pinctrl tool's RP1 table
// (SDA1/SCL1, TXD0/RXD0, SPI0_*/SPI1_*, PWM0_CHAN0-3). Other RP1 functions
// are left out: the documentation does not list them for the header.

const pi5Gpio = (gpio: number): PinMcu => ({ name: `GPIO${gpio}`, gpio });

export const raspberryPi5FunctionTable: PinFunctionTable = {
  GPIO2: { mcu: pi5Gpio(2), functions: [fn("I2C", "I2C1", "SDA", true)] },
  GPIO3: { mcu: pi5Gpio(3), functions: [fn("I2C", "I2C1", "SCL", true)] },
  GPIO4: { mcu: pi5Gpio(4) },
  GPIO5: { mcu: pi5Gpio(5) },
  GPIO6: { mcu: pi5Gpio(6) },
  GPIO7: { mcu: pi5Gpio(7), functions: [fn("SPI", "SPI0", "CS1")] },
  GPIO8: { mcu: pi5Gpio(8), functions: [fn("SPI", "SPI0", "CS0", true)] },
  GPIO9: { mcu: pi5Gpio(9), functions: [fn("SPI", "SPI0", "MISO", true)] },
  GPIO10: { mcu: pi5Gpio(10), functions: [fn("SPI", "SPI0", "MOSI", true)] },
  GPIO11: { mcu: pi5Gpio(11), functions: [fn("SPI", "SPI0", "SCK", true)] },
  GPIO12: { mcu: pi5Gpio(12), functions: [fn("PWM", "PWM0", "CH0")] },
  GPIO13: { mcu: pi5Gpio(13), functions: [fn("PWM", "PWM0", "CH1")] },
  GPIO14: { mcu: pi5Gpio(14), functions: [fn("UART", "UART0", "TX", true)] },
  GPIO15: { mcu: pi5Gpio(15), functions: [fn("UART", "UART0", "RX", true)] },
  GPIO16: { mcu: pi5Gpio(16), functions: [fn("SPI", "SPI1", "CS2")] },
  GPIO17: { mcu: pi5Gpio(17), functions: [fn("SPI", "SPI1", "CS1")] },
  GPIO18: { mcu: pi5Gpio(18), functions: [fn("SPI", "SPI1", "CS0"), fn("PWM", "PWM0", "CH2")] },
  GPIO19: { mcu: pi5Gpio(19), functions: [fn("SPI", "SPI1", "MISO"), fn("PWM", "PWM0", "CH3")] },
  GPIO20: { mcu: pi5Gpio(20), functions: [fn("SPI", "SPI1", "MOSI")] },
  GPIO21: { mcu: pi5Gpio(21), functions: [fn("SPI", "SPI1", "SCK")] },
  GPIO22: { mcu: pi5Gpio(22) },
  GPIO23: { mcu: pi5Gpio(23) },
  GPIO24: { mcu: pi5Gpio(24) },
  GPIO25: { mcu: pi5Gpio(25) },
  GPIO26: { mcu: pi5Gpio(26) },
  GPIO27: { mcu: pi5Gpio(27) },
};

export const raspberryPi5FunctionData: PinFunctionData = {
  sources: [
    {
      label: "Raspberry Pi documentation: GPIO alternative functions (gpio-on-raspberry-pi.adoc)",
      url: "https://github.com/raspberrypi/documentation/blob/34dfb87309ab/documentation/asciidoc/computers/raspberry-pi/gpio-on-raspberry-pi.adoc",
      type: "Docs",
    },
    {
      label: "Raspberry Pi utils pinctrl gpiochip_rp1.c: RP1 function names per GPIO",
      url: "https://github.com/raspberrypi/utils/blob/ebc4a56bac3a/pinctrl/gpiochip_rp1.c",
      type: "Docs",
    },
  ],
  mux: {
    model: "fixed",
    note: "Raspberry Pi: “Almost all of the GPIO pins have alternative functions.” PinHub plans only the header functions that documentation lists: I2C on GPIO2/3, SPI0, SPI1, serial on GPIO14/15, and hardware PWM on GPIO12, 13, 18, and 19.",
  },
  flagNotes: {},
  exports: ["c-header", "json"],
};
