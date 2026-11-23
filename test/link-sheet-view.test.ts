import { describe, expect, it } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { buildBoardLink, linkBuses } from "@/lib/board-link";
import { inView, linkedSheetView, sheetScrollCentre, wireEndKey } from "@/components/link/sheet-view";

function board(id: string): Board {
  const found = boards.find((entry) => entry.id === id);
  if (!found) throw new Error(`no board ${id}`);
  return found;
}

function viewFor(a: Board, b: Board, side: "a" | "b", bus: (typeof linkBuses)[number] = "uart") {
  const target = side === "a" ? a : b;
  const geometry = buildBoardGeometry(target, { sheet: true })!;
  const link = buildBoardLink(a, b, bus);
  const keys = link.wires.map((wire) => wireEndKey(geometry, wire[side]));
  return { geometry, link, keys, view: linkedSheetView(geometry, keys) };
}

describe("link sheet framing", () => {
  it("frames a Nucleo-144 on the one Zio connector the UART link uses", () => {
    // The reported case: the H753ZI sheet was 1649 px wide in a 441 px panel,
    // with the linked CN7 pins a sideways scroll away on the far right.
    const { geometry, keys, view } = viewFor(board("raspberry-pi-4-model-b"), board("stm32-nucleo-h753zi"), "b");
    expect(view).not.toBeNull();
    expect(view!.connectors).toHaveLength(1);
    expect(view!.connectors[0]).toMatch(/^CN7\b/);
    expect(view!.w).toBeLessThan(geometry.vbw / 2);
    expect(view!.h).toBeLessThan(geometry.vbh / 2);
    // The frame sits on the right edge, where CN7's labels run out.
    expect(view!.x + view!.w).toBe(geometry.vbw);
    for (const key of keys) {
      const anchor = geometry.anchors.find((item) => item.key === key)!;
      expect(inView(view!, anchor)).toBe(true);
    }
  });

  it("keeps a two-row header whole", () => {
    const { view } = viewFor(board("raspberry-pi-4-model-b"), board("stm32-nucleo-h753zi"), "a");
    expect(view).toBeNull();
  });

  it("never frames out a linked pad or its label rail, on any board pair side", () => {
    const partner = board("raspberry-pi-pico");
    let framed = 0;
    for (const target of boards) {
      if (!buildBoardGeometry(target, { sheet: true })) continue;
      for (const bus of linkBuses) {
        const { geometry, link, keys, view } = viewFor(partner, target, "b", bus);
        if (link.status === "blocked" || !view) continue;
        framed += 1;
        expect(view.x).toBeGreaterThanOrEqual(0);
        expect(view.y).toBeGreaterThanOrEqual(0);
        expect(view.x + view.w).toBeLessThanOrEqual(geometry.vbw);
        expect(view.y + view.h).toBeLessThanOrEqual(geometry.vbh);
        for (const key of keys) {
          const anchor = geometry.anchors.find((item) => item.key === key)!;
          expect(inView(view, anchor), `${target.id} ${bus} ${anchor.pin.label}`).toBe(true);
          // Rail labels: the frame reaches the sheet edge the label runs to.
          if (geometry.kind !== "group-strips" && !anchor.rotateLabel) {
            if (anchor.labelAnchor === "end") expect(view.x).toBe(0);
            if (anchor.labelAnchor === "start") expect(view.x + view.w).toBe(geometry.vbw);
          }
        }
      }
    }
    // The framing has to actually engage on the catalog's large sheets.
    expect(framed).toBeGreaterThan(5);
  });

  it("opens a scrolling sheet on the most linked pads it can show, not their empty midpoint", () => {
    // Mobile gate: a Grand Central at 360 px had pads at 546, 624 and 0 scroll
    // px in a 300 px panel; centring on the midpoint showed none of them.
    const grand = sheetScrollCentre([546, 624, 0], 300, 30)!;
    expect(grand.shown).toBe(2);
    for (const x of [546, 624]) expect(Math.abs(x - grand.centre)).toBeLessThanOrEqual(150 - 30);
    // A UNO's D0/D1 sit together and GND far off: show the pair, which holds wire 1.
    const uno = sheetScrollCentre([146, 192, 514], 300, 30)!;
    expect(uno.shown).toBe(2);
    expect(uno.centre).toBe(169);
    // Equal windows: the earliest wire wins.
    expect(sheetScrollCentre([900, 0], 300, 30)!.centre).toBe(900);
    // Everything fits: centre on the whole span.
    expect(sheetScrollCentre([100, 200, 260], 300, 30)).toEqual({ centre: 180, shown: 3 });
    expect(sheetScrollCentre([], 300, 30)).toBeNull();
  });

  it("drops the frame when a linked end has no pad on the drawing", () => {
    const geometry = buildBoardGeometry(board("stm32-nucleo-h753zi"), { sheet: true })!;
    expect(linkedSheetView(geometry, [geometry.anchors[0].key, null])).toBeNull();
    expect(linkedSheetView(geometry, [])).toBeNull();
  });
});
