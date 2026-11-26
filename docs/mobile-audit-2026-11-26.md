# Mobile audit — 2026-11-26

Full-site mobile resolution audit of `main` at `48035f2`, run by the
`mobile-mojo` subagent with the rewritten `mobile-mojo` skill. Audit only: no
application code changed. The same commit updates the mobile-gate step in
`CLAUDE.md` and `AGENTS.md` to describe the new skill, its baseline sweep
script, and PinHub's theme key.

**Verdict: PASS WITH NOTES.** No new defects; every finding below predates this
audit.

## Coverage

- Server: production build (`next start`) on `localhost:3210`.
- Baseline sweep (`mobile-sweep.mjs`): 11 routes × 4 viewports (360 × 800,
  390 × 844, 412 × 915, 844 × 390) × dark and light = 88 combinations. All had
  the requested `innerWidth`; 0 horizontal overflow; 0 console errors, page
  errors, or failed requests.
  Routes: `/`, `/boards/raspberry-pi-5`, `/boards/esp32-devkitc`, `/compare`,
  `/find`, `/planner`, `/check`, `/link`, `/prices`, `/collections`, `/privacy`.
- Journeys (pure touch, dark at all four sizes, light spot checks): catalog
  search and open; board page Show pins filter, pin selection, zoom, and touch
  pan; compare with 2 and 4 boards; finder plan; planner plan and reload;
  code check; link two boards; header Tools menu; theme toggle.
- Not exercised: real keyboard or IME, safe-area insets (always 0 in
  emulation), real devices, collections create/delete/share flows, prices
  interactions beyond first paint, every journey in the light theme.

## Findings (all pre-existing)

| Severity | Finding | Evidence |
| --- | --- | --- |
| Medium | Pin-map pads are below 44 px at fit scale on board pages | 80 undersized targets on `raspberry-pi-5` (40 under 24 px), 38 on `esp32-devkitc`; pads reach 44 px after "Zoom to touch size", and the 44 px pin-table buttons give a touch path |
| Low–Medium (**fixed**, see below) | Zoomed pin map captures vertical page-scroll drags | `.board-view-scroll` is 324 × 440 at 390 × 844 and 754 × 215 in landscape; a drag scrolled the map, not the page; page scroll only from 33–45 px gutters or "Fit whole board" |
| Low | `/compare` board-name links are 24 px tall | 21–24 undersized targets per viewport |
| Low | Sticky catalog bar and compare tray take a large share of the screen | bar 171 px (21 %) at 360 × 800, 119 px (31 %) at 844 × 390; tray 197 px (25 %) / 91 px (23 %) and covers the card being selected |
| Low | Home Tools menu in landscape scrolls inside a 230 px box with no scroll cue | "Connect two boards" sits below the fold at 844 × 390 |
| Low (uncertain) | Light-theme interface chips on board pages stay dark-filled | legible, but inconsistent with the light theme |
| Cosmetic | Search and `/link` placeholders and the home tagline clip with an ellipsis | — |

`/prices` reports one 16 px checkbox; its label is 44 px tall, so the target is
fine.

## Previously recorded defects now confirmed fixed

- Planner and `/link` picker board names no longer truncate at 360 and 390.
- `/compare` with the Jetson AGX Orin no longer overflows at 360 (0 px).
- Pin-table buttons measure 44 px.

## Follow-up fix: zoomed pin map no longer traps page scroll

The zoomed drawing (`.board-view-scroll[data-zoomed]`) was a two-axis
scroller capped at `min(55svh, 440px)`. It now keeps its full height and
scrolls sideways only (`overflow-x: auto; overflow-y: hidden`), with sideways
overscroll contained (`overscroll-behavior-x: contain`).
The tallest zoomed drawing measured at 390 × 844 is 1,182 px (ESP32-S2
DevKitM-1); most are 540–950 px, so the page grows by at most about one
screen. Because the drawing can now run past the screen, `usePinViewport`
also scrolls the pad into the page's view when the reader zooms in, and only
then: a later selection still pans the drawing alone.

Regression coverage: `test/pin-viewport-page-scroll.test.tsx` (the page
reveal happens on zoom and not on reselection) and
`e2e/zoomed-map-page-scroll.spec.ts` (at 390 × 844 and 844 × 390, a real
vertical touch swipe on the zoomed map scrolls the page and a sideways one
pans the map). Against the previous build the swipe left the page where it
was (`scrollY` 1243 before and after at 390 × 844).

Mobile gate (mobile-mojo, production build, 360 × 800 to 844 × 390, both
themes, board pages and the catalog Dynamic panel): PASS WITH NOTES, no new
defect. A vertical swipe on the zoomed map scrolled the page 228–276 px with
the map's `scrollTop` at 0; a sideways swipe panned the map without moving the
page; selecting a pin from the table did not jump the page to the map;
connector diagrams were unchanged. Not verified: whether a rightward swipe
that starts with the map already at its left edge triggers browser back on a
real phone. In emulation it did, with or without `overscroll-behavior-x:
contain`, and a bare test page behaved the same, so this needs a real device.

## Known limits

Viewport emulation in Chrome is representative, not proof for every physical
browser. Notch and home-indicator collisions need a real device. The findings
above were reported but not fixed; each is a candidate for its own change.
