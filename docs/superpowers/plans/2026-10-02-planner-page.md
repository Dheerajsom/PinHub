# Planner Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the pin planner to its own `/planner` section (header nav, next to Pin Maps) where a user searches for a board, picks it, claims pins by hand on any board with a pin map, and auto-assigns peripherals on boards with source-backed pin functions.

**Architecture:** A static `/planner` page renders a client `PlannerApp` that reads `?board=` after hydration, loads the full record through the existing board detail loader, and shows either a board picker or a workspace. The workspace keeps two pieces of state in the URL (`plan=` for auto requirements, `use=` for manual claims), passes manual claims to the existing solver as excluded pins, and draws a flat schematic board (no Raspberry Pi artwork).

**Tech Stack:** Next.js App Router (this repo's version; read `node_modules/next/dist/docs/01-app/` before writing the page), TypeScript, Tailwind v4, Vitest + Testing Library, Playwright.

Spec: `docs/superpowers/specs/2026-10-02-planner-page-design.md`

## Global Constraints

- Branch `feature/planner-page`. **Never create a git worktree.**
- **Do not commit per task.** CLAUDE.md allows a commit only after the desktop gate and the mobile gate pass. Task 9 commits and pushes once.
- Baseline first: `npm run lint`, `npm run typecheck`, `npm test` must be green before Task 1 so later failures are known to be ours.
- Every URL value is untrusted: `board` must pass `isBoardId`; `use` is ≤ 2 048 characters, ≤ 64 claims, names ≤ 24 characters from `[A-Za-z0-9 _+\-./#]`, unknown anchor keys dropped, first token per key wins. The same limits apply on write.
- Never infer an electrical fact. Cautions come only from `pin.flags` + `board.pinFunctions.flagNotes`, `pin.note`, and role `reserved`.
- Auto-assign appears only for boards with `pinFunctions`; other boards get one line and the report link, never a guessed plan.
- Colour: cyan = interaction/probe only (`#22d3ee` never used for a plan ring), orange = hardware caution, emerald = present. Reuse class strings that already exist in the codebase (they have light-theme counterparts in `src/app/globals.css`); a new class with an opacity suffix silently escapes the light theme.
- `button { font: inherit }` is global, so size button text on an inner `<span>`.
- Touch targets ≥ 44 px (`min-h-11` / `size-11`). Layout inside the workspace is container-relative (`@container`, `@3xl:`), not viewport breakpoints.
- External links: HTTPS, `target="_blank"`, `rel="noopener noreferrer"`. CSV cells go through `csvCell`.
- Existing export snapshots (`test/__snapshots__/pin-plan-export.test.ts.snap`) must not change.

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `src/lib/planner-claims.ts` | create | claim types, limits, name filter, caution lookup |
| `src/lib/plan-params.ts` | modify | `board=` and `use=` parsing/serialising |
| `src/lib/pin-planner.ts` | modify | `exclude` set for the solver and capabilities |
| `src/lib/board-visual-geometry.ts` | modify | `{ artwork: false }` option |
| `src/components/board-visual/BoardStage.tsx` | modify | `claimed` ring |
| `src/lib/csv.ts` | create | `csvCell` (moved out of `CopyPinTable.tsx`) |
| `src/lib/pin-plan-export.ts` | modify | manual claims in exports, CSV, JSON for every board |
| `src/components/SectionNav.tsx` | modify | Planner link, 360 px fit |
| `src/components/planner/peripherals.ts` | create | peripheral → role / hint maps |
| `src/components/planner/PlannerBoardPicker.tsx` | create | search combobox, quick picks |
| `src/components/planner/PlannerAutoAssign.tsx` | create | steppers + status |
| `src/components/planner/PlannerPinEditor.tsx` | create | claim / rename / release |
| `src/components/planner/PlannerPinsTable.tsx` | create | "Your pins" |
| `src/components/planner/PlannerExports.tsx` | create | export picker |
| `src/components/planner/PlannerWorkspace.tsx` | create | state, URL sync, layout |
| `src/components/planner/PlannerApp.tsx` | create | picker vs workspace, board loading |
| `src/components/planner/PlanPinsLink.tsx` | create | link to `/planner?board=` |
| `src/app/planner/page.tsx` | create | route |
| `src/components/planner/PinPlanner.tsx`, `PinPlannerSection.tsx` | delete | replaced |
| `src/app/boards/[id]/page.tsx`, `src/components/board-visual/PinoutFullView.tsx`, `src/components/BoardDetailPanel.tsx` | modify | swap planner section for `PlanPinsLink` |

---

### Task 1: Claims model and URL parameters

**Files:**
- Create: `src/lib/planner-claims.ts`
- Modify: `src/lib/plan-params.ts`
- Test: `test/planner-claims.test.ts`, `test/plan-params.test.ts` (append)

**Interfaces:**
- Produces:
  - `type PinClaim = { key: string; name: string }`
  - `type ClaimCaution = { label: string; note: string }`
  - `type ClaimedPin = { name: string; pin: Pin; group?: string; cautions: ClaimCaution[] }`
  - `maxClaims = 64`, `maxClaimNameLength = 24`, `maxUseParamLength = 2048`
  - `claimNameInput(value: string): string` (filter while typing), `cleanClaimName(value: unknown): string` (filter + trim)
  - `claimCautions(board: Board, pin: Pin): ClaimCaution[]`
  - `boardParam = "board"`, `useParam = "use"`
  - `boardFromSearch(search: string): string | null`
  - `parseUseParam(value: string | null | undefined, validKeys: ReadonlySet<string>): PinClaim[]`
  - `serializeUse(claims: readonly PinClaim[]): string`
  - `claimsFromSearch(search: string, validKeys: ReadonlySet<string>): PinClaim[]`
  - `searchWithPlanner(search: string, requirements: PlanRequirements, claims: readonly PinClaim[]): string`

- [ ] **Step 1: Write the failing tests**

`test/planner-claims.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { boards, type Board, type Pin } from "@/lib/boards";
import {
  claimCautions,
  claimNameInput,
  cleanClaimName,
  maxClaimNameLength,
} from "@/lib/planner-claims";

function board(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`${id} missing`);
  return found;
}

function pins(target: Board): Pin[] {
  const pinout = target.pinout!;
  return pinout.pins
    ? [...pinout.pins.left, ...pinout.pins.right]
    : (pinout.groups ?? []).flatMap((group) => group.pins);
}

describe("claim names", () => {
  it("keeps the allowed characters and drops everything else", () => {
    expect(cleanClaimName("  OLED <b>SDA</b>  ")).toBe("OLED bSDA/b");
    expect(cleanClaimName("+5V rail #2")).toBe("+5V rail #2");
    expect(cleanClaimName("a\n=cmd|b,c~d:e")).toBe("acmdbcde");
  });

  it("bounds the length and rejects non-strings", () => {
    expect(cleanClaimName("x".repeat(100))).toHaveLength(maxClaimNameLength);
    expect(cleanClaimName(42)).toBe("");
    expect(cleanClaimName(null)).toBe("");
  });

  it("filters while typing without trimming a trailing space", () => {
    expect(claimNameInput("OLED ")).toBe("OLED ");
    expect(claimNameInput("a~b")).toBe("ab");
    expect(claimNameInput("x".repeat(100))).toHaveLength(maxClaimNameLength);
  });
});

describe("claimCautions", () => {
  it("quotes the board's flag notes and never invents one", () => {
    const esp = board("esp32-devkitc");
    const flagged = pins(esp).find((pin) => pin.flags?.includes("strapping"));
    expect(flagged).toBeDefined();
    const cautions = claimCautions(esp, flagged!);
    expect(cautions.map((item) => item.note)).toContain(esp.pinFunctions!.flagNotes.strapping);

    const plain = pins(esp).find((pin) => !pin.flags?.length && pin.role !== "reserved");
    expect(claimCautions(esp, plain!)).toEqual([]);
  });

  it("returns nothing for a board without pin function data", () => {
    const pi4 = board("raspberry-pi-4-model-b");
    const gpio = pins(pi4).find((pin) => pin.role === "gpio")!;
    expect(claimCautions(pi4, gpio)).toEqual([]);
  });
});
```

Append to `test/plan-params.test.ts` (add the new names to its existing import from `@/lib/plan-params`):

```ts
describe("planner board and claims parameters", () => {
  const keys = new Set(["pL:0", "pL:1", "pR:0"]);

  it("accepts only board-id-shaped values", () => {
    expect(boardFromSearch("?board=raspberry-pi-pico")).toBe("raspberry-pi-pico");
    expect(boardFromSearch("?board=../etc")).toBeNull();
    expect(boardFromSearch("?board=Raspberry")).toBeNull();
    expect(boardFromSearch("")).toBeNull();
  });

  it("parses claims, dropping unknown keys and repeats", () => {
    expect(parseUseParam("pL:0~OLED SDA,pR:0~,zz:9~nope,pL:0~again", keys)).toEqual([
      { key: "pL:0", name: "OLED SDA" },
      { key: "pR:0", name: "" },
    ]);
  });

  it("filters and bounds names", () => {
    expect(parseUseParam(`pL:1~<script>${"x".repeat(60)}`, keys)).toEqual([
      { key: "pL:1", name: `script${"x".repeat(18)}` },
    ]);
  });

  it("rejects oversized input and caps the claim count", () => {
    expect(parseUseParam(`pL:0~${"a".repeat(3000)}`, keys)).toEqual([]);
    const many = new Set(Array.from({ length: 100 }, (_, index) => `g0:${index}`));
    const value = [...many].map((key) => `${key}~`).join(",");
    expect(parseUseParam(value, many)).toHaveLength(64);
    expect(parseUseParam(null, keys)).toEqual([]);
  });

  it("round-trips through the search string and keeps other parameters", () => {
    const claims = [
      { key: "pL:0", name: "OLED SDA" },
      { key: "pR:0", name: "" },
    ];
    const search = searchWithPlanner("?board=raspberry-pi-pico&x=1", { I2C: 1 }, claims);
    const params = new URLSearchParams(search);
    expect(params.get("board")).toBe("raspberry-pi-pico");
    expect(params.get("x")).toBe("1");
    expect(params.get("plan")).toBe("i2c1");
    expect(claimsFromSearch(search, keys)).toEqual(claims);
    expect(searchWithPlanner(search, {}, [])).toBe("?board=raspberry-pi-pico&x=1");
  });

  it("applies the same limits when writing", () => {
    const claims = Array.from({ length: 100 }, (_, index) => ({ key: `g0:${index}`, name: "n" }));
    expect(serializeUse(claims).split(",")).toHaveLength(64);
    expect(serializeUse([{ key: "pL:0", name: "a~b,c" }])).toBe("pL:0~abc");
  });
});
```

- [ ] **Step 2: Run and confirm they fail**

Run: `npx vitest run test/planner-claims.test.ts test/plan-params.test.ts`
Expected: FAIL (module `@/lib/planner-claims` not found; `boardFromSearch` not exported).

- [ ] **Step 3: Implement**

`src/lib/planner-claims.ts`:

```ts
import type { Board, Pin } from "@/lib/boards";

// Manual pin claims for the planner: "this pin is in use, for this". The name
// is the only free text a user can put in a shared planner link, so it is
// filtered to a small character set and bounded wherever it is read or written.

/** A claim as stored in the URL: a board-visual anchor key and a short name. */
export type PinClaim = { key: string; name: string };

export type ClaimCaution = { label: string; note: string };

/** A claim resolved against a board, as the exports and tables use it. */
export type ClaimedPin = { name: string; pin: Pin; group?: string; cautions: ClaimCaution[] };

export const maxClaims = 64;
export const maxClaimNameLength = 24;
export const maxUseParamLength = 2048;

const disallowed = /[^A-Za-z0-9 _+\-./#]+/g;
const maxNameScan = 256;

/** Filter for the text field: drops disallowed characters, keeps spacing. */
export function claimNameInput(value: string): string {
  return value.slice(0, maxNameScan).replace(disallowed, "").slice(0, maxClaimNameLength);
}

/** Canonical stored form: filtered, single-spaced, trimmed, bounded. */
export function cleanClaimName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .slice(0, maxNameScan)
    .replace(disallowed, "")
    .replace(/ +/g, " ")
    .trim()
    .slice(0, maxClaimNameLength)
    .trim();
}

/**
 * Risks the record states for a pin: the board's own note for each flag, and
 * the reserved role. Nothing is inferred from the label or the role otherwise.
 */
export function claimCautions(board: Board, pin: Pin): ClaimCaution[] {
  const notes = board.pinFunctions?.flagNotes ?? {};
  const cautions: ClaimCaution[] = (pin.flags ?? []).flatMap((flag) => {
    const note = notes[flag];
    return note ? [{ label: flag.replaceAll("-", " "), note }] : [];
  });
  if (pin.role === "reserved") {
    cautions.push({
      label: "reserved",
      note: pin.note ?? "The catalog records this pin as reserved.",
    });
  }
  return cautions;
}
```

In `src/lib/plan-params.ts`, add imports and append:

```ts
import { isBoardId } from "@/lib/board-id";
import {
  cleanClaimName,
  maxClaims,
  maxUseParamLength,
  type PinClaim,
} from "@/lib/planner-claims";
```

```ts
// The planner page's own state: `?board=<id>&use=<key>~<name>,<key>~<name>`.
// Anchor keys look like `pL:3` or `g1:12`; names never contain `~` or `,`
// (see `cleanClaimName`), so the two separators cannot be forged by a name.

export const boardParam = "board";
export const useParam = "use";
const anchorKeyPattern = /^[A-Za-z0-9]{1,8}:\d{1,4}$/;

export function boardFromSearch(search: string): string | null {
  const value = new URLSearchParams(search.slice(0, maxSearchScan)).get(boardParam);
  return isBoardId(value) ? value : null;
}

export function parseUseParam(
  value: string | null | undefined,
  validKeys: ReadonlySet<string>,
): PinClaim[] {
  if (typeof value !== "string" || !value || value.length > maxUseParamLength) return [];
  const claims: PinClaim[] = [];
  const seen = new Set<string>();
  for (const token of value.split(",")) {
    if (claims.length >= maxClaims) break;
    const split = token.indexOf("~");
    const key = split === -1 ? token : token.slice(0, split);
    if (!anchorKeyPattern.test(key) || !validKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    claims.push({ key, name: cleanClaimName(split === -1 ? "" : token.slice(split + 1)) });
  }
  return claims;
}

export function serializeUse(claims: readonly PinClaim[]): string {
  const tokens: string[] = [];
  let length = 0;
  for (const claim of claims.slice(0, maxClaims)) {
    if (!anchorKeyPattern.test(claim.key)) continue;
    const token = `${claim.key}~${cleanClaimName(claim.name)}`;
    if (length + token.length + 1 > maxUseParamLength) break;
    tokens.push(token);
    length += token.length + 1;
  }
  return tokens.join(",");
}

export function claimsFromSearch(search: string, validKeys: ReadonlySet<string>): PinClaim[] {
  const params = new URLSearchParams(search.slice(0, maxSearchScan));
  return parseUseParam(params.get(useParam), validKeys);
}

/** `search` with the plan and claims set (or removed when empty); the rest is kept. */
export function searchWithPlanner(
  search: string,
  requirements: PlanRequirements,
  claims: readonly PinClaim[],
): string {
  const params = new URLSearchParams(search.slice(0, maxSearchScan));
  const plan = serializePlan(requirements);
  if (plan) params.set(planParam, plan);
  else params.delete(planParam);
  const use = serializeUse(claims);
  if (use) params.set(useParam, use);
  else params.delete(useParam);
  const next = params.toString();
  return next ? `?${next}` : "";
}
```

- [ ] **Step 4: Run and confirm they pass**

Run: `npx vitest run test/planner-claims.test.ts test/plan-params.test.ts`
Expected: PASS. If the `<script>` case fails on the exact truncated string, recompute it by hand from `cleanClaimName` (24 characters after filtering) and fix the expectation, not the filter.

---

### Task 2: Solver excludes manually claimed pins

**Files:**
- Modify: `src/lib/pin-planner.ts` (`PinPlanModel` constructor, `planPins`, `planCapabilities`)
- Test: `test/pin-planner.test.ts` (append)

**Interfaces:**
- Produces:
  - `new PinPlanModel(board: Board, exclude?: ReadonlySet<Pin>)`
  - `planPins(board, requirements, budget = defaultPlanStepBudget, exclude?: ReadonlySet<Pin>): PlanResult`
  - `planCapabilities(board: Board, exclude?: ReadonlySet<Pin>)`
  - Pins are compared by object identity; pass the `Pin` objects from the same `Board`.

- [ ] **Step 1: Write the failing tests** (append; reuse the file's existing `board()` helper if it has one, otherwise add the two helpers below)

```ts
function allPins(target: Board): Pin[] {
  const pinout = target.pinout!;
  return pinout.pins
    ? [...pinout.pins.left, ...pinout.pins.right]
    : (pinout.groups ?? []).flatMap((group) => group.pins);
}

describe("excluded pins", () => {
  const pico = boards.find((item) => item.id === "raspberry-pi-pico")!;

  it("never assigns a pin the user already claimed", () => {
    const first = planPins(pico, { I2C: 1 });
    if (first.status !== "ok") throw new Error("baseline plan failed");
    const taken = new Set(first.assignments.map((item) => item.pin));

    const second = planPins(pico, { I2C: 1 }, undefined, taken);
    if (second.status !== "ok") throw new Error("plan around claims failed");
    expect(second.assignments).toHaveLength(2);
    for (const item of second.assignments) expect(taken.has(item.pin)).toBe(false);
  });

  it("shrinks what the board can supply", () => {
    const adcPins = new Set(
      allPins(pico).filter((pin) => pin.functions?.some((item) => item.peripheral === "ADC")),
    );
    expect(planCapabilities(pico).some((item) => item.peripheral === "ADC")).toBe(true);
    expect(planCapabilities(pico, adcPins).some((item) => item.peripheral === "ADC")).toBe(false);
    expect(planCapabilities(pico, new Set(allPins(pico)))).toEqual([]);
  });

  it("gives the same plan with no exclusion as before", () => {
    expect(planPins(pico, { SPI: 1, PWM: 2 }, undefined, new Set())).toEqual(
      planPins(pico, { SPI: 1, PWM: 2 }),
    );
  });
});
```

Make sure `Pin`, `boards`, `planCapabilities` are imported at the top of the test file.

- [ ] **Step 2: Run** `npx vitest run test/pin-planner.test.ts` — Expected: FAIL (excluded pins are still assigned; `planCapabilities` ignores its second argument).

- [ ] **Step 3: Implement**

In `PinPlanModel`:

```ts
  constructor(
    readonly board: Board,
    /** Pins already in use (manual claims); they are treated as absent. */
    exclude?: ReadonlySet<Pin>,
  ) {
    if (!board.pinFunctions) throw new Error(`${board.id} has no pin function data`);
    this.data = board.pinFunctions;
    const candidates = candidatesOf(board);
    this.candidates = exclude?.size
      ? candidates.filter((candidate) => !exclude.has(candidate.pin))
      : candidates;
  }
```

In `planPins`, change the signature and the model line:

```ts
export function planPins(
  board: Board,
  requirements: PlanRequirements,
  budget = defaultPlanStepBudget,
  exclude?: ReadonlySet<Pin>,
): PlanResult {
  if (!board.pinFunctions || !board.pinout) return { status: "unsupported" };
  const model = new PinPlanModel(board, exclude);
```

Update its doc comment: add "`exclude` lists pins the user has claimed by hand; they are never assigned and do not count toward capacity."

In `planCapabilities`:

```ts
export function planCapabilities(
  board: Board,
  exclude?: ReadonlySet<Pin>,
): { peripheral: PlanPeripheral; max: number }[] {
  if (!board.pinFunctions || !board.pinout) return [];
  const capacity = new PinPlanModel(board, exclude).capacity();
```

- [ ] **Step 4: Run** `npx vitest run test/pin-planner.test.ts` — Expected: PASS, including every pre-existing case.

---

### Task 3: Schematic geometry and the claimed ring

**Files:**
- Modify: `src/lib/board-visual-geometry.ts:869-875`
- Modify: `src/components/board-visual/BoardStage.tsx`
- Test: `test/planner-render.test.tsx` (create)

**Interfaces:**
- Produces:
  - `buildBoardGeometry(board: Board, options?: { artwork?: boolean }): BoardGeometry | null` — `artwork: false` skips `raspberryPiGeometry`, so `artworkId` is undefined and pads use the flat style. Anchor keys are identical either way.
  - `BoardStage` prop `claimed?: ReadonlySet<string>` (anchor keys). Claimed pads get `<circle class="bv-claimed-ring">`; pads neither claimed nor planned recede when either set is non-empty.

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { BoardStage } from "@/components/board-visual/BoardStage";

afterEach(cleanup);

const pi5 = boards.find((item) => item.id === "raspberry-pi-5")!;

describe("planner render", () => {
  it("builds a Raspberry Pi without the realistic artwork, same anchors", () => {
    const realistic = buildBoardGeometry(pi5)!;
    const flat = buildBoardGeometry(pi5, { artwork: false })!;
    expect(realistic.artworkId).toBe("raspberry-pi-5");
    expect(flat.artworkId).toBeUndefined();
    expect(flat.anchors.map((anchor) => anchor.key)).toEqual(
      realistic.anchors.map((anchor) => anchor.key),
    );
    expect(flat.anchors.map((anchor) => anchor.pin)).toEqual(
      realistic.anchors.map((anchor) => anchor.pin),
    );
  });

  it("rings claimed pads solid, never in the probe's cyan, and dims the rest", () => {
    const geometry = buildBoardGeometry(pi5, { artwork: false })!;
    const [first, second] = geometry.anchors;
    const { container } = render(
      <BoardStage
        geometry={geometry}
        title="test"
        selectedKey={null}
        activeKey={null}
        activeRole={null}
        showAllLabels
        netKeys={new Set()}
        claimed={new Set([first.key])}
        onSelect={() => {}}
        onActiveKey={() => {}}
      />,
    );
    const rings = container.querySelectorAll(".bv-claimed-ring");
    expect(rings).toHaveLength(1);
    expect(rings[0].getAttribute("stroke")?.toLowerCase()).not.toBe("#22d3ee");
    expect(rings[0].getAttribute("stroke-dasharray")).toBeNull();
    const pads = container.querySelectorAll<SVGGElement>(".bv-pad");
    const index = geometry.anchors.indexOf(second);
    expect(pads[geometry.anchors.indexOf(first)].style.opacity).toBe("1");
    expect(pads[index].style.opacity).toBe("0.28");
  });
});
```

- [ ] **Step 2: Run** `npx vitest run test/planner-render.test.tsx` — Expected: FAIL (`artworkId` still set; no `.bv-claimed-ring`).

- [ ] **Step 3: Implement**

`board-visual-geometry.ts`:

```ts
/**
 * Build the full geometry for a board, or null if it has no pinout.
 * `artwork: false` keeps the plain schematic sheet for every board: the
 * planner uses it so the pins, not a board illustration, carry the drawing.
 */
export function buildBoardGeometry(
  board: Board,
  options: { artwork?: boolean } = {},
): BoardGeometry | null {
  if (!board.pinout) return null;
  const visual = boardVisuals[board.id];
  if (!visual) return null;
  const geometry = { kind: visual.headerKind, ...builders[visual.headerKind](board, visual) };
  return options.artwork === false ? geometry : raspberryPiGeometry(board, geometry);
}
```

`BoardStage.tsx` — add to `BoardStageProps` after `planned`:

```ts
  /**
   * Pads the user claimed by hand in the planner. A solid ring in a neutral
   * ink: distinct from the planner's dashed role-hue ring and from the probe.
   */
  claimed?: ReadonlySet<string>;
```

Destructure `claimed` in the component. Replace the `dimmed=` expression on `<Pad>`:

```tsx
            dimmed={
              (activeRole !== null && anchor.pin.role !== activeRole) ||
              (Boolean(planned?.size || claimed?.size) &&
                !planned?.has(anchor.key) &&
                !claimed?.has(anchor.key) &&
                anchor.key !== activeKey &&
                anchor.key !== selectedKey)
            }
            plannedRole={planned?.get(anchor.key)}
            claimed={Boolean(claimed?.has(anchor.key))}
```

Add `claimed` (`boolean`) to `Pad`'s props and type, and render it just before the `plannedRole` ring:

```tsx
      {claimed ? (
        <circle
          className="bv-claimed-ring"
          cx={anchor.cx}
          cy={anchor.cy}
          r={padR + 4.5}
          fill="none"
          stroke="#f4f4f5"
          strokeWidth={2.5}
        />
      ) : null}
```

(The stage background is `#0a0c11` in both themes, so one stroke colour serves both.)

- [ ] **Step 4: Run** `npx vitest run test/planner-render.test.tsx test/board-visual-validation.test.ts` — Expected: PASS.

---

### Task 4: Exports carry manual claims; CSV and JSON for every board

**Files:**
- Create: `src/lib/csv.ts`
- Modify: `src/components/CopyPinTable.tsx:125-136` (import `csvCell` instead of defining it)
- Modify: `src/lib/pin-plan-export.ts`
- Test: `test/pin-plan-export.test.ts` (append), `test/copy-pin-table.test.ts` (must stay green)

**Interfaces:**
- Consumes: `ClaimedPin` from Task 1.
- Produces:
  - `csvCell(value: string): string` in `@/lib/csv`
  - `type PlanExportFormat = PinPlanExportFormat | "csv"`; `PlanExport.format: PlanExportFormat`
  - `planExports(board, assignments, date, claims: readonly ClaimedPin[] = []): PlanExport[]` — returns `[]` only when both lists are empty. Code formats only for boards with `pinFunctions`; JSON and CSV for every board.
  - `planFilename(board, format: PlanExportFormat)`

- [ ] **Step 1: Write the failing tests** (append)

```ts
import type { ClaimedPin } from "@/lib/planner-claims";

function pinByLabel(target: Board, label: string) {
  const pinout = target.pinout!;
  const all = pinout.pins
    ? [...pinout.pins.left, ...pinout.pins.right]
    : (pinout.groups ?? []).flatMap((group) => group.pins);
  const pin = all.find((item) => item.label === label);
  if (!pin) throw new Error(`${label} missing on ${target.id}`);
  return pin;
}

describe("exports with manual claims", () => {
  const pico = board("raspberry-pi-pico");
  const claims: ClaimedPin[] = [
    { name: "OLED SDA", pin: pinByLabel(pico, "GP2"), cautions: [] },
    { name: "+5V rail", pin: pinByLabel(pico, "VBUS"), cautions: [] },
    { name: "OLED SDA", pin: pinByLabel(pico, "GP3"), cautions: [] },
  ];

  it("leaves a plan with no claims byte-identical", () => {
    const assignments = plan(pico, { I2C: 1 });
    const format = (items: ReturnType<typeof planExports>) =>
      items.filter((item) => item.format !== "csv");
    expect(format(planExports(pico, assignments, date, []))).toEqual(
      format(planExports(pico, assignments, date)),
    );
  });

  it("adds claims as constants where the pin has an MCU identity", () => {
    const exports = planExports(pico, plan(pico, { I2C: 1 }), date, claims);
    const header = exports.find((item) => item.format === "c-header")!.text;
    expect(header).toContain("#define PINHUB_USER_OLED_SDA 2");
    expect(header).toContain("#define PINHUB_USER_OLED_SDA_2 3");
    expect(header).toContain("// In use (no MCU pin): physical pin 40, VBUS: +5V rail");
    const python = exports.find((item) => item.format === "micropython")!.text;
    expect(python).toContain("user_oled_sda = Pin(2)");
  });

  it("offers code exports for claims alone on a board with pin functions", () => {
    const exports = planExports(pico, [], date, claims);
    expect(exports.map((item) => item.format)).toEqual(["c-header", "micropython", "json", "csv"]);
    expect(exports[0].text).not.toContain("avr/io.h");
  });

  it("writes a formula-safe CSV", () => {
    const text = planExports(pico, plan(pico, { I2C: 1 }), date, claims).find(
      (item) => item.format === "csv",
    )!.text;
    expect(text).toContain(`"Manual","'+5V rail"`);
    expect(text).toContain(`"Auto","I2C 1"`);
    expect(text).toContain(planNotice);
    for (const line of text.split("\r\n")) {
      for (const cell of line.split('","')) expect(cell.replace(/^﻿?"/, "")).not.toMatch(/^[=+\-@]/);
    }
  });

  it("gives a board without pin functions JSON and CSV only", () => {
    const pi4 = board("raspberry-pi-4-model-b");
    const gpio = pinByLabel(pi4, pi4.pinout!.pins!.left[1].label);
    const exports = planExports(pi4, [], date, [{ name: "LED", pin: gpio, cautions: [] }]);
    expect(exports.map((item) => item.format)).toEqual(["json", "csv"]);
    expect(JSON.parse(exports[0].text).claims[0].name).toBe("LED");
    expect(exports[1].filename).toBe("pinhub-plan-raspberry-pi-4-model-b.csv");
    expect(planExports(pi4, [], date, [])).toEqual([]);
  });
});
```

If `GP2`, `GP3`, or `VBUS` are not the Pico labels in `boards.ts`, or VBUS is not position 40, read the Pico pinout there and substitute the real labels/positions in the test before running. If the Pi 4 map is grouped rather than dual-row, pick any `gpio` pin with the `pinByLabel` helper instead.

- [ ] **Step 2: Run** `npx vitest run test/pin-plan-export.test.ts` — Expected: new cases FAIL, old ones PASS.

- [ ] **Step 3: Implement**

`src/lib/csv.ts`:

```ts
/**
 * One CSV field. Spreadsheet applications treat a cell that begins with
 * `=`, `+`, `-`, or `@` as a formula, even inside quotes, so those get a
 * leading text marker; pin labels such as "+3.3V" stay literal and neither
 * catalog text nor user text can become an executable expression.
 */
export function csvCell(value: string): string {
  const flattened = value.replace(/[\r\n]+/g, " ");
  const literal =
    /^[ \t]*[=+\-@]/.test(flattened) || flattened.startsWith("\t")
      ? `'${flattened}`
      : flattened;
  return `"${literal.replace(/"/g, '""')}"`;
}
```

In `CopyPinTable.tsx` delete the local `csvCell` function and add `import { csvCell } from "@/lib/csv";`.

In `pin-plan-export.ts`:

```ts
import { csvCell } from "@/lib/csv";
import type { ClaimedPin } from "@/lib/planner-claims";

export type PlanExportFormat = PinPlanExportFormat | "csv";

export type PlanExport = {
  format: PlanExportFormat;
  label: string;
  filename: string;
  mimeType: string;
  text: string;
};

const formatInfo: Record<PlanExportFormat, { label: string; suffix: string; mimeType: string }> = {
  "c-header": { label: "C header", suffix: ".h", mimeType: "text/x-c" },
  micropython: { label: "MicroPython", suffix: "-micropython.py", mimeType: "text/x-python" },
  arduino: { label: "Arduino", suffix: "-arduino.h", mimeType: "text/x-c" },
  json: { label: "JSON", suffix: ".json", mimeType: "application/json" },
  csv: { label: "CSV", suffix: ".csv", mimeType: "text/csv" },
};
```

Change `planFilename`'s `format` parameter type to `PlanExportFormat`.

Add helpers after `cautionLines`:

```ts
function claimPlace(claim: ClaimedPin): string {
  const place = claim.group
    ? `${oneLine(claim.group)} position ${claim.pin.position}`
    : `physical pin ${claim.pin.position}`;
  return `${place}, ${oneLine(claim.pin.label)}`;
}

function claimUse(claim: ClaimedPin): string {
  return oneLine(claim.name) || "in use";
}

function claimCautionLines(claim: ClaimedPin): string[] {
  return claim.cautions.map(
    (caution) =>
      `CAUTION (${claim.pin.mcu?.name ?? claim.pin.label}, ${oneLine(caution.label)}): ${oneLine(caution.note)}`,
  );
}

/** A unique name per claim: the cleaned name, then `_2`, `_3` for repeats. */
function claimNames(claims: readonly ClaimedPin[], shape: (value: string) => string): string[] {
  const used = new Map<string, number>();
  return claims.map((claim) => {
    const base = shape(claim.name) || shape("pin");
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    return count === 1 ? base : `${base}_${count}`;
  });
}
```

Every builder gains a fourth parameter `claims: readonly ClaimedPin[]`.

`cHeader`: replace the `avr` line and append claims before the closing guard:

```ts
  const mcuPins = [...assignments.map((item) => item.pin), ...claims.map((item) => item.pin)].filter(
    (pin) => pin.mcu,
  );
  const avr = mcuPins.length > 0 && mcuPins.every((pin) => pin.mcu?.gpio === undefined);
```

```ts
  if (claims.length) {
    const names = claimNames(claims, identifier);
    lines.push("", "// Pins claimed by hand in the planner");
    claims.forEach((claim, index) => {
      const mcu = claim.pin.mcu;
      const name = `PINHUB_USER_${names[index]}`;
      const port = mcu ? /^P([A-Z])([0-7])$/.exec(mcu.name) : null;
      lines.push(...claimCautionLines(claim).map((line) => `// ${line}`));
      if (mcu?.gpio !== undefined) {
        lines.push(`// ${claimUse(claim)} on ${claimPlace(claim)}`, `#define ${name} ${mcu.gpio}`);
      } else if (mcu && port) {
        lines.push(
          `// ${claimUse(claim)} on ${claimPlace(claim)}`,
          `#define ${name}_PORT PORT${port[1]}`,
          `#define ${name}_DDR DDR${port[1]}`,
          `#define ${name}_PIN PIN${port[1]}`,
          `#define ${name}_BIT ${mcu.name}`,
        );
      } else {
        lines.push(`// In use (no MCU pin): ${claimPlace(claim)}: ${claimUse(claim)}`);
      }
    });
  }
```

Check: with assignments only, `avr` equals the old value (every assignment has `mcu`), so snapshots hold.

`microPython`: before the final `return`, add

```ts
  if (claims.length) {
    const names = claimNames(claims, variable);
    body.push("", "# Pins claimed by hand in the planner");
    claims.forEach((claim, index) => {
      body.push(...claimCautionLines(claim).map((line) => `# ${line}`));
      const gpio = claim.pin.mcu?.gpio;
      body.push(
        gpio !== undefined
          ? `user_${names[index]} = Pin(${gpio})  # ${claimUse(claim)} on ${claimPlace(claim)}`
          : `# In use (no MCU pin): ${claimPlace(claim)}: ${claimUse(claim)}`,
      );
    });
  }
```

`variable("OLED SDA")` is `oled_sda`, giving `user_oled_sda`. `variable` prefixes `p_` for names starting with a digit, which is fine after `user_`.

`arduino`: before the final `lines.push("")`, add

```ts
  if (claims.length) {
    const names = claimNames(claims, identifier);
    lines.push("", "// Pins claimed by hand in the planner");
    claims.forEach((claim, index) => {
      lines.push(...claimCautionLines(claim).map((line) => `// ${line}`));
      const pin = claim.pin.mcu?.arduino;
      lines.push(
        pin
          ? `const uint8_t PINHUB_USER_${names[index]} = ${pin};  // ${claimUse(claim)} on ${claimPlace(claim)}`
          : `// In use (no Arduino pin name): ${claimPlace(claim)}: ${claimUse(claim)}`,
      );
    });
  }
```

`json`: after the `assignments` property, add

```ts
      ...(claims.length
        ? {
            claims: claims.map((claim) => ({
              name: claim.name,
              pin: {
                position: claim.pin.position,
                label: claim.pin.label,
                ...(claim.group ? { group: claim.group } : {}),
              },
              ...(claim.pin.mcu ? { mcu: claim.pin.mcu } : {}),
              cautions: claim.cautions,
            })),
          }
        : {}),
```

New CSV builder:

```ts
const csvBom = String.fromCharCode(0xfeff);

function csv(board: Board, assignments: PlanAssignment[], date: string, claims: readonly ClaimedPin[]): string {
  const source = verificationSourceFor(board);
  const rows = [["Kind", "Use", "Signal", "Group", "Pin", "Label", "MCU pin", "Cautions"]];
  for (const claim of claims) {
    rows.push([
      "Manual",
      claim.name || "In use",
      "",
      claim.group ?? "",
      String(claim.pin.position),
      claim.pin.label,
      claim.pin.mcu?.name ?? "",
      claim.cautions.map((item) => `${item.label}: ${oneLine(item.note)}`).join(" | "),
    ]);
  }
  for (const item of assignments) {
    rows.push([
      "Auto",
      `${item.peripheral} ${item.unit}`,
      [item.instance, item.signal !== "IO" ? item.signal : ""].filter(Boolean).join(" "),
      item.group ?? "",
      String(item.pin.position),
      item.pin.label,
      item.pin.mcu?.name ?? "",
      item.cautions.map((caution) => `${caution.flag}: ${oneLine(caution.note)}`).join(" | "),
    ]);
  }
  rows.push([
    "Note",
    `${board.name} (${board.id})`,
    "",
    "",
    "",
    "",
    "",
    `${planNotice} ${date}${source ? ` Verify against: ${source.label} <${source.url}>` : ""}`.trim(),
  ]);
  return `${csvBom}${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
```

Replace `builders` and `planExports`:

```ts
const builders: Record<
  PlanExportFormat,
  (board: Board, assignments: PlanAssignment[], date: string, claims: readonly ClaimedPin[]) => string
> = { "c-header": cHeader, micropython: microPython, arduino, json, csv };

/**
 * The exports for a plan, in the board's order. Code formats need the
 * board's pin-function data; JSON and CSV are offered for every board.
 * `date` is an ISO calendar date (YYYY-MM-DD) stamped into each file.
 */
export function planExports(
  board: Board,
  assignments: PlanAssignment[],
  date: string,
  claims: readonly ClaimedPin[] = [],
): PlanExport[] {
  if (!assignments.length && !claims.length) return [];
  const stamp = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  const hasMcuPin = assignments.length > 0 || claims.some((claim) => claim.pin.mcu);
  const code = (board.pinFunctions?.exports ?? []).filter(
    (format) => format === "json" || (hasMcuPin && supports(format, assignments)),
  );
  const formats: PlanExportFormat[] = [...code, ...(code.includes("json") ? [] : ["json" as const]), "csv"];
  return formats.map((format) => ({
    format,
    label: formatInfo[format].label,
    filename: planFilename(board, format),
    mimeType: formatInfo[format].mimeType,
    text: builders[format](board, assignments, stamp, claims),
  }));
}
```

The existing pilot test asserts the exact format list per board (for example `["c-header", "micropython", "json"]`). Every board now also gets `"csv"`, so update the `pilots` table in `test/pin-plan-export.test.ts` to append `"csv"` to each list, and make any `for (const item of exports)` loop that asserts comment-style headers skip `item.format === "csv"`. Do **not** regenerate snapshots with `-u`; if a snapshot test now iterates over CSV and wants a new snapshot, exclude CSV from that loop instead (the CSV cases above cover it).

- [ ] **Step 4: Run** `npx vitest run test/pin-plan-export.test.ts test/copy-pin-table.test.ts` — Expected: PASS, with `git status` showing no change under `test/__snapshots__/`.

---

### Task 5: Planner in the section nav

**Files:**
- Modify: `src/components/SectionNav.tsx`
- Test: `test/section-nav.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SectionNav } from "@/components/SectionNav";

afterEach(cleanup);

describe("SectionNav", () => {
  it("lists Planner next to Pin Maps and marks the current section", () => {
    render(<SectionNav current="/planner" />);
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Pin Maps", "Planner", "Compare", "Prices"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/", "/planner", "/compare", "/prices"]);
    expect(screen.getByRole("link", { name: "Planner" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Pin Maps" }).getAttribute("aria-current")).toBeNull();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run test/section-nav.test.tsx` — Expected: FAIL (three links).

- [ ] **Step 3: Implement** — replace the file body:

```tsx
import Link from "next/link";
import { CircuitBoard, GitCompareArrows, Route, Tags } from "lucide-react";
import { clsx } from "clsx";

const sections = [
  { href: "/", label: "Pin Maps", icon: CircuitBoard },
  { href: "/planner", label: "Planner", icon: Route },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/prices", label: "Prices", icon: Tags },
] as const;

export function SectionNav({ current, className }: { current: string; className?: string }) {
  return (
    <nav aria-label="PinHub sections" className={clsx("flex w-fit shrink-0 items-center gap-1", className)}>
      {sections.map(({ href, label, icon: Icon }) => {
        const active = current === href;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            // Four sections share one row down to 360 px: below 400 px the
            // icons give way to the labels and the padding tightens.
            className={clsx("inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition max-sm:min-h-11 max-[400px]:px-2.5",
              active
                ? "bg-cyan-300/10 text-cyan-100 ring-1 ring-inset ring-cyan-300/35"
                : href === "/prices"
                  ? "ph-price-ink ph-price-nav"
                  : "text-zinc-500 hover:bg-white/[0.06] hover:text-white")}>
            <Icon className="size-3.5 max-[400px]:hidden" aria-hidden="true" />{label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Run** `npx vitest run test/section-nav.test.tsx test/pinhub-app.test.tsx` — Expected: PASS. If another test or e2e spec asserts exactly three nav links, update it to four.

---

### Task 6: Planner components and the `/planner` route

**Files:**
- Create: `src/components/planner/peripherals.ts`, `PlannerBoardPicker.tsx`, `PlannerAutoAssign.tsx`, `PlannerPinEditor.tsx`, `PlannerPinsTable.tsx`, `PlannerExports.tsx`, `PlannerWorkspace.tsx`, `PlannerApp.tsx`
- Create: `src/app/planner/page.tsx`
- Test: `test/planner-ui.test.tsx` (create)

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces:
  - `<PlannerApp catalog={BoardSummary[]} autoAssignIds={string[]} loader?={BoardDetailLoader} />`
  - `<PlannerWorkspace board={Board} onChangeBoard={() => void} />` — root is `<section aria-label="Pin planner">`
  - `<PlannerBoardPicker catalog autoAssignIds onPick={(id: string) => void} notice?={string} />`

- [ ] **Step 1: Read the framework docs.** Open `node_modules/next/dist/docs/01-app/` and read the pages on `page.tsx`, `metadata`, and client components for this Next version. Confirm the `metadata` export shape and that a page with no dynamic APIs is prerendered. Follow `src/app/compare/page.tsx` where the docs agree.

- [ ] **Step 2: Write the failing tests** — `test/planner-ui.test.tsx`:

```tsx
// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { createBoardDetailLoader } from "@/lib/board-detail-loader";
import { PlannerApp } from "@/components/planner/PlannerApp";
import { PlannerBoardPicker } from "@/components/planner/PlannerBoardPicker";
import { PlannerWorkspace } from "@/components/planner/PlannerWorkspace";

const catalog = boards.map(summarizeBoard);
const autoAssignIds = boards.filter((item) => item.pinFunctions && item.pinout).map((item) => item.id);

function board(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`${id} missing`);
  return found;
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

async function settle() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

describe("PlannerBoardPicker", () => {
  it("finds a board, tags what it supports, and picks it with Enter", () => {
    const onPick = vi.fn();
    render(<PlannerBoardPicker catalog={catalog} autoAssignIds={autoAssignIds} onPick={onPick} />);
    const input = screen.getByRole("combobox", { name: "Search for your board" });
    fireEvent.change(input, { target: { value: "raspberry pi pico" } });
    const options = screen.getAllByRole("option");
    expect(options[0].textContent).toContain("Raspberry Pi Pico");
    expect(options[0].textContent).toContain("Auto-assign");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith("raspberry-pi-pico");
  });

  it("lists the auto-assign boards as quick picks", () => {
    const onPick = vi.fn();
    render(<PlannerBoardPicker catalog={catalog} autoAssignIds={autoAssignIds} onPick={onPick} />);
    const group = screen.getByRole("group", { name: "Boards with auto-assign" });
    expect(within(group).getAllByRole("button")).toHaveLength(autoAssignIds.length);
    fireEvent.click(within(group).getByRole("button", { name: /Arduino UNO/ }));
    expect(onPick).toHaveBeenCalledWith("arduino-uno-rev3");
  });

  const unmapped = catalog.find((item) => !item.hasPinout);
  it.skipIf(!unmapped)("shows a board with no pin map as unavailable", () => {
    const onPick = vi.fn();
    render(<PlannerBoardPicker catalog={catalog} autoAssignIds={autoAssignIds} onPick={onPick} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: unmapped!.name } });
    const option = screen.getAllByRole("option").find((item) => item.textContent?.includes(unmapped!.name))!;
    expect(option.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(option);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("says when nothing matches", () => {
    render(<PlannerBoardPicker catalog={catalog} autoAssignIds={autoAssignIds} onPick={() => {}} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzzzqqqq" } });
    expect(screen.getByText("No board matches that.")).toBeTruthy();
  });
});

describe("PlannerWorkspace", () => {
  it("claims a pin by hand, keeps it in the URL, and plans around it", async () => {
    window.history.replaceState(null, "", "/planner?board=raspberry-pi-pico");
    render(<PlannerWorkspace board={board("raspberry-pi-pico")} onChangeBoard={() => {}} />);
    await settle();
    const section = screen.getByRole("region", { name: "Pin planner" });

    fireEvent.click(within(section).getByRole("button", { name: /^Pin 6, GP4/ }));
    const editor = within(section).getByRole("region", { name: "Pin editor" });
    fireEvent.change(within(editor).getByLabelText("Used for"), { target: { value: "OLED <SDA>" } });
    expect((within(editor).getByLabelText("Used for") as HTMLInputElement).value).toBe("OLED SDA");
    fireEvent.click(within(editor).getByRole("button", { name: "Claim pin" }));

    const params = () => new URLSearchParams(window.location.search);
    expect(params().get("board")).toBe("raspberry-pi-pico");
    expect(params().get("use")).toMatch(/~OLED SDA$/);
    expect(section.querySelectorAll(".bv-claimed-ring")).toHaveLength(1);
    expect(section.querySelector('tr[data-kind="manual"]')?.textContent).toContain("OLED SDA");

    fireEvent.click(within(section).getByRole("button", { name: "Add one I2C" }));
    expect(within(section).getByText("Plan ready: 2 pins assigned.")).toBeTruthy();
    expect(params().get("plan")).toBe("i2c1");
    for (const row of section.querySelectorAll('tr[data-kind="auto"]')) {
      expect(row.textContent).not.toMatch(/\bGP4\b/);
    }

    fireEvent.click(within(section).getByRole("button", { name: /^Pin 6, GP4/ }));
    fireEvent.click(within(section).getByRole("button", { name: "Release pin" }));
    expect(params().get("use")).toBeNull();
  });

  it("restores a shared plan with claims", async () => {
    window.history.replaceState(null, "", "/planner?board=raspberry-pi-pico&plan=i2c1&use=pL:0~UART+TX,zz:9~bad");
    render(<PlannerWorkspace board={board("raspberry-pi-pico")} onChangeBoard={() => {}} />);
    await settle();
    const section = screen.getByRole("region", { name: "Pin planner" });
    expect(section.querySelectorAll('tr[data-kind="manual"]')).toHaveLength(1);
    expect(section.querySelector('tr[data-kind="manual"]')?.textContent).toContain("UART TX");
    expect(within(section).getByRole("group", { name: /^I2C, 1 planned/ })).toBeTruthy();
    expect(new URLSearchParams(window.location.search).get("use")).toBe("pL:0~UART TX");
  });

  it("offers manual claims but no guessed plan on a board without pin functions", async () => {
    window.history.replaceState(null, "", "/planner?board=raspberry-pi-4-model-b");
    render(<PlannerWorkspace board={board("raspberry-pi-4-model-b")} onChangeBoard={() => {}} />);
    await settle();
    const section = screen.getByRole("region", { name: "Pin planner" });
    expect(section.textContent).toContain("Auto-assign isn't available for this board yet.");
    expect(within(section).queryByRole("button", { name: /^Add one/ })).toBeNull();
    const report = within(section).getByRole("link", { name: /Report a data error/ });
    expect(report.getAttribute("rel")).toBe("noopener noreferrer");
    expect(section.querySelector("image, .rpi-artwork")).toBeNull();
    expect(within(section).getAllByRole("button", { name: /^Pin \d+, / }).length).toBeGreaterThan(0);
  });

  it("asks before discarding a plan when changing board", async () => {
    const onChangeBoard = vi.fn();
    window.history.replaceState(null, "", "/planner?board=raspberry-pi-pico&plan=i2c1");
    render(<PlannerWorkspace board={board("raspberry-pi-pico")} onChangeBoard={onChangeBoard} />);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Change board" }));
    expect(onChangeBoard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Discard plan and change board" }));
    expect(onChangeBoard).toHaveBeenCalledTimes(1);
  });
});

describe("PlannerApp", () => {
  it("shows the picker, then the workspace for the board in the URL", async () => {
    const loader = createBoardDetailLoader(boards);
    render(<PlannerApp catalog={catalog} autoAssignIds={autoAssignIds} loader={loader} />);
    await settle();
    expect(screen.getByRole("combobox", { name: "Search for your board" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Raspberry Pi Pico$/ }));
    await settle();
    expect(window.location.search).toBe("?board=raspberry-pi-pico");
    expect(screen.getByRole("region", { name: "Pin planner" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Raspberry Pi Pico");
  });

  it("ignores a malformed board parameter", async () => {
    window.history.replaceState(null, "", "/planner?board=../../etc");
    render(<PlannerApp catalog={catalog} autoAssignIds={autoAssignIds} loader={createBoardDetailLoader(boards)} />);
    await settle();
    expect(screen.getByRole("combobox", { name: "Search for your board" })).toBeTruthy();
  });
});
```

The Pico pad label `/^Pin 6, GP4/` and anchor key `pL:0` come from the existing e2e spec and `buildEdgeDual`; if `pL:0` is not a Pico anchor key, log `buildBoardGeometry(pico)!.anchors[0].key` and use that.

- [ ] **Step 3: Run** `npx vitest run test/planner-ui.test.tsx` — Expected: FAIL (modules missing).

- [ ] **Step 4: Implement `peripherals.ts`**

```ts
import type { PinRole } from "@/lib/boards";
import type { PlanPeripheral } from "@/lib/pin-planner";

/** The role hue each planned peripheral is drawn in. */
export const peripheralRole: Record<PlanPeripheral, PinRole> = {
  I2C: "i2c",
  SPI: "spi",
  UART: "uart",
  CAN: "special",
  PWM: "pwm",
  ADC: "adc",
  DAC: "dac",
  GPIO: "gpio",
};

export const peripheralHint: Record<PlanPeripheral, string> = {
  I2C: "SDA, SCL",
  SPI: "SCK, MOSI, MISO, CS",
  UART: "TX, RX",
  CAN: "TX, RX",
  PWM: "1 output each",
  ADC: "1 channel each",
  DAC: "1 channel each",
  GPIO: "plain I/O",
};
```

- [ ] **Step 5: Implement `PlannerBoardPicker.tsx`**

```tsx
"use client";

import { useId, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Search } from "lucide-react";
import type { BoardSummary } from "@/lib/board-summary";
import {
  createBoardSearchIndex,
  matchBoardSearchEntry,
  tokenizeQuery,
} from "@/lib/board-search";
import { VendorLogo } from "@/components/VendorLogo";
import { useSlashToFocus } from "@/components/catalog/useSlashToFocus";

const maxResults = 12;
const maxQueryLength = 256;

/**
 * Step one of the planner: find the board. Every board with a pin map can be
 * planned by hand; the tag says which ones PinHub can also auto-assign.
 */
export function PlannerBoardPicker({
  catalog,
  autoAssignIds,
  onPick,
  notice,
}: {
  catalog: readonly BoardSummary[];
  autoAssignIds: readonly string[];
  onPick: (id: string) => void;
  notice?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useSlashToFocus(inputRef);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const index = useMemo(() => createBoardSearchIndex(catalog), [catalog]);
  const auto = useMemo(() => new Set(autoAssignIds), [autoAssignIds]);
  const quickPicks = useMemo(
    () => catalog.filter((board) => auto.has(board.id)),
    [auto, catalog],
  );

  const tokens = useMemo(() => tokenizeQuery(query), [query]);
  const results = useMemo(() => {
    if (!tokens.length) return [];
    return index
      .flatMap((entry) => {
        const match = matchBoardSearchEntry(entry, tokens);
        return match ? [{ board: entry.board, score: match.score }] : [];
      })
      .sort((a, b) => b.score - a.score || a.board.name.localeCompare(b.board.name))
      .slice(0, maxResults)
      .map((item) => item.board);
  }, [index, tokens]);
  const current = results[Math.min(active, results.length - 1)];

  function move(delta: number) {
    if (!results.length) return;
    let next = Math.min(active, results.length - 1);
    for (let step = 0; step < results.length; step += 1) {
      next = (next + delta + results.length) % results.length;
      if (results[next].hasPinout) break;
    }
    setActive(next);
  }

  return (
    <section aria-labelledby={`${listId}-title`} className="surface-panel rounded-2xl p-5 sm:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200">Pin planner</p>
      <h1 id={`${listId}-title`} className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-white">
        Which board are you wiring?
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-7 text-zinc-400">
        Pick your board, then mark the pins your circuit uses. On boards with source-backed pin
        functions PinHub can also assign buses for you.
      </p>
      {notice ? (
        <p role="status" className="surface-well mt-4 rounded-md px-3 py-2 text-[13px] leading-6 text-zinc-300">
          {notice}
        </p>
      ) : null}

      <div className="relative mt-5 max-w-2xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
        <input
          ref={inputRef}
          role="combobox"
          aria-label="Search for your board"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
          autoComplete="off"
          spellCheck={false}
          maxLength={maxQueryLength}
          value={query}
          placeholder="Search by board, vendor, or chip…"
          onChange={(event) => {
            setQuery(event.target.value.slice(0, maxQueryLength));
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              move(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              move(-1);
            } else if (event.key === "Enter") {
              const target = current?.hasPinout ? current : results.find((board) => board.hasPinout);
              if (target) {
                event.preventDefault();
                onPick(target.id);
              }
            } else if (event.key === "Escape" && query) {
              event.preventDefault();
              setQuery("");
            }
          }}
          className="h-12 w-full rounded-md border border-white/10 bg-[#0a0c11] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300/70 focus:ring-1 focus:ring-cyan-300/30"
        />
      </div>

      <ul id={listId} role="listbox" aria-label="Boards" className={clsx("mt-2 max-w-2xl", results.length ? "surface-well rounded-md p-1" : "")}>
        {results.map((board) => {
          const selectable = board.hasPinout;
          const isActive = board === current;
          return (
            <li
              key={board.id}
              id={`${listId}-${board.id}`}
              role="option"
              aria-selected={isActive}
              aria-disabled={!selectable}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (selectable) onPick(board.id);
              }}
              className={clsx(
                "flex min-h-11 items-center gap-3 rounded px-2 py-1.5",
                selectable ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                isActive && selectable ? "bg-white/[0.06]" : "",
              )}
            >
              <VendorLogo vendor={board.vendor} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{board.name}</span>
                <span className="block truncate font-mono text-[11px] text-zinc-500">
                  {board.vendor} / {board.family}
                </span>
              </span>
              <CapabilityTag auto={auto.has(board.id)} mapped={selectable} />
            </li>
          );
        })}
      </ul>
      <p role="status" aria-live="polite" className={tokens.length && !results.length ? "mt-2 text-[13px] text-zinc-400" : "sr-only"}>
        {tokens.length
          ? results.length
            ? `${results.length} ${results.length === 1 ? "board" : "boards"} found`
            : "No board matches that."
          : ""}
      </p>

      {quickPicks.length ? (
        <div role="group" aria-labelledby={`${listId}-quick`} className="mt-6">
          <h2 id={`${listId}-quick`} className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Boards with auto-assign
          </h2>
          <div className="mt-2 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,15rem),1fr))]">
            {quickPicks.map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() => onPick(board.id)}
                className="surface-well flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-zinc-200 transition hover:border-cyan-300/40 hover:text-white"
              >
                <VendorLogo vendor={board.vendor} />
                <span className="min-w-0 truncate text-sm font-medium">{board.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CapabilityTag({ auto, mapped }: { auto: boolean; mapped: boolean }) {
  const label = !mapped ? "No pin map" : auto ? "Auto-assign" : "Manual";
  return (
    <span
      className={clsx(
        "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]",
        auto && mapped
          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
          : "border-white/10 text-zinc-400",
      )}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 6: Implement `PlannerAutoAssign.tsx`**

```tsx
"use client";

import { useId } from "react";
import { clsx } from "clsx";
import { Flag, Minus, Plus, RotateCcw, TriangleAlert, Wand2 } from "lucide-react";
import type { PlanPeripheral, PlanRequirements } from "@/lib/pin-planner";
import { roleColors } from "@/components/board-visual/roles";
import { peripheralHint, peripheralRole } from "@/components/planner/peripherals";

type Props = {
  /** False for a board without source-backed pin functions. */
  available: boolean;
  boardName: string;
  reportUrl: string | null;
  capabilities: { peripheral: PlanPeripheral; max: number }[];
  requirements: PlanRequirements;
  status: string;
  unsatisfiable: boolean;
  usedFlaggedPins: boolean;
  onStep: (peripheral: PlanPeripheral, delta: number) => void;
  onClear: () => void;
};

/**
 * "Fit these buses into the pins I have left." Only for boards whose pin
 * functions are source-backed; every other board gets one line, never a guess.
 */
export function PlannerAutoAssign({
  available,
  boardName,
  reportUrl,
  capabilities,
  requirements,
  status,
  unsatisfiable,
  usedFlaggedPins,
  onStep,
  onClear,
}: Props) {
  const headingId = useId();
  const statusId = useId();
  const total = Object.values(requirements).reduce((sum, count) => sum + (count ?? 0), 0);
  // A requirement can outlive its capacity once pins are claimed by hand, so
  // it keeps a stepper (to take it back down) even when the board has no room.
  const rows = [
    ...capabilities,
    ...(Object.keys(requirements) as PlanPeripheral[])
      .filter((peripheral) => !capabilities.some((item) => item.peripheral === peripheral))
      .map((peripheral) => ({ peripheral, max: 0 })),
  ];

  return (
    <section aria-labelledby={headingId} className="surface-panel min-w-0 rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id={headingId} className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-white">
            <Wand2 className="size-4 text-zinc-400" aria-hidden="true" />
            Auto-assign
          </h2>
          {available ? (
            <p className="mt-1 text-[13px] leading-6 text-zinc-400">
              Say what else the circuit needs. PinHub fits it into the pins you have not claimed,
              using {boardName}&apos;s source-backed pin functions only.
            </p>
          ) : null}
        </div>
        {available && total ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span className="text-xs">Clear auto-assign</span>
          </button>
        ) : null}
      </div>

      {!available ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-6 text-zinc-400">
          <p className="min-w-0">
            Auto-assign isn&apos;t available for this board yet. It needs source-backed pin functions,
            and PinHub does not guess them. You can still claim pins by hand on the board.
          </p>
          {reportUrl ? (
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 underline-offset-4 transition hover:text-white hover:underline"
            >
              <Flag className="size-3.5" aria-hidden="true" />
              Report a data error
              <span className="sr-only"> on GitHub (opens in a new tab)</span>
            </a>
          ) : null}
        </div>
      ) : (
        <>
          <div
            role="group"
            aria-labelledby={headingId}
            aria-describedby={statusId}
            className="mt-3 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,13rem),1fr))]"
          >
            {rows.map(({ peripheral, max }) => {
              const count = requirements[peripheral] ?? 0;
              const colors = roleColors[peripheralRole[peripheral]];
              return (
                <div
                  key={peripheral}
                  role="group"
                  aria-label={`${peripheral}, ${count} planned, up to ${max}`}
                  className="surface-well flex min-w-0 items-center justify-between gap-2 rounded-lg py-1 pl-3 pr-1"
                >
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5 font-mono text-[13px] font-semibold text-zinc-100">
                      <span className="size-2 shrink-0 self-center rounded-full" style={{ backgroundColor: colors.edge }} aria-hidden="true" />
                      {peripheral}
                      <span className="text-[10px] font-normal text-zinc-500">max {max}</span>
                    </div>
                    <div className="text-[10px] leading-4 text-zinc-500">{peripheralHint[peripheral]}</div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => onStep(peripheral, -1)}
                      disabled={count === 0}
                      aria-label={`Remove one ${peripheral}`}
                      className="ph-plan-step grid size-11 place-items-center rounded-md text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Minus className="size-4" aria-hidden="true" />
                    </button>
                    <span aria-hidden="true" data-plan-count={peripheral} className="w-6 text-center font-mono text-base font-semibold tabular-nums text-white">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => onStep(peripheral, 1)}
                      disabled={count >= max}
                      aria-label={`Add one ${peripheral}`}
                      className="ph-plan-step grid size-11 place-items-center rounded-md text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p
            id={statusId}
            data-plan-status=""
            role="status"
            aria-live="polite"
            className={clsx(
              "mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-[13px] leading-6",
              unsatisfiable
                ? "border border-orange-300/30 bg-orange-400/10 text-orange-100"
                : "surface-well text-zinc-300",
            )}
          >
            {unsatisfiable ? <TriangleAlert className="mt-1 size-3.5 shrink-0 text-orange-200" aria-hidden="true" /> : null}
            <span className="min-w-0">{status}</span>
          </p>
          {usedFlaggedPins ? (
            <p className="mt-2 text-[12px] leading-5 text-orange-200">
              Every unflagged pin that could carry these signals is taken, so the plan uses the
              flagged pins marked in your pin list. Read each caution before wiring.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 7: Implement `PlannerPinEditor.tsx`**

```tsx
"use client";

import { useId, useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import type { PinAnchor } from "@/lib/board-visual-geometry";
import type { PlanAssignment } from "@/lib/pin-planner";
import {
  claimNameInput,
  cleanClaimName,
  maxClaimNameLength,
  maxClaims,
  type ClaimCaution,
} from "@/lib/planner-claims";
import { roleLabels } from "@/components/board-visual/roles";

type Props = {
  anchor: PinAnchor;
  /** The pin's current claim name, or null when it is not claimed. */
  claimedName: string | null;
  assignment?: PlanAssignment;
  cautions: ClaimCaution[];
  /** False when the claim limit is reached and this pin is not yet claimed. */
  canClaim: boolean;
  onClaim: (name: string) => void;
  onRelease: () => void;
  onClose: () => void;
};

/** Claim, rename, or release the selected pin. Mount with `key={anchor.key}`. */
export function PlannerPinEditor({
  anchor,
  claimedName,
  assignment,
  cautions,
  canClaim,
  onClaim,
  onRelease,
  onClose,
}: Props) {
  const inputId = useId();
  const [name, setName] = useState(claimedName ?? "");
  const claimed = claimedName !== null;
  const { pin } = anchor;

  return (
    <section aria-label="Pin editor" className="surface-well mt-3 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-mono text-[12px] leading-5 text-zinc-200">
          {anchor.group ? `${anchor.group} · ` : ""}
          {pin.position} · <span className="font-semibold text-white">{pin.label}</span>
          <span className="text-zinc-500"> · {roleLabels[pin.role]}</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close pin editor"
          className="ph-plan-step -mr-1 -mt-1 grid size-11 shrink-0 place-items-center rounded-md text-zinc-400 transition hover:text-white"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {pin.note && pin.role !== "reserved" ? (
        <p className="mt-1 text-[12px] leading-5 text-zinc-400">{pin.note}</p>
      ) : null}
      {cautions.length ? (
        <ul className="mt-2 space-y-1 rounded-md border border-orange-300/30 bg-orange-400/10 px-2 py-1.5 text-[12px] leading-5 text-orange-100">
          {cautions.map((caution) => (
            <li key={caution.label} className="flex gap-1.5">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-orange-200" aria-hidden="true" />
              <span className="min-w-0">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-orange-200">{caution.label}</span>{" "}
                {caution.note}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {assignment && !claimed ? (
        <p className="mt-2 text-[12px] leading-5 text-zinc-400">
          Auto-assigned to {assignment.peripheral} {assignment.unit}. Claiming it moves that function
          to another pin.
        </p>
      ) : null}

      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (claimed || canClaim) onClaim(cleanClaimName(name));
        }}
      >
        <div className="min-w-0 flex-1 basis-40">
          <label htmlFor={inputId} className="block font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Used for
          </label>
          <input
            id={inputId}
            value={name}
            maxLength={maxClaimNameLength}
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. OLED SDA"
            onChange={(event) => setName(claimNameInput(event.target.value))}
            className="mt-1 h-11 w-full rounded-md border border-white/10 bg-[#0a0c11] px-3 font-mono text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300/70 focus:ring-1 focus:ring-cyan-300/30"
          />
        </div>
        <button
          type="submit"
          disabled={!claimed && !canClaim}
          className="inline-flex min-h-11 items-center rounded-md border border-cyan-300/60 bg-cyan-300/10 px-3 text-cyan-50 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span className="text-[12px] font-medium">{claimed ? "Update name" : "Claim pin"}</span>
        </button>
        {claimed ? (
          <button
            type="button"
            onClick={onRelease}
            className="inline-flex min-h-11 items-center rounded-md border border-white/10 bg-white/[0.03] px-3 text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            <span className="text-[12px] font-medium">Release pin</span>
          </button>
        ) : null}
      </form>
      {!claimed && !canClaim ? (
        <p role="status" className="mt-2 text-[12px] leading-5 text-zinc-400">
          A plan holds at most {maxClaims} claimed pins. Release one to claim this pin.
        </p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 8: Implement `PlannerPinsTable.tsx`**

```tsx
"use client";

import { clsx } from "clsx";
import { TriangleAlert } from "lucide-react";
import type { PinAnchor } from "@/lib/board-visual-geometry";
import type { PlanAssignment } from "@/lib/pin-planner";
import type { ClaimCaution } from "@/lib/planner-claims";
import { roleColors } from "@/components/board-visual/roles";
import { peripheralRole } from "@/components/planner/peripherals";

export type PlannerRow =
  | { kind: "manual"; anchor: PinAnchor; name: string; cautions: ClaimCaution[] }
  | { kind: "auto"; anchor: PinAnchor; assignment: PlanAssignment; cautions: ClaimCaution[] };

/** Every pin in the plan, in physical order: claimed by hand and auto-assigned. */
export function PlannerPinsTable({
  rows,
  selectedKey,
  auto,
  onProbe,
}: {
  rows: PlannerRow[];
  selectedKey: string | null;
  auto: boolean;
  onProbe: (key: string) => void;
}) {
  if (!rows.length) {
    return (
      <p className="surface-well rounded-md px-3 py-2 text-[13px] leading-6 text-zinc-400">
        No pins planned yet. Select a pin on the board to claim it
        {auto ? ", or add what the circuit needs under Auto-assign." : "."}
      </p>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-collapse text-left font-mono text-[12px]">
        <caption className="sr-only">Your pins</caption>
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
            <th scope="col" className="px-2 pb-2 font-medium">Use</th>
            <th scope="col" className="px-2 pb-2 font-medium">Signal</th>
            <th scope="col" className="px-2 pb-2 font-medium">Pin</th>
            <th scope="col" className="px-2 pb-2 font-medium">Label</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { anchor } = row;
            const selected = selectedKey === anchor.key;
            const place = anchor.group ? `${anchor.group} · ${anchor.pin.position}` : String(anchor.pin.position);
            const item = row.kind === "auto" ? row.assignment : null;
            return [
              <tr
                key={anchor.key}
                data-kind={row.kind}
                data-selected={selected || undefined}
                className={clsx("border-t border-white/10 align-middle transition", selected ? "bg-white/[0.06]" : "")}
              >
                <td className="px-2 py-1 text-zinc-200">
                  <span className="flex items-center gap-1.5">
                    {item ? (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: roleColors[peripheralRole[item.peripheral]].edge }}
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="size-2 shrink-0 rounded-full border border-zinc-300" aria-hidden="true" />
                    )}
                    <span className="min-w-0 break-words">
                      {item ? `${item.peripheral} ${item.unit}` : row.kind === "manual" && row.name ? row.name : "In use"}
                    </span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-zinc-400">
                  {item
                    ? [item.instance, item.signal !== "IO" ? item.signal : null].filter(Boolean).join(" ") || "I/O"
                    : "claimed"}
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-zinc-400">{place}</td>
                <td className="px-2 py-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onProbe(anchor.key)}
                      aria-pressed={selected}
                      aria-label={`Show pin ${anchor.pin.position}, ${anchor.pin.label} on the board`}
                      className={clsx(
                        "inline-flex min-h-11 items-center rounded px-1.5 text-left font-semibold underline-offset-4 transition hover:underline",
                        selected ? "text-white" : "text-zinc-100",
                      )}
                    >
                      <span className="font-mono text-[12px]">{anchor.pin.label}</span>
                    </button>
                    {item?.isDefault ? (
                      <span className="rounded border border-white/10 px-1 py-0.5 text-[10px] text-zinc-400">default</span>
                    ) : null}
                    {item?.routed ? (
                      <span className="rounded border border-white/10 px-1 py-0.5 text-[10px] text-zinc-400">routed</span>
                    ) : null}
                  </span>
                </td>
              </tr>,
              row.cautions.length ? (
                <tr key={`${anchor.key}-caution`} className="align-top">
                  <td colSpan={4} className="px-2 pb-2">
                    <ul className="space-y-1 rounded-md border border-orange-300/30 bg-orange-400/10 px-2 py-1.5 font-sans text-[12px] leading-5 text-orange-100">
                      {row.cautions.map((caution) => (
                        <li key={caution.label} className="flex gap-1.5">
                          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-orange-200" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-orange-200">{caution.label}</span>{" "}
                            {caution.note}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ) : null,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 9: Implement `PlannerExports.tsx`** (the old `PlanExports`, taking finished exports)

```tsx
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { clsx } from "clsx";
import { Check, Copy, Download } from "lucide-react";
import type { PlanExport } from "@/lib/pin-plan-export";

export function PlannerExports({ exports }: { exports: PlanExport[] }) {
  const [format, setFormat] = useState(exports[0]?.format);
  const [feedback, setFeedback] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelId = useId();
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const current = exports.find((item) => item.format === format) ?? exports[0];
  if (!current) return null;

  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(current.text);
      setFeedback(`Copied the ${current.label} export.`);
    } catch {
      setFeedback("Couldn’t copy. Check clipboard permission and try again.");
    }
    timer.current = setTimeout(() => setFeedback(""), 3000);
  }

  return (
    <section aria-labelledby={labelId} className="surface-panel min-w-0 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={labelId} className="text-[15px] font-semibold tracking-tight text-white">Export</h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Export format">
          {exports.map((item) => (
            <button
              key={item.format}
              type="button"
              aria-pressed={item.format === current.format}
              onClick={() => setFormat(item.format)}
              className={clsx(
                "min-h-11 rounded-md border px-3 font-medium transition",
                item.format === current.format
                  ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-50"
                  : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/25 hover:text-white",
              )}
            >
              <span className="text-[12px]">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 break-all font-mono text-[11px] text-zinc-500">{current.filename}</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            {feedback.startsWith("Copied") ? (
              <Check className="size-3.5 text-emerald-300" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
            <span className="text-[12px]">Copy</span>
          </button>
          <a
            href={`data:${current.mimeType};charset=utf-8,${encodeURIComponent(current.text)}`}
            download={current.filename}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-[12px] font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Download
          </a>
        </div>
      </div>
      <pre
        tabIndex={0}
        aria-label={`${current.label} export preview`}
        className="surface-well mt-2 max-h-72 overflow-auto rounded-md p-3 font-mono text-[11px] leading-5 text-zinc-300"
      >
        <code>{current.text}</code>
      </pre>
      <p role="status" aria-live="polite" className={feedback ? "mt-1 text-[12px] text-zinc-400" : "sr-only"}>
        {feedback}
      </p>
    </section>
  );
}
```

- [ ] **Step 10: Implement `PlannerWorkspace.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import type { Board, Pin, PinRole } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import {
  maxPlanCount,
  normalizePlanRequirements,
  planCapabilities,
  planPins,
  type PlanAssignment,
  type PlanPeripheral,
  type PlanRequirements,
  type PlanResult,
} from "@/lib/pin-planner";
import { planExports } from "@/lib/pin-plan-export";
import { claimsFromSearch, planFromSearch, searchWithPlanner } from "@/lib/plan-params";
import { pinReportContextFor, pinReportUrl } from "@/lib/pin-report";
import {
  claimCautions,
  cleanClaimName,
  maxClaims,
  type ClaimedPin,
  type PinClaim,
} from "@/lib/planner-claims";
import { BoardStage } from "@/components/board-visual/BoardStage";
import { VendorLogo } from "@/components/VendorLogo";
import { PlannerAutoAssign } from "@/components/planner/PlannerAutoAssign";
import { PlannerExports } from "@/components/planner/PlannerExports";
import { PlannerPinEditor } from "@/components/planner/PlannerPinEditor";
import { PlannerPinsTable, type PlannerRow } from "@/components/planner/PlannerPinsTable";
import { peripheralRole } from "@/components/planner/peripherals";

/** Tallest the planner's drawing gets; tall boards shrink to fit, not scroll. */
const maxDrawingHeight = 560;
const noNet = new Set<string>();
const unsupported: PlanResult = { status: "unsupported" };

function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The planner for one board. Pins are claimed by hand on the drawing; on a
 * board with source-backed pin functions the solver fits further peripherals
 * into whatever is left. Both halves live in the URL (`use=` and `plan=`).
 * Mount with `key={board.id}` so a new board starts clean.
 */
export function PlannerWorkspace({ board, onChangeBoard }: { board: Board; onChangeBoard: () => void }) {
  const auto = Boolean(board.pinFunctions && board.pinout);
  const geometry = useMemo(() => buildBoardGeometry(board, { artwork: false }), [board]);
  const anchorByKey = useMemo(
    () => new Map(geometry?.anchors.map((anchor) => [anchor.key, anchor]) ?? []),
    [geometry],
  );
  const validKeys = useMemo(() => new Set(anchorByKey.keys()), [anchorByKey]);
  const baseLimits = useMemo(
    () => new Map(planCapabilities(board).map((item) => [item.peripheral, item.max])),
    [board],
  );
  const fit = useCallback(
    (requirements: PlanRequirements): PlanRequirements => {
      const fitted: PlanRequirements = {};
      for (const [peripheral, max] of baseLimits) {
        const count = Math.min(requirements[peripheral] ?? 0, max);
        if (count > 0) fitted[peripheral] = count;
      }
      return normalizePlanRequirements(fitted);
    },
    [baseLimits],
  );

  const [requirements, setRequirements] = useState<PlanRequirements>({});
  const [claims, setClaims] = useState<PinClaim[]>([]);
  const ready = useRef(false);

  const restore = useCallback(() => {
    if (ready.current) return;
    ready.current = true;
    setRequirements(fit(planFromSearch(location.search)));
    setClaims(claimsFromSearch(location.search, validKeys));
  }, [fit, validKeys]);

  // Restore a shared plan after hydration: the page is statically generated,
  // so the URL is only known in the browser.
  useEffect(() => {
    const frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [restore]);

  useEffect(() => {
    if (!ready.current) return;
    const next = `${location.pathname}${searchWithPlanner(location.search, requirements, claims)}${location.hash}`;
    if (next !== `${location.pathname}${location.search}${location.hash}`) {
      history.replaceState(null, "", next);
    }
  }, [requirements, claims]);

  const claimNameByKey = useMemo(() => new Map(claims.map((claim) => [claim.key, claim.name])), [claims]);
  const claimedKeys = useMemo(() => new Set(claimNameByKey.keys()), [claimNameByKey]);
  const excluded = useMemo(() => {
    const pins = new Set<Pin>();
    for (const key of claimedKeys) {
      const anchor = anchorByKey.get(key);
      if (anchor) pins.add(anchor.pin);
    }
    return pins;
  }, [anchorByKey, claimedKeys]);

  const capabilities = useMemo(() => (auto ? planCapabilities(board, excluded) : []), [auto, board, excluded]);
  const result = useMemo(
    () => (auto ? planPins(board, requirements, undefined, excluded) : unsupported),
    [auto, board, excluded, requirements],
  );
  const assignments = useMemo(() => (result.status === "ok" ? result.assignments : []), [result]);
  const assignmentByPin = useMemo(() => new Map(assignments.map((item) => [item.pin, item])), [assignments]);

  const planned = useMemo(() => {
    const map = new Map<string, PinRole>();
    for (const anchor of geometry?.anchors ?? []) {
      const item = assignmentByPin.get(anchor.pin);
      if (item) map.set(anchor.key, peripheralRole[item.peripheral]);
    }
    return map;
  }, [assignmentByPin, geometry]);

  const rows = useMemo<PlannerRow[]>(() => {
    const list: PlannerRow[] = [];
    for (const anchor of geometry?.anchors ?? []) {
      const name = claimNameByKey.get(anchor.key);
      const assignment = assignmentByPin.get(anchor.pin);
      if (name !== undefined) {
        list.push({ kind: "manual", anchor, name, cautions: claimCautions(board, anchor.pin) });
      } else if (assignment) {
        list.push({
          kind: "auto",
          anchor,
          assignment,
          cautions: assignment.cautions.map((item) => ({ label: item.flag.replaceAll("-", " "), note: item.note })),
        });
      }
    }
    return list;
  }, [assignmentByPin, board, claimNameByKey, geometry]);

  const claimedPins = useMemo<ClaimedPin[]>(
    () =>
      rows.flatMap((row) =>
        row.kind === "manual"
          ? [{
              name: row.name,
              pin: row.anchor.pin,
              ...(row.anchor.group ? { group: row.anchor.group } : {}),
              cautions: row.cautions,
            }]
          : [],
      ),
    [rows],
  );
  const exports = useMemo(
    () => planExports(board, assignments, today(), claimedPins),
    [assignments, board, claimedPins],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const drawingRef = useRef<HTMLDivElement>(null);
  const liveKey = activeKey ?? selectedKey;
  const liveAnchor = liveKey ? anchorByKey.get(liveKey) ?? null : null;
  const selectedAnchor = selectedKey ? anchorByKey.get(selectedKey) ?? null : null;

  const step = useCallback(
    (peripheral: PlanPeripheral, delta: number) => {
      const apply = (current: PlanRequirements) =>
        normalizePlanRequirements({
          ...current,
          [peripheral]: Math.min(maxPlanCount, Math.max(0, (current[peripheral] ?? 0) + delta)),
        });
      if (!ready.current) {
        // A tap can beat the first frame; start from the shared plan, not over it.
        ready.current = true;
        setClaims(claimsFromSearch(location.search, validKeys));
        setRequirements(apply(fit(planFromSearch(location.search))));
      } else {
        setRequirements(apply);
      }
    },
    [fit, validKeys],
  );

  function claim(key: string, name: string) {
    restore();
    const cleaned = cleanClaimName(name);
    setClaims((current) => {
      if (current.some((item) => item.key === key)) {
        return current.map((item) => (item.key === key ? { key, name: cleaned } : item));
      }
      return current.length >= maxClaims ? current : [...current, { key, name: cleaned }];
    });
  }

  function release(key: string) {
    restore();
    setClaims((current) => current.filter((item) => item.key !== key));
  }

  function probe(key: string) {
    setSelectedKey((current) => (current === key ? null : key));
    setActiveKey(null);
    drawingRef.current?.scrollIntoView({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  const cautionCount = assignments.filter((item) => item.cautions.length).length;
  const status =
    result.status === "ok"
      ? `Plan ready: ${assignments.length} ${assignments.length === 1 ? "pin" : "pins"} assigned${cautionCount ? `, ${cautionCount} with ${cautionCount === 1 ? "a caution" : "cautions"}` : ""}.`
      : result.status === "unsatisfiable"
        ? `No plan fits. ${result.reason}`
        : "Add the peripherals your circuit needs to plan its pins.";
  const hasPlan = claims.length > 0 || Object.keys(requirements).length > 0;
  const liveName = liveAnchor ? claimNameByKey.get(liveAnchor.key) : undefined;
  const liveAssignment = liveAnchor ? assignmentByPin.get(liveAnchor.pin) : undefined;

  return (
    <section aria-label="Pin planner" className="@container min-w-0">
      <header className="surface-panel flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl p-4 sm:p-5">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200">Pin planner</p>
          <h1 className="mt-1.5 flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-white">
            <VendorLogo vendor={board.vendor} size={24} />
            <span className="min-w-0 break-words">{board.name}</span>
          </h1>
          <p className="mt-1 font-mono text-[11px] leading-5 text-zinc-500">
            {board.logicLevel} · {claims.length} claimed · {assignments.length} auto-assigned
          </p>
          <p className="mt-1 flex flex-wrap gap-x-4 text-[13px]">
            <Link href={`/boards/${board.id}`} className="inline-flex min-h-11 items-center text-zinc-400 underline-offset-4 transition hover:text-white hover:underline">
              Board overview
            </Link>
            <Link href={`/pinout/${board.id}`} className="inline-flex min-h-11 items-center text-zinc-400 underline-offset-4 transition hover:text-white hover:underline">
              Full pin map
            </Link>
          </p>
        </div>
        {confirming ? (
          <div role="group" aria-label="Change board" className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] text-zinc-300">Discard this plan?</p>
            <button
              type="button"
              onClick={onChangeBoard}
              className="inline-flex min-h-11 items-center rounded-md border border-orange-300/30 bg-orange-400/10 px-3 text-orange-100 transition"
            >
              <span className="text-[12px] font-medium">Discard plan and change board</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="inline-flex min-h-11 items-center rounded-md border border-white/10 bg-white/[0.03] px-3 text-zinc-300 transition hover:border-white/25 hover:text-white"
            >
              <span className="text-[12px] font-medium">Keep planning</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => (hasPlan ? setConfirming(true) : onChangeBoard())}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            <ArrowLeftRight className="size-3.5" aria-hidden="true" />
            <span className="text-[12px] font-medium">Change board</span>
          </button>
        )}
      </header>

      <div className="mt-4 grid gap-4 @3xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] @3xl:items-start">
        <div ref={drawingRef} className="surface-panel min-w-0 scroll-mt-24 rounded-xl p-4 @3xl:sticky @3xl:top-4">
          {geometry ? (
            <>
              {/* The whole board stays in view: tall boards shrink to the
                  height cap instead of hiding pins below a scroll. */}
              <div className="bv-stage-wrap w-full overflow-hidden rounded-md">
                <div
                  className="mx-auto"
                  style={{
                    aspectRatio: `${geometry.vbw} / ${geometry.vbh}`,
                    width: `min(100%, ${Math.round((maxDrawingHeight * geometry.vbw) / geometry.vbh)}px)`,
                  }}
                >
                  <BoardStage
                    geometry={geometry}
                    title={`${board.name} pin plan`}
                    sheetLabel={board.name}
                    selectedKey={selectedKey}
                    activeKey={liveKey}
                    activeRole={null}
                    showAllLabels
                    netKeys={noNet}
                    planned={planned}
                    claimed={claimedKeys}
                    onSelect={(key) => {
                      setSelectedKey(key);
                      setActiveKey(key);
                    }}
                    onActiveKey={setActiveKey}
                  />
                </div>
              </div>
              <p className="mt-2 min-h-5 font-mono text-[11px] leading-5 text-zinc-400" aria-live="polite">
                {liveAnchor
                  ? `${liveAnchor.group ? `${liveAnchor.group} · ` : ""}${liveAnchor.pin.position} · ${liveAnchor.pin.label}${
                      liveName !== undefined
                        ? ` · claimed${liveName ? `: ${liveName}` : ""}`
                        : liveAssignment
                          ? ` · ${liveAssignment.peripheral} ${liveAssignment.unit}${liveAssignment.instance ? ` ${liveAssignment.instance}` : ""}${liveAssignment.signal !== "IO" ? ` ${liveAssignment.signal}` : ""}`
                          : " · free"
                    }`
                  : "Select a pin to claim it. Solid rings are yours; dashed rings are auto-assigned."}
              </p>
              {selectedAnchor ? (
                <PlannerPinEditor
                  key={selectedAnchor.key}
                  anchor={selectedAnchor}
                  claimedName={claimNameByKey.get(selectedAnchor.key) ?? null}
                  assignment={assignmentByPin.get(selectedAnchor.pin)}
                  cautions={claimCautions(board, selectedAnchor.pin)}
                  canClaim={claims.length < maxClaims}
                  onClaim={(name) => claim(selectedAnchor.key, name)}
                  onRelease={() => release(selectedAnchor.key)}
                  onClose={() => {
                    setSelectedKey(null);
                    setActiveKey(null);
                  }}
                />
              ) : null}
            </>
          ) : (
            <p className="text-[13px] leading-6 text-zinc-400">
              PinHub has no drawing for this board&apos;s connector yet, so pins cannot be claimed here.
            </p>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <section aria-label="Your pins" className="surface-panel min-w-0 rounded-xl p-4">
            <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-white">Your pins</h2>
            <PlannerPinsTable rows={rows} selectedKey={liveKey} auto={auto} onProbe={probe} />
          </section>
          <PlannerAutoAssign
            available={auto}
            boardName={board.name}
            reportUrl={pinReportUrl(pinReportContextFor(board))}
            capabilities={capabilities}
            requirements={requirements}
            status={status}
            unsatisfiable={result.status === "unsatisfiable"}
            usedFlaggedPins={result.status === "ok" && result.usedFlaggedPins}
            onStep={step}
            onClear={() => {
              restore();
              setRequirements({});
            }}
          />
          {result.status === "ok" ? <PlanNotes board={board} muxNote={result.muxNote} matrix={result.muxModel === "matrix"} /> : null}
          {exports.length ? <PlannerExports exports={exports} /> : null}
        </div>
      </div>
    </section>
  );
}

function PlanNotes({ board, muxNote, matrix }: { board: Board; muxNote: string; matrix: boolean }) {
  const sources = board.pinFunctions?.sources ?? [];
  return (
    <div className="surface-panel space-y-2 rounded-xl p-4 text-[12px] leading-5 text-zinc-400">
      <p>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
          {matrix ? "GPIO matrix" : "Fixed pin functions"}
        </span>{" "}
        {muxNote}
      </p>
      <details>
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-zinc-300 transition hover:text-white">
          Pin function sources ({sources.length})
        </summary>
        <ul className="mt-1 space-y-1">
          {sources.map((source) => (
            <li key={source.url} className="min-w-0">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words underline-offset-2 hover:text-white hover:underline"
              >
                {source.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
```

Unused-import check: remove `PlanAssignment` from the import list if lint flags it.

Note on the "restores a shared plan" test: `fit` clamps to the board's own limits, while `PlannerAutoAssign` shows `max` from `capabilities` (after exclusion), which is why the test matches `/^I2C, 1 planned/` rather than an exact maximum.

- [ ] **Step 11: Implement `PlannerApp.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Board } from "@/lib/boards";
import type { BoardSummary } from "@/lib/board-summary";
import { createBoardDetailLoader, type BoardDetailLoader } from "@/lib/board-detail-loader";
import { boardFromSearch, boardParam } from "@/lib/plan-params";
import { PlannerBoardPicker } from "@/components/planner/PlannerBoardPicker";
import { PlannerWorkspace } from "@/components/planner/PlannerWorkspace";

type Detail =
  | { status: "idle"; notice?: string }
  | { status: "loading"; id: string }
  | { status: "ready"; board: Board }
  | { status: "error"; id: string };

/**
 * The planner page: pick a board, then plan it. The board lives in `?board=`
 * and its full record is fetched on demand, so the page ships only the
 * catalog summaries.
 */
export function PlannerApp({
  catalog,
  autoAssignIds,
  loader: providedLoader,
}: {
  catalog: readonly BoardSummary[];
  autoAssignIds: readonly string[];
  loader?: BoardDetailLoader;
}) {
  const byId = useMemo(() => new Map(catalog.map((board) => [board.id, board])), [catalog]);
  const loader = useMemo(() => providedLoader ?? createBoardDetailLoader([]), [providedLoader]);
  const [detail, setDetail] = useState<Detail>({ status: "idle" });
  const ticket = useRef(0);

  const open = useCallback(
    (id: string | null) => {
      const mine = ++ticket.current;
      const summary = id ? byId.get(id) : undefined;
      if (!id || !summary) {
        setDetail({ status: "idle" });
        return;
      }
      if (!summary.hasPinout) {
        setDetail({
          status: "idle",
          notice: `${summary.name} has no pin map in PinHub yet, so there is nothing to plan. Pick another board.`,
        });
        return;
      }
      const cached = loader.peek(id);
      if (cached) {
        setDetail({ status: "ready", board: cached });
        return;
      }
      setDetail({ status: "loading", id });
      loader.load(id).then(
        (board) => {
          if (ticket.current === mine) setDetail({ status: "ready", board });
        },
        () => {
          if (ticket.current === mine) setDetail({ status: "error", id });
        },
      );
    },
    [byId, loader],
  );

  // The page is static, so the board in the URL is only known in the browser.
  useEffect(() => {
    const sync = () => open(boardFromSearch(location.search));
    const frame = requestAnimationFrame(sync);
    window.addEventListener("popstate", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("popstate", sync);
    };
  }, [open]);

  function pick(id: string) {
    history.pushState(null, "", `${location.pathname}?${boardParam}=${encodeURIComponent(id)}`);
    open(id);
  }

  function changeBoard() {
    history.pushState(null, "", location.pathname);
    open(null);
  }

  if (detail.status === "ready") {
    return <PlannerWorkspace key={detail.board.id} board={detail.board} onChangeBoard={changeBoard} />;
  }

  if (detail.status === "loading" || detail.status === "error") {
    const name = byId.get(detail.id)?.name ?? "the board";
    const failed = detail.status === "error";
    return (
      <section aria-label="Pin planner" className="surface-panel rounded-2xl p-5 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{name}</h1>
        <p role="status" aria-live="polite" className="mt-2 text-[13px] leading-6 text-zinc-400">
          {failed ? "The board details could not be loaded." : "Loading source-backed pin data…"}
        </p>
        {failed ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => open(detail.id)}
              className="inline-flex min-h-11 items-center rounded-md border border-cyan-300/60 bg-cyan-300/10 px-3 text-cyan-50 transition hover:bg-cyan-300/20"
            >
              <span className="text-[12px] font-medium">Try again</span>
            </button>
            <button
              type="button"
              onClick={changeBoard}
              className="inline-flex min-h-11 items-center rounded-md border border-white/10 bg-white/[0.03] px-3 text-zinc-300 transition hover:border-white/25 hover:text-white"
            >
              <span className="text-[12px] font-medium">Pick another board</span>
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <PlannerBoardPicker
      catalog={catalog}
      autoAssignIds={autoAssignIds}
      onPick={pick}
      notice={detail.notice}
    />
  );
}
```

In jsdom `location.pathname` is `/` in the test, which is why the code uses `location.pathname` rather than a hard-coded `/planner`.

- [ ] **Step 12: Implement `src/app/planner/page.tsx`**

```tsx
import type { Metadata } from "next";
import { boards } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { assertBoardVisualsValid } from "@/lib/board-visual-validation";
import { assertBoardSourcesValid } from "@/lib/source-trust";
import { CircuitBackground } from "@/components/CircuitBackground";
import { SiteHeader } from "@/components/SiteHeader";
import { PlannerApp } from "@/components/planner/PlannerApp";

export const metadata: Metadata = {
  title: "Pin planner",
  description:
    "Pick your board, mark the pins your circuit uses, and let PinHub fit I2C, SPI, UART, PWM, and ADC into the pins that are left, from source-backed pin functions.",
  alternates: { canonical: "/planner" },
};

assertBoardSourcesValid(boards);
assertBoardVisualsValid();

const catalog = boards.map(summarizeBoard);
const autoAssignIds = boards
  .filter((board) => board.pinFunctions && board.pinout)
  .map((board) => board.id);

export default function PlannerPage() {
  return (
    <main className="relative isolate min-h-screen pb-10">
      <CircuitBackground />
      <SiteHeader current="/planner" />
      <div className="relative mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <PlannerApp catalog={catalog} autoAssignIds={autoAssignIds} />
      </div>
    </main>
  );
}
```

If `test/metadata-routes.test.ts` enumerates routes or the sitemap lists sections, add `/planner` there the same way `/compare` is listed.

- [ ] **Step 13: Run** `npx vitest run test/planner-ui.test.tsx` — Expected: PASS. Then `npm run typecheck` and `npm run lint` — Expected: clean.

---

### Task 7: Replace the inline planner with a link

**Files:**
- Create: `src/components/planner/PlanPinsLink.tsx`
- Modify: `src/app/boards/[id]/page.tsx` (import at line 29, usage at lines 234–236)
- Modify: `src/components/board-visual/PinoutFullView.tsx:17,169-171`
- Modify: `src/components/BoardDetailPanel.tsx` (`FullBoardPageLink` and its call site)
- Delete: `src/components/planner/PinPlanner.tsx`, `src/components/planner/PinPlannerSection.tsx`, `test/pin-planner-ui.test.tsx`
- Test: `test/board-detail-panel.test.tsx` (modify), `test/plan-pins-link.test.tsx` (create)

- [ ] **Step 1: Write the failing tests**

`test/plan-pins-link.test.tsx`:

```tsx
// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlanPinsLink } from "@/components/planner/PlanPinsLink";

afterEach(cleanup);

describe("PlanPinsLink", () => {
  it("opens the planner on the board and says what it offers", () => {
    render(<PlanPinsLink boardId="raspberry-pi-pico" auto />);
    const link = screen.getByRole("link", { name: /Plan pins on this board/ });
    expect(link.getAttribute("href")).toBe("/planner?board=raspberry-pi-pico");
    expect(link.textContent).toContain("auto-assign");
  });

  it("does not promise auto-assign where the data is missing", () => {
    render(<PlanPinsLink boardId="raspberry-pi-500" auto={false} />);
    expect(screen.getByRole("link").textContent).not.toMatch(/auto/i);
  });
});
```

In `test/board-detail-panel.test.tsx`, replace the two cases under "BoardDetailPanel full board page link" with:

```tsx
  it("links to the board page and, separately, to the planner", () => {
    const board = catalogBoard("raspberry-pi-pico");
    renderPanel(board);

    const page = screen.getByRole("link", { name: /Open full board page/ });
    expect(page.getAttribute("href")).toBe("/boards/raspberry-pi-pico");
    const plan = screen.getByRole("link", { name: /Plan pins on this board/ });
    expect(plan.getAttribute("href")).toBe("/planner?board=raspberry-pi-pico");
    expect(plan.textContent).toContain("auto-assign");
    expect(plan.getAttribute("target")).toBeNull();
  });

  it("does not promise auto-assign to a board without pin function data", () => {
    const board = catalogBoard("raspberry-pi-500");
    expect(board.pinFunctions).toBeUndefined();
    renderPanel(board);

    const plan = screen.queryByRole("link", { name: /Plan pins on this board/ });
    if (board.pinout) expect(plan?.textContent).not.toMatch(/auto/i);
    else expect(plan).toBeNull();
  });
```

- [ ] **Step 2: Run** `npx vitest run test/plan-pins-link.test.tsx test/board-detail-panel.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Implement**

`PlanPinsLink.tsx`:

```tsx
import Link from "next/link";
import { clsx } from "clsx";
import { Route } from "lucide-react";

/** The way from a board to its planner. Only render it for a board with a pin map. */
export function PlanPinsLink({
  boardId,
  auto,
  className,
}: {
  boardId: string;
  /** True when the board has source-backed pin functions. */
  auto: boolean;
  className?: string;
}) {
  return (
    <Link
      href={`/planner?board=${encodeURIComponent(boardId)}`}
      className={clsx(
        "flex min-h-11 items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#15181f] px-3 py-2 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:bg-[#1c2029] hover:text-white sm:max-w-sm",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block font-medium">Plan pins on this board</span>
        <span className="block text-xs leading-5 text-zinc-500">
          {auto ? "Claim pins by hand or auto-assign buses" : "Mark the pins your circuit uses"}
        </span>
      </span>
      <Route className="size-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}
```

`BoardDetailPanel.tsx` — replace `FullBoardPageLink` with:

```tsx
/**
 * The catalog panel is a preview; the rest of the board reference lives on
 * the board page, and planning lives in the planner.
 */
function FullBoardPageLink({ board }: { board: Board }) {
  return (
    <>
      <Link
        href={`/boards/${board.id}`}
        className="mt-2 flex min-h-11 items-center sm:max-w-sm justify-between gap-3 rounded-lg border border-white/10 bg-[#15181f] px-3 py-2 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:bg-[#1c2029] hover:text-white"
      >
        <span className="block min-w-0 font-medium">Open full board page</span>
        <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
      </Link>
      {board.pinout ? (
        <PlanPinsLink boardId={board.id} auto={Boolean(board.pinFunctions)} className="mt-2" />
      ) : null}
    </>
  );
}
```

and add `import { PlanPinsLink } from "@/components/planner/PlanPinsLink";`.

`src/app/boards/[id]/page.tsx` — remove the `PinPlannerSection` import and the block

```tsx
        <div className="mt-5">
          <PinPlannerSection board={board} />
        </div>
```

then, directly after `<BoardActions board={board} />` inside its `mt-5` wrapper, add

```tsx
                {board.pinout ? (
                  <PlanPinsLink boardId={board.id} auto={Boolean(board.pinFunctions)} className="mt-2" />
                ) : null}
```

with the import `import { PlanPinsLink } from "@/components/planner/PlanPinsLink";`.

`PinoutFullView.tsx` — replace the import of `PinPlannerSection` with `PlanPinsLink` and

```tsx
            <div className="mt-5">
              <PinPlannerSection board={board} />
            </div>
```

with

```tsx
            <PlanPinsLink boardId={board.id} auto={Boolean(board.pinFunctions)} className="mt-5" />
```

Delete the three files listed above:

```bash
git rm src/components/planner/PinPlanner.tsx src/components/planner/PinPlannerSection.tsx test/pin-planner-ui.test.tsx
```

Then `grep -rn "PinPlannerSection\|planner/PinPlanner\|#plan" src test e2e docs/DESIGN.md` and fix every remaining reference outside `docs/pin-planner-2026-09-26.md` (a dated record; leave it).

- [ ] **Step 4: Run** `npm test`, `npm run typecheck`, `npm run lint` — Expected: all green.

---

### Task 8: Browser regressions

**Files:**
- Rewrite: `e2e/pin-planner.spec.ts`
- Modify: `e2e/mobile-workflows.spec.ts` only if it counts nav links

- [ ] **Step 1: Replace `e2e/pin-planner.spec.ts`**

```ts
import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectColor } from "./color";

async function workspace(page: Page): Promise<Locator> {
  const section = page.getByRole("region", { name: "Pin planner" });
  await expect(section).toBeVisible();
  return section;
}

/** Taps a stepper until its count reads `target`, surviving a cold hydration. */
async function setCount(section: Locator, peripheral: string, target: number) {
  const count = section.locator(`[data-plan-count="${peripheral}"]`);
  const add = section.getByRole("button", { name: `Add one ${peripheral}`, exact: true });
  await expect(async () => {
    const current = Number(await count.textContent());
    if (current < target) await add.click();
    await expect(count).toHaveText(String(target), { timeout: 1000 });
  }).toPass();
}

async function claim(section: Locator, pad: RegExp, name: string) {
  await section.getByRole("button", { name: pad }).click();
  const editor = section.getByRole("region", { name: "Pin editor" });
  await editor.getByLabel("Used for").fill(name);
  await editor.getByRole("button", { name: "Claim pin" }).click();
}

test.describe("planner page", () => {
  test("header nav reaches the planner; search, pick, claim, auto-assign, share, export", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    await page.getByRole("navigation", { name: "PinHub sections" }).getByRole("link", { name: "Planner", exact: true }).click();
    await expect(page).toHaveURL(/\/planner$/);
    await expect(
      page.getByRole("navigation", { name: "PinHub sections" }).getByRole("link", { name: "Planner", exact: true }),
    ).toHaveAttribute("aria-current", "page");

    const search = page.getByRole("combobox", { name: "Search for your board" });
    await search.fill("raspberry pi pico");
    await expect(page.getByRole("option").first()).toContainText("Raspberry Pi Pico");
    await expect(page.getByRole("option").first()).toContainText("Auto-assign");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/planner\?board=raspberry-pi-pico$/);

    let section = await workspace(page);
    await expect(section.getByRole("heading", { level: 1 })).toContainText("Raspberry Pi Pico");

    await claim(section, /^Pin 6, GP4/, "OLED SDA");
    await claim(section, /^Pin 7, GP5/, "OLED SCL");
    await expect(section.locator(".bv-claimed-ring")).toHaveCount(2);
    await expect(section.locator('tr[data-kind="manual"]')).toHaveCount(2);

    await setCount(section, "I2C", 1);
    await setCount(section, "PWM", 2);
    await expect(section.locator("[data-plan-status]")).toHaveText("Plan ready: 4 pins assigned.");
    for (const text of await section.locator('tr[data-kind="auto"]').allTextContents()) {
      expect(text).not.toMatch(/\bGP4\b|\bGP5\b/);
    }

    // Planned rings are dashed role hues, claimed rings are solid; neither is the probe's cyan.
    const rings = section.locator(".bv-planned-ring, .bv-claimed-ring");
    await expect(rings).toHaveCount(6);
    for (const stroke of await rings.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("stroke")))) {
      expect(stroke?.toLowerCase()).not.toBe("#22d3ee");
    }

    // The shared link reproduces the whole plan.
    await page.goto(page.url());
    section = await workspace(page);
    await expect(section.locator('tr[data-kind="manual"]')).toHaveCount(2);
    await expect(section.locator('tr[data-kind="manual"]').first()).toContainText("OLED SDA");
    await expect(section.locator('[data-plan-count="PWM"]')).toHaveText("2");
    await expect(section.locator("[data-plan-status]")).toHaveText("Plan ready: 4 pins assigned.");

    // Exports carry both halves and the verification header.
    const preview = section.getByLabel(/export preview$/);
    await expect(preview).toContainText("#define PINHUB_USER_OLED_SDA 4");
    await expect(preview).toContainText("Generated by PinHub — verify against the source before wiring.");
    await section.getByRole("button", { name: "CSV", exact: true }).click();
    await expect(preview).toContainText('"Manual","OLED SDA"');
    await section.getByRole("button", { name: "Copy", exact: true }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('"Auto","I2C 1"');
    await expect(section.getByRole("link", { name: "Download" })).toHaveAttribute(
      "download",
      "pinhub-plan-raspberry-pi-pico.csv",
    );

    // Changing board asks first, then returns to the picker.
    await section.getByRole("button", { name: "Change board" }).click();
    await page.getByRole("button", { name: "Discard plan and change board" }).click();
    await expect(page).toHaveURL(/\/planner$/);
    await expect(search).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("explains an unsatisfiable plan in orange, in both themes", async ({ page }) => {
    await page.goto("/planner?board=arduino-uno-rev3&plan=spi1.pwm6");
    const section = await workspace(page);
    const status = section.locator("[data-plan-status]");
    await expect(status).toHaveText("No plan fits. 6× PWM doesn't fit alongside 1× SPI: they need the same pins.");
    for (const [theme, color] of [
      ["dark", "lab(94.7127 3.58391 14.3151)"],
      ["light", "rgb(154, 52, 18)"],
    ] as const) {
      await page.locator("html").evaluate((element, value) => element.setAttribute("data-theme", value), theme);
      await expectColor(status, color);
    }
  });

  test("a Raspberry Pi is drawn as a flat sheet and a manual-only board gets no guessed plan", async ({ page }) => {
    await page.goto("/planner?board=raspberry-pi-4-model-b&plan=i2c1");
    const section = await workspace(page);
    await expect(section).toContainText("Auto-assign isn't available for this board yet.");
    await expect(section.getByRole("button", { name: /^Add one/ })).toHaveCount(0);
    await expect(section.locator(".bv-planned-ring")).toHaveCount(0);
    const report = section.getByRole("link", { name: /Report a data error/ });
    expect(new URL((await report.getAttribute("href")) ?? "").protocol).toBe("https:");
    await expect(report).toHaveAttribute("rel", "noopener noreferrer");

    await claim(section, /^Pin 3, /, "Sensor SDA");
    await expect(section.locator('tr[data-kind="manual"]')).toContainText("Sensor SDA");
    await expect(section.getByRole("button", { name: "CSV", exact: true })).toBeVisible();
    await expect(section.getByRole("button", { name: "C header", exact: true })).toHaveCount(0);
  });

  test("hostile parameters fall back to the picker or are dropped", async ({ page }) => {
    await page.goto("/planner?board=..%2F..%2Fetc");
    await expect(page.getByRole("combobox", { name: "Search for your board" })).toBeVisible();

    await page.goto(`/planner?board=raspberry-pi-pico&use=${encodeURIComponent("pL:0~<img src=x onerror=alert(1)>,zz:1~x")}`);
    const section = await workspace(page);
    await expect(section.locator('tr[data-kind="manual"]')).toHaveCount(1);
    await expect(section.locator('tr[data-kind="manual"]')).toContainText("img srcx onerroralert1");
    await expect(section.locator("img[src='x']")).toHaveCount(0);
  });

  test("board page, full view, and catalog panel link to the planner on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/boards/raspberry-pi-pico");
    await expect(page.getByRole("region", { name: "Pin planner" })).toHaveCount(0);
    const link = page.getByRole("link", { name: /Plan pins on this board/ });
    expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await link.click();
    await expect(page).toHaveURL(/\/planner\?board=raspberry-pi-pico$/);
    await workspace(page);

    await page.goto("/pinout/esp32-devkitc");
    await expect(page.getByRole("link", { name: /Plan pins on this board/ })).toHaveAttribute(
      "href",
      "/planner?board=esp32-devkitc",
    );

    await page.goto("/");
    await page.getByRole("button", { name: "Show Raspberry Pi Pico details", exact: true }).click();
    const panel = page.getByRole("complementary").filter({
      has: page.getByRole("heading", { name: "Raspberry Pi Pico", exact: true }),
    });
    await expect(panel.getByRole("link", { name: /Plan pins on this board/ })).toHaveAttribute(
      "href",
      "/planner?board=raspberry-pi-pico",
    );
  });

  test("four sections fit one row at 360 px without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    for (const path of ["/", "/planner", "/compare", "/prices", "/boards/raspberry-pi-pico"]) {
      await page.goto(path);
      const nav = page.getByRole("navigation", { name: "PinHub sections" });
      const tops = await nav.getByRole("link").evaluateAll((links) => links.map((link) => Math.round(link.getBoundingClientRect().top)));
      expect(new Set(tops).size, `${path} nav wraps`).toBe(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflows`).toBeLessThanOrEqual(0);
    }
  });
});
```

If the Pico pads are not labelled `Pin 7, GP5` (check the pad's `aria-label` in the browser) or GP4/GP5 are not the solver's default I2C pins, adjust the two claims and the expected `#define` so they still claim the pins the solver would otherwise pick first.

- [ ] **Step 2: Run** `npm run build` then `npm run test:e2e` — Expected: build passes (it is also the board-visual and source-link gate) and all specs pass, including the pre-existing ones. Fix code, not expectations, when a failure shows a real defect; update other specs only where they asserted the old inline planner or three nav links.

---

### Task 9: Design pass, gates, record, commit

- [ ] **Step 1: Design pass.** Invoke the `frontend-design` skill and review `/planner` against `docs/DESIGN.md` in the browser, both themes, picker and workspace, on the Pico, ESP32-DevKitC (cautions), UNO (grouped map), Pi 5 (flat render) and Pi 4 (manual only). Check: opaque surfaces only, cyan only on interaction/probe, orange only on cautions, emerald only on the Auto-assign tag, Geist Mono on everything transcribable, no viewport breakpoints inside the workspace, every new class readable in the light theme, focus visible, reduced motion respected. Fix what it finds.

- [ ] **Step 2: Update the docs.**
  - In `docs/DESIGN.md`, add a short "Planner" entry: its own section; solid neutral ring = claimed by hand, dashed role-hue ring = auto-assigned, cyan = probe only; flat schematic render for every board.
  - In the spec, correct the two points where the build differs: `use=` tokens are `<key>~<name>` joined by `,`; a claimed pad keeps its catalog label on the drawing (the claim name shows in the readout and table); the picker's capability data comes from `autoAssignIds` rather than a new summary field.
  - Write `docs/planner-page-2026-10-02.md`: what changed, the URL format and its limits, solver exclusion, exports, verification evidence (commands and counts), mobile gate table, known limits (old `/boards/<id>?plan=` links no longer restore; auto-assign still four boards; no saved plans; wiring-sheet branch will conflict in the board page).

- [ ] **Step 3: Desktop gate.** Run and record each result:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Expected: all pass, and `git status` shows no change under `test/__snapshots__/`.

- [ ] **Step 4: Mobile gate.** Spawn the `mobile-mojo` subagent (no worktree isolation). Have it read the `mobile-mojo` skill and test the production build at 360 × 800, 390 × 844, 412 × 915, and 844 × 390 landscape, in both themes: header nav on every page that has it (`/`, `/planner`, `/compare`, `/prices`, a board page); picker search and quick picks; Pico claim → auto-assign → reload → export; ESP32 cautions; UNO grouped map; Pi 4 manual-only; change-board confirmation; the "Plan pins" links on the board page, full view, and catalog panel. It must check overflow, 44 px targets, focus, navigation, and console errors from real screenshots. Fix what it confirms and have it recheck. A blocked check is not a pass: report it and ask the user for a waiver.

- [ ] **Step 5: Commit and push.**

```bash
git add -A
git status
git commit -m "Give the pin planner its own page with board search and manual claims

- New /planner section in the header nav: search for a board, pick it, plan it
- Claim pins by hand on any board with a pin map; names are filtered and bounded
- Auto-assign plans around claimed pins (solver takes an excluded set)
- Flat schematic render for every board, including Raspberry Pi
- CSV and JSON exports for every board; code exports include manual claims
- Board page, full pinout view, and catalog panel link to the planner

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feature/planner-page
```

Before `git add -A`, confirm `git status` lists only files from this plan (`next-env.d.ts` may be rewritten by the dev server; restore it with `git checkout -- next-env.d.ts` if so).

## Self-review notes

- Spec coverage: navigation (Tasks 5, 7), picker (6), manual claims and cautions (1, 6), solver exclusion (2), render (3), URL state (1, 6), exports (4), error states (6), tests (every task, 8), gates and write-up (9).
- Deviations from the spec, recorded in Task 9 Step 2: `use=` separators, claimed pads keep their catalog label, no `hasPinFunctions` summary field.
