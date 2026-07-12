# PinHub CLI (`ph`)

`@dheerajsom/pinhub` installs a tiny cross-platform command, **`ph`**, that draws hardware
board pinout diagrams straight in your terminal — pin numbers, GPIO names,
power/ground rails, and the safety warnings that matter, sourced from official
vendor documentation.

```text
$ ph rpi5

Raspberry Pi 5 — Raspberry Pi
Source: Raspberry Pi GPIO documentation (official) — see ph raspberry-pi-5 --source
✖ GPIO uses 3.3 V logic. Do not apply 5 V to any GPIO pin.

40-pin GPIO header (J8)
  ┌────────────────────┬────┬────┬───────────────────┐
  │ 3V3                │  1 │  2 │ 5V                │
  │ GPIO2 / SDA1       │  3 │  4 │ 5V                │
  │ GPIO3 / SCL1       │  5 │  6 │ GND               │
  │ GPIO4 / GPCLK0     │  7 │  8 │ GPIO14 / TXD0     │
  │ GND                │  9 │ 10 │ GPIO15 / RXD0     │
  │ …                  │  … │  … │ …                 │
  └────────────────────┴────┴────┴───────────────────┘
```

Works on Windows (PowerShell, Windows Terminal), macOS (Terminal, iTerm2), and
Linux. No network access, no telemetry — all board data ships in the package.

## Install

Requires Node.js 18.18 or newer.

```bash
npm install -g @dheerajsom/pinhub
ph rpi5
```

See [SETUP.md](SETUP.md) for step-by-step setup, installing from source, and
troubleshooting.

Planned package-manager support: Homebrew, winget/Scoop/Chocolatey, Fedora
RPM/dnf, and Debian/Ubuntu deb/apt.

## Usage

```bash
ph <board>            # render a pinout diagram
ph list               # all boards in the catalog
ph search <query>     # find boards by name, alias, or manufacturer
ph info <board>       # description, headers, warnings, sources, aliases
ph help               # usage help
ph --version          # version
```

Board names are forgiving: `ph rpi5`, `ph pi5`, `ph raspberry-pi-5`, and
`ph raspberry pi 5` all resolve to the same board, case-insensitively.

Compatibility note for 0.2: `arduino-uno-rev3` is the canonical UNO identifier
used by list and JSON output; the former `arduino-uno-r3` spelling remains a
supported alias. `esp32` continues to select the DOIT 30-pin
`esp32-devkit-v1`; the distinct 38-pin Espressif board is `esp32-devkitc`.

### Output flags

| Flag | Effect |
| --- | --- |
| `--compact` | Tighter, borderless layout for small terminals |
| `--ascii` | ASCII-only borders and symbols (no Unicode) |
| `--no-color` | Disable ANSI colors |
| `--no-motion` | Disable the brief interactive signal pulse |
| `--details` | Show additional alternate pin functions |
| `--json` | Emit machine-readable JSON (one board or a list/search array) |
| `--source` | Print one board's documentation source links |
| `--width <n>` | Use a whole-number terminal width from 20 to 1000 |

Presentation flags are global and work in any position, including `ph list
--no-color`, `ph search pico --width 60`, and `ph info rpi5 --ascii`. JSON
always keeps stdout pure; `list` and `search` return arrays. Because `--source`
and `--details` are one-board views, using them with `list` or `search` fails
with a short correction instead of silently ignoring the flag. JSON is a
separate machine-readable view, so it cannot be combined with `--ascii`,
`--compact`, `--details`, `--source`, or `--width`; `--no-color` and
`--no-motion` remain safe global opt-outs.

Examples:

```bash
ph rpi5
ph esp32
ph pico --compact
ph pico --details
ph rpi5 --ascii --no-color
ph uno --json | jq '.headers[].name'
ph search raspberry --json | jq '.[].id'
ph rpi5 --source
```

## Boards

