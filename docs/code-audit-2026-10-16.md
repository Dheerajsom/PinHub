# Background redesign — 2026-10-16

Branch: `feature/background-redesign`

## Why

The old `CircuitBackground` showed two cartoon boards (a Raspberry Pi 5 and
an Arduino Uno) drifting over a blueprint grid, with dashed traces animating
between them. The grid looked generic and the boards looked toy-like. Some of
their silkscreen also claimed facts the catalog does not back: the Uno chip
said "20MHz · 5V LOGIC", and the Uno Rev3 runs at 16 MHz.

## Iterations

1. A logic-analyzer capture (scrolling, decodable bus traffic) was built
   first. The owner rejected it: a pinout site should show boards. It was
   removed entirely (`bus-capture.ts` and its test are deleted).
2. Final design: a static bench of popular boards with their pins emphasized,
   described below.

## What changed

- **Five catalog boards, drawn top-down at 5 px/mm:**
  - Left gutter: Raspberry Pi 5 (portrait, 40-pin header up the right edge)
    and ESP32 DevKit V1 (30-pin).
  - Right gutter: Raspberry Pi Zero 2 W (portrait, header down the left
    edge), STM32F103 Blue Pill (USB at the top, MCU at 45°) and Raspberry Pi
    Pico (castellated edges).
- **Pins are the subject.** Every header pad is filled with its pin-role hue
  from `board-visual/roles.ts` and carries its catalog label in Geist Mono.
  The rest of each board is quieter illustration: outline proportions,
  connector edges, main ICs, mounting holes and a few copper runs.
- **Backed by the catalog.** Pin labels and roles live in
  `src/components/bench-boards.ts`, a label/role copy of each board's catalog
  header. A copy is needed because the background ships in client bundles,
  which must not carry full pin maps. `test/bench-boards.test.ts` fails if any
  of the five drift from `src/lib/boards.ts`. Chip markings name only real
  parts (BCM2712, RP1, RP3A0, RP2040, STM32, ESP-WROOM-32), with no electrical
  claims.
- **Layout.**
  - Each side is an SVG sized to the viewport height and anchored to its
    window edge. It is composed so the pins land in the 1920 × 1080 gutter.
  - On wider screens the SVG slides toward the 1560px content column by the
    extra gutter (`--bench-shift`), so the art cropped at the edge comes into
    view. At 2560px the whole Pi 5 shows.
  - Hidden below 1024px, where the catalog fills the frame.
- **No grid, no motion.** The base is a graphite gradient with soft light
  pools behind each side. Light theme uses drafting paper, with boards at 62%
  opacity and pin labels in dark ink.
- Removed the old board artwork, blueprint grid, trace animations and their
  keyframes. The print stylesheet hides `.ph-bench`.
- `docs/DESIGN.md` background section updated.

## Verification

- `test/bench-boards.test.ts` (new, 5 cases) checks that the drawn header
  labels and roles equal the catalog for every board.
- `npm run lint` and `npm run typecheck`: clean.
- `npm test`: 60 files, 576 tests passed.
- `npm run build`: passed (includes the board-visual and source-link gates).
- `npm run test:e2e`: 85 passed. Two phone-layout tests (board-link 360 px,
  planner phone links) were flaky under the full parallel run and pass when
  run on their own. They do not touch the background.
- Desktop browser check: 1440 × 900, 1920 × 1080 and 2560 × 1440 in dark,
  and 1920 × 1080 in light. No console errors.
- Mobile gate (mobile-mojo, production build): `/`,
  `/pinout/raspberry-pi-5`, `/compare`, `/planner`, `/link`, `/collections`,
  `/privacy` and `/nope` at 360 × 800, 390 × 844, 412 × 915 and 844 × 390, in
  dark and light. All 64 combinations passed:
  - The side SVGs compute to `display: none` and `scrollWidth == innerWidth`.
  - No `elementFromPoint` hit lands on the backdrop.
  - No console errors (except the expected 404 on `/nope`).
  - Search, the detail panel and Back to results, the theme toggle, nav and
    keyboard focus all work.
  - Reduced motion was emulated at 390 × 844: it renders cleanly with no
    running animations.
  - Desktop sanity at 1024 × 768, 1280 × 800 and 1920 × 1080: no horizontal
    overflow from the `overflow: visible` sides, and 0 hits on the backdrop.

## Known limits / not fixed

- At 1440px and narrower desktops the gutter is about 32px, so the boards
  mostly show at the window edges and in the gaps between panels.
- The board illustrations are not mechanically exact. Outline proportions,
  header pitch, pin order and connector edges follow the boards; component
  placement is approximate.
