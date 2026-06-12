export type BoardCategory =
  | "SBC"
  | "Microcontroller"
  | "AI Dev Kit"
  | "Development Board";

export type BoardInterface =
  | "GPIO"
  | "I2C"
  | "SPI"
  | "UART"
  | "ADC"
  | "DAC"
  | "PWM"
  | "CAN"
  | "USB"
  | "Wi-Fi"
  | "Bluetooth"
  | "CSI"
  | "PCIe"
  | "SWD"
  | "JTAG"
  | "Ethernet";

export type PinRole =
  | "power"
  | "ground"
  | "gpio"
  | "i2c"
  | "spi"
  | "uart"
  | "adc"
  | "dac"
  | "pwm"
  | "debug"
  | "system"
  | "special"
  | "reserved";

export type Pin = {
  position: number;
  label: string;
  role: PinRole;
  aliases?: string[];
  note?: string;
};

export type PinoutGroup = {
  label: string;
  pins: Pin[];
};

export type Pinout = {
  connector: string;
  layout: "dual-row" | "grouped";
  pins?: {
    left: Pin[];
    right: Pin[];
  };
  groups?: PinoutGroup[];
  notes: string[];
};

export type SourceLink = {
  label: string;
  url: string;
  type: "Docs" | "Pinout" | "Datasheet" | "Schematic" | "Manual";
};

export type Board = {
  id: string;
  name: string;
  vendor: string;
  category: BoardCategory;
  family: string;
  processor: string;
  logicLevel: string;
  power: string;
  formFactor: string;
  description: string;
  tags: string[];
  interfaces: BoardInterface[];
  highlights: string[];
  warnings: string[];
  sourceLinks: SourceLink[];
  pinout?: Pinout;
};

const raspberryPi40Pin: Pinout = {
  connector: "J8 40-pin GPIO header",
  layout: "dual-row",
  notes: [
    "Physical pins 1 and 17 are 3.3 V; pins 2 and 4 are 5 V.",
    "GPIO0 and GPIO1 on pins 27 and 28 are reserved for HAT ID EEPROM use on most setups.",
    "GPIO pins are 3.3 V logic and are not 5 V tolerant.",
  ],
  pins: {
    left: [
      { position: 1, label: "3V3", role: "power" },
      { position: 3, label: "GPIO2", role: "i2c", aliases: ["SDA1"] },
      { position: 5, label: "GPIO3", role: "i2c", aliases: ["SCL1"] },
      { position: 7, label: "GPIO4", role: "gpio", aliases: ["GPCLK0"] },
      { position: 9, label: "GND", role: "ground" },
      { position: 11, label: "GPIO17", role: "gpio" },
      { position: 13, label: "GPIO27", role: "gpio" },
      { position: 15, label: "GPIO22", role: "gpio" },
      { position: 17, label: "3V3", role: "power" },
      { position: 19, label: "GPIO10", role: "spi", aliases: ["SPI0 MOSI"] },
      { position: 21, label: "GPIO9", role: "spi", aliases: ["SPI0 MISO"] },
      { position: 23, label: "GPIO11", role: "spi", aliases: ["SPI0 SCLK"] },
      { position: 25, label: "GND", role: "ground" },
      { position: 27, label: "GPIO0", role: "reserved", aliases: ["ID_SD"] },
      { position: 29, label: "GPIO5", role: "gpio" },
      { position: 31, label: "GPIO6", role: "gpio" },
      { position: 33, label: "GPIO13", role: "pwm", aliases: ["PWM1"] },
      { position: 35, label: "GPIO19", role: "special", aliases: ["PCM FS"] },
      { position: 37, label: "GPIO26", role: "gpio" },
      { position: 39, label: "GND", role: "ground" },
    ],
    right: [
      { position: 2, label: "5V", role: "power" },
      { position: 4, label: "5V", role: "power" },
      { position: 6, label: "GND", role: "ground" },
      { position: 8, label: "GPIO14", role: "uart", aliases: ["TXD0"] },
      { position: 10, label: "GPIO15", role: "uart", aliases: ["RXD0"] },
      { position: 12, label: "GPIO18", role: "pwm", aliases: ["PWM0"] },
      { position: 14, label: "GND", role: "ground" },
      { position: 16, label: "GPIO23", role: "gpio" },
      { position: 18, label: "GPIO24", role: "gpio" },
      { position: 20, label: "GND", role: "ground" },
      { position: 22, label: "GPIO25", role: "gpio" },
      { position: 24, label: "GPIO8", role: "spi", aliases: ["SPI0 CE0"] },
      { position: 26, label: "GPIO7", role: "spi", aliases: ["SPI0 CE1"] },
      { position: 28, label: "GPIO1", role: "reserved", aliases: ["ID_SC"] },
      { position: 30, label: "GND", role: "ground" },
      { position: 32, label: "GPIO12", role: "pwm", aliases: ["PWM0"] },
      { position: 34, label: "GND", role: "ground" },
      { position: 36, label: "GPIO16", role: "gpio" },
      { position: 38, label: "GPIO20", role: "special", aliases: ["PCM DIN"] },
      { position: 40, label: "GPIO21", role: "special", aliases: ["PCM DOUT"] },
    ],
  },
};

