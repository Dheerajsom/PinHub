import type { PinFunctionData, Pinout } from "../boards";
import {
  raspberryPi5FunctionData,
  raspberryPi5FunctionTable,
  withPinFunctions,
} from "../pin-function-data";
import { tableFromRows } from "./rows";

// Planner data for the 40-pin header on Broadcom Raspberry Pi models, from the
// alternate-function tables in Raspberry Pi's pinctrl tool. SD, DPI, PCM,
// and flow-control functions are left out, as is any bus that needs GPIO0 or
// GPIO1 (reserved for the HAT ID EEPROM). The Pi 500 and 500+ use the RP1
// table the Pi 5 already has.

const pinctrl =
  "https://github.com/raspberrypi/utils/blob/b8961eb9a689/pinctrl/gpiochip_bcm2835.c";
const gpioDocs =
  "https://github.com/raspberrypi/documentation/blob/34dfb87309ab/documentation/asciidoc/computers/raspberry-pi/gpio-on-raspberry-pi.adoc";
const uartDocs =
  "https://github.com/raspberrypi/documentation/blob/34dfb87309ab/documentation/asciidoc/computers/configuration/interfaces.adoc";

// bcm2835_gpio_alt_names: BCM2835, BCM2836, BCM2837, BCM2710A1, and RP3A0.
const bcm283xRows: Record<string, string> = {
  GPIO2: "GPIO2#2 | I:I2C1.SDA*",
  GPIO3: "GPIO3#3 | I:I2C1.SCL*",
  GPIO4: "GPIO4#4",
  GPIO5: "GPIO5#5",
  GPIO6: "GPIO6#6",
  GPIO7: "GPIO7#7 | S:SPI0.CS1",
  GPIO8: "GPIO8#8 | S:SPI0.CS0*",
  GPIO9: "GPIO9#9 | S:SPI0.MISO*",
  GPIO10: "GPIO10#10 | S:SPI0.MOSI*",
  GPIO11: "GPIO11#11 | S:SPI0.SCK*",
  GPIO12: "GPIO12#12 | P:PWM.CH0",
  GPIO13: "GPIO13#13 | P:PWM.CH1",
  GPIO14: "GPIO14#14 | U:UART0.TX* U:UART1.TX",
  GPIO15: "GPIO15#15 | U:UART0.RX* U:UART1.RX",
  GPIO16: "GPIO16#16 | S:SPI1.CS2",
  GPIO17: "GPIO17#17 | S:SPI1.CS1",
  GPIO18: "GPIO18#18 | S:SPI1.CS0 P:PWM.CH0",
  GPIO19: "GPIO19#19 | S:SPI1.MISO P:PWM.CH1",
  GPIO20: "GPIO20#20 | S:SPI1.MOSI",
  GPIO21: "GPIO21#21 | S:SPI1.SCK",
  GPIO22: "GPIO22#22",
  GPIO23: "GPIO23#23",
  GPIO24: "GPIO24#24",
  GPIO25: "GPIO25#25",
  GPIO26: "GPIO26#26",
  GPIO27: "GPIO27#27",
};