The catalog carries the full [PinHub website](https://pinhub.vercel.app) board
set — 126 boards across Raspberry Pi, Arduino, Espressif, STM32, Teensy,
Adafruit, SparkFun, Seeed, BeagleBone, Jetson, and more. Run `ph list` to see
everything. A few starters:

| Board | Try |
| --- | --- |
| Raspberry Pi 5 / 4 / Zero 2 W | `ph rpi5` · `ph rpi4` · `ph zero-2-w` |
| Raspberry Pi Pico / Pico 2 / W | `ph pico` · `ph pico2` · `ph pico-w` |
| Arduino UNO R3 / Nano / Mega | `ph uno` · `ph nano` · `ph mega` |
| ESP32 DevKit V1, S2/S3/C3/C6/H2 | `ph esp32` · `ph esp32-s3` · `ph esp32-c3` |
| STM32 Blue Pill / Nucleo | `ph blue-pill` · `ph nucleo` |
| Teensy 4.1, micro:bit V2, … | `ph teensy` · `ph microbit` |

## Color and accessibility

- Pin categories are color-coded (power red/yellow, ground gray, GPIO green,
  communication cyan, analog blue, reserved magenta), but color is never the
  only signal — labels, category names, and the `*` reserved marker survive
  `--no-color` and piping.
- The [`NO_COLOR`](https://no-color.org/) environment variable is honored, as
  is `--no-color`.
- When output is piped or redirected (not a TTY), color is disabled
  automatically and the layout stays stable.
- `--ascii` guarantees ASCII-only text for legacy terminals and screen readers
  that struggle with box-drawing characters.
- On narrow terminals the diagram degrades gracefully: full bordered table →
  compact pairs → wrapped vertical list. Catalog tables, warnings, long source
  titles, and URLs wrap to the requested terminal-cell width without truncating
  hardware information.
- Danger, warning, and informational messages use distinct symbols (`✖`, `⚠`,
  `ℹ`; or `X`, `!`, `i` in ASCII mode), so severity never depends on color.
- Interactive commands briefly show a color-cycling signal pulse before their
  result. It is written to the TTY only and erases itself. It never runs for
  pipes, CI, `TERM=dumb`, help, version, JSON, `--no-color`/`NO_COLOR`, or
  `--no-motion`. `PINHUB_NO_MOTION=1` disables it persistently.
- Pin-specific notes are printed below their header and marked on the diagram.
  The first alternate function remains inline; `--details` expands any
  additional functions.

## Hardware safety disclaimer

Pinout data is hardware-critical. Every board in the catalog cites its
sources (`ph <board> --source`), preferring official vendor documentation;
third-party sources are explicitly marked. Board *variants and revisions can
differ* — especially ESP32 dev boards — so always verify against your exact
board's silkscreen and vendor documentation before wiring anything.
Miswiring power pins can permanently damage your hardware. Use at your own
risk.

## Contributing boards

Most of the catalog is **generated from the PinHub website data**
(`src/lib/boards.ts` at the repository root). To add or fix a board:

1. Add it to the website catalog first (it must stay source-backed there),
   then run `npm run generate:boards` in `cli/` to regenerate
   `src/boards/generated.ts`.
2. Add short aliases people actually type in `scripts/curated-aliases.ts`.
3. Run `npm test` — catalog invariant tests check sources, warnings, alias
   uniqueness, and pin-grid consistency across all 126 boards.

Five flagship boards (Pi 5, Pico, Pico W, UNO R3, ESP32 DevKit V1) have richer
hand-written modules in `src/boards/`, one file per board, using the typed
model in `src/model.ts`. For those:

- Every pin needs a `physical` number, a grid `position`, a `label`, and a
  `category`.
- Include at least one **official** source URL (datasheet, schematic, or
  vendor pinout). Third-party sources are allowed only when official
  documentation is unavailable and must be marked `official: false`.
- Include the safety warnings that apply (logic level, strapping pins,
  reserved pins, revision differences).

## Development

```bash
cd cli
npm install
npm run dev -- rpi5     # run from TypeScript source
npm test                # vitest suite (alias, JSON, rendering, snapshots)
npm run lint            # eslint
npm run build           # compile to dist/
npm run check:boards    # verify generated catalog data is current
npm run package:check   # npm pack --dry-run
```

The CLI entry point is `src/cli.ts`; `src/run.ts` contains the whole command
surface as a deterministic, testable function that writes to captured buffers.
The executable-only signal pulse stays at the `src/cli.ts` boundary, so library
callers and JSON output never receive animation controls. Renderers live
in `src/render/` behind a small abstraction (`dual-row` bordered table,
compact pairs, and vertical list), so new header layouts can be added without
touching board data. CI runs lint, tests, build, and a smoke test on Windows,
macOS, and Linux via GitHub Actions.

To publish a SemVer release from `cli/` (choose the appropriate version level):

```bash
npm version patch
npm publish --access public
```

The `prepublishOnly` hook verifies generated board data, lints, tests, and
builds. The `files` allowlist ships only the compiled CLI and its user
documentation.
