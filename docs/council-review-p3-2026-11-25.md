# Council review P3 follow-up, 2026-11-25

This branch (`fix/council-p3`, from `main` at `5266bac`) works through the P3
list of the [2026-11-24 council review](council-review-2026-11-24.md). The
user asked for no council rounds and no subagents, so one reviewer did the
review and the mobile check.

## Fixed

### Touch targets (44 px)

These were under 44 px tall and now carry `min-h-11`:

- the `/prices` "Explore the full pinout catalog" link (was `min-h-6`);
- the `/collections` empty-state "Browse boards" link (was `py-2`);
- the board links in a saved collection on the catalog shelf (were
  `py-1.5`). The name now truncates inside a span, since `truncate` on a
  flex container shows no ellipsis;
- the board detail panel's "Try again" button (was `py-2`).

Test: `test/p3-touch-motion.test.ts`.

### Reduced motion

The route `loading.tsx` spinner used `animate-spin`. It now uses
`motion-safe:animate-spin`, like every other spinner. The same test fails if
any spinner goes back to a bare `animate-spin`.

### /prices

- The "Hourly checks" header link pointed at `#price-notes`, a closed
  `<details>`. The link, and a URL that arrives with `#price-notes`
  (including through `hashchange`), now open it.
- The stock column printed bare text. It now uses `PriceStockStatus`, the LED
  indicator the board pages and the compare table use. That component takes
  an optional `now`, so on `/prices` the label follows the page's own clock.
  The label and the "In stock" filter therefore cannot disagree.

Tests: `test/price-controls.test.tsx`.

### Privacy page

- The storage section named only favorites. It now lists every key PinHub
  writes, with the storage each one uses:
  - `pinhub.theme`, `pinhub.favorites`, `pinhub.library.v1` (recent boards
    and collections) and `pinhub.pinoutTab`, in `localStorage`;
  - `pinhub.check.draft`, in `sessionStorage`.
- The list lives in `src/lib/privacy-storage.ts`.
  `test/privacy-page.test.ts` scans `src/` for `pinhub.*` keys and fails when
  a key is used but not listed, or listed but unused.
- `/privacy` is now in `sitemap.ts` (yearly, priority 0.2) and in the README
  route table. "Last updated" is 2026-11-25.

### Social metadata

Next merges `openGraph` and `twitter` shallowly. A tool page that set only a
title therefore inherited the homepage's preview URL (`/`) and card title.

The new `pageMetadata()` in `src/lib/site.ts` builds, for one path:

- the title and description;
- the canonical URL;
- the Open Graph URL, title and image;
- the Twitter card.

All eight top-level pages use it: find, planner, check, link, compare,
prices, privacy and collections. Collections stays `noindex`. It also had no
canonical of its own, so it inherited `/`; it now has `/collections`.

Tests: `test/metadata-routes.test.ts`. A unit test covers the helper, and a
guard requires every top-level page to call it with its own path.

### Code check

`from RPi import GPIO` (and `... import GPIO as IO`) never spells
`RPi.GPIO`, so the script was not detected as Raspberry Pi Python. A
detection signal for that import form was added. The existing alias handling
already resolves the names.

Test: `test/code-check.test.ts`.

### Repo and CI

- **`next-env.d.ts`.** It is untracked and gitignored, as the Next.js 16
  TypeScript docs direct. `npm run typecheck` is now
  `next typegen && tsc --noEmit`, so it generates the file and the route
  types itself, in CI as well as locally. Web CI's path filters no longer
  list it.
- **Web CI.** It now triggers on `vercel.json`, which holds the cron schedule.
- **CLI CI.** It now triggers on `src/lib/**`. The generated
  `cli/src/pin-match.ts` and `cli/src/boards/pin-index.ts` come from
  `src/lib/pin-match.ts` and from `src/lib/server/pin-index.ts` with
  everything it imports. Listing those files one by one would go stale the
  same way.
- **Hourly price job.** The `next build` step is dropped. `publish-prices`
  runs from source with `tsx`, and Web CI builds every change before it
  reaches `main`. Lint, typecheck and the unit tests still gate publishing.
- **CLAUDE.md.** The CLI CI note and the `next-env.d.ts` note now describe
  the above.

## Not done

- **`/compare` native `<select>` filters.** On phones the native picker is
  arguably the better control. Replacing it is a design decision, not a
  defect, and is left for the user.
- **Oversized `PinHubApp` and `boards.ts`.** This is a refactor of its own,
  and it should not ride along with fixes.
- **Playwright on Firefox and WebKit.** Adding projects roughly triples the
  browser suite's CI time, and the new engines need their own triage pass.
- The P2 known limits listed in `council-review-2026-11-25.md` are
  unchanged.

## Verification

| Check | Result |
|---|---|
| `npm run lint` | pass |
| `npm run typecheck` (now with `next typegen`, from a deleted `next-env.d.ts`) | pass; file regenerated |
| `npm test` | 109 files, 2,631 tests pass |
| `npm run build` | pass |
| `CI=1 npx playwright test --retries=0` | 184 passed |

Each new test was run against the pre-fix code, by stashing the fix, and
failed. The exception is the privacy-key test, which is a forward guard.

### Mobile check

A single-agent check, without the `mobile-mojo` subagent, at the user's
request to avoid subagents. It ran in Chrome with touch and mobile emulation,
against `next start` on the production build. It covered 360×800, 390×844,
412×915 and 844×390, in both themes, 48 checks in all:

- `/prices`: the notes link opens the notes, `#price-notes` opens them on
  load, 31 stock indicators render, and the catalog link is 44 px.
- `/collections` empty state: "Browse boards" is 44 px.
- `/privacy`: all five keys are listed.
- The catalog shelf: the saved collection's board links are 44 px.

Every check passed. There was no horizontal overflow and no console or page
errors.

The screenshots showed the storage keys on `/privacy` breaking mid-word at
360 px. Each key now sits on its own line; a recheck on the rebuilt
production build at 360×800, in both themes, showed no overflow and no page
errors.
