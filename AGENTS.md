# PinHub Agent Notes

## Project Shape

- PinHub is a Next.js App Router app using TypeScript, Tailwind CSS v4, and static board data in `src/lib/boards.ts`.
- Keep board data source-backed. Every catalog entry should include at least one official documentation, datasheet, schematic, manual, or pinout link.
- Prefer adding static content first. Introduce a database only when the catalog data becomes too large or needs user submissions.

## Development Commands

- `npm run dev` starts the local development server.
- `npm run lint` checks lint rules.
- `npm run build` verifies the production Next.js build.

## Content Rules

- Treat pinout data as hardware-critical. Add warnings for voltage level, boot strap pins, reserved pins, and alternate-function caveats.
- Use official vendor documentation when possible. Third-party references are fine only when they fill a gap and are labeled clearly.
- For boards with variable revisions, note the revision risk in `warnings` rather than implying one universal pin map.

## UI Guidelines

- Keep the app dense, scannable, and engineer-friendly.
- Use icons for tools and commands, not decorative filler.
- Avoid marketing-page sections; the catalog should remain the first screen.

## GitHub Commit Rules

- Always commit to the MAIN branch unless explicitly commanded not to.
- The agent may push its own commits to GitHub when the user asks it to publish changes.
