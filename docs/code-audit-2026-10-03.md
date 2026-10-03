# Correctness audit — 2026-10-03

Follow-up to an external audit of the planner, exports, personal library, and
CI. Every finding below was confirmed against the code before it was changed,
and each fix has a regression test that fails without it.

## Findings and changes

1. **Planner shrank requests it could not meet (P1).** `planPins` capped the
   requested counts to the remaining candidate count before the capacity
   checks, so on a Pico two GPIOs with one free pin returned `ok` with one
   assignment, and a request with every pin claimed returned `empty`.
   Requests are now clamped only to the planner's 0–8 range; anything the
   board cannot meet is `unsatisfiable` with a reason. The GPIO reason for
   zero pins left reads "No pin on this board is left to assign as plain
   GPIO." (was "Only no pins …").
   Tests: `test/pin-planner.test.ts` › excluded pins.

2. **Shared planner links lost claims (P2).** The reader scanned only 4,096
   encoded characters while the writer bounded 2,048 *decoded* ones; 64
   claims with fully escaped 24-character names restored 51. The writer also
   counted a separator for the first token, dropping the 64th claim at the
   exact limit. Both limits are now derived from the longest token the writer
   can emit (decoded 2,495; encoded 5,949), and the reader's scan window is
   that plus room for the board and plan (6,973). A link whose claims did not
   all restore (edited, cut short, or for another board) shows a notice in
   "Your pins" until the claims are edited.
   Tests: `test/plan-params.test.ts`, `test/planner-ui.test.tsx`.

3. **Export identifiers collided (P2).** Claims `foo`, `foo`, `foo_2` emitted
   `foo`, `foo_2`, `foo_2`, which overwrote a MicroPython assignment and
   duplicated C/Arduino definitions. Every emitted name is now reserved and
   suffixes advance until unique (`foo_2_2`).
   Tests: `test/pin-plan-export.test.ts`.

4. **"Saved locally" without storage (P2).** `persist()` swallowed storage
   failures. It now reports whether the write landed; `saveCollection()`
   returns `{ id, durable }`, and the shared-collection button reads "Kept for
   this visit" (neutral, not emerald) with a status line when the browser
   refused the write. `createCollection()` keeps its signature.
   Tests: `test/personal-library.test.ts`, `test/wiring-cautions.test.tsx`.

5. **CLI CI missed generation inputs (P2).** `generate-boards.ts` reads
   `server/pin-index` (geometry, nets, pin functions) and copies
   `pin-match.ts`, none of which were in CLI CI's path filter. Web CI, which
   runs on every `src/**` change, now runs `npm --prefix cli ci` and
   `check:boards`. Test: `test/security-config.test.ts`.

6. **Web CI audit failed (P2).** All five high entries trace to one advisory,
   GHSA-vfj7-8cjw-p6xm, in `braces` ≤ 3.0.3. 3.0.3 is the latest release and
   the latest `@next/eslint-plugin-next` still pins `fast-glob@3.3.1`, so no
   compatible fix exists; `npm audit fix --force` would downgrade
   `eslint-config-next` to 14. Web CI now runs `npm run audit:ci`
   (`scripts/audit.ts`), which audits the full tree and fails on any high or
   critical advisory unless `scripts/lib/audit-policy.ts` lists that exact
   advisory and package with a reason and an expiry. The one entry, braces,
   expires 2027-01-03, after which CI fails again. Unreadable reports fail
   closed. Tests: `test/audit-policy.test.ts`.
   The hourly price workflow ran the same plain audit and had failed on this
   advisory since 2026-10-03 06:29 UTC (earlier failures were the
   brace-expansion advisories that the Dependabot update cleared); it now
   uses `npm run audit:ci` too.

7. **Node engine range.** The root allowed Node 20.17+, but Vitest requires
   `^22.12 || ^24 || >=26`. The range now matches.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test` (516 passed, was 501),
  `npm run build`, `npm run test:e2e` (83 passed), `npm run audit:ci`.
- CLI: `check:boards` (142 boards), `lint`, `test` (139 passed), `build`.
- Desktop, both themes: planner notice and the collection save in both the
  stored and storage-blocked states.
- mobile-mojo (Playwright, real touch, `innerWidth` confirmed): 360×800,
  390×844 (dark and light), 412×915, 844×390. The planner notice (shows,
  wraps, clears on claim, absent for a clean link), the unsatisfiable status
  after a hand claim, and both collection-save states all pass: no
  horizontal overflow, 44 px controls, visible focus, header navigation,
  zero console errors. The subagent could not find a `mobile-mojo` skill
  file and worked from the brief instead.

## Not changed

- Suggested refactors deferred: extracting pin-index fetching from
  `PinLookupAnswer.tsx` (timeout and streamed size limit), splitting
  `PinHubApp`/`DiscoveryApp`, and splitting `boards.ts` by vendor.
- Other library mutations (recent boards, adding a board to a collection,
  undo) still keep in-memory state silently when storage fails; only the
  shared-collection save claimed persistence in its copy.
- The braces exception needs review by 2027-01-03.
- Pre-existing: the header theme toggle is 40 × 40 px, under the 44 px rule.
