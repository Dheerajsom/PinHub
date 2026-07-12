# Setting up the PinHub CLI (`ph`)

This guide walks you through installing the `pinhub` package so the `ph`
command is available in your terminal, on Windows, macOS, or Linux.

## 1. Prerequisites

The only requirement is **Node.js 18.18 or newer** (which includes npm).

Check what you have:

```bash
node --version
npm --version
```

If you need Node.js:

- **Windows:** `winget install OpenJS.NodeJS.LTS`, or download from
  [nodejs.org](https://nodejs.org/).
- **macOS:** `brew install node`, or download from
  [nodejs.org](https://nodejs.org/).
- **Linux:** use your distribution's package manager or
  [nodesource](https://github.com/nodesource/distributions), e.g.
  `sudo dnf install nodejs` / `sudo apt install nodejs npm`.

No `sudo` is required to *run* `ph`, and the CLI itself never touches the
network — all board data is bundled.

## 2. Install from npm (recommended)

```bash
npm install -g @dheerajsom/pinhub
```

Then verify:

```bash
ph --version
ph rpi5
```

If `ph` prints a pinout diagram, you're done.

> **Note on `sudo npm install -g` (macOS/Linux):** if global installs fail
> with a permissions error, prefer fixing your npm prefix over using sudo:
> `npm config set prefix ~/.npm-global` and add `~/.npm-global/bin` to your
> `PATH`.

## 3. Install from source (this repository)

```bash
git clone https://github.com/Dheerajsom/PinHub.git
cd PinHub/cli
npm install
npm run build
npm install -g .
```

`npm install -g .` links the built CLI into your global npm bin, giving you
the same `ph` command as an npm install. Alternatively, run it in place
without installing:

```bash
node dist/cli.js rpi5
# or straight from TypeScript during development:
npm run dev -- rpi5
```

## 4. First steps

```bash
ph list                 # see all 126 boards in the catalog
ph rpi5                 # Raspberry Pi 5 GPIO header
ph pico                 # Raspberry Pi Pico
ph uno                  # Arduino UNO R3
ph esp32                # ESP32 DevKit V1 (DOIT, 30-pin)
ph esp32-s3             # ESP32-S3-DevKitC-1
ph blue-pill            # STM32F103 "Blue Pill"
ph teensy               # Teensy 4.1
ph search raspberry     # find boards
ph info esp32           # warnings, sources, aliases
ph rpi5 --source        # official documentation links
```

Useful flags: `--compact` (small terminals), `--ascii` (strict ASCII),
`--no-color`, `--no-motion`, `--details` (all alternate functions), `--json`
(script-friendly), and `--width <n>` (20 to 1000 columns).

`--json` is a separate machine-readable view and cannot be combined with
`--ascii`, `--compact`, `--details`, `--source`, or `--width`. Source and detail
views require one board and cannot be requested together.

Board names are forgiving — `ph rpi5`, `ph pi5`, and `ph raspberry pi 5` all
work. If you guess wrong, `ph` suggests the closest matches.

## 5. Troubleshooting

**`ph` is not recognized / command not found**
The npm global bin directory is not on your `PATH`.

- Find it with `npm prefix -g`. On Windows that directory itself (e.g.
  `C:\Users\you\AppData\Roaming\npm`) must be on `PATH`; on macOS/Linux it's
  `<prefix>/bin`.
- Open a *new* terminal after installing — `PATH` changes don't apply to
  already-open sessions.

**Boxes render as `?` or garbled characters**
Your terminal or font doesn't support Unicode box-drawing. Use `ph <board>
--ascii`. On legacy Windows consoles, Windows Terminal is recommended;
`chcp 65001` can also help with piped output.

**No colors, or you want no colors**
Color is automatically disabled when output is piped or when the
[`NO_COLOR`](https://no-color.org/) environment variable is set. Force it off
per-invocation with `--no-color`.

**You prefer no terminal animation**
The short signal pulse only appears in an interactive color terminal. It is
automatically disabled for pipes, CI, `TERM=dumb`, help, version, and JSON.
Use `--no-motion` for one command, or set `PINHUB_NO_MOTION=1` to keep it off.

**The diagram looks cramped or wraps badly**
`ph` adapts to terminal width and falls back to a compact layout, but you can
control it: widen the terminal, or use `--compact`, or `--width 100`.

**Uninstall**

```bash
npm uninstall -g @dheerajsom/pinhub
```

## 6. A note on hardware safety

`ph` shows each board's voltage levels, reserved pins, and boot-strap pins,
and cites its documentation sources — but board revisions differ (ESP32
boards especially). Always cross-check your exact board's silkscreen and the
source list (`ph <board> --source`), including any third-party label, before
wiring. 3.3 V GPIO does
not forgive 5 V.
