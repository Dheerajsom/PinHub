import type { PinRole } from "@/lib/boards";

/**
 * Header pins for the boards drawn in the page background (CircuitBackground).
 *
 * The background is imported by client components, so it cannot pull the full
 * catalog (pin maps stay out of the initial payload). These rows are a copy of
 * each board's catalog headers — label and role only, in catalog order — and
 * test/bench-boards.test.ts fails if they ever drift from `src/lib/boards.ts`.
 * Nothing is drawn on a background pin that the catalog does not record.
 */

export type BenchPin = { label: string; role: PinRole };

type Code = "P" | "G" | "IO" | "I2C" | "SPI" | "UART" | "ADC" | "DAC" | "PWM" | "SYS" | "ALT" | "RSV";

const roleOf: Record<Code, PinRole> = {
  P: "power",
  G: "ground",
  IO: "gpio",
  I2C: "i2c",
  SPI: "spi",
  UART: "uart",
  ADC: "adc",
  DAC: "dac",
  PWM: "pwm",
  SYS: "system",
  ALT: "special",
  RSV: "reserved",
};

/** "3V3:P GPIO2:I2C ..." -> pins, so each header reads as one line per column. */
const row = (spec: string): BenchPin[] =>
  spec
    .trim()
    .split(/\s+/)
    .map((entry) => {
      const [label, code] = entry.split(":") as [string, Code];
      return { label, role: roleOf[code] };
    });

/** Catalog `pins.left` and `pins.right`, in catalog order. */
export type BenchHeader = { left: BenchPin[]; right: BenchPin[] };

const raspberryPi40Pin: BenchHeader = {
  left: row(`3V3:P GPIO2:I2C GPIO3:I2C GPIO4:IO GND:G GPIO17:IO GPIO27:IO GPIO22:IO 3V3:P GPIO10:SPI
    GPIO9:SPI GPIO11:SPI GND:G GPIO0:RSV GPIO5:IO GPIO6:IO GPIO13:PWM GPIO19:ALT GPIO26:IO GND:G`),
  right: row(`5V:P 5V:P GND:G GPIO14:UART GPIO15:UART GPIO18:PWM GND:G GPIO23:IO GPIO24:IO GND:G
    GPIO25:IO GPIO8:SPI GPIO7:SPI GPIO1:RSV GND:G GPIO12:PWM GND:G GPIO16:IO GPIO20:ALT GPIO21:ALT`),
};

export const benchHeaders = {
  "raspberry-pi-5": raspberryPi40Pin,
  "raspberry-pi-zero-2-w": raspberryPi40Pin,
  "raspberry-pi-pico": {
    left: row(`GP0:UART GP1:UART GND:G GP2:IO GP3:IO GP4:I2C GP5:I2C GND:G GP6:IO GP7:IO
      GP8:SPI GP9:SPI GND:G GP10:SPI GP11:SPI GP12:IO GP13:IO GND:G GP14:IO GP15:IO`),
    right: row(`VBUS:P VSYS:P GND:G 3V3_EN:SYS 3V3:P ADC_VREF:ADC GP28:ADC AGND:G GP27:ADC GP26:ADC
      RUN:SYS GP22:IO GND:G GP21:I2C GP20:I2C GP19:SPI GP18:SPI GND:G GP17:SPI GP16:SPI`),
  },
  "stm32f103-blue-pill": {
    left: row(`VBAT:P PC13:IO PC14:IO PC15:IO PA0:ADC PA1:ADC PA2:UART PA3:UART PA4:SPI PA5:SPI
      PA6:SPI PA7:SPI PB0:ADC PB1:ADC PB10:I2C PB11:I2C RESET:SYS 3V3:P GND:G GND:G`),
    right: row(`3V3:P GND:G 5V:P PB9:I2C PB8:I2C PB7:I2C PB6:I2C PB5:SPI PB4:SPI PB3:SPI
      PA15:SPI PA12:ALT PA11:ALT PA10:UART PA9:UART PA8:IO PB15:SPI PB14:SPI PB13:SPI PB12:SPI`),
  },
  "esp32-devkit-v1": {
    left: row(`EN:SYS VP:ADC VN:ADC D34:ADC D35:ADC D32:ADC D33:ADC D25:DAC D26:DAC D27:IO
      D14:SPI D12:SYS D13:SPI GND:G VIN:P`),
    right: row(`D23:SPI D22:I2C TX0:UART RX0:UART D21:I2C D19:SPI D18:SPI D5:SYS TX2:UART RX2:UART
      D4:IO D2:SYS D15:SYS GND:G 3V3:P`),
  },
} satisfies Record<string, BenchHeader>;

export type BenchBoardId = keyof typeof benchHeaders;
