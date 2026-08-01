<p align="center">
  <img src="public/pinhub-logo.png" alt="PinHub" width="280" />
</p>

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
- Local favorites with cross-tab sync and a favorites-only filter
- Detail view with specs, wiring warnings, source references, and in-app pin maps
- Interactive pin maps with pin-function filtering, so selecting a role such as
  `I2C` or `PWM` dims every pin that does not serve it
- Side-by-side board comparison at `/compare`
- Read-only JSON API at `/api/boards/[id]`
- Source-backed catalog for Raspberry Pi, Arduino, ESP32, STM32 Nucleo,
  BeagleBone, Jetson, Radxa, Orange Pi, Teensy, Adafruit, Seeed, SparkFun,
  and micro:bit boards

## Compare

`/compare` answers the question the catalog cannot: *which of these boards
should I actually use?* Picking between a Pico and a QT Py, or a Pi 5 and an
Orange Pi, usually means opening several vendor pages and holding the
differences in your head. Compare puts them in one table.

Select boards from the discovery view — the tray at the bottom of the screen
tracks the set — then open the comparison. Up to **three boards** can be
compared at once, across twelve attributes:

- **Silicon and power** — compute class, processor, logic level, 5 V tolerance,
  power input
- **Physical and connectivity** — form factor, wireless, connector ecosystem,
  interfaces
- **Trust signals** — in-app pin map availability, wiring-caution count, number
  of linked sources

Three things make it a decision tool rather than a spec dump:

- **Differences surface first.** The table hides identical rows by default, so
  what is left on screen is only what actually separates the boards. Toggle
  *Show identical* when you need the full picture.
- **Electrical compatibility stays visible.** Logic level, 5 V tolerance, and
  the wiring-caution count are first-class rows. A board that wins on specs and
  loses on voltage should lose the comparison, and here it visibly does.
- **Comparisons are shareable.** The board set lives in the URL
  (`/compare?boards=raspberry-pi-5,raspberry-pi-pico`), so a comparison can be
  pasted into an issue, a chat, or a purchase request. The *Share* button copies
  the current link.

On phones the table becomes one card per attribute, each listing every board's
value, so no board is hidden past the right edge of a scrolling table.

Useful for choosing a board for a project, checking whether a board you already
own can drive a given peripheral, justifying a purchase to someone else, or
sanity-checking that two boards are pin-compatible before you rewire anything.

## Getting Started

```bash
npm install
npm run dev
```

## Command-Line Interface

PinHub is also available as the cross-platform `ph` terminal command:

```bash
npm install -g @dheerajsom/pinhub
ph rpi5
```

See the [complete CLI guide](cli/README.md) for installation, commands, output
options, troubleshooting, board aliases, development, and release instructions.

## Routes

| Route | Purpose |
|---|---|
| `/` | Catalog: search, filter, favorites, and board detail |
| `/compare` | Board discovery and side-by-side comparison |
| `/boards/[id]` | Board overview, specs, warnings, and sources |
| `/pinout/[id]` | Full interactive connector map |
| `/api/boards/[id]` | Board record as JSON |

## JSON API

Every board is also served as a static JSON record:

```bash
curl https://pinhub-mauve.vercel.app/api/boards/raspberry-pi-5
```

The response is the board object described under [Data Model](#data-model).
Unknown ids return `{"error":"Board not found"}` with a `404`. Records are
generated at build time and served with a CDN cache policy, so the endpoint is
safe to poll and needs no API key.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Both the website and CLI workflows also run `npm audit --audit-level=high`.
Dependabot checks npm and GitHub Actions dependencies weekly.

## Deployment

The production website is deployed from `main` to
[pinhub-mauve.vercel.app](https://pinhub-mauve.vercel.app). The application is
statically generated for every known board, requires no runtime environment
variables, and publishes a robots policy, sitemap, web app manifest, canonical
URLs, and social metadata. Unknown API records return a JSON 404.

The CLI is published separately as `@dheerajsom/pinhub` on npm. Run the web
and CLI validation commands before publishing either surface.

## Data Model

Board entries live in `src/lib/boards.ts` and include:

- board identity, vendor, category, family, processor, power, and logic level
- tags and supported interfaces
- highlights and wiring warnings
- source links for docs, manuals, datasheets, schematics, and pinouts
- optional in-app pinout maps for stable connector layouts

## Planned Features

- Pin-by-pin diffing between two connector maps, beyond the board-level
  comparison that ships today
- User-submitted board entries with review status
- Downloadable quick-reference sheets
- Community verification for submitted pinouts

## Contributing

Board additions are welcome, especially for hardware you own and can check
against the real thing. Adding a board is a single edit to `src/lib/boards.ts`
plus at least one official vendor source link.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the catalog rules, the validation
the build enforces, and how to open an issue or a pull request.

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) — adding boards, reporting pinout errors
- [cli/README.md](cli/README.md) — the `ph` command-line client
- [docs/DESIGN.md](docs/DESIGN.md) — product direction and UI reference
- [AGENTS.md](AGENTS.md) — conventions for automated contributors

## License

Released under the [MIT License](LICENSE).

Catalog data is compiled from vendor documentation, which remains the property
of the respective vendors. PinHub is not affiliated with or endorsed by any
board vendor.

## A Note on Accuracy

PinHub is a reference, not a substitute for the vendor's documentation. Board
revisions change pin assignments, and a pin map that is correct for one revision
can be wrong for the next. Check the linked official sources before wiring
anything you cannot afford to replace, and please
[open an issue](https://github.com/Dheerajsom/PinHub/issues) if you find an
entry that disagrees with your hardware.
