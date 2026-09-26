# PinHub — Claude Code guide

The shared agent rules live in `AGENTS.md` and are imported here, so the two
files cannot drift apart. Everything below adds to them; nothing overrides them.

@AGENTS.md

## Change workflow

Follow these steps, in order, for any refactor, bug fix, security fix, or UI/UX
change. Skip only the steps that do not apply (for example, a data-only change
needs no design pass).

1. **Branch.** Work on `main` unless the user names a branch. When they do,
   create it from an up-to-date `main` (`git fetch` first) and push only there.
2. **Baseline.** Before editing, run `npm run lint`, `npm run typecheck`, and
   `npm test` so any failure you see later is known to be yours.
3. **Review before changing.** Read the affected routes, components, and
   `src/lib` modules. Look for:
   - Correctness: state that can go stale, lists that disagree between the
     catalog (`PinHubApp`) and discovery (`DiscoveryApp`), copy that claims
     more than the data backs.
   - Hardware-safety text: never infer an electrical fact the record does not
     state (see `fiveVoltCaution` in `src/lib/board-utilities.ts`).
   - Boundaries: every URL parameter, local-storage value, and remote payload
     is validated and size-bounded on read *and* write (`board-id.ts`,
     `catalog-state.ts`, `favorites.ts`, `personal-library.ts`,
     `price-snapshot.ts`).
   - Security: external links are HTTPS-only and `rel="noopener noreferrer"`,
     CSV exports stay formula-safe, API routes keep their method, query, and
     cache rules (`src/lib/server/read-only-route.ts`), and secrets never
     reach logs or client bundles.
   - Duplication worth extracting. Shared catalog behavior belongs in
     `src/components/catalog/` hooks (`useCatalogResults`,
     `useFavoriteToggle`, `useSlashToFocus`, `useCatalogUrlState`).
4. **Fix with a regression test.** Every confirmed bug gets a Vitest case in
   `test/` (and a Playwright case in `e2e/` when it is only observable in a
   browser) that fails without the fix.
5. **Design pass (UI/UX changes).** Use the `frontend-design` skill. Work
   within PinHub's established language, recorded in `docs/DESIGN.md`:
   - Opaque, lightly raised surfaces (`.surface-panel`, `.surface-well`); no
     translucent glass or `backdrop-blur` on widgets. Keep `CircuitBackground`.
   - Color encodes meaning only: cyan = interaction/selection, orange =
     hardware caution, emerald = official/present, amber = favorites/prices.
     Pin-role hues come from `board-visual/roles.ts`, and cyan `#22d3ee`
     belongs to the pin probe alone.
   - Geist for UI, Geist Mono for anything an engineer might transcribe,
     Audiowide for the wordmark only.
   - The catalog stays the first screen and the pin map is the product: no
     marketing sections, no rankings or "trending" claims the data cannot
     back, and nothing drawn in a board diagram that the catalog cannot back.
   - Layout inside the detail panel is container-relative (auto-fill grids,
     `min-w-0`), never viewport breakpoints, because that panel is ~21–32rem
     wide even on large screens.
   - Every new color class needs a light-theme counterpart. The light theme
     overrides utilities by class name in `src/app/globals.css`; an opacity
     suffix such as `text-amber-200/90` silently escapes it.
   - Touch targets are at least 44 px (`min-h-11`), focus stays visible, and
     motion respects `prefers-reduced-motion`.
6. **Verify on desktop.** Run `npm run lint`, `npm run typecheck`,
   `npm test`, `npm run build` (the build is also the board-visual and
   source-link validation gate), and `npm run test:e2e`. For CLI or shared
   board-data changes, also run the `cli/` checks listed in `AGENTS.md`. Look
   at the changed pages in the browser in both themes.
7. **Mobile gate (mandatory for any UI or UX change).** Before committing and
   pushing, spawn the `mobile-mojo` subagent. Have it read the `mobile-mojo`
   skill and test the final build at 360 × 800, 390 × 844, and 412 × 915,
   plus 844 × 390 landscape for pin maps and other dense views. It must
   exercise every affected journey and check overflow, touch targets, focus,
   navigation, and console errors from real screenshots. Fix what it
   confirms, then have it recheck those flows. A blocked check is not a pass:
   report the blocker and get an explicit waiver from the user before
   publishing.
8. **Record.** Audits and cleanups get a dated write-up in `docs/`
   (`code-audit-YYYY-MM-DD.md`): findings, changes, verification evidence, and
   known limits, including anything flagged but not fixed.
9. **Commit and push.** Commit only after steps 6–7 pass. Write a descriptive
   message covering the fixes, refactors, and design changes, then push the
   branch. Open a pull request only when asked.

## Useful facts

- Prices: the hourly workflow publishes to Vercel Blob. The API merges shared
  observations onto curated listings, and a listing whose identity changed in
  a deploy keeps its curated price until it is observed again.
- `/api/prices` reuses one storage read per server instance for 30 seconds, so
  a slow store cannot hold every request open.
- Board ids are lowercase kebab-case everywhere (`isBoardId`). Input that
  fails that shape is dropped at the boundary.
