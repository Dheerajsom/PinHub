# Contributing to PinHub

Contributions are welcome, and the most valuable ones come from people adding
hardware they actually own.

**If you use a board or dev kit that PinHub does not cover yet, please add it.**
Open an issue if you would rather someone else do the data entry, or open a pull
request if you want to add it yourself. Personal boards, obscure dev kits,
regional clones, and discontinued hardware are all in scope — if you had to hunt
for the pinout once, someone else is hunting for it right now.

You do not need to be a web developer. Adding a board is one entry in a
TypeScript file, and the rules below exist so a correct entry passes on the
first try.

## Ways to contribute

| | |
|---|---|
| **Add a board** | The catalog is the product. See [Adding a board](#adding-a-board). |
| **Report a wrong pin** | The highest-priority bug class. See [Reporting a pinout error](#reporting-a-pinout-error). |
| **Add a pin map** | Many boards have specs but no connector map yet. |
| **Improve warnings** | Voltage, boot straps, and reserved pins that bite people. |
| **Fix the site or CLI** | Bugs, accessibility, performance, docs. |

## Ground rule: everything is source-backed

PinHub's value is that an engineer can trust it enough to wire against. So the
catalog does not accept undocumented data.

**Every board must link to at least one official vendor source.** This is not a
style preference — the build fails without it. Blog posts, forum threads, and
image-search results are not sufficient on their own, though they are fine as
*additional* links when they genuinely fill a gap.

If you are using an AI assistant to help gather pin data, verify its output
against a machine-readable source before submitting — a vendor datasheet, a
CircuitPython `pins.c`, a Zephyr devicetree, an Arduino variant file, or a
schematic. Confidently-worded pin assignments are wrong often enough that a
stated confidence level means nothing here. A wrong pin can destroy someone's
hardware.

## Adding a board

Board entries live in [`src/lib/boards.ts`](src/lib/boards.ts). Copy a nearby
entry with a similar shape and edit it.

**Check whether your board is already there first.** The catalog is denser than
it looks, and it already covers most mainstream variants. Search the file for
the vendor name before writing a new entry — `id` must be unique, and a
duplicate fails the integrity test.

The shape, with placeholder values:

```ts
{
  id: "vendor-board-name",           // kebab-case, unique across the catalog
  name: "Vendor Board Name",
  vendor: "Vendor",                  // must match the vendor domain registry
  category: "Microcontroller",       // see allowed values below
  family: "SoC or product family",
  processor: "Dual-core Arm Cortex-M33 @ 150 MHz",
  logicLevel: "3.3 V logic, not 5 V tolerant",
  power: "5 V via USB-C, 1.8–5.5 V via VSYS",
  formFactor: "21 x 51 mm castellated module",
  description: "…",                  // one or two scannable sentences
  tags: ["soc-name", "microcontroller"],
  interfaces: ["GPIO", "I2C", "SPI", "UART", "ADC", "PWM", "USB"],
  highlights: ["…"],
  warnings: ["…"],                   // see Warnings below
  sourceLinks: [
    {
      label: "Board datasheet",
      url: "https://vendor.example/datasheet.pdf",
      type: "Datasheet",
    },
  ],
  pinout: { /* optional — see Pin maps below */ },
}
```

Every string field above is required and must be non-empty. `tags` and
`interfaces` must not contain duplicates.

**`category`** — one of `SBC`, `Microcontroller`, `AI Dev Kit`,
`Development Board`.

**`interfaces`** — any of `GPIO`, `I2C`, `SPI`, `UART`, `ADC`, `DAC`, `PWM`,
`CAN`, `USB`, `Wi-Fi`, `Bluetooth`, `Zigbee`, `Thread`, `CSI`, `PCIe`, `SWD`,
`JTAG`, `Ethernet`.

### Source links

Each entry in `sourceLinks` needs a `label`, a `url`, and a `type` of `Docs`,
`Pinout`, `Datasheet`, `Schematic`, or `Manual`.

The build enforces all of the following:

- At least one source link.
- At least one link on an **official vendor domain**.
- Absolute public `https://` URLs only, with no embedded credentials, IP/local
  hostnames, or non-default ports.
- No duplicate URLs within the same board.

**Adding a vendor PinHub has not seen before?** Its domain also has to be
registered in [`src/lib/source-trust.ts`](src/lib/source-trust.ts), or the
official-source check will fail even though your link is legitimate. Add the
registrable domain to `vendorDomains` (or the org to `vendorGitHubOrgs` for
vendors who publish on GitHub). Subdomains match automatically.

Where a board is a carrier for someone else's module, the chip or module
vendor's electrical documentation counts as official — there are existing
examples in that file, with comments explaining why.

### Warnings

Treat pinout data as hardware-critical. `warnings` is where you protect the
next person. Call out:

- Voltage levels and 5 V tolerance
- Boot strapping pins that must be left alone at reset
- Reserved pins (ID EEPROM, eFuse, internal flash/PSRAM)
- Alternate-function caveats and pin multiplexing surprises
- **Revision differences** — for boards whose pin map changed between
  revisions, put the revision risk in `warnings` rather than implying one
  universal map

### Pin maps

`pinout` is optional; a board with good specs and no connector map is still a
useful entry. If you do add one:

- `connector` — the physical connector's name, as the vendor labels it
  (for example `J8 40-pin GPIO header`)
- `notes` — at least one note, no duplicates
- `layout: "dual-row"` — requires `pins.left` and `pins.right`, both non-empty
- `layout: "grouped"` — requires `groups`, each with a unique label and at
  least one pin

Each pin needs a `position`, a `label`, and a `role` from: `power`, `ground`,
`gpio`, `i2c`, `spi`, `uart`, `adc`, `dac`, `pwm`, `debug`, `system`,
`special`, `reserved`. Optional `aliases` (such as `SDA1`) feed search, and an
optional `note` covers per-pin caveats.

Roles drive the colour coding and the pin-function filter, so pick the role a
user would filter by to find that pin.

## Reporting a pinout error

If PinHub disagrees with your hardware, that is the most important kind of
issue you can file. Please include:

1. The board id or URL (for example `/pinout/raspberry-pi-5`)
2. The specific pin and what PinHub currently says
3. What it should say
4. Your board's exact revision, if it is printed on the silkscreen
5. A source — a vendor doc, or a description of how you measured it

A report with no source is still worth filing. Say what you observed and we
will chase the documentation.

## Before you open a pull request

Run all four:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` includes catalog integrity checks that will catch duplicate or
non-route-safe ids, missing wiring warnings, empty required fields, malformed
source links, and incomplete connector maps — so run it before pushing rather
than waiting on CI. `npm run build` additionally fails on unsafe or missing
source links and on pin maps the board visuals cannot render.

Web CI runs the same commands, plus `npm audit --audit-level=high`, on pull
requests that touch the website, catalog, or their test and configuration
paths.

If you changed the CLI, see [cli/README.md](cli/README.md) for its own
validation steps.

## Style

- Keep the UI dense, scannable, and engineer-friendly. The catalog stays the
  first screen; PinHub has no marketing sections and does not want any.
- Icons are for tools and commands, not decoration.
- Match the surrounding code. There is no separate formatting step beyond
  `npm run lint`.
- Comments should explain *why* something is the way it is, not restate the
  code. The existing comments in `src/lib/source-trust.ts` are a good model.

## Pull request expectations

- One logical change per PR. A batch of unrelated board additions is fine and
  counts as one logical change.
- Say how you verified pin data — "checked against the datasheet, table 3" or
  "measured with a multimeter on my rev 1.2 board" both work.
- Small PRs get reviewed faster, but do not split a board entry across several.

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).

## Questions

Not sure whether a board belongs, or whether your source is good enough? Open
an issue and ask. A question costs less than a wrong pin map.
