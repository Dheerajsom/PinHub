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
  | "Zigbee"
  | "Thread"
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

const baseBoards: Board[] = [
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

const additionalBoards: Board[] = [
  {
    id: "raspberry-pi-pico-w",
    name: "Raspberry Pi Pico W",
    vendor: "Raspberry Pi",
    category: "Microcontroller",
    family: "RP2040",
    processor: "RP2040 dual-core Arm Cortex-M0+ + wireless radio",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, VSYS, VBUS",
    formFactor: "40-pin DIP module",
    description:
      "The wireless version of the Pico keeps the familiar castellated pin layout while adding Wi-Fi for classroom IoT and small connected prototypes.",
    tags: ["RP2040", "Pico W", "MicroPython", "Wi-Fi", "DIP"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "SWD", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Same breadboard-friendly edge layout as Pico with an official pinout PDF.",
      "Useful bridge between microcontroller labs and networked sensors.",
      "Strong official C SDK and MicroPython documentation.",
    ],
    warnings: [
      "Wireless control signals use some RP2040 GPIO internally.",
      "GPIO is 3.3 V logic and is not 5 V tolerant.",
    ],
    sourceLinks: [
      {
        label: "Raspberry Pi Pico W pinout PDF",
        url: "https://pip-assets.raspberrypi.com/categories/686-raspberry-pi-pico-w/documents/RP-008315-DS-1-PicoW-A4-Pinout.pdf",
        type: "Pinout",
      },
      {
        label: "Raspberry Pi Pico documentation",
        url: "https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "raspberry-pi-pico-2",
    name: "Raspberry Pi Pico 2",
    vendor: "Raspberry Pi",
    category: "Microcontroller",
    family: "RP2350",
    processor: "RP2350 dual-core Arm Cortex-M33 / RISC-V Hazard3",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, VSYS, VBUS",
    formFactor: "40-pin DIP module",
    description:
      "Raspberry Pi's RP2350 board keeps the Pico form factor while adding a newer MCU architecture for embedded systems teaching and firmware experiments.",
    tags: ["RP2350", "Pico 2", "MicroPython", "C SDK", "DIP"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "SWD"],
    highlights: [
      "Official Pico docs cover the Pico 2 pinout and layout.",
      "Good modern replacement for RP2040 labs that want Arm and RISC-V options.",
      "Keeps the accessible 40-pin DIP-style ecosystem.",
    ],
    warnings: [
      "Check RP2350-specific electrical limits before porting old Pico fixtures.",
      "GPIO remains 3.3 V only.",
    ],
    sourceLinks: [
      {
        label: "Raspberry Pi Pico 2 documentation",
        url: "https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html",
        type: "Docs",
      },
      {
        label: "RP2350 datasheet pinout",
        url: "https://pip.raspberrypi.com/documents/RP-008373-DS-rp2350-datasheet.pdf",
        type: "Datasheet",
      },
    ],
  },
  {
    id: "arduino-mega-2560-rev3",
    name: "Arduino Mega 2560 Rev3",
    vendor: "Arduino",
    category: "Microcontroller",
    family: "Mega",
    processor: "ATmega2560",
    logicLevel: "5 V GPIO",
    power: "USB-B, barrel jack, VIN",
    formFactor: "Mega shield layout",
    description:
      "A classic high-pin-count Arduino board for teaching, robotics, lab instruments, and shield projects that need many GPIOs or serial ports.",
    tags: ["Arduino", "Mega", "AVR", "Robotics", "Shield"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB"],
    highlights: [
      "54 digital IO pins, 16 analog inputs, and four hardware UARTs.",
      "Official full pinout PDF is easy to cite in classrooms.",
      "Excellent compatibility with legacy Arduino examples.",
    ],
    warnings: [
      "5 V IO can damage 3.3 V-only sensors without level shifting.",
      "Large shield compatibility varies around SPI and power assumptions.",
    ],
    sourceLinks: [
      {
        label: "Arduino Mega 2560 Rev3 documentation",
        url: "https://docs.arduino.cc/hardware/mega-2560/",
        type: "Docs",
      },
      {
        label: "Arduino Mega 2560 full pinout PDF",
        url: "https://docs.arduino.cc/resources/pinouts/A000067-full-pinout.pdf",
        type: "Pinout",
      },
    ],
  },
  {
    id: "arduino-nano",
    name: "Arduino Nano",
    vendor: "Arduino",
    category: "Microcontroller",
    family: "Nano",
    processor: "ATmega328P",
    logicLevel: "5 V GPIO",
    power: "Mini-B USB, VIN, 5 V rail",
    formFactor: "Breadboard Nano module",
    description:
      "The classic breadboard-friendly Arduino used in labs and small prototypes where UNO compatibility is needed in a compact package.",
    tags: ["Arduino", "Nano", "AVR", "Breadboard", "Classic"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB"],
    highlights: [
      "Small footprint with the familiar Arduino programming model.",
      "Official documentation provides an interactive viewer and pinout.",
      "Still common in teaching kits and legacy fixtures.",
    ],
    warnings: [
      "Mini-B USB and older bootloader behavior depend on board revision.",
      "Use level shifting for 3.3 V peripherals.",
    ],
    sourceLinks: [
      {
        label: "Arduino Nano documentation and pinout",
        url: "https://docs.arduino.cc/hardware/nano",
        type: "Docs",
      },
    ],
  },
  {
    id: "arduino-nano-33-ble-sense",
    name: "Arduino Nano 33 BLE Sense",
    vendor: "Arduino",
    category: "Microcontroller",
    family: "Nano",
    processor: "Nordic nRF52840",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, VIN, 3.3 V rail",
    formFactor: "Nano module with sensors",
    description:
      "A compact BLE and TinyML-friendly Arduino with onboard sensors that made it a common choice in teaching demos and embedded ML labs.",
    tags: ["Arduino", "Nano", "nRF52840", "BLE", "TinyML"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Bluetooth"],
    highlights: [
      "Onboard sensors reduce wiring for machine-learning demos.",
      "Official docs include an interactive pinout and cheat sheet.",
      "Good reference for 3.3 V Nano-family projects.",
    ],
    warnings: [
      "End-of-life status matters for new procurement.",
      "Not 5 V tolerant despite the Arduino name.",
    ],
    sourceLinks: [
      {
        label: "Arduino Nano 33 BLE Sense documentation",
        url: "https://docs.arduino.cc/hardware/nano-33-ble-sense",
        type: "Docs",
      },
      {
        label: "Nano 33 BLE Sense cheat sheet",
        url: "https://docs.arduino.cc/tutorials/nano-33-ble-sense/cheat-sheet",
        type: "Manual",
      },
    ],
  },
  {
    id: "arduino-mkr-wifi-1010",
    name: "Arduino MKR WiFi 1010",
    vendor: "Arduino",
    category: "Microcontroller",
    family: "MKR",
    processor: "SAMD21 + u-blox NINA-W102",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, VIN, LiPo connector",
    formFactor: "MKR module",
    description:
      "A SAMD21-based IoT board with Wi-Fi, Bluetooth, crypto hardware, and the MKR shield ecosystem.",
    tags: ["Arduino", "MKR", "SAMD21", "IoT", "Wi-Fi"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Useful for secure IoT exercises and cloud-connected projects.",
      "Official downloadable pinout and datasheet are available from Arduino.",
      "MKR form factor supports a focused shield ecosystem.",
    ],
    warnings: [
      "3.3 V logic only.",
      "Some MCU pins are reserved for the NINA module and crypto peripherals.",
    ],
    sourceLinks: [
      {
        label: "Arduino MKR WiFi 1010 documentation",
        url: "https://docs.arduino.cc/hardware/mkr-wifi-1010",
        type: "Docs",
      },
      {
        label: "MKR WiFi 1010 datasheet",
        url: "https://docs.arduino.cc/resources/datasheets/ABX00023-datasheet.pdf",
        type: "Datasheet",
      },
    ],
  },
  {
    id: "arduino-portenta-h7",
    name: "Arduino Portenta H7",
    vendor: "Arduino",
    category: "Development Board",
    family: "Portenta",
    processor: "STM32H747XI dual-core Cortex-M7/M4",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, VIN, carrier headers",
    formFactor: "MKR-like module with high-density connectors",
    description:
      "A professional Arduino module used for edge AI, industrial prototypes, and high-performance embedded development.",
    tags: ["Arduino", "Portenta", "STM32H7", "AI", "Industrial"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "CAN", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Dual-core STM32H7 with high-density expansion connectors.",
      "Official Portenta docs include pinout and connector resources.",
      "Good fit for advanced labs that outgrow UNO-class boards.",
    ],
    warnings: [
      "High-density connector routing requires careful carrier-board review.",
      "3.3 V IO assumptions differ from classic 5 V Arduino boards.",
    ],
    sourceLinks: [
      {
        label: "Arduino Portenta H7 documentation",
        url: "https://docs.arduino.cc/hardware/portenta-h7",
        type: "Docs",
      },
      {
        label: "Portenta H7 collective datasheet",
        url: "https://docs.arduino.cc/resources/datasheets/ABX00042-ABX00045-ABX00046-datasheet.pdf",
        type: "Datasheet",
      },
    ],
  },
  {
    id: "esp32-s3-devkitc-1",
    name: "ESP32-S3-DevKitC-1",
    vendor: "Espressif",
    category: "Development Board",
    family: "ESP32-S3",
    processor: "ESP32-S3-WROOM / WROVER variants",
    logicLevel: "3.3 V GPIO",
    power: "USB, 5 V input, 3.3 V regulator",
    formFactor: "Breadboard dev kit",
    description:
      "Espressif's mainstream ESP32-S3 reference board for USB, AI acceleration experiments, BLE, Wi-Fi, and embedded product prototypes.",
    tags: ["ESP32-S3", "Espressif", "Wi-Fi", "BLE", "USB"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth", "JTAG"],
    highlights: [
      "Official header tables list J1/J3 pin names and functions.",
      "Popular target for ESP-IDF, Arduino ESP32, and CircuitPython work.",
      "Native USB improves firmware and HID experiments.",
    ],
    warnings: [
      "Module variant affects flash, PSRAM, and available pins.",
      "Bootstrapping pins need sane pull states at reset.",
    ],
    sourceLinks: [
      {
        label: "ESP32-S3-DevKitC-1 user guide",
        url: "https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.0.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "esp32-c3-devkitm-1",
    name: "ESP32-C3-DevKitM-1",
    vendor: "Espressif",
    category: "Development Board",
    family: "ESP32-C3",
    processor: "ESP32-C3-MINI-1 RISC-V",
    logicLevel: "3.3 V GPIO",
    power: "USB, 5 V input, 3.3 V regulator",
    formFactor: "Compact breadboard dev kit",
    description:
      "An entry-level Espressif RISC-V dev board with Wi-Fi and BLE for low-cost connected devices and firmware courses.",
    tags: ["ESP32-C3", "Espressif", "RISC-V", "Wi-Fi", "BLE"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth", "Zigbee", "Thread", "JTAG"],
    highlights: [
      "Official documentation includes pin-header tables.",
      "Good inexpensive board for RISC-V microcontroller labs.",
      "Small module keeps layouts close to real products.",
    ],
    warnings: [
      "Fewer pins than classic ESP32 development kits.",
      "Check USB/JTAG and boot behavior before assigning pins.",
    ],
    sourceLinks: [
      {
        label: "ESP32-C3-DevKitM-1 user guide",
        url: "https://docs.espressif.com/projects/esp-idf/en/v5.2/esp32c3/hw-reference/esp32c3/user-guide-devkitm-1.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "esp32-c6-devkitc-1",
    name: "ESP32-C6-DevKitC-1",
    vendor: "Espressif",
    category: "Development Board",
    family: "ESP32-C6",
    processor: "ESP32-C6 RISC-V",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, 5 V input, 3.3 V regulator",
    formFactor: "Breadboard dev kit",
    description:
      "A modern Espressif board for Wi-Fi 6, BLE, Zigbee, and Thread experiments in connected-device coursework and product prototyping.",
    tags: ["ESP32-C6", "Espressif", "Wi-Fi 6", "Zigbee", "Thread"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth", "JTAG"],
    highlights: [
      "Official header-block tables document both board sides.",
      "Good reference board for newer low-power wireless protocols.",
      "RISC-V core and USB-C make it current for new designs.",
    ],
    warnings: [
      "Wireless protocol support depends on SDK and certification choices.",
      "Pin availability can differ by hardware revision.",
    ],
    sourceLinks: [
      {
        label: "ESP32-C6-DevKitC-1 user guide",
        url: "https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32c6/esp32-c6-devkitc-1/user_guide.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "esp32-s2-saola-1",
    name: "ESP32-S2-Saola-1",
    vendor: "Espressif",
    category: "Development Board",
    family: "ESP32-S2",
    processor: "ESP32-S2",
    logicLevel: "3.3 V GPIO",
    power: "USB, 5 V input, 3.3 V regulator",
    formFactor: "Small breadboard dev kit",
    description:
      "Espressif's ESP32-S2 development board used for native USB, Wi-Fi, and single-core ESP-IDF projects.",
    tags: ["ESP32-S2", "Espressif", "Wi-Fi", "USB", "Saola"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "JTAG"],
    highlights: [
      "Official docs describe the board and exposed pin headers.",
      "Native USB makes it useful for device-mode experiments.",
      "A practical comparison point against ESP32-S3 and ESP32-C-series boards.",
    ],
    warnings: [
      "ESP32-S2 does not include Bluetooth.",
      "Not every chip pin is exposed to headers.",
    ],
    sourceLinks: [
      {
        label: "ESP32-S2-Saola-1 user guide",
        url: "https://docs.espressif.com/projects/esp-idf/en/v5.1/esp32s2/hw-reference/esp32s2/user-guide-saola-1-v1.2.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "bbc-microbit-v2",
    name: "BBC micro:bit V2",
    vendor: "Micro:bit Educational Foundation",
    category: "Microcontroller",
    family: "micro:bit",
    processor: "Nordic nRF52833",
    logicLevel: "3.3 V edge connector",
    power: "Micro-USB, battery pack, 3 V edge",
    formFactor: "25-pin classroom edge connector",
    description:
      "A classroom-first board with sensors, buttons, display, radio, and an edge connector that makes hardware concepts approachable.",
    tags: ["micro:bit", "Education", "nRF52", "BLE", "Classroom"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "Bluetooth"],
    highlights: [
      "Official developer docs document the V2 edge connector pinout.",
      "Widely used by students and teachers before moving to breadboard systems.",
      "Large pads support clips as well as edge connector accessories.",
    ],
    warnings: [
      "Some pins are shared with onboard display, buttons, speaker, or NFC features.",
      "Edge connector accessories can obscure which signals are actually available.",
    ],
    sourceLinks: [
      {
        label: "micro:bit edge connector pinout",
        url: "https://tech.microbit.org/hardware/edgeconnector/",
        type: "Pinout",
      },
    ],
  },
  {
    id: "seeed-xiao-rp2040",
    name: "Seeed Studio XIAO RP2040",
    vendor: "Seeed Studio",
    category: "Microcontroller",
    family: "XIAO",
    processor: "RP2040 dual-core Arm Cortex-M0+",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, 5 V, 3.3 V rail",
    formFactor: "Tiny XIAO module",
    description:
      "A thumb-sized RP2040 board with the XIAO 14-pin footprint for wearable, small robot, and compact sensor builds.",
    tags: ["Seeed", "XIAO", "RP2040", "Tiny", "USB-C"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "SWD"],
    highlights: [
      "Official wiki documents GPIO, analog, PWM, I2C, UART, SPI, and SWD pins.",
      "XIAO footprint works with expansion bases and tiny enclosures.",
      "A useful contrast to full-size Pico boards.",
    ],
    warnings: [
      "Very small pads demand more careful soldering and strain relief.",
      "Arduino-style labels and raw GPIO numbers can differ.",
    ],
    sourceLinks: [
      {
        label: "Seeed XIAO RP2040 getting started and pinout",
        url: "https://wiki.seeedstudio.com/XIAO-RP2040/",
        type: "Docs",
      },
    ],
  },
  {
    id: "seeed-xiao-esp32s3",
    name: "Seeed Studio XIAO ESP32S3",
    vendor: "Seeed Studio",
    category: "Microcontroller",
    family: "XIAO",
    processor: "ESP32-S3",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, 5 V, 3.3 V rail",
    formFactor: "Tiny XIAO module",
    description:
      "A tiny ESP32-S3 board for wireless embedded projects where space matters but Wi-Fi, BLE, and native USB are still needed.",
    tags: ["Seeed", "XIAO", "ESP32-S3", "Wi-Fi", "BLE"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Official Seeed docs show the XIAO ESP32S3 pinout and setup flow.",
      "Good for compact IoT, cameras, and wearable prototypes.",
      "Works with the broader XIAO expansion ecosystem.",
    ],
    warnings: [
      "Ships without pin headers by default.",
      "Small module power and antenna placement matter in enclosures.",
    ],
    sourceLinks: [
      {
        label: "Seeed XIAO ESP32S3 getting started and pinout",
        url: "https://wiki.seeedstudio.com/xiao_esp32s3_getting_started/",
        type: "Docs",
      },
      {
        label: "Seeed XIAO ESP32S3 pin multiplexing",
        url: "https://wiki.seeedstudio.com/xiao_esp32s3_pin_multiplexing/",
        type: "Manual",
      },
    ],
  },
  {
    id: "adafruit-qt-py-esp32-s3",
    name: "Adafruit QT Py ESP32-S3",
    vendor: "Adafruit",
    category: "Microcontroller",
    family: "QT Py",
    processor: "ESP32-S3",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, 5 V, 3.3 V rail",
    formFactor: "QT Py tiny module",
    description:
      "A tiny ESP32-S3 board with STEMMA QT that is popular for CircuitPython, Arduino, and compact Wi-Fi prototypes.",
    tags: ["Adafruit", "QT Py", "ESP32-S3", "CircuitPython", "STEMMA QT"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Adafruit Learn has a dedicated pinouts page.",
      "STEMMA QT reduces wiring for I2C sensors.",
      "Tiny board fits quick demos and product-like prototypes.",
    ],
    warnings: [
      "Choose the PSRAM/no-PSRAM variant deliberately.",
      "Small pads and USB current budget can limit add-ons.",
    ],
    sourceLinks: [
      {
        label: "Adafruit QT Py ESP32-S3 pinouts",
        url: "https://learn.adafruit.com/adafruit-qt-py-esp32-s3/pinouts",
        type: "Pinout",
      },
    ],
  },
  {
    id: "adafruit-qt-py-esp32-c3",
    name: "Adafruit QT Py ESP32-C3",
    vendor: "Adafruit",
    category: "Microcontroller",
    family: "QT Py",
    processor: "ESP32-C3 RISC-V",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, 5 V, 3.3 V rail",
    formFactor: "QT Py tiny module",
    description:
      "A small Wi-Fi and BLE RISC-V board in Adafruit's QT Py footprint for compact connected projects.",
    tags: ["Adafruit", "QT Py", "ESP32-C3", "RISC-V", "STEMMA QT"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Official pinout page lists the logic pins and analog capabilities.",
      "Good low-cost Wi-Fi board for CircuitPython and Arduino examples.",
      "STEMMA QT makes sensor demos fast.",
    ],
    warnings: [
      "UART pins are also hardware debug pins.",
      "Fewer analog and GPIO options than larger ESP32 boards.",
    ],
    sourceLinks: [
      {
        label: "Adafruit QT Py ESP32-C3 pinouts",
        url: "https://learn.adafruit.com/adafruit-qt-py-esp32-c3-wifi-dev-board/pinouts",
        type: "Pinout",
      },
    ],
  },
  {
    id: "adafruit-metro-esp32-s3",
    name: "Adafruit Metro ESP32-S3",
    vendor: "Adafruit",
    category: "Microcontroller",
    family: "Metro",
    processor: "ESP32-S3",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, barrel jack, LiPo connector",
    formFactor: "Arduino shield-compatible Metro",
    description:
      "An ESP32-S3 board in an Arduino-like Metro footprint with STEMMA QT and enough memory for rich CircuitPython projects.",
    tags: ["Adafruit", "Metro", "ESP32-S3", "Wi-Fi", "Shield"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Adafruit's pinout docs call out shield-facing logic pins.",
      "Bridges Arduino shield layout with modern ESP32-S3 features.",
      "Useful for classrooms that want Wi-Fi without leaving shield hardware behind.",
    ],
    warnings: [
      "ESP32-S3 IO is 3.3 V even though the board shape resembles classic Arduino.",
      "Analog pins map to ESP32 ADC resources with their usual limitations.",
    ],
    sourceLinks: [
      {
        label: "Adafruit Metro ESP32-S3 pinouts",
        url: "https://learn.adafruit.com/adafruit-metro-esp32-s3/pinouts",
        type: "Pinout",
      },
    ],
  },
  {
    id: "sparkfun-thing-plus-rp2040",
    name: "SparkFun Thing Plus RP2040",
    vendor: "SparkFun",
    category: "Microcontroller",
    family: "Thing Plus",
    processor: "RP2040 dual-core Arm Cortex-M0+",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, LiPo connector, 3.3 V rail",
    formFactor: "Feather-compatible Thing Plus",
    description:
      "SparkFun's RP2040 Thing Plus combines the Feather-compatible footprint, Qwiic, battery support, microSD, and plenty of flash.",
    tags: ["SparkFun", "Thing Plus", "RP2040", "Qwiic", "Feather"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "JTAG"],
    highlights: [
      "SparkFun hookup guide and product page document board wiring resources.",
      "Qwiic plus battery support makes it good for sensor prototypes.",
      "Feather-compatible footprint broadens add-on options.",
    ],
    warnings: [
      "Not all RP2040 GPIOs are exposed in the Thing Plus footprint.",
      "Check microSD/shared pin usage before assigning SPI.",
    ],
    sourceLinks: [
      {
        label: "SparkFun RP2040 Thing Plus hookup guide",
        url: "https://learn.sparkfun.com/tutorials/rp2040-thing-plus-hookup-guide/all",
        type: "Manual",
      },
      {
        label: "SparkFun Thing Plus RP2040 product page",
        url: "https://www.sparkfun.com/sparkfun-thing-plus-rp2040.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "sparkfun-thing-plus-esp32-wroom-usbc",
    name: "SparkFun Thing Plus ESP32 WROOM USB-C",
    vendor: "SparkFun",
    category: "Microcontroller",
    family: "Thing Plus",
    processor: "ESP32-WROOM",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, LiPo connector, 3.3 V rail",
    formFactor: "Feather-compatible Thing Plus",
    description:
      "A Feather-compatible ESP32 board with Qwiic, microSD, USB-C, Wi-Fi, Bluetooth, and battery support.",
    tags: ["SparkFun", "Thing Plus", "ESP32", "Qwiic", "Feather"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "SparkFun's guide covers the USB-C variant and hardware overview.",
      "Practical for IoT prototypes that need battery and microSD.",
      "Feather compatibility makes it easy to compare with Adafruit boards.",
    ],
    warnings: [
      "ESP32 ADC2 limitations still apply when Wi-Fi is active.",
      "Check microSD and Qwiic shared buses before assigning pins.",
    ],
    sourceLinks: [
      {
        label: "SparkFun ESP32 Thing Plus USB-C hookup guide",
        url: "https://learn.sparkfun.com/tutorials/esp32-thing-plus-usb-c-hookup-guide/all",
        type: "Manual",
      },
      {
        label: "SparkFun Thing Plus ESP32 WROOM USB-C product page",
        url: "https://www.sparkfun.com/sparkfun-thing-plus-esp32-wroom-usb-c.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "sparkfun-redboard-artemis-atp",
    name: "SparkFun RedBoard Artemis ATP",
    vendor: "SparkFun",
    category: "Development Board",
    family: "Artemis",
    processor: "Ambiq Apollo3 Blue",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, VIN, Qwiic",
    formFactor: "Mega-compatible ATP board",
    description:
      "An ultra-low-power Artemis board that breaks out nearly every module signal in a Mega-compatible footprint for advanced prototyping.",
    tags: ["SparkFun", "Artemis", "Apollo3", "BLE", "Low power"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Bluetooth"],
    highlights: [
      "ATP means All The Pins: useful for exploring the Artemis module deeply.",
      "SparkFun hookup guide documents the pinout and advanced features.",
      "Good for low-power TinyML and sensor courses.",
    ],
    warnings: [
      "The Artemis module has no classic Arduino AREF equivalent.",
      "3.3 V IO only despite the Mega-like layout.",
    ],
    sourceLinks: [
      {
        label: "SparkFun RedBoard Artemis ATP hookup guide",
        url: "https://learn.sparkfun.com/tutorials/hookup-guide-for-the-sparkfun-redboard-artemis-atp/all",
        type: "Manual",
      },
      {
        label: "SparkFun RedBoard Artemis ATP product page",
        url: "https://www.sparkfun.com/sparkfun-redboard-artemis-atp.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "sparkfun-micromod-artemis-processor",
    name: "SparkFun MicroMod Artemis Processor",
    vendor: "SparkFun",
    category: "Development Board",
    family: "MicroMod",
    processor: "Ambiq Apollo3 Blue",
    logicLevel: "3.3 V GPIO",
    power: "Carrier-board supplied",
    formFactor: "MicroMod M.2 processor board",
    description:
      "A MicroMod processor board for modular SparkFun carriers, useful when students need to separate processor pinouts from carrier pinouts.",
    tags: ["SparkFun", "MicroMod", "Artemis", "M.2", "BLE"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Bluetooth"],
    highlights: [
      "Official hookup guide includes a MicroMod connector pinout table.",
      "Shows how a processor-board pinout maps through carrier boards.",
      "Low-power Artemis module suits embedded ML sensor work.",
    ],
    warnings: [
      "Always check the selected carrier board in addition to the processor board.",
      "All pins are 3.3 V and the ADC range is lower than many expect.",
    ],
    sourceLinks: [
      {
        label: "SparkFun MicroMod Artemis Processor hookup guide",
        url: "https://learn.sparkfun.com/tutorials/micromod-artemis-processor-board-hookup-guide/all",
        type: "Manual",
      },
    ],
  },
  {
    id: "raspberry-pi-3-model-b-plus",
    name: "Raspberry Pi 3 Model B+",
    vendor: "Raspberry Pi",
    category: "SBC",
    family: "Raspberry Pi 3",
    processor: "Broadcom BCM2837B0 quad-core Arm Cortex-A53",
    logicLevel: "3.3 V GPIO",
    power: "5 V / 2.5 A micro-USB or GPIO header",
    formFactor: "Standard Raspberry Pi credit-card layout",
    description:
      "The final mainstream Pi 3 revision with gigabit-over-USB Ethernet and dual-band Wi-Fi, still common in deployed kiosks, labs, and legacy HAT projects.",
    tags: ["Raspberry Pi 3", "BCM2837", "40-pin", "Legacy", "PoE header"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "USB", "Wi-Fi", "Bluetooth", "Ethernet", "CSI"],
    highlights: [
      "Same 40-pin J8 header as later Pis, so most HATs carry over.",
      "Adds a 4-pin PoE header for the official PoE HAT.",
      "Long-lifetime product with an official product brief.",
    ],
    warnings: [
      "GPIO is 3.3 V only and not 5 V tolerant.",
      "Ethernet is bridged over USB 2.0, so throughput tops out near 300 Mbps.",
      "Needs a solid 2.5 A supply; undervoltage throttles the CPU.",
    ],
    sourceLinks: [
      {
        label: "Raspberry Pi 3 Model B+ product brief",
        url: "https://datasheets.raspberrypi.com/rpi3/raspberry-pi-3-b-plus-product-brief.pdf",
        type: "Datasheet",
      },
      {
        label: "Raspberry Pi computers documentation",
        url: "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "raspberry-pi-compute-module-4",
    name: "Raspberry Pi Compute Module 4",
    vendor: "Raspberry Pi",
    category: "SBC",
    family: "Compute Module",
    processor: "Broadcom BCM2711 quad-core Arm Cortex-A72",
    logicLevel: "3.3 V GPIO (1.8 V optional banks)",
    power: "5 V via carrier board",
    formFactor: "55 x 40 mm module, dual 100-pin mezzanine connectors",
    description:
      "Pi 4 silicon on a solder-down-free module for industrial carriers, with optional eMMC and wireless and a PCIe lane exposed through the connectors.",
    tags: ["CM4", "BCM2711", "Industrial", "PCIe", "eMMC"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "USB", "Wi-Fi", "Bluetooth", "Ethernet", "CSI", "PCIe"],
    highlights: [
      "Official datasheet documents both 100-pin connectors pin by pin.",
      "32 variants across RAM, eMMC, and wireless options.",
      "Single PCIe Gen 2 lane available to the carrier board.",
    ],
    warnings: [
      "Pinout depends entirely on the carrier board; verify against the CM4 datasheet, not Pi 4 guides.",
      "GPIO bank voltage is configurable; mixing 1.8 V and 3.3 V assumptions damages peripherals.",
      "Lite (no eMMC) and eMMC variants boot differently; eMMC versions disable the SD interface.",
    ],
    sourceLinks: [
      {
        label: "Compute Module 4 datasheet",
        url: "https://datasheets.raspberrypi.com/cm4/cm4-datasheet.pdf",
        type: "Datasheet",
      },
      {
        label: "Raspberry Pi computers documentation",
        url: "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "raspberry-pi-500",
    name: "Raspberry Pi 500",
    vendor: "Raspberry Pi",
    category: "SBC",
    family: "Raspberry Pi 500",
    processor: "Broadcom BCM2712 quad-core Arm Cortex-A76",
    logicLevel: "3.3 V GPIO",
    power: "5 V / 5 A USB-C",
    formFactor: "Keyboard computer",
    description:
      "Pi 5 internals built into a keyboard, with the standard 40-pin GPIO header exposed on the rear edge for classroom electronics without a separate board.",
    tags: ["Pi 500", "BCM2712", "Keyboard PC", "40-pin", "Desktop"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "USB", "Wi-Fi", "Bluetooth", "Ethernet"],
    highlights: [
      "Standard 40-pin header keeps HAT and tutorial compatibility.",
      "Integrated heatsink sustains higher clocks than a bare Pi 5.",
      "Dual 4K micro-HDMI output for desktop use.",
    ],
    warnings: [
      "GPIO is 3.3 V only and not 5 V tolerant.",
      "Rear header orientation is mirrored versus a bare Pi; check pin 1 before wiring.",
      "No CSI/DSI connectors, unlike Raspberry Pi 5.",
    ],
    sourceLinks: [
      {
        label: "Raspberry Pi 500 product brief",
        url: "https://datasheets.raspberrypi.com/pi500/raspberry-pi-500-product-brief.pdf",
        type: "Datasheet",
      },
      {
        label: "Raspberry Pi computers documentation",
        url: "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "stm32f103-blue-pill",
    name: "STM32F103C8T6 \"Blue Pill\"",
    vendor: "Generic",
    category: "Microcontroller",
    family: "STM32F1",
    processor: "STM32F103C8T6 Arm Cortex-M3 @ 72 MHz",
    logicLevel: "3.3 V GPIO (many pins 5 V tolerant)",
    power: "Micro-USB, 5 V pin, or 3.3 V pin",
    formFactor: "Breadboard DIP-style board, dual pin rows",
    description:
      "The ubiquitous low-cost STM32 board from many manufacturers, a staple for learning bare-metal Arm, STM32duino, and SWD debugging on a budget.",
    tags: ["STM32", "Blue Pill", "Cortex-M3", "STM32duino", "Clone"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "CAN", "USB", "SWD", "JTAG"],
    highlights: [
      "Huge community support and cheap ST-LINK programming over the 4-pin SWD header.",
      "Many GPIOs are 5 V tolerant (FT pins), unusual for 3.3 V boards.",
      "BOOT0/BOOT1 jumpers select flash, system bootloader, or SRAM boot.",
    ],
    warnings: [
      "Quality varies wildly; many boards carry counterfeit or remarked chips that deviate from the datasheet.",
      "Early boards ship a wrong-value USB pull-up (R10) that breaks USB enumeration.",
      "Only FT-marked pins are 5 V tolerant; PA11/PA12 share the USB lines.",
    ],
    sourceLinks: [
      {
        label: "STM32F103x8/xB datasheet",
        url: "https://www.st.com/resource/en/datasheet/stm32f103c8.pdf",
        type: "Datasheet",
      },
      {
        label: "STM32-base Blue Pill board reference (third party)",
        url: "https://stm32-base.org/boards/STM32F103C8T6-Blue-Pill.html",
        type: "Pinout",
      },
    ],
  },
  {
    id: "weact-black-pill-stm32f411",
    name: "WeAct Black Pill (STM32F411CE)",
    vendor: "WeAct Studio",
    category: "Microcontroller",
    family: "STM32F4",
    processor: "STM32F411CEU6 Arm Cortex-M4F @ 100 MHz",
    logicLevel: "3.3 V GPIO (many pins 5 V tolerant)",
    power: "USB-C, 5 V pin, or 3.3 V pin",
    formFactor: "Breadboard DIP-style board, dual pin rows",
    description:
      "The popular successor to the Blue Pill with a Cortex-M4F, USB-C, and a user key, widely used for keyboards (QMK), flight controllers, and STM32 learning.",
    tags: ["STM32", "Black Pill", "Cortex-M4", "USB-C", "WeAct"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "SWD"],
    highlights: [
      "Vendor GitHub repo publishes schematics and pin diagrams per board revision.",
      "DFU bootloader via BOOT0 button allows flashing without a programmer.",
      "Optional SPI flash footprint on the underside for extra storage.",
    ],
    warnings: [
      "Multiple board revisions (v2.0/v3.0/v3.1) differ in pinout details and components; match the schematic to your revision.",
      "Clones of this board exist with different regulators and crystals.",
      "Hold BOOT0 at reset for DFU; a floating BOOT0 can cause intermittent boot issues.",
    ],
    sourceLinks: [
      {
        label: "WeAct MiniSTM32F4x1 schematics and docs (GitHub)",
        url: "https://github.com/WeActStudio/WeActStudio.MiniSTM32F4x1",
        type: "Schematic",
      },
      {
        label: "STM32F411xC/xE datasheet",
        url: "https://www.st.com/resource/en/datasheet/stm32f411ce.pdf",
        type: "Datasheet",
      },
    ],
  },
  {
    id: "stm32f4discovery",
    name: "STM32F4DISCOVERY",
    vendor: "STMicroelectronics",
    category: "Microcontroller",
    family: "STM32 Discovery",
    processor: "STM32F407VGT6 Arm Cortex-M4F @ 168 MHz",
    logicLevel: "3.3 V GPIO (many pins 5 V tolerant)",
    power: "USB (ST-LINK) or 5 V external",
    formFactor: "Discovery board with dual 50-pin expansion headers",
    description:
      "ST's classic Cortex-M4 discovery kit with onboard ST-LINK, accelerometer, MEMS mic, and audio DAC, a long-running standard in university embedded courses.",
    tags: ["STM32", "Discovery", "Cortex-M4", "ST-LINK", "Audio"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "CAN", "USB", "SWD", "JTAG"],
    highlights: [
      "Embedded ST-LINK/V2-A means no external programmer is needed.",
      "UM1472 user manual documents every header pin and jumper.",
      "Onboard MEMS sensors and class-D audio driver for DSP labs.",
    ],
    warnings: [
      "Several GPIOs are tied to onboard peripherals (LIS3DSH, CS43L22, USB OTG); check UM1472 before reusing them.",
      "VDD is 3 V; only FT-marked pins tolerate 5 V.",
      "Remove ST-LINK jumpers when debugging an external target.",
    ],
    sourceLinks: [
      {
        label: "UM1472 STM32F4DISCOVERY user manual",
        url: "https://www.st.com/resource/en/user_manual/um1472-discovery-kit-with-stm32f407vg-mcu-stmicroelectronics.pdf",
        type: "Manual",
      },
      {
        label: "STM32F4DISCOVERY product page",
        url: "https://www.st.com/en/evaluation-tools/stm32f4discovery.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "nordic-nrf52840-dk",
    name: "nRF52840 DK",
    vendor: "Nordic Semiconductor",
    category: "Development Board",
    family: "nRF52",
    processor: "nRF52840 Arm Cortex-M4F @ 64 MHz",
    logicLevel: "3.3 V GPIO (1.7–3.6 V supply range)",
    power: "USB, external 1.7–5 V, Li-Po, or CR2032 coin cell",
    formFactor: "Arduino Uno R3-compatible footprint",
    description:
      "Nordic's reference kit for Bluetooth LE, Thread, Zigbee, and 802.15.4 development, with a SEGGER J-Link debugger and NFC antenna on board.",
    tags: ["nRF52840", "BLE", "Thread", "Zigbee", "J-Link"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "SWD", "Bluetooth", "Thread", "Zigbee"],
    highlights: [
      "Onboard SEGGER J-Link OB programs the DK and external targets.",
      "Arduino Uno R3 header layout accepts many shields.",
      "Four user LEDs and buttons plus an NFC-A antenna connector.",
    ],
    warnings: [
      "GPIO voltage follows the selected supply (down to 1.7 V); shields assuming 5 V logic are incompatible.",
      "Some GPIOs are shared with buttons, LEDs, and the QSPI flash by default.",
      "nRF USB and debugger USB are separate connectors; flashing uses the debugger port.",
    ],
    sourceLinks: [
      {
        label: "nRF52840 DK product page",
        url: "https://www.nordicsemi.com/Products/Development-hardware/nRF52840-DK",
        type: "Docs",
      },
      {
        label: "nRF52840 DK user guide",
        url: "https://docs.nordicsemi.com/bundle/ug_nrf52840_dk/page/UG/dk/intro.html",
        type: "Manual",
      },
    ],
  },
  {
    id: "ti-msp-exp430g2et-launchpad",
    name: "MSP430 LaunchPad (MSP-EXP430G2ET)",
    vendor: "Texas Instruments",
    category: "Microcontroller",
    family: "LaunchPad",
    processor: "MSP430G2553 16-bit RISC @ 16 MHz",
    logicLevel: "3.3 V GPIO",
    power: "USB (eZ-FET) or external 1.8–3.6 V",
    formFactor: "LaunchPad with dual 10-pin BoosterPack headers",
    description:
      "TI's entry-level ultra-low-power LaunchPad with a socketed DIP MSP430 and onboard eZ-FET debug probe, a common first board for low-power MCU courses.",
    tags: ["MSP430", "LaunchPad", "Low power", "BoosterPack", "DIP socket"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB"],
    highlights: [
      "Socketed 20-pin DIP MCU can be programmed and moved to a breadboard.",
      "BoosterPack header standard shared across the LaunchPad family.",
      "Onboard eZ-FET supports EnergyTrace power profiling.",
    ],
    warnings: [
      "Strictly 3.3 V logic; 5 V Arduino-style peripherals need level shifting.",
      "Isolation jumpers between the debugger and target must be set correctly for external power.",
      "Only 16 KB flash and 512 B RAM; heavy Arduino-style libraries will not fit.",
    ],
    sourceLinks: [
      {
        label: "MSP-EXP430G2ET tool page",
        url: "https://www.ti.com/tool/MSP-EXP430G2ET",
        type: "Docs",
      },
      {
        label: "MSP-EXP430G2ET user's guide (SLAU772)",
        url: "https://www.ti.com/lit/ug/slau772a/slau772a.pdf",
        type: "Manual",
      },
    ],
  },
  {
    id: "banana-pi-bpi-m5",
    name: "Banana Pi BPI-M5",
    vendor: "Banana Pi",
    category: "SBC",
    family: "BPI-M",
    processor: "Amlogic S905X3 quad-core Arm Cortex-A55",
    logicLevel: "3.3 V GPIO",
    power: "5 V USB-C",
    formFactor: "Raspberry Pi-like credit-card layout",
    description:
      "An Amlogic S905X3 SBC in a Pi-style footprint with 16 GB eMMC onboard, gigabit Ethernet, and a 40-pin header, popular as a low-cost media and Linux box.",
    tags: ["Banana Pi", "Amlogic", "S905X3", "eMMC", "40-pin"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "USB", "Ethernet"],
    highlights: [
      "Onboard 16 GB eMMC plus microSD boot options.",
      "Native gigabit Ethernet (not USB-bridged).",
      "40-pin header mechanically matches Raspberry Pi HAT spacing.",
    ],
    warnings: [
      "40-pin header is Pi-like but GPIO numbering and alternate functions differ; verify against Banana Pi docs, not Pi guides.",
      "No onboard Wi-Fi or Bluetooth.",
      "Software images vary in quality across distros; check the wiki for maintained builds.",
    ],
    sourceLinks: [
      {
        label: "Banana Pi BPI-M5 official documentation",
        url: "https://docs.banana-pi.org/en/BPI-M5/BananaPi_BPI-M5",
        type: "Docs",
      },
    ],
  },
  {
    id: "odroid-c4",
    name: "ODROID-C4",
    vendor: "Hardkernel",
    category: "SBC",
    family: "ODROID-C",
    processor: "Amlogic S905X3 quad-core Arm Cortex-A55 @ 2.0 GHz",
    logicLevel: "3.3 V GPIO (analog input 1.8 V max)",
    power: "5.5–17 V DC barrel jack",
    formFactor: "85 x 56 mm SBC with 40-pin header",
    description:
      "Hardkernel's mainstream S905X3 SBC with four USB 3.0 ports, gigabit Ethernet, and a well-documented 40-pin expansion header for Linux and Android work.",
    tags: ["ODROID", "Amlogic", "S905X3", "USB 3.0", "40-pin"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Ethernet"],
    highlights: [
      "Official wiki documents the J2 40-pin header pin by pin.",
      "Wide-range DC input simplifies industrial power supplies.",
      "eMMC module socket alongside microSD.",
    ],
    warnings: [
      "ADC inputs are 1.8 V maximum, lower than the 3.3 V GPIO rail.",
      "Pins 27/28 (I2C-1) are shared with the RTC add-on and disabled as GPIO by default.",
      "Header resembles the Pi's but signal mapping differs; do not wire from Pi pinout diagrams.",
    ],
    sourceLinks: [
      {
        label: "ODROID-C4 expansion connectors wiki",
        url: "https://wiki.odroid.com/odroid-c4/hardware/expansion_connectors",
        type: "Pinout",
      },
      {
        label: "ODROID-C4 product page",
        url: "https://www.hardkernel.com/shop/odroid-c4/",
        type: "Docs",
      },
    ],
  },
  {
    id: "pine64-rockpro64",
    name: "ROCKPro64",
    vendor: "Pine64",
    category: "SBC",
    family: "ROCKPro",
    processor: "Rockchip RK3399 hexa-core (2x Cortex-A72 + 4x Cortex-A53)",
    logicLevel: "3.3 V GPIO",
    power: "12 V DC barrel jack",
    formFactor: "127 x 79 mm SBC with open PCIe x4 slot",
    description:
      "Pine64's RK3399 board with a physical PCIe x4 slot, used widely for NAS builds, Linux mainline development, and community OS work.",
    tags: ["Pine64", "RK3399", "PCIe", "NAS", "Mainline Linux"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "USB", "Ethernet", "CSI", "PCIe"],
    highlights: [
      "Open-ended PCIe x4 slot accepts NVMe and SATA controllers.",
      "Community wiki hosts schematics and connector pinouts.",
      "eMMC socket, SPI flash, and microSD boot options.",
    ],
    warnings: [
      "Requires a 12 V supply; do not feed 5 V Pi supplies into the barrel jack.",
      "PI-2 GPIO bus header is not Raspberry Pi pin-compatible despite the 40-pin form.",
      "Boot order (SPI/eMMC/SD) trips up first-time installs; consult the wiki.",
    ],
    sourceLinks: [
      {
        label: "ROCKPro64 Pine64 wiki (docs, schematics)",
        url: "https://wiki.pine64.org/wiki/ROCKPro64",
        type: "Docs",
      },
    ],
  },
  {
    id: "libre-computer-le-potato",
    name: "Le Potato (AML-S905X-CC)",
    vendor: "Libre Computer",
    category: "SBC",
    family: "Libre Computer",
    processor: "Amlogic S905X quad-core Arm Cortex-A53",
    logicLevel: "3.3 V GPIO",
    power: "5 V micro-USB",
    formFactor: "Raspberry Pi 3 Model B footprint",
    description:
      "A Raspberry Pi 3-footprint SBC with upstream Linux support and a 40-pin GPIO header, often used as a drop-in Pi alternative for headless projects.",
    tags: ["Libre Computer", "Amlogic", "S905X", "Pi-compatible footprint", "Upstream Linux"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Ethernet"],
    highlights: [
      "Mechanically matches Pi 3 cases and HAT spacing.",
      "Strong upstream Linux/u-boot support from the vendor.",
      "eMMC interface plus microSD boot.",
    ],
    warnings: [
      "40-pin header is mechanically Pi-like but electrically different; use Libre Computer's pin maps.",
      "No onboard Wi-Fi/Bluetooth; Ethernet is 100 Mbit.",
      "GPIO is 3.3 V only.",
    ],
    sourceLinks: [
      {
        label: "AML-S905X-CC product page and resources",
        url: "https://libre.computer/products/aml-s905x-cc/",
        type: "Docs",
      },
    ],
  },
  {
    id: "milkv-duo",
    name: "Milk-V Duo",
    vendor: "Milk-V",
    category: "SBC",
    family: "Duo",
    processor: "CVITEK CV1800B dual RISC-V C906 (1 GHz + 700 MHz)",
    logicLevel: "3.3 V GPIO",
    power: "5 V USB-C",
    formFactor: "Pico-sized 21 x 51 mm module",
    description:
      "A tiny RISC-V Linux board in the Raspberry Pi Pico footprint, able to run Linux on one core and an RTOS on the other, popular for cheap RISC-V experimentation.",
    tags: ["RISC-V", "Milk-V", "CV1800B", "Linux", "Pico footprint"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "CSI"],
    highlights: [
      "Boots mainline-derived Linux from microSD on a $5-class board.",
      "Official docs include the full pinout and SDK.",
      "Camera connector for the onboard ISP.",
    ],
    warnings: [
      "Footprint matches the Pico but the pin functions do not; never reuse Pico wiring diagrams.",
      "Default images mux many pins for camera/RTOS use; check the duo pinmux docs before assuming GPIO.",
      "3.3 V logic only, and total 3.3 V rail current is limited.",
    ],
    sourceLinks: [
      {
        label: "Milk-V Duo official documentation",
        url: "https://milkv.io/docs/duo/getting-started/duo",
        type: "Docs",
      },
    ],
  },
  {
    id: "m5stack-core2",
    name: "M5Stack Core2",
    vendor: "M5Stack",
    category: "Development Board",
    family: "M5Stack Core",
    processor: "ESP32-D0WDQ6-V3 dual-core Xtensa LX6",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, internal 390 mAh battery",
    formFactor: "54 x 54 mm stackable enclosure with touch LCD",
    description:
      "A self-contained ESP32 development kit with a 2-inch capacitive touch screen, battery, speaker, and IMU in a stackable case, common in IoT prototyping and education.",
    tags: ["M5Stack", "ESP32", "Touch LCD", "Battery", "Stackable"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Official docs list every exposed pin on the M-Bus and Grove port.",
      "AXP192 PMIC manages battery, backlight, and peripheral power rails.",
      "UIFlow, Arduino, and ESP-IDF support.",
    ],
    warnings: [
      "Many ESP32 pins are consumed internally by the LCD, touch, SD, and PMIC; only the M-Bus/Grove pins are free.",
      "Peripheral power is software-switched via the AXP192; ports are dead until the PMIC rail is enabled.",
      "Grove port A is 5 V supply with 3.3 V logic; do not feed 5 V signals back in.",
    ],
    sourceLinks: [
      {
        label: "M5Stack Core2 official docs",
        url: "https://docs.m5stack.com/en/core/core2",
        type: "Docs",
      },
    ],
  },
  {
    id: "lilygo-t-display-s3",
    name: "LilyGO T-Display-S3",
    vendor: "LilyGO",
    category: "Development Board",
    family: "T-Display",
    processor: "ESP32-S3R8 dual-core Xtensa LX7",
    logicLevel: "3.3 V GPIO",
    power: "USB-C or 1S Li-Po (JST connector with charging)",
    formFactor: "Compact board with integrated 1.9-inch LCD",
    description:
      "An ESP32-S3 board with a 170x320 parallel LCD, two user buttons, and Li-Po charging, widely used for badges, dashboards, and small connected displays.",
    tags: ["LilyGO", "ESP32-S3", "LCD", "Li-Po", "Badge"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Vendor GitHub publishes the schematic and pin map.",
      "8-bit parallel LCD bus driven by the S3's LCD peripheral for fast refresh.",
      "Onboard battery charging and voltage divider for fuel reading.",
    ],
    warnings: [
      "Most GPIOs are committed to the parallel LCD; few free pins remain on the side headers.",
      "GPIO0 is the boot-strap button; holding it at reset enters download mode.",
      "Battery voltage sense divider is always connected and draws standby current.",
    ],
    sourceLinks: [
      {
        label: "T-Display-S3 schematics and docs (GitHub)",
        url: "https://github.com/Xinyuan-LilyGO/T-Display-S3",
        type: "Schematic",
      },
    ],
  },
  {
    id: "lolin-d1-mini",
    name: "LOLIN D1 Mini",
    vendor: "LOLIN",
    category: "Microcontroller",
    family: "D1",
    processor: "ESP8266EX Xtensa L106 @ 80/160 MHz",
    logicLevel: "3.3 V GPIO",
    power: "USB or 5 V/3.3 V pins",
    formFactor: "Compact 34.2 x 25.6 mm module with shield stacking",
    description:
      "The classic tiny ESP8266 board with a stackable shield ecosystem, still everywhere in home automation (ESPHome, Tasmota) and quick Wi-Fi hacks.",
    tags: ["ESP8266", "D1 Mini", "ESPHome", "Tasmota", "Shields"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi"],
    highlights: [
      "Official LOLIN docs cover pin mapping and shield stack.",
      "Onboard USB-serial and auto-reset for easy flashing.",
      "Large shield ecosystem (relay, OLED, battery, sensor).",
    ],
    warnings: [
      "GPIO0, GPIO2, and GPIO15 are boot-strap pins; wrong pull levels prevent booting.",
      "Single ADC input is 0–3.2 V via onboard divider (bare chip is 0–1 V).",
      "Only ~9 usable GPIOs; D0 (GPIO16) lacks PWM/interrupt support.",
    ],
    sourceLinks: [
      {
        label: "LOLIN D1 Mini official documentation",
        url: "https://www.wemos.cc/en/latest/d1/d1_mini.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "lolin-s2-mini",
    name: "LOLIN S2 Mini",
    vendor: "LOLIN",
    category: "Microcontroller",
    family: "S2",
    processor: "ESP32-S2FN4R2 single-core Xtensa LX7",
    logicLevel: "3.3 V GPIO",
    power: "USB-C or 5 V/3.3 V pins",
    formFactor: "D1 Mini footprint with extra inner pin rows",
    description:
      "An ESP32-S2 upgrade in the D1 Mini footprint with native USB and many more GPIOs, a cheap favorite for ESPHome nodes and USB-device experiments.",
    tags: ["ESP32-S2", "S2 Mini", "Native USB", "ESPHome", "D1 footprint"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB", "Wi-Fi"],
    highlights: [
      "Compatible with many D1 Mini shields on the outer rows.",
      "Native USB-OTG enables CDC, HID, and DFU without a bridge chip.",
      "27 GPIOs in a thumb-sized board.",
    ],
    warnings: [
      "No Bluetooth on ESP32-S2.",
      "GPIO0 is the boot-strap pin (onboard button 0); USB CDC must be enabled in firmware or the serial port disappears.",
      "Shield compatibility only holds for the outer D1-style rows; inner rows are S2-specific.",
    ],
    sourceLinks: [
      {
        label: "LOLIN S2 Mini official documentation",
        url: "https://www.wemos.cc/en/latest/s2/s2_mini.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "nodemcu-devkit-v1",
    name: "NodeMCU DevKit v1.0 (ESP-12E)",
    vendor: "NodeMCU",
    category: "Microcontroller",
    family: "NodeMCU",
    processor: "ESP8266EX Xtensa L106 @ 80/160 MHz",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB or VIN (5 V)",
    formFactor: "30-pin breadboard DIP module",
    description:
      "The open-hardware ESP8266 board that popularized Wi-Fi microcontrollers, with onboard USB-serial, auto-reset, and the D0–D8 Lua/Arduino pin naming.",
    tags: ["ESP8266", "NodeMCU", "Lua", "Arduino", "Open hardware"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi"],
    highlights: [
      "Official open-hardware repo includes full schematics.",
      "Dn silkscreen labels map to ESP8266 GPIO numbers used by firmware.",
      "Breadboard-friendly with flash/reset buttons onboard.",
    ],
    warnings: [
      "Dn labels are not GPIO numbers (D1 = GPIO5, D2 = GPIO4, etc.); mixing them up is the most common wiring error.",
      "GPIO0/2/15 boot-strap levels must be respected at reset.",
      "Board is too wide for one-row clearance on standard breadboards; use two boards or jumpers.",
    ],
    sourceLinks: [
      {
        label: "NodeMCU DevKit v1.0 hardware repo (schematics)",
        url: "https://github.com/nodemcu/nodemcu-devkit-v1.0",
        type: "Schematic",
      },
      {
        label: "ESP8266EX datasheet",
        url: "https://www.espressif.com/sites/default/files/documentation/0a-esp8266ex_datasheet_en.pdf",
        type: "Datasheet",
      },
    ],
  },
  {
    id: "particle-photon-2",
    name: "Particle Photon 2",
    vendor: "Particle",
    category: "Development Board",
    family: "Photon",
    processor: "Realtek RTL8721DM Arm Cortex-M33 @ 200 MHz",
    logicLevel: "3.3 V GPIO (some pins 5 V tolerant when unpowered constraints met)",
    power: "USB or Li-Po (onboard charger)",
    formFactor: "Feather-compatible module",
    description:
      "Particle's Wi-Fi 5 + BLE 5 cloud-connected dev board in Adafruit Feather form, built around Device OS with over-the-air firmware updates.",
    tags: ["Particle", "Photon 2", "Cloud", "Feather", "OTA"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Official datasheet documents every pin and Feather mapping.",
      "Integrated Particle Cloud, OTA updates, and fleet tooling.",
      "Li-Po charging onboard for battery deployments.",
    ],
    warnings: [
      "Not firmware-compatible with the original Photon; pin functions moved.",
      "Check the datasheet's per-pin 5 V tolerance table before mixing 5 V sensors.",
      "A few pins are reserved by Device OS / radio functions.",
    ],
    sourceLinks: [
      {
        label: "Particle Photon 2 datasheet",
        url: "https://docs.particle.io/reference/datasheets/wi-fi/photon-2-datasheet/",
        type: "Datasheet",
      },
    ],
  },
  {
    id: "seeed-wio-terminal",
    name: "Wio Terminal",
    vendor: "Seeed Studio",
    category: "Development Board",
    family: "Wio",
    processor: "Microchip ATSAMD51P19 Arm Cortex-M4F @ 120 MHz",
    logicLevel: "3.3 V GPIO",
    power: "USB-C or battery chassis",
    formFactor: "Handheld terminal with 2.4-inch LCD and Pi-style 40-pin port",
    description:
      "A SAMD51-based handheld with LCD, buttons, IMU, mic, and a Raspberry Pi-compatible 40-pin connector, used for portable dashboards and TinyML demos.",
    tags: ["Seeed", "SAMD51", "LCD", "TinyML", "40-pin"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Rear 40-pin port follows Raspberry Pi physical pin spacing for sharing accessories.",
      "Wiki documents the full pinout and onboard peripherals.",
      "Wireless via onboard RTL8720DN coprocessor.",
    ],
    warnings: [
      "Wireless runs on a separate RTL8720 with its own firmware that may need updating before Wi-Fi works.",
      "40-pin port is 3.3 V logic; it can plug into Pi accessories but is not a Pi GPIO clone.",
      "Some GPIOs are shared with the LCD, SD card, and internal sensors.",
    ],
    sourceLinks: [
      {
        label: "Wio Terminal getting started wiki",
        url: "https://wiki.seeedstudio.com/Wio-Terminal-Getting-Started/",
        type: "Docs",
      },
    ],
  },
  {
    id: "adafruit-itsybitsy-m4",
    name: "Adafruit ItsyBitsy M4 Express",
    vendor: "Adafruit",
    category: "Microcontroller",
    family: "ItsyBitsy",
    processor: "Microchip ATSAMD51G19 Arm Cortex-M4F @ 120 MHz",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB or BAT/VHI input",
    formFactor: "36 x 18 mm stick",
    description:
      "A small, fast SAMD51 stick board with QSPI flash for CircuitPython, a common step up from M0 boards when projects need more speed and RAM.",
    tags: ["Adafruit", "SAMD51", "CircuitPython", "ItsyBitsy", "Compact"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB"],
    highlights: [
      "Learn-guide pinout page documents every pad and alternate function.",
      "2 MB QSPI flash for CircuitPython filesystems.",
      "Special 5 V-level output pin for driving NeoPixels from 3.3 V logic boards.",
    ],
    warnings: [
      "Inputs are 3.3 V only; only the dedicated level-shifted output pin is 5 V.",
      "No battery charger onboard despite the BAT pin.",
      "Double-press reset enters the UF2 bootloader; single-press just resets.",
    ],
    sourceLinks: [
      {
        label: "Introducing Adafruit ItsyBitsy M4 (learn guide)",
        url: "https://learn.adafruit.com/introducing-adafruit-itsybitsy-m4",
        type: "Docs",
      },
    ],
  },
  {
    id: "arduino-giga-r1-wifi",
    name: "Arduino GIGA R1 WiFi",
    vendor: "Arduino",
    category: "Microcontroller",
    family: "GIGA",
    processor: "STM32H747XI dual-core (Cortex-M7 @ 480 MHz + Cortex-M4 @ 240 MHz)",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, barrel jack (6–24 V), VIN",
    formFactor: "Mega shield layout",
    description:
      "Arduino's high-end Mega-format board with a dual-core STM32H7, Wi-Fi/BLE, USB host, and camera/display connectors for demanding maker and robotics builds.",
    tags: ["Arduino", "GIGA", "STM32H7", "Dual-core", "Mega layout"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "CAN", "USB", "Wi-Fi", "Bluetooth", "JTAG"],
    highlights: [
      "76 GPIOs, 4 UARTs, 12-bit ADCs, and dual DACs with an official full pinout PDF.",
      "Mega 2560 shield mechanical compatibility at 3.3 V logic.",
      "USB-A host port plus camera (DSI/CSI-style) connectors.",
    ],
    warnings: [
      "Unlike the 5 V Mega it resembles, all IO is 3.3 V and not 5 V tolerant; legacy Mega shields can destroy it.",
      "CAN transceiver is not onboard; the CAN pins are controller-level only.",
      "Dual-core sketches require the M4/M7 RPC workflow described in the docs.",
    ],
    sourceLinks: [
      {
        label: "Arduino GIGA R1 WiFi documentation",
        url: "https://docs.arduino.cc/hardware/giga-r1-wifi/",
        type: "Docs",
      },
      {
        label: "GIGA R1 WiFi full pinout PDF",
        url: "https://docs.arduino.cc/resources/pinouts/ABX00063-full-pinout.pdf",
        type: "Pinout",
      },
    ],
  },
];

const expansionBoards: Board[] = [
  {
    id: "raspberry-pi-zero-w",
    name: "Raspberry Pi Zero W",
    vendor: "Raspberry Pi",
    category: "SBC",
    family: "Raspberry Pi Zero",
    processor: "Broadcom BCM2835",
    logicLevel: "3.3 V GPIO",
    power: "5 V micro-USB, 5 V header rail",
    formFactor: "Compact SBC",
    description:
      "The original wireless Pi Zero is a tiny Linux SBC with the Raspberry Pi 40-pin header footprint for low-power headless and embedded projects.",
    tags: ["Raspberry Pi", "Zero", "Linux", "40-pin", "Wireless"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CSI", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Shares the Raspberry Pi 40-pin GPIO convention used by HATs and tutorials.",
      "Very low-cost Linux board for deployed sensors and camera builds.",
      "Official documentation covers GPIO electrical limits and overlays.",
    ],
    warnings: [
      "GPIO is 3.3 V only and is not 5 V tolerant.",
      "Headers are often unpopulated and must be soldered before use.",
      "Pins 27 and 28 are reserved for HAT ID EEPROM in normal Pi conventions.",
    ],
    sourceLinks: [
      {
        label: "Raspberry Pi GPIO documentation",
        url: "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "raspberry-pi-3-model-a-plus",
    name: "Raspberry Pi 3 Model A+",
    vendor: "Raspberry Pi",
    category: "SBC",
    family: "Raspberry Pi",
    processor: "Broadcom BCM2837B0",
    logicLevel: "3.3 V GPIO",
    power: "5 V micro-USB, 5 V header rail",
    formFactor: "Compact Raspberry Pi SBC",
    description:
      "A smaller single-USB Raspberry Pi 3 variant with wireless networking and the standard 40-pin expansion header.",
    tags: ["Raspberry Pi", "BCM2837", "Linux", "40-pin", "Wireless"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CSI", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Useful when a full-size Pi is too large but a 40-pin header is still needed.",
      "Official docs share the same GPIO guidance as other 40-pin Raspberry Pi boards.",
      "Lower power and smaller footprint than the Model B family.",
    ],
    warnings: [
      "3.3 V GPIO only; use level shifting for 5 V devices.",
      "Only one USB data port is available without a hub.",
      "UART availability depends on overlays and Bluetooth configuration.",
    ],
    sourceLinks: [
      {
        label: "Raspberry Pi 3 Model A+ product brief",
        url: "https://pip.raspberrypi.com/documents/RP-008331-DS-raspberry-pi-3-a-plus-product-brief.pdf",
        type: "Datasheet",
      },
      {
        label: "Raspberry Pi GPIO documentation",
        url: "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "raspberry-pi-400",
    name: "Raspberry Pi 400",
    vendor: "Raspberry Pi",
    category: "SBC",
    family: "Raspberry Pi",
    processor: "Broadcom BCM2711",
    logicLevel: "3.3 V GPIO",
    power: "5 V USB-C",
    formFactor: "Keyboard computer with 40-pin header",
    description:
      "A Raspberry Pi 4-class computer built into a keyboard, exposing the same 40-pin GPIO header at the rear edge for desktop lab work.",
    tags: ["Raspberry Pi", "Keyboard", "Linux", "40-pin", "Education"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "USB", "Ethernet", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Convenient classroom form factor with GPIO still accessible.",
      "Official GPIO documentation applies to the rear 40-pin connector.",
      "Runs the Raspberry Pi OS ecosystem used by Pi 4 projects.",
    ],
    warnings: [
      "GPIO orientation differs from typical top-down Pi board photos; check pin 1 before wiring.",
      "3.3 V GPIO only.",
      "Rear header access can be cramped with bulky jumper housings.",
    ],
    sourceLinks: [
      {
        label: "Raspberry Pi 400 product brief",
        url: "https://datasheets.raspberrypi.com/rpi400/raspberry-pi-400-product-brief.pdf",
        type: "Datasheet",
      },
      {
        label: "Raspberry Pi GPIO documentation",
        url: "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "raspberry-pi-compute-module-5",
    name: "Raspberry Pi Compute Module 5",
    vendor: "Raspberry Pi",
    category: "SBC",
    family: "Compute Module",
    processor: "Broadcom BCM2712",
    logicLevel: "3.3 V GPIO",
    power: "Carrier-board supplied rails",
    formFactor: "200-pin board-to-board compute module",
    description:
      "A Raspberry Pi 5-class compute module for custom carrier boards, exposing high-speed and GPIO signals through board-to-board connectors.",
    tags: ["Raspberry Pi", "Compute Module", "BCM2712", "Carrier", "Industrial"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CSI", "PCIe", "USB", "Ethernet"],
    highlights: [
      "Good target for custom products that need Pi 5 software support.",
      "Official compute-module documentation covers connector and carrier design details.",
      "Available with eMMC and wireless options depending on variant.",
    ],
    warnings: [
      "Pin availability depends entirely on the carrier board design.",
      "Do not assume the 40-pin Raspberry Pi header exists unless the carrier provides it.",
      "Follow official carrier-board design rules for power sequencing and high-speed lanes.",
    ],
    sourceLinks: [
      {
        label: "Raspberry Pi Compute Module 5 datasheet",
        url: "https://pip.raspberrypi.com/documents/RP-008180-DS-cm5-datasheet.pdf",
        type: "Datasheet",
      },
    ],
  },
  {
    id: "arduino-uno-r4-minima",
    name: "Arduino UNO R4 Minima",
    vendor: "Arduino",
    category: "Microcontroller",
    family: "UNO",
    processor: "Renesas RA4M1",
    logicLevel: "5 V operating voltage",
    power: "USB-C, barrel jack, VIN",
    formFactor: "UNO shield layout",
    description:
      "The non-wireless UNO R4 keeps the classic 5 V shield footprint while moving the UNO line to a 32-bit Renesas MCU.",
    tags: ["Arduino", "UNO", "RA4M1", "5 V", "Shield"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "CAN", "USB"],
    highlights: [
      "Good choice for classic 5 V Arduino wiring with a modern MCU.",
      "Official Arduino hardware page links pinout, schematics, and datasheet resources.",
      "CAN controller and DAC are available at the board level.",
    ],
    warnings: [
      "Libraries written for AVR register access may not work on the Renesas RA4M1.",
      "CAN requires appropriate bus wiring and termination.",
      "Check current limits before powering shields from the 5 V rail.",
    ],
    sourceLinks: [
      {
        label: "Arduino UNO R4 Minima documentation",
        url: "https://docs.arduino.cc/hardware/uno-r4-minima",
        type: "Docs",
      },
    ],
  },
  {
    id: "arduino-due",
    name: "Arduino Due",
    vendor: "Arduino",
    category: "Microcontroller",
    family: "Due",
    processor: "Microchip SAM3X8E Arm Cortex-M3",
    logicLevel: "3.3 V GPIO",
    power: "USB, barrel jack, VIN",
    formFactor: "Mega shield layout",
    description:
      "Arduino's classic Arm-based Mega-format board, valued for many IO pins, dual DAC outputs, and faster 3.3 V logic than AVR boards.",
    tags: ["Arduino", "Due", "SAM3X8E", "Mega layout", "DAC"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "CAN", "USB"],
    highlights: [
      "Large shield-style header set with many timers, ADC channels, and serial ports.",
      "Official docs include pinout and electrical information.",
      "Useful when older sketches need an Arduino IDE workflow but more performance.",
    ],
    warnings: [
      "The Due is 3.3 V only and its GPIO is not 5 V tolerant.",
      "Many older Mega shields expect 5 V IO and can damage the board.",
      "Programming and native USB ports behave differently in sketches.",
    ],
    sourceLinks: [
      {
        label: "Arduino Due documentation",
        url: "https://docs.arduino.cc/hardware/due",
        type: "Docs",
      },
    ],
  },
  {
    id: "arduino-nano-every",
    name: "Arduino Nano Every",
    vendor: "Arduino",
    category: "Microcontroller",
    family: "Nano",
    processor: "Microchip ATmega4809",
    logicLevel: "5 V operating voltage",
    power: "Micro-USB, VIN, 5 V pin",
    formFactor: "Nano module",
    description:
      "A modernized 5 V Nano with the ATmega4809, keeping the small breadboard-friendly Nano footprint for simple embedded projects.",
    tags: ["Arduino", "Nano", "ATmega4809", "5 V", "Breadboard"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB"],
    highlights: [
      "Drop-in style Nano footprint for many simple projects.",
      "Official docs provide pinout, schematics, and board resources.",
      "5 V operation simplifies older sensor and shield wiring.",
    ],
    warnings: [
      "ATmega4809 peripheral registers differ from the original ATmega328P Nano.",
      "USB connector and VIN limits differ from clone boards; check the official docs.",
      "A6 and A7 behavior can differ from older Nano expectations.",
    ],
    sourceLinks: [
      {
        label: "Arduino Nano Every documentation",
        url: "https://docs.arduino.cc/hardware/nano-every",
        type: "Docs",
      },
    ],
  },
  {
    id: "arduino-nano-33-iot",
    name: "Arduino Nano 33 IoT",
    vendor: "Arduino",
    category: "Microcontroller",
    family: "Nano",
    processor: "Microchip SAMD21G18 + u-blox NINA-W102",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, VIN",
    formFactor: "Nano module",
    description:
      "A compact Arduino Nano-format board with SAMD21 logic plus Wi-Fi and Bluetooth connectivity for cloud-connected prototypes.",
    tags: ["Arduino", "Nano", "SAMD21", "Wi-Fi", "BLE"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Official Arduino Cloud-friendly Nano board with secure element support.",
      "Small breadboard footprint with wireless built in.",
      "Official documentation links pinout, schematic, and module details.",
    ],
    warnings: [
      "GPIO is 3.3 V only, unlike classic 5 V Nanos.",
      "Some pins are shared with the NINA wireless module.",
      "Do not power high-current peripherals from the 3.3 V rail.",
    ],
    sourceLinks: [
      {
        label: "Arduino Nano 33 IoT documentation",
        url: "https://docs.arduino.cc/hardware/nano-33-iot",
        type: "Docs",
      },
    ],
  },
  {
    id: "arduino-nano-rp2040-connect",
    name: "Arduino Nano RP2040 Connect",
    vendor: "Arduino",
    category: "Microcontroller",
    family: "Nano",
    processor: "RP2040 + u-blox NINA-W102",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, VIN",
    formFactor: "Nano module",
    description:
      "Arduino's Nano-format RP2040 board adds Wi-Fi, Bluetooth, IMU, microphone, and secure element features around Raspberry Pi silicon.",
    tags: ["Arduino", "Nano", "RP2040", "Wi-Fi", "Sensors"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Useful bridge between RP2040 firmware work and Arduino Cloud examples.",
      "Official docs cover the Nano labels and board-level peripherals.",
      "Onboard IMU and microphone reduce external wiring for sensing demos.",
    ],
    warnings: [
      "GPIO is 3.3 V only and not 5 V tolerant.",
      "Some RP2040 pins are dedicated to onboard peripherals.",
      "Use the Arduino pinout for Nano labels rather than a bare RP2040 pin table.",
    ],
    sourceLinks: [
      {
        label: "Arduino Nano RP2040 Connect documentation",
        url: "https://docs.arduino.cc/hardware/nano-rp2040-connect",
        type: "Docs",
      },
    ],
  },
  {
    id: "arduino-mkr-zero",
    name: "Arduino MKR Zero",
    vendor: "Arduino",
    category: "Microcontroller",
    family: "MKR",
    processor: "Microchip SAMD21G18",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, Li-Po connector, VIN",
    formFactor: "MKR module",
    description:
      "A SAMD21 MKR-format board with microSD support, aimed at compact audio, logging, and battery-capable embedded projects.",
    tags: ["Arduino", "MKR", "SAMD21", "microSD", "Logging"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB"],
    highlights: [
      "Official docs provide pinout and board resources.",
      "Integrated microSD socket makes data logging easy.",
      "MKR ecosystem shields fit the compact header layout.",
    ],
    warnings: [
      "MKR boards use 3.3 V IO, not 5 V Arduino UNO logic.",
      "SPI pins are shared with microSD use.",
      "Battery charging and VIN limits differ from bare Li-Po breakout assumptions.",
    ],
    sourceLinks: [
      {
        label: "Arduino MKR Zero documentation",
        url: "https://docs.arduino.cc/hardware/mkr-zero",
        type: "Docs",
      },
    ],
  },
  {
    id: "arduino-mkr-wan-1310",
    name: "Arduino MKR WAN 1310",
    vendor: "Arduino",
    category: "Development Board",
    family: "MKR",
    processor: "Microchip SAMD21G18 + Murata LoRa module",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, Li-Po connector, VIN",
    formFactor: "MKR module",
    description:
      "A low-power MKR board with LoRa connectivity for remote sensors and long-range telemetry prototypes.",
    tags: ["Arduino", "MKR", "LoRa", "SAMD21", "Battery"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB"],
    highlights: [
      "Official docs include pinout and LoRa-specific board details.",
      "MKR form factor keeps battery and shield wiring compact.",
      "Useful for gateway-free long-range sensor nodes where LoRa is allowed.",
    ],
    warnings: [
      "3.3 V IO only.",
      "Radio regulations and antenna matching matter for LoRa deployments.",
      "Some SPI resources are shared with the radio module.",
    ],
    sourceLinks: [
      {
        label: "Arduino MKR WAN 1310 documentation",
        url: "https://docs.arduino.cc/hardware/mkr-wan-1310",
        type: "Docs",
      },
    ],
  },
  {
    id: "arduino-portenta-c33",
    name: "Arduino Portenta C33",
    vendor: "Arduino",
    category: "Development Board",
    family: "Portenta",
    processor: "Renesas R7FA6M5BH2CBG",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, VIN, high-density connectors",
    formFactor: "Portenta module",
    description:
      "A compact industrial Arduino Pro board with Renesas RA6M5, Wi-Fi/BLE, secure element, and Portenta high-density expansion.",
    tags: ["Arduino Pro", "Portenta", "RA6M5", "Industrial", "Wireless"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "CAN", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Official Pro documentation covers high-density connector pin assignments.",
      "Good lower-cost Portenta option for connected products.",
      "Includes wireless and secure element features.",
    ],
    warnings: [
      "Most expansion signals are on high-density connectors, not simple 0.1 inch headers.",
      "GPIO is 3.3 V logic.",
      "Check alternate functions carefully before designing a carrier.",
    ],
    sourceLinks: [
      {
        label: "Arduino Portenta C33 documentation",
        url: "https://docs.arduino.cc/hardware/portenta-c33",
        type: "Docs",
      },
    ],
  },
  {
    id: "arduino-nicla-vision",
    name: "Arduino Nicla Vision",
    vendor: "Arduino",
    category: "AI Dev Kit",
    family: "Nicla",
    processor: "STM32H747AII6 dual-core Arm Cortex-M7/M4",
    logicLevel: "3.3 V GPIO",
    power: "USB, battery connector",
    formFactor: "Tiny camera/sensor module",
    description:
      "A tiny Arduino Pro vision and sensor module with camera, IMU, microphone, ToF sensor, Wi-Fi, and Bluetooth for edge AI prototypes.",
    tags: ["Arduino Pro", "Nicla", "Vision", "TinyML", "STM32H7"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth", "CSI"],
    highlights: [
      "Official docs detail the compact expansion connector and onboard sensors.",
      "Designed for machine vision and TinyML examples in a very small board.",
      "Works with Arduino and OpenMV-style workflows.",
    ],
    warnings: [
      "Connector pitch and pin density make hand wiring harder than header boards.",
      "Many MCU pins are consumed by onboard camera and sensors.",
      "Use official carrier or connector docs before attaching external hardware.",
    ],
    sourceLinks: [
      {
        label: "Arduino Nicla Vision documentation",
        url: "https://docs.arduino.cc/hardware/nicla-vision",
        type: "Docs",
      },
    ],
  },
  {
    id: "adafruit-feather-m4-express",
    name: "Adafruit Feather M4 Express",
    vendor: "Adafruit",
    category: "Microcontroller",
    family: "Feather",
    processor: "Microchip ATSAMD51J19 Arm Cortex-M4F",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, Li-Po connector, USB/3V rail",
    formFactor: "Feather module",
    description:
      "A fast SAMD51 Feather with battery charging and QSPI flash, popular for CircuitPython and Arduino projects that need more speed than M0 boards.",
    tags: ["Adafruit", "Feather", "SAMD51", "CircuitPython", "Battery"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB"],
    highlights: [
      "FeatherWing ecosystem compatibility with official pinout docs.",
      "QSPI flash supports CircuitPython filesystems.",
      "SAMD51 performance is strong for audio, display, and control projects.",
    ],
    warnings: [
      "GPIO is 3.3 V only.",
      "Feather BAT/USB/3V rails have distinct current and charging limits.",
      "DAC and analog pins should be checked against the Adafruit pinout before wiring.",
    ],
    sourceLinks: [
      {
        label: "Adafruit Feather M4 Express pinouts",
        url: "https://learn.adafruit.com/adafruit-feather-m4-express-atsamd51/pinouts",
        type: "Pinout",
      },
    ],
  },
  {
    id: "adafruit-feather-nrf52840-express",
    name: "Adafruit Feather nRF52840 Express",
    vendor: "Adafruit",
    category: "Development Board",
    family: "Feather",
    processor: "Nordic nRF52840 Arm Cortex-M4F",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, Li-Po connector, USB/3V rail",
    formFactor: "Feather module",
    description:
      "A BLE-capable Feather built around Nordic's nRF52840, with CircuitPython support and a familiar Feather expansion pinout.",
    tags: ["Adafruit", "Feather", "nRF52840", "BLE", "CircuitPython"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Bluetooth", "Thread"],
    highlights: [
      "Official Learn guide documents the Feather pins and power rails.",
      "Native USB and BLE make it useful for wireless HID and sensor nodes.",
      "FeatherWing compatibility speeds up hardware prototyping.",
    ],
    warnings: [
      "GPIO is 3.3 V only.",
      "Radio performance depends on antenna clearance and enclosure choices.",
      "NFC pins can be repurposed only after firmware/configuration changes.",
    ],
    sourceLinks: [
      {
        label: "Adafruit nRF52840 Feather pinouts",
        url: "https://learn.adafruit.com/introducing-the-adafruit-nrf52840-feather/pinouts",
        type: "Pinout",
      },
    ],
  },
  {
    id: "adafruit-esp32-s3-feather",
    name: "Adafruit ESP32-S3 Feather",
    vendor: "Adafruit",
    category: "Development Board",
    family: "Feather",
    processor: "Espressif ESP32-S3",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, Li-Po connector, USB/3V rail",
    formFactor: "Feather module",
    description:
      "A Feather-format ESP32-S3 board with native USB, Wi-Fi, Bluetooth LE, battery charging, and STEMMA QT.",
    tags: ["Adafruit", "Feather", "ESP32-S3", "Wi-Fi", "STEMMA QT"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Official pinout shows Feather labels, ESP32 GPIO numbers, and STEMMA QT wiring.",
      "Native USB supports CDC and HID use cases.",
      "Good CircuitPython and Arduino support.",
    ],
    warnings: [
      "ESP32-S3 boot straps and USB pins should not be pulled incorrectly at reset.",
      "GPIO is 3.3 V only.",
      "Some pins are tied to PSRAM/flash or onboard peripherals depending on variant.",
    ],
    sourceLinks: [
      {
        label: "Adafruit ESP32-S3 Feather pinouts",
        url: "https://learn.adafruit.com/adafruit-esp32-s3-feather/pinouts",
        type: "Pinout",
      },
    ],
  },
  {
    id: "adafruit-itsybitsy-rp2040",
    name: "Adafruit ItsyBitsy RP2040",
    vendor: "Adafruit",
    category: "Microcontroller",
    family: "ItsyBitsy",
    processor: "RP2040 dual-core Arm Cortex-M0+",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, BAT, USB, 3V",
    formFactor: "36 x 18 mm stick",
    description:
      "A compact RP2040 stick board with more exposed pins than QT Py-style boards and official CircuitPython support.",
    tags: ["Adafruit", "ItsyBitsy", "RP2040", "CircuitPython", "Compact"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB"],
    highlights: [
      "Official pinout maps ItsyBitsy labels to RP2040 GPIO numbers.",
      "Small footprint still exposes many useful pads.",
      "Works well for embedded USB and PIO experiments.",
    ],
    warnings: [
      "GPIO is not 5 V tolerant.",
      "Use the Adafruit label map instead of assuming Raspberry Pi Pico positions.",
      "No battery charger is included despite battery-related pads.",
    ],
    sourceLinks: [
      {
        label: "Adafruit ItsyBitsy RP2040 pinouts",
        url: "https://learn.adafruit.com/adafruit-itsybitsy-rp2040/pinouts",
        type: "Pinout",
      },
    ],
  },
  {
    id: "adafruit-metro-m4-express",
    name: "Adafruit Metro M4 Express",
    vendor: "Adafruit",
    category: "Microcontroller",
    family: "Metro",
    processor: "Microchip ATSAMD51J19 Arm Cortex-M4F",
    logicLevel: "3.3 V GPIO",
    power: "USB, barrel jack, VIN",
    formFactor: "UNO-compatible Metro layout",
    description:
      "A SAMD51 Arduino-compatible board in the UNO shield footprint, with much higher performance and CircuitPython storage.",
    tags: ["Adafruit", "Metro", "SAMD51", "UNO layout", "CircuitPython"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB"],
    highlights: [
      "Official pinout explains 3.3 V Metro shield compatibility.",
      "QSPI flash enables CircuitPython filesystems.",
      "Good for projects that need UNO ergonomics with more CPU headroom.",
    ],
    warnings: [
      "Despite the UNO-like shape, GPIO is 3.3 V only.",
      "Legacy 5 V shields may require level shifting.",
      "SPI is primarily on the ICSP header for shield compatibility.",
    ],
    sourceLinks: [
      {
        label: "Adafruit Metro M4 Express pinouts",
        url: "https://learn.adafruit.com/adafruit-metro-m4-express-featuring-atsamd51/pinouts",
        type: "Pinout",
      },
    ],
  },
  {
    id: "adafruit-grand-central-m4-express",
    name: "Adafruit Grand Central M4 Express",
    vendor: "Adafruit",
    category: "Microcontroller",
    family: "Grand Central",
    processor: "Microchip ATSAMD51P20 Arm Cortex-M4F",
    logicLevel: "3.3 V GPIO",
    power: "USB, barrel jack, VIN",
    formFactor: "Mega shield layout",
    description:
      "A high-pin-count SAMD51 board in the Arduino Mega footprint, aimed at projects needing many headers plus CircuitPython support.",
    tags: ["Adafruit", "SAMD51", "Mega layout", "CircuitPython", "High IO"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB"],
    highlights: [
      "Official pinout documents the many Mega-style header positions.",
      "Large SAMD51 package exposes many more pins than Feather boards.",
      "QSPI flash and microSD support are useful for data-heavy projects.",
    ],
    warnings: [
      "The Mega-like footprint does not mean 5 V IO tolerance.",
      "Check which pins are shared with SD card and onboard peripherals.",
      "High pin count makes alternate-function conflicts easy to miss.",
    ],
    sourceLinks: [
      {
        label: "Adafruit Grand Central pinouts",
        url: "https://learn.adafruit.com/adafruit-grand-central/pinouts",
        type: "Pinout",
      },
    ],
  },
  {
    id: "seeed-xiao-samd21",
    name: "Seeed Studio XIAO SAMD21",
    vendor: "Seeed Studio",
    category: "Microcontroller",
    family: "XIAO",
    processor: "Microchip SAMD21G18",
    logicLevel: "3.3 V GPIO",
    power: "USB-C or 5 V/3.3 V pins",
    formFactor: "Tiny castellated module",
    description:
      "The original tiny Seeed XIAO board exposes SAMD21 pins on castellated edges for wearables, small sensors, and USB prototypes.",
    tags: ["Seeed", "XIAO", "SAMD21", "Tiny", "Castellated"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB"],
    highlights: [
      "Official wiki includes the pinout and pad labels.",
      "Very small footprint with Arduino and CircuitPython support.",
      "Castellated edges support direct soldering into products.",
    ],
    warnings: [
      "3.3 V GPIO only.",
      "Tiny pads are easy to bridge; use the official pinout before soldering.",
      "Reset and boot access is less convenient than full-size boards.",
    ],
    sourceLinks: [
      {
        label: "Seeed XIAO SAMD21 wiki",
        url: "https://wiki.seeedstudio.com/Seeeduino-XIAO/",
        type: "Docs",
      },
    ],
  },
  {
    id: "seeed-xiao-nrf52840",
    name: "Seeed Studio XIAO nRF52840",
    vendor: "Seeed Studio",
    category: "Development Board",
    family: "XIAO",
    processor: "Nordic nRF52840",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, battery pads, 5 V/3.3 V pins",
    formFactor: "Tiny castellated module",
    description:
      "A tiny XIAO board with Nordic BLE, NFC-capable pins, battery support, and a compact castellated footprint.",
    tags: ["Seeed", "XIAO", "nRF52840", "BLE", "Tiny"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Bluetooth", "Thread"],
    highlights: [
      "Official wiki documents the XIAO BLE pinout and battery pads.",
      "Good for low-power wireless sensor nodes.",
      "Small enough for wearables and compact enclosures.",
    ],
    warnings: [
      "3.3 V GPIO only.",
      "Radio antenna clearance affects range.",
      "NFC and low-frequency crystal pins have special configuration caveats.",
    ],
    sourceLinks: [
      {
        label: "Seeed XIAO nRF52840 wiki",
        url: "https://wiki.seeedstudio.com/XIAO_BLE/",
        type: "Docs",
      },
    ],
  },
  {
    id: "seeed-xiao-esp32c3",
    name: "Seeed Studio XIAO ESP32C3",
    vendor: "Seeed Studio",
    category: "Development Board",
    family: "XIAO",
    processor: "Espressif ESP32-C3",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, battery pads, 5 V/3.3 V pins",
    formFactor: "Tiny castellated module",
    description:
      "A tiny RISC-V ESP32-C3 XIAO board with Wi-Fi, Bluetooth LE, and battery pads for compact IoT projects.",
    tags: ["Seeed", "XIAO", "ESP32-C3", "Wi-Fi", "RISC-V"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Official wiki includes pin map, power notes, and software setup.",
      "Very small ESP32-C3 board with castellated pads.",
      "Useful for ESPHome and battery IoT experiments.",
    ],
    warnings: [
      "GPIO is 3.3 V only.",
      "ESP32-C3 boot straps can prevent boot if pulled incorrectly.",
      "Available ADC pins and USB pins are limited by the tiny package routing.",
    ],
    sourceLinks: [
      {
        label: "Seeed XIAO ESP32C3 wiki",
        url: "https://wiki.seeedstudio.com/XIAO_ESP32C3_Getting_Started/",
        type: "Docs",
      },
    ],
  },
  {
    id: "seeed-xiao-esp32c6",
    name: "Seeed Studio XIAO ESP32C6",
    vendor: "Seeed Studio",
    category: "Development Board",
    family: "XIAO",
    processor: "Espressif ESP32-C6",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, battery pads, 5 V/3.3 V pins",
    formFactor: "Tiny castellated module",
    description:
      "A compact XIAO board with ESP32-C6 Wi-Fi 6, Bluetooth LE, Zigbee, and Thread radios for modern IoT prototypes.",
    tags: ["Seeed", "XIAO", "ESP32-C6", "Matter", "Thread"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth", "Zigbee", "Thread"],
    highlights: [
      "Official wiki documents pinout and wireless setup.",
      "Tiny board with radio support for Matter-style experiments.",
      "Castellated footprint fits small products and sensor nodes.",
    ],
    warnings: [
      "3.3 V GPIO only.",
      "Boot strap and USB/JTAG pins need care during reset and flashing.",
      "Radio coexistence and firmware support vary by stack.",
    ],
    sourceLinks: [
      {
        label: "Seeed XIAO ESP32C6 wiki",
        url: "https://wiki.seeedstudio.com/xiao_esp32c6_getting_started/",
        type: "Docs",
      },
    ],
  },
  {
    id: "seeed-reterminal",
    name: "Seeed Studio reTerminal",
    vendor: "Seeed Studio",
    category: "SBC",
    family: "reTerminal",
    processor: "Raspberry Pi Compute Module 4",
    logicLevel: "3.3 V GPIO",
    power: "5 V USB-C",
    formFactor: "Handheld HMI with 40-pin expansion",
    description:
      "A CM4-based industrial HMI device with display, sensors, and Raspberry Pi-style expansion for dashboards and edge control panels.",
    tags: ["Seeed", "reTerminal", "CM4", "HMI", "40-pin"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "USB", "Ethernet", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Official wiki documents expansion connector access and onboard peripherals.",
      "Combines a display enclosure with a Linux SBC.",
      "Good starting point for panel-mount dashboards.",
    ],
    warnings: [
      "Internal peripherals consume some CM4 interfaces.",
      "Use Seeed's reTerminal docs rather than assuming a bare CM4 carrier layout.",
      "3.3 V GPIO only.",
    ],
    sourceLinks: [
      {
        label: "Seeed reTerminal wiki",
        url: "https://wiki.seeedstudio.com/reTerminal/",
        type: "Docs",
      },
    ],
  },
  {
    id: "sparkfun-pro-micro-rp2040",
    name: "SparkFun Pro Micro RP2040",
    vendor: "SparkFun",
    category: "Microcontroller",
    family: "Pro Micro",
    processor: "RP2040 dual-core Arm Cortex-M0+",
    logicLevel: "3.3 V GPIO",
    power: "USB-C, RAW, 3V3",
    formFactor: "Pro Micro footprint",
    description:
      "SparkFun's RP2040 board in the popular Pro Micro footprint, useful for USB HID, keyboards, and compact embedded projects.",
    tags: ["SparkFun", "RP2040", "Pro Micro", "USB-C", "Keyboard"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB"],
    highlights: [
      "Official hookup guide documents the board pinout and solder jumpers.",
      "Pro Micro footprint works with many keyboard and HID designs.",
      "RP2040 PIO enables unusual digital interfaces.",
    ],
    warnings: [
      "GPIO is 3.3 V only.",
      "The Pro Micro footprint differs from Raspberry Pi Pico pin numbering.",
      "USB boot/reset behavior matters for keyboard firmware recovery.",
    ],
    sourceLinks: [
      {
        label: "SparkFun Pro Micro RP2040 hookup guide",
        url: "https://learn.sparkfun.com/tutorials/pro-micro-rp2040-hookup-guide",
        type: "Docs",
      },
    ],
  },
  {
    id: "sparkfun-redboard-turbo",
    name: "SparkFun RedBoard Turbo",
    vendor: "SparkFun",
    category: "Microcontroller",
    family: "RedBoard",
    processor: "Microchip SAMD21G18",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, barrel jack, VIN",
    formFactor: "UNO-compatible RedBoard layout",
    description:
      "A SAMD21 RedBoard with Arduino shield ergonomics and 3.3 V logic for projects needing more memory and speed than classic AVR boards.",
    tags: ["SparkFun", "RedBoard", "SAMD21", "UNO layout", "Qwiic"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB"],
    highlights: [
      "Official hookup guide includes pinout and power information.",
      "Qwiic connector simplifies I2C sensor wiring.",
      "UNO-style headers support many shields when voltage-compatible.",
    ],
    warnings: [
      "UNO footprint does not imply 5 V tolerant IO.",
      "Legacy shields may need level shifting.",
      "DAC and analog references should be checked before precision measurements.",
    ],
    sourceLinks: [
      {
        label: "SparkFun RedBoard Turbo hookup guide",
        url: "https://learn.sparkfun.com/tutorials/redboard-turbo-hookup-guide",
        type: "Docs",
      },
    ],
  },
  {
    id: "sparkfun-esp32-thing",
    name: "SparkFun ESP32 Thing",
    vendor: "SparkFun",
    category: "Development Board",
    family: "Thing",
    processor: "Espressif ESP32",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, Li-Po connector, 3.3 V rail",
    formFactor: "Thing module",
    description:
      "A classic SparkFun ESP32 board with battery charging, USB serial, and a well-documented breakout of ESP32 pins.",
    tags: ["SparkFun", "ESP32", "Thing", "Wi-Fi", "Battery"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Official hookup guide covers pinout, boot pins, and power paths.",
      "Battery charger makes it useful for portable Wi-Fi projects.",
      "Large ESP32 community support and examples.",
    ],
    warnings: [
      "GPIO is 3.3 V only.",
      "ESP32 GPIO6 through GPIO11 are typically tied to flash and should not be used.",
      "ADC2 pins conflict with Wi-Fi in many ESP32 software stacks.",
    ],
    sourceLinks: [
      {
        label: "SparkFun ESP32 Thing hookup guide",
        url: "https://learn.sparkfun.com/tutorials/esp32-thing-hookup-guide",
        type: "Docs",
      },
    ],
  },
  {
    id: "sparkfun-micromod-rp2040-processor",
    name: "SparkFun MicroMod RP2040 Processor",
    vendor: "SparkFun",
    category: "Microcontroller",
    family: "MicroMod",
    processor: "RP2040 dual-core Arm Cortex-M0+",
    logicLevel: "3.3 V GPIO",
    power: "MicroMod carrier supplied",
    formFactor: "MicroMod M.2 processor card",
    description:
      "An RP2040 processor card for SparkFun's MicroMod carrier ecosystem, separating the MCU from application-specific carrier boards.",
    tags: ["SparkFun", "MicroMod", "RP2040", "M.2", "Carrier"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB"],
    highlights: [
      "Official hookup guide maps RP2040 functions onto the MicroMod connector.",
      "Carrier-board approach makes it easy to swap processors.",
      "Good for reusable sensor and data-logging carriers.",
    ],
    warnings: [
      "Available pins depend on the chosen MicroMod carrier.",
      "GPIO is 3.3 V only.",
      "Do not confuse M.2 mechanical form with PCIe/NVMe electrical compatibility.",
    ],
    sourceLinks: [
      {
        label: "SparkFun MicroMod RP2040 hookup guide",
        url: "https://learn.sparkfun.com/tutorials/micromod-rp2040-processor-board-hookup-guide",
        type: "Docs",
      },
    ],
  },
  {
    id: "teensy-40",
    name: "Teensy 4.0",
    vendor: "PJRC",
    category: "Microcontroller",
    family: "Teensy",
    processor: "NXP i.MX RT1062 Arm Cortex-M7 @ 600 MHz",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, VIN, 3.3 V rail",
    formFactor: "Small DIP-style module",
    description:
      "A very fast compact Teensy board with extensive peripheral muxing and Arduino-compatible tooling through Teensyduino.",
    tags: ["Teensy", "PJRC", "i.MX RT1062", "Audio", "Fast MCU"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "CAN", "USB"],
    highlights: [
      "Official PJRC page includes pinout card and peripheral tables.",
      "High clock speed makes it popular for audio, control, and signal projects.",
      "Small footprint suits dense embedded builds.",
    ],
    warnings: [
      "Teensy 4.x GPIO is 3.3 V only and not 5 V tolerant.",
      "Some pads are underside-only and harder to access.",
      "High-speed IO layouts need attention to grounding and signal integrity.",
    ],
    sourceLinks: [
      {
        label: "PJRC Teensy 4.0 product page",
        url: "https://www.pjrc.com/store/teensy40.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "teensy-lc",
    name: "Teensy LC",
    vendor: "PJRC",
    category: "Microcontroller",
    family: "Teensy",
    processor: "NXP MKL26Z64VFT4 Arm Cortex-M0+",
    logicLevel: "3.3 V GPIO",
    power: "Micro-USB, VIN, 3.3 V rail",
    formFactor: "Small DIP-style module",
    description:
      "A low-cost Teensy board with native USB and a compact breadboard-friendly pinout for simple HID and control projects.",
    tags: ["Teensy", "PJRC", "Kinetis", "USB", "Low cost"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB"],
    highlights: [
      "Official PJRC page documents the pinout card and electrical limits.",
      "Native USB makes keyboard, MIDI, and serial devices straightforward.",
      "Compact module remains useful where many shields are not needed.",
    ],
    warnings: [
      "GPIO is 3.3 V only.",
      "5 V tolerant behavior is limited; check PJRC electrical notes before wiring.",
      "Lower memory and speed than Teensy 3.x/4.x boards.",
    ],
    sourceLinks: [
      {
        label: "PJRC Teensy LC product page",
        url: "https://www.pjrc.com/store/teensylc.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "particle-boron",
    name: "Particle Boron",
    vendor: "Particle",
    category: "Development Board",
    family: "Boron",
    processor: "Nordic nRF52840 + cellular modem",
    logicLevel: "3.3 V GPIO",
    power: "USB, Li-Po connector, VIN",
    formFactor: "Particle Feather-like module",
    description:
      "Particle's cellular IoT development board combines nRF52840 application logic with LTE connectivity and Particle Device OS.",
    tags: ["Particle", "Boron", "Cellular", "nRF52840", "Cloud"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Bluetooth"],
    highlights: [
      "Official datasheet includes pin map and power states.",
      "Particle Cloud and OTA workflows are built in.",
      "Li-Po support suits remote sensor prototypes.",
    ],
    warnings: [
      "Cellular current bursts require a strong power source and battery planning.",
      "Some pins are reserved or have Device OS functions.",
      "Check antenna and carrier-region compatibility before deployment.",
    ],
    sourceLinks: [
      {
        label: "Particle Boron datasheet",
        url: "https://docs.particle.io/reference/datasheets/b-series/boron-datasheet/",
        type: "Datasheet",
      },
    ],
  },
  {
    id: "particle-argon",
    name: "Particle Argon",
    vendor: "Particle",
    category: "Development Board",
    family: "Argon",
    processor: "Nordic nRF52840 + Espressif ESP32 radio",
    logicLevel: "3.3 V GPIO",
    power: "USB, Li-Po connector, VIN",
    formFactor: "Particle Feather-like module",
    description:
      "A Particle Wi-Fi and BLE development board in the mesh-era Particle form factor, still useful for Device OS prototypes.",
    tags: ["Particle", "Argon", "Wi-Fi", "nRF52840", "Cloud"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Official datasheet documents the pinout and power rails.",
      "Particle Cloud integration and OTA updates are available.",
      "Feather-like layout works with many simple carrier designs.",
    ],
    warnings: [
      "Some mesh-era features are deprecated; check current Particle platform support.",
      "GPIO is 3.3 V only.",
      "Shared radio and Device OS functions constrain some pins.",
    ],
    sourceLinks: [
      {
        label: "Particle Argon datasheet",
        url: "https://docs.particle.io/reference/datasheets/wi-fi/argon-datasheet/",
        type: "Datasheet",
      },
    ],
  },
  {
    id: "nvidia-jetson-nano-dev-kit",
    name: "NVIDIA Jetson Nano Developer Kit",
    vendor: "NVIDIA",
    category: "AI Dev Kit",
    family: "Jetson",
    processor: "NVIDIA Tegra X1",
    logicLevel: "3.3 V GPIO",
    power: "5 V DC barrel or micro-USB depending on kit",
    formFactor: "AI SBC developer kit",
    description:
      "NVIDIA's entry Jetson developer kit exposes a Raspberry Pi-style 40-pin header alongside camera and display connectors for edge AI experiments.",
    tags: ["NVIDIA", "Jetson", "AI", "CUDA", "40-pin"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CSI", "USB", "Ethernet"],
    highlights: [
      "Official Jetson guides document the J41 expansion header.",
      "Good low-cost CUDA-capable board for camera and robotics tutorials.",
      "Large ecosystem of Jetson.GPIO examples.",
    ],
    warnings: [
      "The 40-pin connector is Pi-style mechanically but software numbering differs.",
      "Power mode and supply quality affect USB and camera stability.",
      "GPIO is 3.3 V only.",
    ],
    sourceLinks: [
      {
        label: "Jetson Nano developer kit user guide",
        url: "https://developer.nvidia.com/embedded/dlc/jetson_nano_developer_kit_user_guide",
        type: "Manual",
      },
    ],
  },
  {
    id: "nvidia-jetson-xavier-nx-dev-kit",
    name: "NVIDIA Jetson Xavier NX Developer Kit",
    vendor: "NVIDIA",
    category: "AI Dev Kit",
    family: "Jetson",
    processor: "NVIDIA Xavier NX",
    logicLevel: "3.3 V GPIO",
    power: "19 V DC barrel jack",
    formFactor: "AI SBC developer kit",
    description:
      "A compact Jetson developer kit with higher AI performance than Nano and a carrier exposing expansion headers and camera interfaces.",
    tags: ["NVIDIA", "Jetson", "Xavier NX", "AI", "CSI"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CSI", "USB", "Ethernet"],
    highlights: [
      "Official user guide covers carrier connectors and expansion header details.",
      "Supports CUDA, TensorRT, and JetPack workflows.",
      "Useful for robotics prototypes with multiple cameras.",
    ],
    warnings: [
      "Requires a 19 V supply, unlike many 5 V SBCs.",
      "Carrier-board pinout differs from Jetson Nano and Orin kits.",
      "GPIO is 3.3 V only.",
    ],
    sourceLinks: [
      {
        label: "Jetson Xavier NX developer kit getting started guide",
        url: "https://developer.nvidia.com/embedded/learn/get-started-jetson-xavier-nx-devkit",
        type: "Docs",
      },
    ],
  },
  {
    id: "beagley-ai",
    name: "BeagleY-AI",
    vendor: "BeagleBoard.org",
    category: "AI Dev Kit",
    family: "BeagleY",
    processor: "Texas Instruments AM67A",
    logicLevel: "3.3 V GPIO",
    power: "5 V USB-C",
    formFactor: "Raspberry Pi-style SBC",
    description:
      "A BeagleBoard AI-focused SBC with a Pi-like form factor, expansion header, camera connectors, and TI neural acceleration.",
    tags: ["BeagleBoard", "AM67A", "AI", "40-pin", "Linux"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CSI", "USB", "Ethernet"],
    highlights: [
      "Official BeagleBoard docs include board hardware and expansion details.",
      "Pi-style mechanical shape helps with cases and accessories.",
      "Targets edge AI workloads with mainline-friendly Linux workflows.",
    ],
    warnings: [
      "Pi-like shape does not guarantee Raspberry Pi electrical pin compatibility.",
      "Confirm header muxing in the BeagleY-AI docs before wiring.",
      "3.3 V GPIO only.",
    ],
    sourceLinks: [
      {
        label: "BeagleY-AI official documentation",
        url: "https://docs.beagleboard.org/latest/boards/beagley/ai/index.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "beagleplay",
    name: "BeaglePlay",
    vendor: "BeagleBoard.org",
    category: "SBC",
    family: "BeaglePlay",
    processor: "Texas Instruments AM625",
    logicLevel: "3.3 V GPIO",
    power: "5 V USB-C",
    formFactor: "Credit-card SBC with mikroBUS and Grove",
    description:
      "A connectivity-focused BeagleBoard with mikroBUS, Grove, CSI, Ethernet, Wi-Fi, and sub-GHz/BLE radios for rapid Linux prototyping.",
    tags: ["BeagleBoard", "AM625", "mikroBUS", "Grove", "Linux"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CSI", "USB", "Ethernet", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Official docs document mikroBUS, Grove, and expansion connectors.",
      "Good board for mixed wired and wireless Linux IoT prototypes.",
      "Many interfaces are exposed without custom carrier design.",
    ],
    warnings: [
      "Connector pin functions depend on Linux overlays and pinmux setup.",
      "3.3 V IO; check mikroBUS click-board voltage expectations.",
      "Radio features require the correct firmware and antennas.",
    ],
    sourceLinks: [
      {
        label: "BeaglePlay official documentation",
        url: "https://docs.beagleboard.org/latest/boards/beagleplay/index.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "beaglebone-ai-64",
    name: "BeagleBone AI-64",
    vendor: "BeagleBoard.org",
    category: "AI Dev Kit",
    family: "BeagleBone",
    processor: "Texas Instruments TDA4VM",
    logicLevel: "3.3 V GPIO",
    power: "USB-C or 5 V barrel jack",
    formFactor: "BeagleBone cape-compatible SBC",
    description:
      "A high-performance BeagleBone-family board with TI vision/AI acceleration while retaining many cape-style expansion concepts.",
    tags: ["BeagleBoard", "BeagleBone", "TDA4VM", "AI", "Cape"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CAN", "CSI", "USB", "Ethernet"],
    highlights: [
      "Official docs cover expansion headers, cape compatibility notes, and schematics.",
      "Designed for robotics, vision, and industrial edge compute.",
      "Keeps familiar BeagleBone-style hardware access patterns.",
    ],
    warnings: [
      "Not every legacy BeagleBone cape is electrically or mechanically compatible.",
      "Pinmux setup is required before assuming a header pin is GPIO.",
      "3.3 V IO only.",
    ],
    sourceLinks: [
      {
        label: "BeagleBone AI-64 official documentation",
        url: "https://docs.beagleboard.org/latest/boards/beaglebone/ai-64/index.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "beaglev-fire",
    name: "BeagleV-Fire",
    vendor: "BeagleBoard.org",
    category: "SBC",
    family: "BeagleV",
    processor: "Microchip PolarFire SoC FPGA",
    logicLevel: "3.3 V GPIO",
    power: "USB-C",
    formFactor: "RISC-V FPGA SBC",
    description:
      "A RISC-V Linux board with PolarFire SoC FPGA fabric and BeagleBone-style expansion for hardware/software co-design.",
    tags: ["BeagleBoard", "RISC-V", "FPGA", "PolarFire", "Linux"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CAN", "USB", "Ethernet", "JTAG"],
    highlights: [
      "Official docs document board connectors and FPGA resources.",
      "Interesting mix of Linux-capable RISC-V cores and FPGA fabric.",
      "Useful for teaching hardware acceleration and open ISA workflows.",
    ],
    warnings: [
      "FPGA image and Linux pinmux configuration determine exposed behavior.",
      "Cape compatibility must be checked against BeagleV-Fire docs.",
      "3.3 V IO only unless a carrier explicitly level shifts.",
    ],
    sourceLinks: [
      {
        label: "BeagleV-Fire official documentation",
        url: "https://docs.beagleboard.org/latest/boards/beaglev/fire/index.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "radxa-rock-5b",
    name: "Radxa ROCK 5B",
    vendor: "Radxa",
    category: "SBC",
    family: "ROCK 5",
    processor: "Rockchip RK3588",
    logicLevel: "3.3 V GPIO",
    power: "USB-C Power Delivery",
    formFactor: "High-performance ARM SBC",
    description:
      "A powerful RK3588 SBC with 40-pin expansion, PCIe, M.2, camera/display connectors, and strong Linux community interest.",
    tags: ["Radxa", "RK3588", "PCIe", "M.2", "40-pin"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CSI", "PCIe", "USB", "Ethernet"],
    highlights: [
      "Official Radxa docs include hardware and GPIO resources.",
      "High CPU/GPU/NPU performance in a maker SBC format.",
      "M.2 and PCIe make it useful for storage-heavy builds.",
    ],
    warnings: [
      "The 40-pin header is not a Raspberry Pi electrical clone.",
      "Use Radxa's pin tables and overlays for GPIO numbering.",
      "Power delivery negotiation matters for stable high-load use.",
    ],
    sourceLinks: [
      {
        label: "Radxa ROCK 5B documentation",
        url: "https://docs.radxa.com/en/rock5/rock5b",
        type: "Docs",
      },
    ],
  },
  {
    id: "radxa-zero-3e",
    name: "Radxa ZERO 3E",
    vendor: "Radxa",
    category: "SBC",
    family: "ZERO",
    processor: "Rockchip RK3566",
    logicLevel: "3.3 V GPIO",
    power: "5 V USB-C",
    formFactor: "Compact SBC with Ethernet",
    description:
      "A tiny RK3566 Linux SBC with Ethernet and 40-pin expansion aimed at compact networking and embedded controller projects.",
    tags: ["Radxa", "RK3566", "Zero", "Ethernet", "40-pin"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "USB", "Ethernet"],
    highlights: [
      "Official docs document board hardware and GPIO expansion.",
      "Compact footprint with wired networking.",
      "Useful for small Linux gateways and controllers.",
    ],
    warnings: [
      "Do not reuse Raspberry Pi Zero wiring diagrams without checking Radxa pinout.",
      "GPIO is 3.3 V only.",
      "Connector population can vary by kit and revision.",
    ],
    sourceLinks: [
      {
        label: "Radxa ZERO 3 hardware interface",
        url: "https://docs.radxa.com/en/zero/zero3/hardware-design/hardware-interface",
        type: "Docs",
      },
    ],
  },
  {
    id: "odroid-n2-plus",
    name: "ODROID-N2+",
    vendor: "Hardkernel",
    category: "SBC",
    family: "ODROID-N",
    processor: "Amlogic S922X",
    logicLevel: "3.3 V GPIO (analog input limits differ)",
    power: "7.5-18 V DC barrel jack",
    formFactor: "Performance SBC with 40-pin header",
    description:
      "Hardkernel's high-performance Amlogic SBC with a large heatsink, eMMC support, and a documented 40-pin expansion header.",
    tags: ["ODROID", "Amlogic", "S922X", "eMMC", "40-pin"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Ethernet"],
    highlights: [
      "Official wiki documents the expansion connector pin by pin.",
      "Fast CPU and mature Hardkernel ecosystem for Linux and Android.",
      "eMMC modules provide reliable storage options.",
    ],
    warnings: [
      "Analog input voltage limits differ from the 3.3 V digital rail.",
      "Header is Pi-like physically but signal mapping differs.",
      "Use the specified DC input range instead of a 5 V Pi supply.",
    ],
    sourceLinks: [
      {
        label: "ODROID-N2 expansion connectors wiki",
        url: "https://wiki.odroid.com/odroid-n2/hardware/expansion_connectors",
        type: "Pinout",
      },
    ],
  },
  {
    id: "odroid-m1",
    name: "ODROID-M1",
    vendor: "Hardkernel",
    category: "SBC",
    family: "ODROID-M",
    processor: "Rockchip RK3568B2",
    logicLevel: "3.3 V GPIO",
    power: "7.5-15 V DC barrel jack",
    formFactor: "SBC with M.2 and SATA",
    description:
      "A storage-friendly Hardkernel SBC with RK3568, SATA, NVMe-capable M.2, and a documented GPIO expansion header.",
    tags: ["ODROID", "RK3568", "SATA", "M.2", "40-pin"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "PCIe", "USB", "Ethernet"],
    highlights: [
      "Official wiki provides expansion connector documentation.",
      "Onboard SATA and M.2 make it useful for NAS-style embedded projects.",
      "Hardkernel publishes schematics and board resources.",
    ],
    warnings: [
      "Power input is wide-range DC, not 5 V USB.",
      "Header mapping differs from Raspberry Pi boards.",
      "Check ADC voltage limits before connecting analog sensors.",
    ],
    sourceLinks: [
      {
        label: "ODROID-M1 expansion connectors wiki",
        url: "https://wiki.odroid.com/odroid-m1/hardware/expansion_connectors",
        type: "Pinout",
      },
    ],
  },
  {
    id: "pine64-quartz64-model-b",
    name: "Quartz64 Model B",
    vendor: "Pine64",
    category: "SBC",
    family: "Quartz64",
    processor: "Rockchip RK3566",
    logicLevel: "3.3 V GPIO",
    power: "5 V USB-C",
    formFactor: "Raspberry Pi-like SBC",
    description:
      "A Pine64 RK3566 board in a Pi-like footprint with 40-pin expansion and community Linux support.",
    tags: ["Pine64", "Quartz64", "RK3566", "40-pin", "Linux"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "USB", "Ethernet", "CSI"],
    highlights: [
      "Pine64 wiki collects schematics, connector notes, and board resources.",
      "Pi-like footprint can simplify case selection.",
      "Community-oriented board for Linux experimentation.",
    ],
    warnings: [
      "Pi-like mechanics do not guarantee Pi-compatible GPIO mapping.",
      "Software support varies by distribution and kernel version.",
      "3.3 V GPIO only.",
    ],
    sourceLinks: [
      {
        label: "Quartz64 Pine64 wiki",
        url: "https://wiki.pine64.org/wiki/Quartz64",
        type: "Docs",
      },
    ],
  },
  {
    id: "khadas-vim4",
    name: "Khadas VIM4",
    vendor: "Khadas",
    category: "SBC",
    family: "VIM",
    processor: "Amlogic A311D2",
    logicLevel: "3.3 V GPIO",
    power: "USB-C Power Delivery",
    formFactor: "Compact media/AI SBC",
    description:
      "A compact Amlogic SBC with OOWOW recovery, MIPI interfaces, 40-pin GPIO, and an NPU for media and edge AI prototypes.",
    tags: ["Khadas", "VIM4", "A311D2", "NPU", "40-pin"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "CSI", "USB", "Ethernet", "Wi-Fi", "Bluetooth"],
    highlights: [
      "Official Khadas docs cover hardware, GPIO, and expansion connectors.",
      "OOWOW makes OS installation and recovery easier.",
      "Compact form factor with strong media IO.",
    ],
    warnings: [
      "Use Khadas pinout tables; 40-pin layout is not guaranteed Pi-compatible.",
      "Power delivery requirements can change with peripherals attached.",
      "Some pins are muxed with onboard devices and high-speed connectors.",
    ],
    sourceLinks: [
      {
        label: "Khadas VIM4 documentation",
        url: "https://docs.khadas.com/products/sbc/vim4/",
        type: "Docs",
      },
    ],
  },
  {
    id: "stm32-nucleo-l476rg",
    name: "STM32 Nucleo-L476RG",
    vendor: "STMicroelectronics",
    category: "Development Board",
    family: "STM32 Nucleo-64",
    processor: "STM32L476RG Arm Cortex-M4",
    logicLevel: "3.3 V GPIO",
    power: "USB, VIN/E5V/3V3 headers",
    formFactor: "Nucleo-64 with Arduino Uno headers",
    description:
      "A low-power STM32 Nucleo board with Arduino Uno R3 and ST morpho headers for flexible embedded development.",
    tags: ["STM32", "Nucleo", "STM32L4", "Low power", "Arduino headers"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "CAN", "USB", "SWD"],
    highlights: [
      "Official ST product page links user manual, schematics, and board resources.",
      "Morpho headers expose most MCU pins beyond Arduino shield pins.",
      "Integrated ST-LINK debugger simplifies firmware work.",
    ],
    warnings: [
      "Arduino headers are 3.3 V logic even when shields expect 5 V.",
      "Many pins have solder-bridge or alternate-function caveats.",
      "Check the user manual for morpho-to-MCU pin mapping before wiring.",
    ],
    sourceLinks: [
      {
        label: "ST NUCLEO-L476RG product page",
        url: "https://www.st.com/en/evaluation-tools/nucleo-l476rg.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "stm32-nucleo-g071rb",
    name: "STM32 Nucleo-G071RB",
    vendor: "STMicroelectronics",
    category: "Development Board",
    family: "STM32 Nucleo-64",
    processor: "STM32G071RB Arm Cortex-M0+",
    logicLevel: "3.3 V GPIO",
    power: "USB, VIN/E5V/3V3 headers",
    formFactor: "Nucleo-64 with Arduino Uno headers",
    description:
      "A cost-effective STM32G0 Nucleo board with Arduino and morpho headers for control, interface, and low-cost MCU evaluation.",
    tags: ["STM32", "Nucleo", "STM32G0", "Arduino headers", "SWD"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "USB", "SWD"],
    highlights: [
      "Official ST page links board manual, CAD, and schematics.",
      "Morpho headers expose many MCU pins for custom wiring.",
      "Integrated ST-LINK supports debugging and virtual COM port.",
    ],
    warnings: [
      "Arduino shield voltage expectations must be checked against 3.3 V MCU IO.",
      "Solder bridges affect clock, power, and debug routing.",
      "Use ST's manual for exact pin mapping.",
    ],
    sourceLinks: [
      {
        label: "ST NUCLEO-G071RB product page",
        url: "https://www.st.com/en/evaluation-tools/nucleo-g071rb.html",
        type: "Docs",
      },
    ],
  },
  {
    id: "nordic-nrf5340-dk",
    name: "Nordic nRF5340 DK",
    vendor: "Nordic Semiconductor",
    category: "Development Board",
    family: "nRF",
    processor: "Nordic nRF5340 dual-core Arm Cortex-M33",
    logicLevel: "3.3 V GPIO",
    power: "USB, coin cell, external supply",
    formFactor: "DK with Arduino headers",
    description:
      "Nordic's dual-core Bluetooth LE development kit with Arduino-compatible headers, current measurement support, and Segger debugger.",
    tags: ["Nordic", "nRF5340", "BLE", "Thread", "Arduino headers"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Bluetooth", "Thread", "SWD"],
    highlights: [
      "Official Nordic page links hardware files and documentation.",
      "Good reference board for nRF Connect SDK development.",
      "Current measurement support helps low-power tuning.",
    ],
    warnings: [
      "Some GPIOs are shared with LEDs, buttons, debugger, and external memory.",
      "3.3 V IO only.",
      "Network/application core ownership affects firmware access to peripherals.",
    ],
    sourceLinks: [
      {
        label: "Nordic nRF5340 DK product page",
        url: "https://www.nordicsemi.com/Products/Development-hardware/nRF5340-DK",
        type: "Docs",
      },
    ],
  },
  {
    id: "nordic-nrf52-dk",
    name: "Nordic nRF52 DK",
    vendor: "Nordic Semiconductor",
    category: "Development Board",
    family: "nRF",
    processor: "Nordic nRF52832 Arm Cortex-M4F",
    logicLevel: "3.3 V GPIO",
    power: "USB, coin cell, external supply",
    formFactor: "DK with Arduino headers",
    description:
      "A widely used Nordic Bluetooth LE development kit exposing nRF52832 IO through headers and debugger-friendly board resources.",
    tags: ["Nordic", "nRF52832", "BLE", "Arduino headers", "Low power"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Bluetooth", "SWD"],
    highlights: [
      "Official page links schematics, hardware files, and documentation.",
      "Good baseline board for BLE firmware examples.",
      "Arduino-style headers make quick peripheral wiring easy.",
    ],
    warnings: [
      "3.3 V IO only.",
      "Radio antenna clearance and ground plane affect range.",
      "Board peripherals consume or load some GPIOs.",
    ],
    sourceLinks: [
      {
        label: "Nordic nRF52 DK product page",
        url: "https://www.nordicsemi.com/Products/Development-hardware/nRF52-DK",
        type: "Docs",
      },
    ],
  },
  {
    id: "ti-launchxl-cc1352p",
    name: "TI LAUNCHXL-CC1352P",
    vendor: "Texas Instruments",
    category: "Development Board",
    family: "LaunchPad",
    processor: "TI CC1352P SimpleLink wireless MCU",
    logicLevel: "3.3 V GPIO",
    power: "USB, boosterpack headers",
    formFactor: "LaunchPad with BoosterPack headers",
    description:
      "A SimpleLink wireless LaunchPad for Sub-1 GHz, 2.4 GHz, Thread, Zigbee, and Bluetooth LE development.",
    tags: ["TI", "LaunchPad", "CC1352P", "Sub-1 GHz", "Zigbee"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Bluetooth", "Zigbee", "Thread", "JTAG"],
    highlights: [
      "Official TI tool page links user's guide, schematics, and design files.",
      "BoosterPack headers support TI's add-on ecosystem.",
      "Useful for multi-protocol wireless firmware work.",
    ],
    warnings: [
      "3.3 V IO only.",
      "RF output path and regulatory settings must match the selected band.",
      "BoosterPack pins may be shared with onboard sensors or jumpers.",
    ],
    sourceLinks: [
      {
        label: "TI LAUNCHXL-CC1352P tool page",
        url: "https://www.ti.com/tool/LAUNCHXL-CC1352P",
        type: "Docs",
      },
    ],
  },
  {
    id: "ti-lp-mspm0g3507",
    name: "TI LP-MSPM0G3507",
    vendor: "Texas Instruments",
    category: "Development Board",
    family: "LaunchPad",
    processor: "TI MSPM0G3507 Arm Cortex-M0+",
    logicLevel: "3.3 V GPIO",
    power: "USB, BoosterPack headers",
    formFactor: "LaunchPad with BoosterPack headers",
    description:
      "A modern low-cost TI LaunchPad for MSPM0 development with onboard debugger and BoosterPack expansion.",
    tags: ["TI", "LaunchPad", "MSPM0", "Cortex-M0+", "BoosterPack"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "DAC", "PWM", "CAN", "USB", "SWD"],
    highlights: [
      "Official TI tool page links design files, user's guide, and schematics.",
      "BoosterPack headers expose common embedded interfaces.",
      "Good entry board for TI's newer MSPM0 family.",
    ],
    warnings: [
      "3.3 V IO; check BoosterPack voltage assumptions.",
      "Some pins are routed through jumpers or onboard peripherals.",
      "Use the TI user's guide for exact header-to-MCU mapping.",
    ],
    sourceLinks: [
      {
        label: "TI LP-MSPM0G3507 tool page",
        url: "https://www.ti.com/tool/LP-MSPM0G3507",
        type: "Docs",
      },
    ],
  },
  {
    id: "silabs-xg24-explorer-kit",
    name: "Silicon Labs xG24 Explorer Kit",
    vendor: "Silicon Labs",
    category: "Development Board",
    family: "Explorer Kit",
    processor: "EFR32xG24 wireless SoC",
    logicLevel: "3.3 V GPIO",
    power: "USB-C or coin cell/external supply",
    formFactor: "Explorer kit with mikroBUS and breakout pads",
    description:
      "A Silicon Labs wireless explorer kit for Bluetooth LE, Matter, OpenThread, and Zigbee development on EFR32xG24 devices.",
    tags: ["Silicon Labs", "EFR32", "Matter", "Thread", "Zigbee"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB", "Bluetooth", "Zigbee", "Thread", "SWD"],
    highlights: [
      "Official Silicon Labs page links kit documentation and board resources.",
      "mikroBUS socket and breakout pads support quick sensor experiments.",
      "Good board for Matter and multiprotocol wireless demos.",
    ],
    warnings: [
      "3.3 V IO only.",
      "Radio antenna placement and board orientation affect range.",
      "Pin functions depend on Simplicity Studio project configuration.",
    ],
    sourceLinks: [
      {
        label: "Silicon Labs xG24 Explorer Kit page",
        url: "https://www.silabs.com/development-tools/wireless/efr32xg24-explorer-kit",
        type: "Docs",
      },
    ],
  },
  {
    id: "digilent-arty-a7-35t",
    name: "Digilent Arty A7-35T",
    vendor: "Digilent",
    category: "Development Board",
    family: "Arty",
    processor: "AMD Artix-7 FPGA",
    logicLevel: "3.3 V PMOD and shield IO",
    power: "USB or external 7-15 V",
    formFactor: "FPGA trainer board with Arduino and PMOD headers",
    description:
      "A popular Artix-7 FPGA development board with PMOD connectors and Arduino/chipKIT-style headers for digital design labs.",
    tags: ["Digilent", "FPGA", "Artix-7", "PMOD", "Arduino headers"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "USB", "Ethernet", "JTAG"],
    highlights: [
      "Official Digilent reference page links schematic, manual, and XDC constraints.",
      "PMOD connectors make FPGA peripheral wiring repeatable.",
      "Arduino-style headers support shield-style FPGA experiments.",
    ],
    warnings: [
      "FPGA IO bank voltage and constraints must match connected hardware.",
      "There is no fixed pin function until the bitstream assigns it.",
      "Use the official XDC file to avoid swapped or overvoltage pins.",
    ],
    sourceLinks: [
      {
        label: "Digilent Arty A7 reference manual",
        url: "https://digilent.com/reference/programmable-logic/arty-a7/start",
        type: "Manual",
      },
    ],
  },
  {
    id: "digilent-cora-z7-10",
    name: "Digilent Cora Z7-10",
    vendor: "Digilent",
    category: "Development Board",
    family: "Cora",
    processor: "AMD Zynq-7000 SoC",
    logicLevel: "3.3 V PMOD IO",
    power: "USB or external 5 V",
    formFactor: "Zynq trainer board with PMOD headers",
    description:
      "A compact Zynq-7000 board exposing programmable logic IO through PMODs for embedded Linux plus FPGA teaching.",
    tags: ["Digilent", "Zynq", "FPGA", "PMOD", "Embedded Linux"],
    interfaces: ["GPIO", "I2C", "SPI", "UART", "PWM", "USB", "Ethernet", "JTAG"],
    highlights: [
      "Official reference page links manuals, schematics, and constraints.",
      "Combines ARM processing system with FPGA fabric.",
      "PMOD connectors simplify reusable peripheral add-ons.",
    ],
    warnings: [
      "Pin functions are determined by Vivado design and XDC constraints.",
      "Respect FPGA bank voltage limits before attaching PMODs.",
      "Linux device tree must match the hardware design for PS/PL peripherals.",
    ],
    sourceLinks: [
      {
        label: "Digilent Cora Z7 reference manual",
        url: "https://digilent.com/reference/programmable-logic/cora-z7/start",
        type: "Manual",
      },
    ],
  },
];

export const boards: Board[] = [
  ...baseBoards,
  ...additionalBoards,
  ...expansionBoards,
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
  "Zigbee",
  "Thread",
  "CSI",
  "PCIe",
] as const;