const picoPinout: Pinout = {
  connector: "40-pin castellated DIP edge",
  layout: "dual-row",
  notes: [
    "Pico exposes RP2040 GPIO0 through GPIO28, with GPIO23 through GPIO25 used internally.",
    "ADC pins are GP26, GP27, and GP28; ADC_VREF is available on physical pin 35.",
    "GPIO is 3.3 V logic and is not 5 V tolerant.",
  ],
  pins: {
    left: [
      { position: 1, label: "GP0", role: "uart", aliases: ["UART0 TX"] },
      { position: 2, label: "GP1", role: "uart", aliases: ["UART0 RX"] },
      { position: 3, label: "GND", role: "ground" },
      { position: 4, label: "GP2", role: "gpio" },
      { position: 5, label: "GP3", role: "gpio" },
      { position: 6, label: "GP4", role: "i2c", aliases: ["I2C0 SDA"] },
      { position: 7, label: "GP5", role: "i2c", aliases: ["I2C0 SCL"] },
      { position: 8, label: "GND", role: "ground" },
      { position: 9, label: "GP6", role: "gpio" },
      { position: 10, label: "GP7", role: "gpio" },
      { position: 11, label: "GP8", role: "spi", aliases: ["SPI1 RX"] },
      { position: 12, label: "GP9", role: "spi", aliases: ["SPI1 CS"] },
      { position: 13, label: "GND", role: "ground" },
      { position: 14, label: "GP10", role: "spi", aliases: ["SPI1 SCK"] },
      { position: 15, label: "GP11", role: "spi", aliases: ["SPI1 TX"] },
      { position: 16, label: "GP12", role: "gpio" },
      { position: 17, label: "GP13", role: "gpio" },
      { position: 18, label: "GND", role: "ground" },
      { position: 19, label: "GP14", role: "gpio" },
      { position: 20, label: "GP15", role: "gpio" },
    ],
    right: [
      { position: 40, label: "VBUS", role: "power" },
      { position: 39, label: "VSYS", role: "power" },
      { position: 38, label: "GND", role: "ground" },
      { position: 37, label: "3V3_EN", role: "system" },
      { position: 36, label: "3V3", role: "power" },
      { position: 35, label: "ADC_VREF", role: "adc" },
      { position: 34, label: "GP28", role: "adc", aliases: ["ADC2"] },
      { position: 33, label: "AGND", role: "ground" },
      { position: 32, label: "GP27", role: "adc", aliases: ["ADC1"] },
      { position: 31, label: "GP26", role: "adc", aliases: ["ADC0"] },
      { position: 30, label: "RUN", role: "system" },
      { position: 29, label: "GP22", role: "gpio" },
      { position: 28, label: "GND", role: "ground" },
      { position: 27, label: "GP21", role: "i2c", aliases: ["I2C0 SCL"] },
      { position: 26, label: "GP20", role: "i2c", aliases: ["I2C0 SDA"] },
      { position: 25, label: "GP19", role: "spi", aliases: ["SPI0 TX"] },
      { position: 24, label: "GP18", role: "spi", aliases: ["SPI0 SCK"] },
      { position: 23, label: "GND", role: "ground" },
      { position: 22, label: "GP17", role: "spi", aliases: ["SPI0 CS"] },
      { position: 21, label: "GP16", role: "spi", aliases: ["SPI0 RX"] },
    ],
  },
};

