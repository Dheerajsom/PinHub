<p align="center">
  <img src="public/pinhub-logo.png" alt="PinHub" width="280" />
</p>

PinHub is a searchable, source-backed pinout catalog for development boards,
SBCs, and microcontroller modules — Raspberry Pi, Arduino, ESP32, STM32 Nucleo,
Teensy, Adafruit, Seeed, SparkFun, BeagleBone, Jetson, and more. Every board
links to official documentation, and most carry an interactive pin map.

**Live:** [pinhub-mauve.vercel.app](https://pinhub-mauve.vercel.app)

## Features

| Route | What it does |
|---|---|
| `/` | Catalog: search boards and pins (`pico sda`, `rpi5 spi`, `esp32 gpio27`), filter, favorite, and open board detail |
| `/boards/[id]` | The board page: specs, wiring cautions (always before the map), price, sources, and the pin workbench — pin search, one **Show pins** filter that narrows the table and highlights the drawing together (`?show=`, shareable), selected-pin summary and diagram jump (`?pin=`), net probing, a colour key, complete print schedule, and Markdown/CSV export |
| `/pinout/[id]` | Permanent redirect to `/boards/[id]`, keeping the query string; an old `?role=` link opens with the matching Show pins filter on |
| `/boards/[id]/opengraph-image` | 1200×630 link-preview image of the board's pins, colored by role |
| `/compare` | Discover boards with labeled filters, then compare up to four side by side; differences first; shareable URL |
| `/find` | **Board finder.** Count the I2C, SPI, UART, CAN, PWM, ADC, DAC, and GPIO your project needs (optionally narrowed by platform, logic level, and wireless) and see every board where all of it fits at once, with the pins it would use. Runs the pin planner's own search on the server for each board with source-backed pin functions; each fit opens in the planner as the same plan, each miss says why, and boards without pin-function data are counted, not guessed. Shareable URL (`?plan=i2c1.adc2&logic=3v3`) |
| `/planner` | **Pin planner.** Review board cautions, mark the pins you use, and fit I2C, SPI, UART, PWM, and ADC into what's left |
| `/check` | **Code check.** Paste Arduino, MicroPython, CircuitPython, Raspberry Pi Python, Pico SDK, or ESP-IDF code, pick its board, and see each pin reference it recognises checked against the record (input-only, reserved, strapping, flash/PSRAM and USB pins, missing ADC/DAC/PWM/bus functions, the wrong MicroPython bus id), plus the values it could not follow. Runs in the browser; hands the pins to the planner |
| `/link` | **Connect two boards.** Wire two boards over UART or I2C, with board cautions and logic-level mismatch warnings |
| `/prices` | Dated USD prices and stock for 31 curated listings (Adafruit and the Arduino store), refreshed hourly |
| `/collections` | Shareable board sets from your local library, with explicit four-board comparison subsets |

The header links to Pin Maps, Compare, and Prices; the **Tools** menu lists
Board finder, Pin planner, Code check, and Connect two boards, each with a one-line summary.

Favorites and collections use local storage; if the browser refuses a write,
PinHub identifies changes kept for this visit only. Nothing requires an account.

## JSON API

Read-only, no key required. Each route below rejects query strings (`400`)
and mutating methods (`405`).

```bash
curl https://pinhub-mauve.vercel.app/api/boards                 # index
curl https://pinhub-mauve.vercel.app/api/boards/raspberry-pi-5  # full record
curl https://pinhub-mauve.vercel.app/api/pins                   # pin index
curl https://pinhub-mauve.vercel.app/api/prices                 # price snapshot
```

## CLI

```bash
npm install -g @dheerajsom/pinhub
ph rpi5
```

See [cli/README.md](cli/README.md).

## Development

Next.js App Router, TypeScript, Tailwind CSS v4. Board data is static in
`src/lib/boards.ts`.

```bash
npm install
npm run dev
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e   # Playwright, port 3100
```

The build also validates board visuals and source links. Prices are optional
locally: without Blob credentials the app uses the bundled dated snapshot (see
[docs/board-prices.md](docs/board-prices.md)).

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) — adding boards, reporting pinout errors
- [docs/DESIGN.md](docs/DESIGN.md) — design language and UI reference
- [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md) — rules for automated contributors

## Accuracy and license

PinHub is a reference, not a substitute for vendor documentation. Board
revisions change pin assignments; check the linked sources before wiring
anything you can't replace, and
[open an issue](https://github.com/Dheerajsom/PinHub/issues) if an entry
disagrees with your hardware.

[MIT License](LICENSE). Catalog data is compiled from vendor documentation,
which remains the vendors' property. PinHub is not affiliated with any vendor.
