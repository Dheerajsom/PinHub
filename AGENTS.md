# PinHub Agent Notes

## Project Shape

- PinHub is a Next.js App Router app using TypeScript, Tailwind CSS v4, and static board data in `src/lib/boards.ts`.
- Keep board data source-backed. Every catalog entry should include at least one official documentation, datasheet, schematic, manual, or pinout link.
- Prefer adding static content first. Introduce a database only when the catalog data becomes too large or needs user submissions.

## Development Commands

- `npm run dev` starts the local development server.
- `npm run lint` checks lint rules.
- `npm run typecheck` checks application, scripts, unit tests, and browser tests.
- `npm test` runs the Vitest unit and component regression suite.
- `npm run test:e2e` runs Playwright browser regressions (Chrome, local port 3100).
- `npm run build` verifies the production Next.js build.
- The published terminal tool lives in `cli/`. For CLI changes run `npm --prefix cli run check:boards`, `npm --prefix cli run lint`, `npm --prefix cli test`, and `npm --prefix cli run build`. Regenerate its catalog with `npm --prefix cli run generate:boards` when changing shared board data; do not edit generated board records manually.

## Content Rules

- Treat pinout data as hardware-critical. Add warnings for voltage level, boot strap pins, reserved pins, and alternate-function caveats.
- Use official vendor documentation when possible. Third-party references are fine only when they fill a gap and are labeled clearly.
- For boards with variable revisions, note the revision risk in `warnings` rather than implying one universal pin map.

## UI Guidelines

- Keep the app dense, scannable, and engineer-friendly.
- Use icons for tools and commands, not decorative filler.
- Avoid marketing-page sections; the catalog should remain the first screen.

## Review and Verification Workflow

- Preserve the lightweight catalog summaries and on-demand board detail loading. Keep full pin maps out of the initial catalog payload.
- Validate user-controlled URLs and local storage at their boundaries. Apply the same capacity limits when writing and reading saved data, with visible feedback when a limit prevents an action.
- Add regression coverage for confirmed bugs and run lint, typecheck, unit tests, and a production build before publishing code changes.
- **Every UI or UX change requires a mobile-mojo subagent before pushing to `main` or any other branch.** Have the subagent read the `mobile-mojo` skill and test the final changes in a browser. This rule explicitly authorizes that delegation.
- Cover compact (360 × 800), common (390 × 844), and large (412 × 915) phones, plus landscape (844 × 390) for pinout and other dense views. Exercise affected user journeys, inspect screenshots, and check overflow, touch controls, focus, navigation, and console errors.
- Fix confirmed mobile regressions and have the subagent recheck the final affected flows before pushing. Record coverage and limitations; a blocked browser check is not a pass. If verification is blocked, report the blocker and obtain an explicit user waiver before publishing UI/UX changes.

## GitHub Commit Rules

- Always commit to the MAIN branch unless explicitly commanded not to.
- The agent may push its own commits to GitHub when the user asks it to publish changes.
- After a branch has been merged, automatically delete both its local and remote refs. Never delete `main`, the currently checked-out branch, or a branch that has not been fully merged.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
