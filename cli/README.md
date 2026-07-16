# PinHub CLI (`ph`)

PinHub puts source-backed hardware pinouts directly in your terminal. The
cross-platform `ph` command shows physical positions, GPIO names, power rails,
alternate functions, and wiring warnings without opening a browser.

Board data ships with the package, so normal commands run locally with no
network access or telemetry. Source links favor official vendor documentation
and are available from every board view.

```text
$ ph rpi5

Raspberry Pi 5 - Raspberry Pi
Source: Raspberry Pi GPIO documentation (official) - ph rpi5 --source
X GPIO uses 3.3 V logic. Do not apply 5 V to any GPIO pin.

40-pin GPIO header (J8)
  +--------------------+----+----+--------------------+
  | 3V3                |  1 |  2 | 5V                 |
  | GPIO2 / SDA1       |  3 |  4 | 5V                 |
  | GPIO3 / SCL1       |  5 |  6 | GND                |
  | ...                | .. | .. | ...                |
  +--------------------+----+----+--------------------+
```

## Requirements and installation

PinHub requires Node.js 18.18 or newer, which includes npm.

```bash
node --version
npm --version
npm install -g @dheerajsom/pinhub
ph --version
ph rpi5
```

It works in PowerShell and Windows Terminal on Windows, Terminal and iTerm2 on
macOS, and common Linux terminals. Install Node.js from
[nodejs.org](https://nodejs.org/) or with your platform package manager:

```powershell
winget install OpenJS.NodeJS.LTS
```

```bash
# macOS
brew install node

# Debian/Ubuntu or Fedora
sudo apt install nodejs npm
sudo dnf install nodejs
```

If a global npm install fails with permissions errors on macOS or Linux, prefer
an npm-owned prefix instead of `sudo npm install -g`:

```bash
npm config set prefix ~/.npm-global
```

Then add `~/.npm-global/bin` to your shell `PATH` and open a new terminal.

### Install from this repository

```bash
git clone https://github.com/Dheerajsom/PinHub.git
cd PinHub/cli
npm install
npm run build
npm install -g .
ph rpi5
```

You can also run the compiled command without installing it globally:

```bash
node dist/cli.js rpi5
```

## Commands

```bash
ph <board>            # render one board's pinout
ph list               # list the complete catalog
ph search <query>     # search names, aliases, and manufacturers
ph info <board>       # show description, warnings, headers, and aliases
ph <board> --source   # show documentation sources
ph help               # show command help
ph --version          # show the installed version
```

Names are case-insensitive and forgiving. For example, `ph rpi5`, `ph pi5`,
`ph raspberry-pi-5`, and `ph raspberry pi 5` resolve to the same board. If a
query does not match, `ph` suggests the closest entries.

Compatibility notes:

- `arduino-uno-rev3` is the canonical UNO identifier; the former
  `arduino-uno-r3` spelling remains an alias.
- `esp32` selects the DOIT 30-pin `esp32-devkit-v1`; the distinct 38-pin
  Espressif board is `esp32-devkitc`.
- Educational aliases include `frdm-kl25z`, `nexys-a7`, and `de10-lite`.

### Output options

| Flag | Effect |
| --- | --- |
| `--compact` | Use a tighter borderless layout for small terminals |
| `--ascii` | Use ASCII-only borders and symbols |
| `--no-color` | Disable ANSI colors |
| `--no-motion` | Disable the brief interactive signal pulse |
| `--details` | Expand additional alternate pin functions |
| `--json` | Emit machine-readable JSON for a board, list, or search |
| `--source` | Print one board's source links |
| `--width <n>` | Set a whole-number terminal width from 20 to 1000 |

Presentation flags work in any position, such as `ph list --no-color`,
`ph search pico --width 60`, and `ph info rpi5 --ascii`.

JSON keeps stdout clean and returns arrays for `list` and `search`. It cannot be
combined with `--ascii`, `--compact`, `--details`, `--source`, or `--width`.
`--source` and `--details` require a single board and cannot be combined with
`list` or `search`.

```bash
ph esp32
ph pico --compact
ph pico --details
ph rpi5 --ascii --no-color
ph uno --json | jq '.headers[].name'
ph search raspberry --json | jq '.[].id'
ph frdm-kl25z --source
```

## Catalog and accessibility

The CLI carries the complete PinHub website catalog across Raspberry Pi,
Arduino, Espressif, STM32, Nordic, TI, NXP, Digilent, Terasic, Lattice,
Teensy, Adafruit, SparkFun, Seeed, BeagleBoard, Jetson, and other ecosystems.
Run `ph list` for the current set.

- Pin categories use color, labels, category names, and reserved markers, so
  color is never the only signal.
- [`NO_COLOR`](https://no-color.org/), `--no-color`, and redirected output all
  disable ANSI color.
- `--ascii` avoids Unicode box drawing for older terminals and assistive tools.
- Layouts adapt from a bordered table to compact pairs and then a wrapped
  vertical list as terminal width shrinks.
- Warnings retain distinct symbols in color and monochrome modes.
- The interactive signal pulse never runs for pipes, CI, `TERM=dumb`, help,
  version, JSON, `--no-color`, or `--no-motion`. Set `PINHUB_NO_MOTION=1` to
  disable it persistently.

## Troubleshooting

### `ph` is not recognized or command not found

Find the npm global prefix with `npm prefix -g`. On Windows, that directory
itself (often `C:\Users\you\AppData\Roaming\npm`) must be on `PATH`; on macOS
and Linux, add `<prefix>/bin`. Open a new terminal after changing `PATH`.

### Boxes render as `?` or garbled characters

Use `ph <board> --ascii`. On Windows, prefer Windows Terminal; `chcp 65001` can
also help with piped output in legacy consoles.

### Colors or animation are missing

Color and motion turn off automatically for non-interactive output. Check
`NO_COLOR`, `PINHUB_NO_MOTION`, and `TERM`, or explicitly use `--no-color` and
`--no-motion` when deterministic output is desired.

### The diagram is cramped

Widen the terminal, use `--compact`, or supply an explicit width such as
`--width 100`.

### Uninstall

```bash
npm uninstall -g @dheerajsom/pinhub
```

## Hardware safety

Pinout data is hardware-critical. Board variants and revisions can differ,
especially among ESP32 carrier boards. Before wiring, compare the result with
your exact board's silkscreen and run `ph <board> --source` to inspect the cited
vendor documents. Never assume a 3.3 V GPIO is 5 V tolerant, and do not connect
power until voltage, ground, boot-strap, reserved, and shared-peripheral pins
have been checked.

## Contributing boards

Most CLI data is generated from the website catalog in `src/lib/boards.ts` at
the repository root. Add or correct a board there first, keeping it backed by
official pinouts, manuals, schematics, or datasheets. Then:

```bash
cd cli
npm run generate:boards
```

Add short, normalized aliases people actually type to
`scripts/curated-aliases.ts`. Catalog tests enforce source coverage, warning
coverage, alias uniqueness, connector positions, and generated-data parity.

Five flagship boards (Pi 5, Pico, Pico W, UNO R3, and ESP32 DevKit V1) retain
richer hand-written modules under `src/boards/`. For those modules:

- Give every pin a physical number, grid position, label, and category.
- Include at least one official source URL; clearly mark any necessary
  third-party source.
- Include voltage, boot-strap, reserved-pin, and revision warnings.

## Development and release

```bash
cd cli
npm install
npm run dev -- rpi5     # run directly from TypeScript
npm run generate:boards # regenerate website-backed board modules
npm run check:boards    # verify generated data is current
npm run lint
npm test
npm run build
npm run package:check
```

The entry point is `src/cli.ts`. `src/run.ts` contains the deterministic command
surface and writes to captured buffers for tests. Renderers under `src/render/`
handle dual-row, compact, and vertical layouts. CI exercises lint, tests, build,
and smoke coverage on Windows, macOS, and Linux.

To publish an intentional SemVer release from `cli/`:

```bash
npm version patch       # or minor / major
npm publish --access public
```

The `prepublishOnly` hook checks generated board data, lint, tests, and build.
The package allowlist ships only compiled output and this README.

More links: [PinHub website](https://pinhub.vercel.app) ·
[source and issues](https://github.com/Dheerajsom/PinHub)
