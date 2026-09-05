# Raspberry Pi Static and Dynamic redesign

The Dynamic view implements the Raspberry Pi component-view concept across all 15
Raspberry Pi entries currently in the catalog. It uses original vector artwork,
not a generated raster image, so the board stays sharp at different sizes and
the contacts remain interactive.

## Experience

- Static: original compact circular pin map, paired in source connector order,
  with role colors, signal labels, per-pin copy, and full-table Markdown copy.
  All boards use the shared `PinoutDiagram`; Static contains no board artwork.
  In narrow panels, signal names occupy their own line above the copy control;
  the shared legend and pad colors identify roles without crowding the labels.
- Dynamic: component illustration, source-backed contact selection, role
  highlighting, pin readout, native physical-pin selector, board zoom, and the
  existing expanded inspector and full-page pinout.
- Desktop: board and pin readout side by side. Narrow panels and phones stack
  them. Zoom scrolls inside the canvas without widening the page.
- Both views support light and dark themes. The PCB retains its dark inspection
  canvas in either theme.

## Model coverage and data boundaries

The model registry in `src/lib/raspberry-pi-models.ts` covers Pi 1 B+, Pi 2 B,
Pi 3 B+/A+, Pi 4 B, Pi 5, Zero/Zero W/Zero 2 W, Pico/Pico W/Pico 2/Pico 2 W,
and Pi 400/500. SBC generations have distinct port arrangements and silicon
markings; Zero and Pico have separate artwork families. The keyboard computers
use a clearly labeled connector schematic above a keyboard silhouette.

Electrical labels, roles, aliases, warnings, and copy text still come from the
original catalog pin objects. No hardware data was changed. Decorative component
locations, copper traces, and markings are illustrative, not fabrication or
electrical-routing data. Verify wiring against the linked vendor documentation,
particularly the physical rear connector orientation of Pi 400/500.

Visual references:

- [Official Raspberry Pi computer documentation](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html)
- [Official Pico-series documentation](https://www.raspberrypi.com/documentation/microcontrollers/pico-series.html)
- [Pi 500 product brief](https://datasheets.raspberrypi.com/pi500/raspberry-pi-500-product-brief.pdf)

The artwork is memoized so pin hover and selection do not regenerate its
component tree. Reused SVG symbols keep small component definitions compact;
there are no remote image requests, canvas render loops, or added dependencies.

## Verification

- Lint, TypeScript checking, all 256 unit/component tests, and production build.
- New geometry regressions verify catalog coverage, original pin-object identity,
  contact count, row ordering, and keyboard schematic caveats.
- New browser coverage exercises Pi 4, Pi 5, Zero 2 W, Pico 2 W, and Pi 500 at
  360 × 800, 390 × 844, 412 × 915, and 844 × 390; all other Pi variants receive
  additional coverage. Flows include Static physical ordering, circular pads,
  label readability, legend, and copy; Dynamic contact and native-selector
  selection, role highlighting, zoom, modal focus/dismissal,
  inline catalog details, full-view navigation, and desktop themes/keyboard use.
- Mobile-mojo review uses Chromium phone emulation and screenshot inspection.
  This is browser emulation, not testing on physical iOS or Android devices.
- Final mobile-mojo approval: all 60 browser cases passed (33 redesign cases,
  27 existing). The restored Static view and compact signal-label fix were
  rechecked across all four phone sizes, with an additional ESP32 smoke test.

The generated concept was an art-direction reference. This implementation is a
vector interpretation, not a pixel-identical reproduction or certified board
layout. Browser screenshots are generated under ignored `test-results/`.
