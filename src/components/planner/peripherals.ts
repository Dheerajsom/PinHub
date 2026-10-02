import type { PinRole } from "@/lib/boards";
import type { PlanPeripheral } from "@/lib/pin-planner";

/** The role hue each planned peripheral is drawn in. */
export const peripheralRole: Record<PlanPeripheral, PinRole> = {
  I2C: "i2c",
  SPI: "spi",
  UART: "uart",
  CAN: "special",
  PWM: "pwm",
  ADC: "adc",
  DAC: "dac",
  GPIO: "gpio",
};

export const peripheralHint: Record<PlanPeripheral, string> = {
  I2C: "SDA, SCL",
  SPI: "SCK, MOSI, MISO, CS",
  UART: "TX, RX",
  CAN: "TX, RX",
  PWM: "1 output each",
  ADC: "1 channel each",
  DAC: "1 channel each",
  GPIO: "plain I/O",
};
