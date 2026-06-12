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
];

export const boards: Board[] = [...baseBoards, ...additionalBoards];

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
