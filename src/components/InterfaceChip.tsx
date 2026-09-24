// Protocol-tinted interface chips. The tone key drives `.ph-iface[data-tone]`
// in globals.css (same hues as the pin-role system), which keeps both themes
// working — inline styles would bypass the light-mode rules entirely.
const interfaceTones: Record<string, string> = {
  GPIO: "gpio",
  I2C: "i2c",
  SPI: "spi",
  UART: "uart",
  ADC: "adc",
  DAC: "dac",
  PWM: "pwm",
  CAN: "can",
  USB: "usb",
  Ethernet: "ethernet",
  "Wi-Fi": "wifi",
  Bluetooth: "bluetooth",
};

function interfaceTone(item: string): string {
  return interfaceTones[item] ?? "default";
}

export function InterfaceChip({ name }: { name: string }) {
  return (
    <span data-tone={interfaceTone(name)} className="ph-iface">
      {name}
    </span>
  );
}
