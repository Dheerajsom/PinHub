// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { BoardStage } from "@/components/board-visual/BoardStage";

afterEach(cleanup);

const pi5 = boards.find((item) => item.id === "raspberry-pi-5")!;

describe("planner render", () => {
  it("builds the planner sheet for a Raspberry Pi: no artwork, same pins and keys", () => {
    const realistic = buildBoardGeometry(pi5)!;
    const sheet = buildBoardGeometry(pi5, { sheet: true })!;
    expect(realistic.artworkId).toBe("raspberry-pi-5");
    expect(sheet.artworkId).toBeUndefined();
    expect(sheet.plain).toBe(true);
    const byKey = (geometry: typeof sheet) =>
      new Map(geometry.anchors.map((anchor) => [anchor.key, anchor.pin]));
    expect([...byKey(sheet).keys()].sort()).toEqual([...byKey(realistic).keys()].sort());
    for (const [key, pin] of byKey(realistic)) expect(byKey(sheet).get(key)).toBe(pin);
    // Rows pair up the way the connector is numbered: 1 beside 2, 3 beside 4.
    const at = (position: number) => sheet.anchors.find((anchor) => anchor.pin.position === position)!;
    expect(at(1).cy).toBe(at(2).cy);
    expect(at(3).cy).toBeGreaterThan(at(1).cy);
    expect(at(1).cx).toBeLessThan(at(2).cx);
  });

  it("keeps every board's planner sheet inside its view box, keys unique", () => {
    for (const board of boards) {
      const sheet = buildBoardGeometry(board, { sheet: true });
      if (!sheet) continue;
      expect(sheet.plain, board.id).toBe(true);
      expect(new Set(sheet.anchors.map((anchor) => anchor.key)).size, board.id).toBe(sheet.anchors.length);
      for (const anchor of sheet.anchors) {
        expect(anchor.cx, board.id).toBeGreaterThan(0);
        expect(anchor.cx, board.id).toBeLessThan(sheet.vbw);
        expect(anchor.cy, board.id).toBeGreaterThan(0);
        expect(anchor.cy, board.id).toBeLessThan(sheet.vbh);
      }
    }
  });

  it("draws the sheet without illustrated components", () => {
    const geometry = buildBoardGeometry(pi5, { sheet: true })!;
    const { container } = render(
      <BoardStage
        geometry={geometry}
        title="test"
        selectedKey={null}
        activeKey={null}
        activeRole={null}
        showAllLabels
        netKeys={new Set()}
        onSelect={() => {}}
        onActiveKey={() => {}}
      />,
    );
    expect(container.querySelectorAll("linearGradient, pattern, path")).toHaveLength(0);
    expect(container.querySelectorAll(".bv-pad")).toHaveLength(40);
  });

  it("rings claimed pads solid, never in the probe's cyan, and dims the rest", () => {
    const geometry = buildBoardGeometry(pi5, { sheet: true })!;
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
    expect(pads[geometry.anchors.indexOf(first)].style.opacity).toBe("1");
    expect(pads[geometry.anchors.indexOf(second)].style.opacity).toBe("0.5");
  });
});