const arduinoUnoHeaders: Pinout = {
  connector: "Arduino UNO R3/R4 shield headers",
  layout: "grouped",
  notes: [
    "UNO R4 keeps the classic UNO shield form factor and 5 V operating voltage.",
    "SPI is exposed on the ICSP header; D10 through D13 are commonly used with SPI shields.",
    "A4 and A5 are the default I2C SDA/SCL pins on the UNO-style header.",
  ],
  groups: [
    {
      label: "Digital",
      pins: [
        { position: 0, label: "D0 / RX", role: "uart" },
        { position: 1, label: "D1 / TX", role: "uart" },
        { position: 2, label: "D2", role: "gpio" },
        { position: 3, label: "D3", role: "pwm" },
        { position: 4, label: "D4", role: "gpio" },
        { position: 5, label: "D5", role: "pwm" },
        { position: 6, label: "D6", role: "pwm" },
        { position: 7, label: "D7", role: "gpio" },
        { position: 8, label: "D8", role: "gpio" },
        { position: 9, label: "D9", role: "pwm" },
        { position: 10, label: "D10 / CS", role: "spi" },
        { position: 11, label: "D11 / COPI", role: "spi" },
        { position: 12, label: "D12 / CIPO", role: "spi" },
        { position: 13, label: "D13 / SCK", role: "spi" },
      ],
    },
    {
      label: "Analog / Power",
      pins: [
        { position: 14, label: "A0", role: "adc" },
        { position: 15, label: "A1", role: "adc" },
        { position: 16, label: "A2", role: "adc" },
        { position: 17, label: "A3", role: "adc" },
        { position: 18, label: "A4 / SDA", role: "i2c" },
        { position: 19, label: "A5 / SCL", role: "i2c" },
        { position: 20, label: "3V3", role: "power" },
        { position: 21, label: "5V", role: "power" },
        { position: 22, label: "GND", role: "ground" },
        { position: 23, label: "VIN", role: "power" },
        { position: 24, label: "RESET", role: "system" },
      ],
    },
  ],
};

const esp32DevKitHeaders: Pinout = {
  connector: "ESP32-DevKitC dual breadboard headers",
  layout: "dual-row",
  notes: [
    "ESP32 DevKitC variants can differ; check the Espressif doc for the exact module and revision.",
    "GPIO6 through GPIO11 are used internally for SPI flash on common ESP32-WROOM modules.",
    "ADC2 pins conflict with Wi-Fi use in many ESP32 software stacks.",
  ],
  pins: {
    left: [
      { position: 1, label: "EN", role: "system" },
      { position: 2, label: "GPIO36", role: "adc", aliases: ["VP"] },
      { position: 3, label: "GPIO39", role: "adc", aliases: ["VN"] },
      { position: 4, label: "GPIO34", role: "adc" },
      { position: 5, label: "GPIO35", role: "adc" },
      { position: 6, label: "GPIO32", role: "adc" },
      { position: 7, label: "GPIO33", role: "adc" },
      { position: 8, label: "GPIO25", role: "dac", aliases: ["DAC1"] },
      { position: 9, label: "GPIO26", role: "dac", aliases: ["DAC2"] },
      { position: 10, label: "GPIO27", role: "gpio" },
      { position: 11, label: "GPIO14", role: "spi", aliases: ["HSPI CLK"] },
      { position: 12, label: "GPIO12", role: "spi", aliases: ["HSPI MISO"] },
      { position: 13, label: "GND", role: "ground" },
      { position: 14, label: "GPIO13", role: "spi", aliases: ["HSPI MOSI"] },
      { position: 15, label: "VIN", role: "power" },
    ],
    right: [
      { position: 16, label: "3V3", role: "power" },
      { position: 17, label: "GPIO23", role: "spi", aliases: ["VSPI MOSI"] },
      { position: 18, label: "GPIO22", role: "i2c", aliases: ["SCL"] },
      { position: 19, label: "GPIO1", role: "uart", aliases: ["TX0"] },
      { position: 20, label: "GPIO3", role: "uart", aliases: ["RX0"] },
      { position: 21, label: "GPIO21", role: "i2c", aliases: ["SDA"] },
      { position: 22, label: "GND", role: "ground" },
      { position: 23, label: "GPIO19", role: "spi", aliases: ["VSPI MISO"] },
      { position: 24, label: "GPIO18", role: "spi", aliases: ["VSPI CLK"] },
      { position: 25, label: "GPIO5", role: "spi", aliases: ["VSPI CS"] },
      { position: 26, label: "GPIO17", role: "uart", aliases: ["TX2"] },
      { position: 27, label: "GPIO16", role: "uart", aliases: ["RX2"] },
      { position: 28, label: "GPIO4", role: "gpio" },
      { position: 29, label: "GPIO0", role: "system", aliases: ["BOOT"] },
      { position: 30, label: "GPIO2", role: "gpio" },
    ],
  },
};

