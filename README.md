# PinHub

PinHub is a searchable pinout catalog for development boards, SBCs,
microcontrollers, and embedded hardware. Instead of digging through image search,
forum posts, PDFs, and vendor docs every time you need a board pinout, PinHub
puts board summaries, warnings, source links, and source-backed connector maps in
one clean interface.

## Current Build

- Next.js App Router with TypeScript and Tailwind CSS
- Static board catalog in `src/lib/boards.ts`
- Search by board name, vendor, processor, tag, interface, or warning text
- Filters for category and common interfaces
- Detail view with specs, wiring warnings, source references, and in-app pin maps
- Source-backed catalog for Raspberry Pi, Arduino, ESP32, STM32 Nucleo,
  BeagleBone, Jetson, Radxa, Orange Pi, Teensy, Adafruit, Seeed, SparkFun,
  and micro:bit boards

## Getting Started

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```

## Data Model

Board entries live in `src/lib/boards.ts` and include:

- board identity, vendor, category, family, processor, power, and logic level
- tags and supported interfaces
- highlights and wiring warnings
- source links for docs, manuals, datasheets, schematics, and pinouts
- optional in-app pinout maps for stable connector layouts

## Planned Features

- Board-to-board pinout comparison
- Pin function filtering for `UART`, `SPI`, `I2C`, `CAN`, `ADC`, `PWM`, `GPIO`,
  and power pins
- User-submitted board entries with review status
- Downloadable quick-reference sheets
- Favorites or saved boards
- Community verification for submitted pinouts
