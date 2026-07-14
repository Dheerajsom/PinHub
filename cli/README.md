# PinHub CLI

PinHub puts hardware board pinouts directly in your terminal. The `ph` command
shows pin numbers, GPIO names, power and ground rails, alternate functions, and
important wiring warnings without requiring a browser.

Board data ships with the package, so commands run locally with no network
access or telemetry. Sources favor official vendor documentation and can be
viewed from the CLI.

## Install

PinHub requires Node.js 18.18 or newer.

```bash
npm install -g @dheerajsom/pinhub
```

Confirm the installation and open your first pinout:

```bash
ph --version
ph rpi5
```

PinHub works in PowerShell and Windows Terminal on Windows, Terminal and iTerm2
on macOS, and common Linux terminals.

## Common commands

```bash
ph <board>            # show a board pinout
ph list               # browse all supported boards
ph search <query>     # search names, aliases, and manufacturers
ph info <board>       # show board details and warnings
ph <board> --source   # show documentation sources
ph help               # show command help
```

Board aliases are flexible, so commands such as `ph rpi5`, `ph pi5`, `ph pico`,
`ph uno`, and `ph esp32` work as expected.

Useful output options include `--compact`, `--ascii`, `--no-color`, `--details`,
`--json`, and `--width <n>`.

## More information

- [Complete command guide](CLI.md)
- [Setup and troubleshooting](SETUP.md)
- [PinHub website](https://pinhub.vercel.app)
- [Source code and issues](https://github.com/Dheerajsom/PinHub)

Pinouts are hardware-critical and board revisions can differ. Always verify the
result against your exact board's silkscreen and vendor documentation before
connecting power or signals.
