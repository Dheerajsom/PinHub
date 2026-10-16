# Background redesign — 2026-10-16

Branch: `feature/background-redesign`

## Why

The old `CircuitBackground` showed two cartoon boards (a Raspberry Pi 5 and
an Arduino Uno) drifting over a blueprint grid, with dashed traces animating
between them. The grid looked generic and the boards looked toy-like. Some of
their silkscreen also claimed facts the catalog does not back: the Uno chip
said "20MHz · 5V LOGIC", and the Uno Rev3 runs at 16 MHz.

## Iterations

1. **Logic-analyzer capture** (scrolling, decodable bus traffic). Rejected: a
   pinout site should show boards. Removed.
2. **Static bench of five boards** with role-colored pins. Rejected as low
   effort. Removed (`bench-boards.ts` and its test are deleted).
3. **Final: vendor marks plus a cursor probe**, described below. This follows
   the owner's brief: company logos scattered across the background, and a
   halo that lights up under the cursor and reveals hex bytes such as I2C
   addresses, with a small puzzle.

## What changed

- **Vendor marks.**
  - 72 placements of the catalog's vendor marks fill the two gutters beside
    the 1560px content column. They sit in four staggered columns a side
    (two show at 1920px, all four at 2560px), with small seeded jitter in
    position, size and rotation.
  - They are monochrome at about 10% opacity, so they read as texture.
  - Marks load from Google's favicon service through `next/image`, exactly as
    `VendorLogo` does, so no trademarked files ship. The vendor→site map moved
    to `src/lib/vendor-domains.ts` and is shared by both.
- **Excluded vendors.**
  - WeAct Studio, micro:bit, LOLIN and NodeMCU: their favicons 404, which
    would show broken images and console errors.
  - M5Stack: no catalog board, so showing its mark would claim a vendor the
    catalog does not carry. A test enforces this.
- **Cursor probe.**
  - On a desktop with a mouse, a soft cyan light (cyan is the interaction
    color) follows the pointer while it is over bare background. It stays
    dark over any panel: the check walks up from the hovered element and
    stops at `<main>`.
  - Inside the light, the nearby marks return to full color and a byte field
    shows through. The field has I2C writes to common parts (SSD1306 at 0x3C,
    MPU-6050 at 0x68, BME280 at 0x76 and others), shown as `S 78 A 00 A AF
    A P` with the address byte in the I2C role ink.
  - **Puzzle:** bright bytes scattered through the field are ASCII for
    "READ THE DATASHEET".
  - **Performance:** following the cursor touches only `transform` on two
    elements, one frame at a time. The byte field is generated in the
    browser only when the probe can run, so phones and the server HTML never
    carry it.
- **Light theme:** drafting-paper base, gray marks at 16% opacity, teal
  probe, dark ink bytes.
- Hidden below 1024px (marks and probe), where the catalog fills the frame.
  The probe also needs `(hover: hover) and (pointer: fine)`.
- Removed the bench boards and their CSS. The print stylesheet hides
  `.ph-backdrop`.
- `docs/DESIGN.md` background section updated.

## Bugs found and fixed during this pass

- **Crash without `matchMedia`.** The first probe build called
  `window.matchMedia` unguarded, so it threw where the API is missing (jsdom,
  some embedded browsers). The full suite caught it through
  `catalog-url-state.test.tsx`. It is now guarded, with a regression test
  that renders the background without `matchMedia`.
- **Vendor not in the catalog.** M5Stack was in the vendor→site map with no
  catalog board. The new test caught it, and it is excluded from the
  background.

## Verification

- `test/background-field.test.ts` (new, 9 cases):
  - Every mark is a catalog vendor with its own site, and every vendor with
    a working mark appears at least once.
  - Marks stay in the gutters and never overlap.
  - The byte field is deterministic and the right size.
  - Every message run decodes to "READ THE DATASHEET".
  - Every I2C frame is well formed (START, a known address with W, ACK
    after each byte, STOP).
  - Run merging works.
  - The probe stays dark over panels and lit over bare background.
  - The background renders without `matchMedia`.
- `npm run lint` and `npm run typecheck`: clean.
- `npm test`: 60 files, 580 tests passed.
- `npm run build`: passed.
- `npm run test:e2e`: 85 passed.
- Desktop browser check:
  - 1024 × 760, 1920 × 1080 and 2560 × 1440 in dark, and 1920 × 1080 in
    light.
  - The probe was dark over a catalog card and lit over the gutter and a gap
    between columns. The colored marks and hex were visible inside it.
  - No failing image requests after the exclusions.
- Mobile and resolution audit (mobile-mojo, production build). All checks
  passed:
  - **Phones:** `/`, `/pinout/raspberry-pi-5`, `/compare`, `/planner`,
    `/link`, `/collections`, `/privacy` and `/nope` at 360 × 800, 390 × 844,
    412 × 915 and 844 × 390, in dark and light (64 combinations).
    - No overflow.
    - The marks and probe compute to `display: none`, none of the 72 marks
      loads, and the byte field is never generated.
    - The probe never lights on touch.
    - No hits on the backdrop and no console errors (except the expected
      404 on `/nope`).
    - Search, the detail panel and Back to results, the theme toggle, nav
      and focus all work.
  - **Desktop with a mouse:** 1024 × 768, 1280 × 800, 1440 × 900,
    1920 × 1080 and 2560 × 1440 on `/` and `/privacy`, in dark and light.
    - No overflow, no console errors and no 4xx responses.
    - All 144 mark images load (72 shown plus 72 lit copies).
    - 25 marks show at 1920 and all 72 at 2560.
    - The probe is dark over cards and panels, and lit over the gutters,
      the column gaps and the /privacy heading.
    - Clicks work while it is lit, and it turns off when the pointer
      leaves the window.
    - Reduced motion behaves the same.

## Known limits / not fixed

- At 1440px and narrower desktops the gutter is about 32px, so few marks show.
  The probe still works in the gaps between panels.
- Text placed directly on the background (the /privacy heading, the "Last
  updated" line) has low-contrast hex passing behind it while the probe is
  over it. It stays legible. Not checked: pen input, real devices, and
  resizing a window across 1024px after load.
- The marks depend on Google's favicon service. If it changes or blocks a
  site, that mark may fail to load. The four known 404s are excluded.
- Pre-existing, not changed here: `VendorLogo` has a `BeagleBoard` key, but
  some catalog boards use the vendor name `BeagleBoard.org`, so those rows
  show no mark.
