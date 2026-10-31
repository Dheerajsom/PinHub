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
| `/pinout/[id]` | Full interactive pin map with role filters, net probing, and Markdown/CSV export |
| `/boards/[id]` | Specs, wiring warnings, and sources |
| `/pinout/[id]/opengraph-image`, `/boards/[id]/opengraph-image` | 1200×630 link-preview image of the board's pins, colored by role |
| `/compare` | Up to four boards side by side; differences first; shareable URL |
| `/planner` | Mark the pins you use and fit I2C, SPI, UART, PWM, and ADC into what's left |
| `/link` | Wire two boards over UART or I2C, with logic-level mismatch warnings |
| `/prices` | Dated USD prices and stock for curated listings, refreshed hourly |
| `/collections` | Shareable board sets from your local library |

Favorites and collections stay in local storage; nothing requires an account.

## JSON API

Read-only, no key required. The board and pin routes reject query strings
(`400`) and mutating methods (`405`).

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