export const boards: Board[] = [
  {
    id: "raspberry-pi-5",
    name: "Raspberry Pi 5",
    vendor: "Raspberry Pi",
    category: "SBC",
    family: "Raspberry Pi",
    processor: "Broadcom BCM2712",
    logicLevel: "3.3 V GPIO",
    power: "5 V USB-C, 5 V header rail",
    formFactor: "Credit-card SBC",
    description:
      "The current mainstream Raspberry Pi SBC with a familiar 40-pin GPIO header, PCIe FFC, dual camera/display connectors, and strong Linux support.",
    tags: ["Raspberry Pi", "Linux", "40-pin", "HAT", "BCM2712"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CSI", "PCIe", "USB"],
    highlights: [
      "Pi-compatible 40-pin header with power, I2C, SPI, UART, PWM, and GPIO.",
      "Excellent first-class documentation and software ecosystem.",
      "Good reference board for HAT compatibility checks.",
    ],
    warnings: [
      "GPIO is 3.3 V only; level-shift 5 V peripherals.",
      "Pins 27 and 28 are normally reserved for HAT EEPROM ID.",
    ],
    sourceLinks: [
      {
        label: "Raspberry Pi GPIO documentation",
        url: "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html",
        type: "Docs",
      },
      {
        label: "Raspberry Pi 5 product brief",
        url: "https://datasheets.raspberrypi.com/rpi5/raspberry-pi-5-product-brief.pdf",
        type: "Datasheet",
      },
    ],
    pinout: raspberryPi40Pin,
  },
  {
    id: "raspberry-pi-4-model-b",
    name: "Raspberry Pi 4 Model B",
    vendor: "Raspberry Pi",
    category: "SBC",
    family: "Raspberry Pi",
    processor: "Broadcom BCM2711",
    logicLevel: "3.3 V GPIO",
    power: "5 V USB-C, 5 V header rail",
    formFactor: "Credit-card SBC",
    description:
      "A widely deployed Linux SBC with the same 40-pin expansion header used across modern Raspberry Pi boards.",
    tags: ["Raspberry Pi", "Linux", "40-pin", "HAT", "BCM2711"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CSI", "USB", "Ethernet"],
    highlights: [
      "Useful baseline board for Pi HAT and jumper-wire projects.",
      "Lots of community examples map to this exact header.",
      "Gigabit Ethernet and multiple USB ports make it practical as a lab controller.",
    ],
    warnings: [
      "Header power pins are not current-limited like GPIO pins.",
      "Check UART overlays before assuming serial availability on pins 8 and 10.",
    ],
    sourceLinks: [
      {
        label: "Raspberry Pi GPIO documentation",
        url: "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html",
        type: "Docs",
      },
      {
        label: "Raspberry Pi 4 datasheet",
        url: "https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-datasheet.pdf",
        type: "Datasheet",
      },
    ],
    pinout: raspberryPi40Pin,
  },
  {
    id: "raspberry-pi-zero-2-w",
    name: "Raspberry Pi Zero 2 W",
    vendor: "Raspberry Pi",
    category: "SBC",
    family: "Raspberry Pi Zero",
    processor: "Raspberry Pi RP3A0 SiP",
    logicLevel: "3.3 V GPIO",
    power: "5 V micro-USB, 5 V header rail",
    formFactor: "Compact SBC",
    description:
      "A tiny Linux SBC with wireless networking and the standard Raspberry Pi 40-pin GPIO layout in a smaller footprint.",
    tags: ["Raspberry Pi", "Zero", "Linux", "40-pin", "Wireless"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CSI", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Uses the same 40-pin logical header pattern as full-size Pi boards.",
      "Great for space-constrained sensors, cameras, and embedded Linux tasks.",
      "Wireless networking is built in.",
    ],
    warnings: [
      "Headers may need to be soldered depending on the purchased variant.",
      "Fewer exposed connectors than full-size Pi boards.",
    ],
    sourceLinks: [
      {
        label: "Raspberry Pi GPIO documentation",
        url: "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html",
        type: "Docs",
      },
      {
        label: "Raspberry Pi Zero 2 W product brief",
        url: "https://datasheets.raspberrypi.com/rpizero2/raspberry-pi-zero-2-w-product-brief.pdf",
        type: "Datasheet",
      },
    ],
    pinout: raspberryPi40Pin,
  },
  {
    id: "raspberry-pi-pico",
    name: "Raspberry Pi Pico",
    vendor: "Raspberry Pi",
    category: "Microcontroller",
    family: "RP2040",
    processor: "RP2040 dual-core Arm Cortex-M0+",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, VSYS, VBUS",
    formFactor: "40-pin DIP module",
    description:
      "Raspberry Pi's low-cost RP2040 microcontroller board with castellated edges, flexible peripheral muxing, SWD debug, and three exposed ADC inputs.",
    tags: ["RP2040", "Pico", "MicroPython", "C SDK", "DIP"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "SWD"],
    highlights: [
      "Breadboard-friendly 40-pin edge with clear physical pin numbering.",
      "PIO blocks make unusual digital protocols possible.",
      "Strong official SDK and MicroPython support.",
    ],
    warnings: [
      "GPIO is not 5 V tolerant.",
      "ADC input range is limited to the analog reference voltage.",
    ],
    sourceLinks: [
      {
        label: "Raspberry Pi Pico documentation",
        url: "https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html",
        type: "Docs",
      },
      {
        label: "Raspberry Pi Pico pinout PDF",
        url: "https://pip-assets.raspberrypi.com/categories/610-raspberry-pi-pico/documents/RP-008309-DS-1-Pico-R3-A4-Pinout.pdf",
        type: "Pinout",
      },
    ],
    pinout: picoPinout,
  },
  {
    id: "arduino-uno-r4-wifi",
    name: "Arduino UNO R4 WiFi",
    vendor: "Arduino",
    category: "Microcontroller",
    family: "UNO",
    processor: "Renesas RA4M1 + ESP32-S3 radio",
    logicLevel: "5 V operating voltage",
    power: "USB-C, barrel jack, VIN",
    formFactor: "UNO shield layout",
    description:
      "A modern UNO-format board with a 32-bit Renesas microcontroller, Wi-Fi/Bluetooth coprocessor, Qwiic connector, and the classic shield header layout.",
    tags: ["Arduino", "UNO", "RA4M1", "Wi-Fi", "Qwiic"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "Wi-Fi", "Bluetooth", "CAN"],
    highlights: [
      "Keeps the UNO shield ecosystem while moving to a 32-bit MCU.",
      "Built-in wireless and 12x8 LED matrix make quick prototypes easier.",
      "Good beginner-friendly board when 5 V IO is useful.",
    ],
    warnings: [
      "UNO shield compatibility does not guarantee every older shield library works unchanged.",
      "Check current limits before powering external circuits from board rails.",
    ],
    sourceLinks: [
      {
        label: "Arduino UNO R4 WiFi documentation",
        url: "https://docs.arduino.cc/hardware/uno-r4-wifi",
        type: "Docs",
      },
      {
        label: "UNO R4 WiFi cheat sheet",
        url: "https://docs.arduino.cc/tutorials/uno-r4-wifi/cheat-sheet",
        type: "Manual",
      },
    ],
    pinout: arduinoUnoHeaders,
  },
  {
    id: "arduino-nano-esp32",
    name: "Arduino Nano ESP32",
    vendor: "Arduino",
    category: "Microcontroller",
    family: "Nano",
    processor: "u-blox NORA-W106 / ESP32-S3",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, VIN, 3.3 V rail",
    formFactor: "Nano module",
    description:
      "A compact Arduino Nano-format board built around an ESP32-S3 module with Arduino, MicroPython, Wi-Fi, and Bluetooth support.",
    tags: ["Arduino", "Nano", "ESP32-S3", "MicroPython", "Wireless"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Nano footprint with modern USB-C and ESP32-S3 wireless features.",
      "Good fit for breadboard IoT prototypes and Arduino Cloud experiments.",
      "Official docs include pinout PDF, datasheet, schematics, and CAD files.",
    ],
    warnings: [
      "Use Arduino's Nano pin labels unless you specifically need raw ESP32-S3 GPIO names.",
      "3.3 V logic only.",
    ],
    sourceLinks: [
      {
        label: "Arduino Nano ESP32 documentation",
        url: "https://docs.arduino.cc/hardware/nano-esp32",
        type: "Docs",
      },
      {
        label: "Nano ESP32 datasheet",
        url: "https://docs.arduino.cc/resources/datasheets/ABX00083-datasheet.pdf",
        type: "Datasheet",
      },
    ],
  },
  {
    id: "esp32-devkitc",
    name: "ESP32-DevKitC",
    vendor: "Espressif",
    category: "Development Board",
    family: "ESP32",
    processor: "ESP32-WROOM / ESP32-WROVER variants",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, 5 V VIN, 3.3 V regulator",
    formFactor: "Breadboard dev kit",
    description:
      "Espressif's reference-style ESP32 development board with most module IO broken out to two breadboard-friendly headers.",
    tags: ["ESP32", "Espressif", "Wi-Fi", "Bluetooth", "DevKit"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB", "Wi-Fi", "Bluetooth", "JTAG"],
    highlights: [
      "Common ESP32 board shape used by countless tutorials and prototypes.",
      "Exposes flexible ESP32 peripheral muxing across two header rows.",
      "Official Espressif docs note exact header names and module variants.",
    ],
    warnings: [
      "ESP32 module variants and board revisions change pin availability.",
      "Avoid internal flash pins on common WROOM/WROVER modules.",
      "Some bootstrapping pins affect startup mode if pulled incorrectly.",
    ],
    sourceLinks: [
      {
        label: "ESP32-DevKitC documentation",
        url: "https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/index.html",
        type: "Docs",
      },
      {
        label: "Espressif ESP32-DevKitC product page",
        url: "https://www.espressif.com/en/products/devkits/esp32-devkitc",
        type: "Docs",
      },
    ],
    pinout: esp32DevKitHeaders,
  },
  {
    id: "stm32-nucleo-f401re",
    name: "STM32 Nucleo-F401RE",
    vendor: "STMicroelectronics",
    category: "Development Board",
    family: "STM32 Nucleo-64",
    processor: "STM32F401RE Arm Cortex-M4",
    logicLevel: "3.3 V MCU IO",
    power: "USB, E5V, VIN, 3.3 V rail",
    formFactor: "Nucleo-64 with Arduino + Morpho headers",
    description:
      "A popular STM32 Nucleo-64 board that exposes both Arduino-compatible headers and ST Morpho headers for direct MCU access.",
    tags: ["STM32", "Nucleo", "Cortex-M4", "Arduino headers", "Morpho"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "SWD"],
    highlights: [
      "Arduino header support plus high-density Morpho breakout.",
      "Integrated ST-LINK debugger simplifies firmware bring-up.",
      "Great STM32 baseline for comparing alternate pin functions.",
    ],
    warnings: [
      "Pin functions depend on solder bridges, alternate functions, and board configuration.",
      "Do not assume Arduino-shield voltage behavior without checking the user manual.",
    ],
    sourceLinks: [
      {
        label: "ST Nucleo-64 user manual UM1724",
        url: "https://www.st.com/resource/en/user_manual/um1724-stm32-nucleo64-boards-mb1136-stmicroelectronics.pdf",
        type: "Manual",
      },
      {
        label: "NUCLEO-F401RE product page",
        url: "https://www.st.com/en/evaluation-tools/nucleo-f401re.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "beaglebone-black",
    name: "BeagleBone Black",
    vendor: "BeagleBoard",
    category: "SBC",
    family: "BeagleBone",
    processor: "TI Sitara AM335x",
    logicLevel: "3.3 V expansion IO",
    power: "5 V barrel jack, USB, header rails",
    formFactor: "Credit-card SBC with dual cape headers",
    description:
      "A Linux SBC designed for hardware control, with two 46-pin cape headers and a rich set of default and muxed peripheral functions.",
    tags: ["BeagleBone", "Linux", "Cape", "AM335x", "PRU"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Ethernet"],
    highlights: [
      "Dual P8/P9 expansion headers expose many processor signals.",
      "PRU real-time cores make it useful for deterministic IO projects.",
      "Long-lived board with detailed official connector tables.",
    ],
    warnings: [
      "Expansion pins are 3.3 V unless documented otherwise.",
      "The official docs warn that 5 V logic on expansion IO can damage the board.",
      "Pin muxing can change default functions after boot.",
    ],
    sourceLinks: [
      {
        label: "BeagleBone Black connector documentation",
        url: "https://docs.beagleboard.org/boards/beaglebone/black/ch07.html",
        type: "Docs",
      },
      {
        label: "BeagleBone Black documentation home",
        url: "https://docs.beagleboard.org/boards/beaglebone/black/index.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "jetson-orin-nano-dev-kit",
    name: "Jetson Orin Nano Developer Kit",
    vendor: "NVIDIA",
    category: "AI Dev Kit",
    family: "Jetson Orin",
    processor: "Jetson Orin Nano module",
    logicLevel: "3.3 V expansion IO",
    power: "DC barrel input, 5 V header rail",
    formFactor: "AI SBC carrier board",
    description:
      "NVIDIA's entry Jetson Orin developer kit for edge AI projects, with a 40-pin expansion header plus camera, display, and high-speed interfaces.",
    tags: ["Jetson", "NVIDIA", "AI", "Linux", "40-pin"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CSI", "PCIe", "USB"],
    highlights: [
      "40-pin expansion header feels familiar to Raspberry Pi users.",
      "Camera and AI acceleration make it useful for robotics and vision projects.",
      "Carrier-board docs list custom connector pinouts.",
    ],
    warnings: [
      "Jetson header functions and Linux device names differ from Raspberry Pi even when the connector looks similar.",
      "Confirm JetPack and pinmux configuration before relying on alternate functions.",
    ],
    sourceLinks: [
      {
        label: "Jetson Orin Nano carrier board specification",
        url: "https://developer.nvidia.com/downloads/assets/embedded/secure/jetson/orin_nano/docs/jetson_orin_nano_devkit_carrier_board_specification_sp.pdf",
        type: "Manual",
      },
      {
        label: "Jetson Orin Nano GPIO reference by JetsonHacks",
        url: "https://jetsonhacks.com/nvidia-jetson-orin-nano-gpio-header-pinout/",
        type: "Pinout",
      },
    ],
  },
  {
    id: "teensy-41",
    name: "Teensy 4.1",
    vendor: "PJRC",
    category: "Microcontroller",
    family: "Teensy",
    processor: "NXP i.MX RT1062 Arm Cortex-M7",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, VIN",
    formFactor: "Breadboard-friendly Teensy module",
    description:
      "A very fast Arduino-compatible microcontroller board with many IO pins, Ethernet PHY support, USB host pads, and optional memory pads.",
    tags: ["Teensy", "Cortex-M7", "Arduino", "High speed", "Audio"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Ethernet"],
    highlights: [
      "600 MHz class MCU with 55 total IO signal pins.",
      "Strong audio, USB, and real-time embedded ecosystem.",
      "PJRC publishes pinout cards and schematic files.",
    ],
    warnings: [
      "3.3 V IO only; not 5 V tolerant.",
      "Some underside pads are not breadboard-accessible.",
    ],
    sourceLinks: [
      {
        label: "PJRC Teensy 4.1 product and pinout page",
        url: "https://www.pjrc.com/store/teensy41.html",
        type: "Docs",
      },
      {
        label: "PJRC Teensy schematics",
        url: "https://www.pjrc.com/teensy/schematic.html",
        type: "Schematic",
      },
    ],
  },
  {
    id: "radxa-zero-3w",
    name: "Radxa ZERO 3W",
    vendor: "Radxa",
    category: "SBC",
    family: "Radxa ZERO",
    processor: "Rockchip RK3566",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, 5 V header rail",
    formFactor: "Tiny SBC with 40-pin header",
    description:
      "A compact Linux SBC with wireless networking and a 40-pin GPIO header intended to work with many SBC accessories.",
    tags: ["Radxa", "Linux", "RK3566", "40-pin", "Wireless"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Small-board alternative when Pi-style accessory compatibility matters.",
      "Radxa docs include a full 40-pin function table.",
      "Useful for Linux projects that need more CPU than a microcontroller.",
    ],
    warnings: [
      "Pi accessory compatibility depends on the signal and software stack.",
      "Radxa notes extra pull-ups on pins 3, 5, 27, and 28.",
    ],
    sourceLinks: [
      {
        label: "Radxa ZERO 3 hardware interface",
        url: "https://docs.radxa.com/en/zero/zero3/hardware-design/hardware-interface",
        type: "Docs",
      },
      {
        label: "Radxa ZERO 3W product page",
        url: "https://www.radxa.com/products/zeros/zero3w/",
        type: "Docs",
      },
    ],
  },
  {
    id: "orange-pi-5",
    name: "Orange Pi 5",
    vendor: "Orange Pi",
    category: "SBC",
    family: "Orange Pi",
    processor: "Rockchip RK3588S",
    logicLevel: "3.3 V GPIO",
    power: "USB-C / DC power depending on setup",
    formFactor: "RK3588S SBC",
    description:
      "A high-performance RK3588S Linux SBC with a 26-pin expansion header and high-speed storage/display options.",
    tags: ["Orange Pi", "Linux", "RK3588S", "26-pin", "AI"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "USB", "PCIe", "Ethernet"],
    highlights: [
      "Powerful ARM SBC for media, edge compute, and Linux lab use.",
      "Official resources include user manual and schematics.",
      "Good catalog entry to distinguish 26-pin headers from Pi-style 40-pin headers.",
    ],
    warnings: [
      "Header is 26-pin, not the full Raspberry Pi 40-pin layout.",
      "Documentation quality and OS images vary by board revision and distribution.",
    ],
    sourceLinks: [
      {
        label: "Orange Pi 5 product page",
        url: "https://www.orangepi.org/html/hardWare/computerAndMicrocontrollers/details/Orange-Pi-5.html",
        type: "Docs",
      },
      {
        label: "Orange Pi 5 user manual",
        url: "https://orangepi.net/wp-content/uploads/2024/09/OrangePi_5_RK3588S_User-Manual_v2.1.1.pdf",
        type: "Manual",
      },
    ],
  },
  {
    id: "adafruit-feather-rp2040",
    name: "Adafruit Feather RP2040",
    vendor: "Adafruit",
    category: "Microcontroller",
    family: "Feather",
    processor: "RP2040 dual-core Arm Cortex-M0+",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, LiPo connector, 3.3 V rail",
    formFactor: "Feather module",
    description:
      "Adafruit's Feather-format RP2040 board with battery charging, STEMMA QT, and clear CircuitPython-focused pin labels.",
    tags: ["Adafruit", "Feather", "RP2040", "CircuitPython", "STEMMA QT"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB"],
    highlights: [
      "Feather ecosystem compatibility with battery-friendly power design.",
      "Adafruit pinout docs explain CircuitPython labels versus raw GP numbers.",
      "STEMMA QT makes I2C prototyping quick.",
    ],
    warnings: [
      "RP2040 peripheral muxing is flexible, but simultaneous peripheral use still has limits.",
      "Use the pin labels appropriate for your runtime: CircuitPython names or RP2040 GP names.",
    ],
    sourceLinks: [
      {
        label: "Adafruit Feather RP2040 pinouts",
        url: "https://learn.adafruit.com/adafruit-feather-rp2040-pico/pinouts",
        type: "Pinout",
      },
      {
        label: "CircuitPython board page",
        url: "https://circuitpython.org/board/adafruit_feather_rp2040/",
        type: "Docs",
      },
    ],
  },
];

export const categories = ["All", ...new Set(boards.map((board) => board.category))];

export const interfaceFilters = [
  "All",
  "GPIO",
  "I2C",
  "SPI",
  "UART",
  "ADC",
  "DAC",
  "PWM",
  "CAN",
  "Wi-Fi",
  "Bluetooth",
  "CSI",
  "PCIe",
] as const;