// bcm2711_gpio_alt_names.
const bcm2711Rows: Record<string, string> = {
  GPIO2: "GPIO2#2 | I:I2C1.SDA* I:I2C3.SDA",
  GPIO3: "GPIO3#3 | I:I2C1.SCL* I:I2C3.SCL",
  GPIO4: "GPIO4#4 | S:SPI4.CS0 U:UART3.TX I:I2C3.SDA",
  GPIO5: "GPIO5#5 | S:SPI4.MISO U:UART3.RX I:I2C3.SCL",
  GPIO6: "GPIO6#6 | S:SPI4.MOSI I:I2C4.SDA",
  GPIO7: "GPIO7#7 | S:SPI0.CS1 S:SPI4.SCK I:I2C4.SCL",
  GPIO8: "GPIO8#8 | S:SPI0.CS0* U:UART4.TX I:I2C4.SDA",
  GPIO9: "GPIO9#9 | S:SPI0.MISO* U:UART4.RX I:I2C4.SCL",
  GPIO10: "GPIO10#10 | S:SPI0.MOSI* I:I2C5.SDA",
  GPIO11: "GPIO11#11 | S:SPI0.SCK* I:I2C5.SCL",
  GPIO12: "GPIO12#12 | P:PWM0.CH0 S:SPI5.CS0 U:UART5.TX I:I2C5.SDA",
  GPIO13: "GPIO13#13 | P:PWM0.CH1 S:SPI5.MISO U:UART5.RX I:I2C5.SCL",
  GPIO14: "GPIO14#14 | U:UART0.TX* S:SPI5.MOSI U:UART1.TX",
  GPIO15: "GPIO15#15 | U:UART0.RX* S:SPI5.SCK U:UART1.RX",
  GPIO16: "GPIO16#16 | S:SPI1.CS2",
  GPIO17: "GPIO17#17 | S:SPI1.CS1",
  GPIO18: "GPIO18#18 | S:SPI6.CS0 S:SPI1.CS0 P:PWM0.CH0",
  GPIO19: "GPIO19#19 | S:SPI6.MISO S:SPI1.MISO P:PWM0.CH1",
  GPIO20: "GPIO20#20 | S:SPI6.MOSI S:SPI1.MOSI",
  GPIO21: "GPIO21#21 | S:SPI6.SCK S:SPI1.SCK",
  GPIO22: "GPIO22#22 | I:I2C6.SDA",
  GPIO23: "GPIO23#23 | I:I2C6.SCL",
  GPIO24: "GPIO24#24",
  GPIO25: "GPIO25#25 | S:SPI4.CS1",
  GPIO26: "GPIO26#26 | S:SPI5.CS1",
  GPIO27: "GPIO27#27 | S:SPI6.CS1",
};

function broadcomData(chip: string, extra: string): PinFunctionData {
  return {
    sources: [
      {
        label: `Raspberry Pi utils pinctrl gpiochip_bcm2835.c: ${chip} alternate functions per GPIO`,
        url: pinctrl,
        type: "Docs",
      },
      {
        label: "Raspberry Pi documentation: GPIO alternative functions (gpio-on-raspberry-pi.adoc)",
        url: gpioDocs,
        type: "Docs",
      },
      {
        label: "Raspberry Pi documentation: serial interfaces (interfaces.adoc)",
        url: uartDocs,
        type: "Docs",
      },
    ],
    mux: {
      model: "fixed",
      note: `Raspberry Pi: “Almost all of the GPIO pins have alternative functions.” Each GPIO selects one function from its row of the pinctrl table.${extra} UART0 and UART1 share GPIO14 and GPIO15; on models with Bluetooth, UART0 is taken by the radio unless you reassign it.`,
    },
    flagNotes: {},
    exports: ["c-header", "json"],
  };
}

const bcm283xData = broadcomData("BCM283x", "");
const bcm2711Data = broadcomData(
  "BCM2711",
  " I2C3 to I2C6, UART3 to UART5, and SPI3 to SPI6 need a dtoverlay.",
);

const families = {
  bcm283x: { rows: bcm283xRows, data: bcm283xData },
  bcm2711: { rows: bcm2711Rows, data: bcm2711Data },
};

/** Raspberry Pi models by the pinctrl table their SoC uses. */
export const raspberryPiBoards = {
  "raspberry-pi-1-model-a-plus": "bcm283x",
  "raspberry-pi-1-model-b-plus": "bcm283x",
  "raspberry-pi-2-model-b": "bcm283x",
  "raspberry-pi-3-model-a-plus": "bcm283x",
  "raspberry-pi-3-model-b": "bcm283x",
  "raspberry-pi-3-model-b-plus": "bcm283x",
  "raspberry-pi-zero": "bcm283x",
  "raspberry-pi-zero-w": "bcm283x",
  "raspberry-pi-zero-2-w": "bcm283x",
  "raspberry-pi-4-model-b": "bcm2711",
  "raspberry-pi-400": "bcm2711",
  "raspberry-pi-500": "rp1",
  "raspberry-pi-500-plus": "rp1",
} as const;

export type RaspberryPiBoardId = keyof typeof raspberryPiBoards;

/** The planner fields for one Raspberry Pi with a 40-pin header. */
export function raspberryPiPinFunctions(
  boardId: RaspberryPiBoardId,
  pinout: Pinout,
): { pinout: Pinout; pinFunctions: PinFunctionData } {
  const family = raspberryPiBoards[boardId];
  if (family === "rp1") {
    return {
      pinout: withPinFunctions(pinout, raspberryPi5FunctionTable),
      pinFunctions: raspberryPi5FunctionData,
    };
  }
  const { rows, data } = families[family];
  return { pinout: withPinFunctions(pinout, tableFromRows(rows)), pinFunctions: data };
}
