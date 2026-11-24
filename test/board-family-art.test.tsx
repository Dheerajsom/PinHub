// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { boardPortrait } from "@/lib/board-portraits";
import { boardVisuals } from "@/lib/board-visuals";
import { buildBoardGeometry, SHIELD_ORDER_NOTE, type BoardGeometry } from "@/lib/board-visual-geometry";
import { familyArtFor, freeField, layoutFamilyArt, overlaps } from "@/lib/board-family-art";
import { renderCoverage, renderTier } from "@/lib/board-render-coverage";
import { raspberryPiModel } from "@/lib/raspberry-pi-models";
import { BoardArtwork } from "@/components/board-visual/BoardArtwork";
import { BoardPinoutVisualization } from "@/components/board-visual/BoardPinoutVisualization";
import { connectorCaption } from "@/components/board-visual/illustration-caption";
import { touchDrawingWidth } from "@/components/board-visual/touch-sizing";

afterEach(cleanup);

const byId = (id: string) => boards.find((board) => board.id === id)!;
const layoutOf = (geometry: BoardGeometry) =>
  geometry.familyArt
    ? layoutFamilyArt(geometry.familyArt, freeField(geometry.body, geometry.headerZones, geometry.ports), geometry.usbEdge)
    : null;
const RADIO = ["Wi-Fi", "Bluetooth", "Zigbee", "Thread"];

describe("family board artwork", () => {
  it("distinguishes the LaunchPad debugger families", () => {
    for (const [id, label] of [["ti-ek-tm4c123gxl-launchpad", "ICDI"], ["ti-msp-exp430g2et-launchpad", "eZ-FET"]]) {
      expect(familyArtFor(byId(id), boardVisuals[id])!.features).toContainEqual({ kind: "debug-section", label, depth: 0.3 });
    }
  });
  it("never covers a pad, never leaves the board, and never stacks features", () => {
    let checked = 0;
    for (const board of boards) {
      const geometry = buildBoardGeometry(board);
      const layout = geometry && layoutOf(geometry);
      if (!geometry || !layout) continue;
      const { body, anchors, padR } = geometry;
      for (const feature of layout.features) {
        const { rect } = feature;
        expect(rect.x >= body.x && rect.y >= body.y && rect.x + rect.w <= body.x + body.w && rect.y + rect.h <= body.y + body.h, `${board.id} ${feature.kind}`).toBe(true);
        for (const anchor of anchors) {
          const pad = { x: anchor.cx - padR, y: anchor.cy - padR, w: padR * 2, h: padR * 2 };
          expect(overlaps(rect, pad), `${board.id} ${feature.kind} covers ${anchor.key}`).toBe(false);
        }
      }
      layout.features.forEach((a, i) => layout.features.slice(i + 1).forEach((b) => {
        expect(overlaps(a.rect, b.rect), `${board.id} ${a.kind}/${b.kind}`).toBe(false);
      }));
      checked += 1;
    }
    expect(checked).toBeGreaterThan(90);
  });

  it("keeps Raspberry Pi models on their dedicated artwork and schematic sheets free of board art", () => {
    for (const board of boards) {
      const visual = boardVisuals[board.id];
      if (raspberryPiModel(board.id)) expect(familyArtFor(board, visual), board.id).toBeNull();
      if (visual?.headerKind === "group-strips") expect(renderTier(board) === "separate" || !board.pinout, board.id).toBe(true);
    }
  });

  it("draws a radio module only for boards whose record lists a radio", () => {
    for (const board of boards) {
      const art = familyArtFor(board, boardVisuals[board.id]);
      if (art?.features.some((feature) => feature.kind === "rf-module")) {
        expect(board.interfaces.some((entry) => RADIO.includes(entry)), board.id).toBe(true);
      }
    }
    expect(familyArtFor(byId("adafruit-feather-rp2040"), boardVisuals["adafruit-feather-rp2040"])).toBeNull();
    expect(familyArtFor(byId("esp32-devkitc"), boardVisuals["esp32-devkitc"])!.features.map((f) => f.kind)).toEqual(["rf-module", "button", "button"]);
  });

  it("renders recognizable family features into the board SVG", () => {
    const kinds = (id: string) => {
      const markup = renderToStaticMarkup(<svg>{<BoardArtwork geometry={buildBoardGeometry(byId(id))!} />}</svg>);
      return [...markup.matchAll(/data-feature="([a-z-]+)"/g)].map((match) => match[1]);
    };
    expect(kinds("esp32-devkitc")).toEqual(["rf-module", "button", "button"]);
    expect(kinds("bbc-microbit-v2")).toEqual(["led-matrix", "button", "button"]);
    expect(kinds("stm32-nucleo-f401re")).toEqual(["debug-section", "button", "button"]);
    expect(kinds("jetson-orin-nano-dev-kit")).toEqual(["heatsink"]);
    expect(kinds("arduino-uno-rev3")).toEqual(["button"]);
    expect(kinds("orange-pi-5")).toEqual(["soc"]);
    // The micro:bit's processor is on the back, so no generic IC is drawn.
    const microbit = renderToStaticMarkup(<svg><BoardArtwork geometry={buildBoardGeometry(byId("bbc-microbit-v2"))!} /></svg>);
    expect(microbit).not.toContain("url(#silicon-");
    expect(renderToStaticMarkup(<svg><BoardArtwork geometry={buildBoardGeometry(byId("teensy-40"))!} /></svg>)).toContain("url(#silicon-");
  });

  it("says what is illustration and flags catalog-ordered shield headers", () => {
    const uno = buildBoardGeometry(byId("arduino-uno-rev3"))!;
    expect(uno.orderNote).toBe(SHIELD_ORDER_NOTE);
    expect(connectorCaption(uno)).toContain("Connector reference.");
    expect(connectorCaption(uno)).toContain("not the physical sequence");
    const devkit = buildBoardGeometry(byId("esp32-devkit-v1"))!;
    expect(devkit.orderNote).toBeUndefined();
    expect(connectorCaption(buildBoardGeometry(byId("teensy-40"))!)).toContain("Illustrated component side.");
  });
});

describe("render coverage inventory", () => {
  it("distinguishes the Freedom board's touch slider from the micro:bit edge contacts", () => {
    const freedom = boardPortrait("nxp-frdm-kl25z")!.parts.map(([kind]) => kind);
    expect(freedom).toContain("touch-slider");
    expect(freedom).not.toContain("contacts");
    expect(boardPortrait("bbc-microbit-v2")!.parts.some(([kind]) => kind === "contacts")).toBe(true);
  });

  it("accounts for every catalog board in exactly one tier", () => {
    const coverage = renderCoverage(boards);
    const counts = Object.fromEntries(Object.entries(coverage).map(([tier, ids]) => [tier, ids.length]));
    expect(counts).toEqual({ pi: 18, module: 69, separate: 103, portraitOnly: 6, missing: 0 });
    expect(Object.values(coverage).flat().sort()).toEqual(boards.map((board) => board.id).sort());
    expect(coverage.separate).toContain("digilent-nexys-a7-100t");
    expect(coverage.portraitOnly).toContain("digilent-basys-3");
  });
});

describe("embedded product pin map", () => {
  it("fits the whole physical board by default and zooms to touch size on request", () => {
    const board = byId("esp32-devkitc");
    const { container } = render(<BoardPinoutVisualization board={board} />);
    const frame = container.querySelector<HTMLElement>("[data-board-view]")!;
    expect(frame.dataset.boardView).toBe("fit");
    expect(frame.style.minWidth).toBe("");
    expect(screen.getByText(/pads are small at this size/)).toBeTruthy();
    expect(container.querySelector('[data-product-artwork="esp32-devkitc"]')).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Zoom to touch size" }));
    expect(frame.dataset.boardView).toBe("touch");
    expect(parseFloat(frame.style.minWidth)).toBe(touchDrawingWidth(buildBoardGeometry(board)!, true));
    fireEvent.click(screen.getByRole("button", { name: "Fit whole board" }));
    expect(frame.dataset.boardView).toBe("fit");
  });

  it("shows the Feather short row opposite the last twelve pads in the long row", () => {
    const geometry = buildBoardGeometry(byId("adafruit-feather-rp2040"))!;
    const left = geometry.anchors.filter(a => a.side === "left");
    const right = geometry.anchors.filter(a => a.side === "right");
    expect(right.map(a => a.cy)).toEqual(left.slice(4).map(a => a.cy));
  });

  it("keeps connector-local numbers distinguishable in the picker", () => {
    const board = byId("digilent-nexys-a7-100t");
    const { container } = render(<BoardPinoutVisualization board={board} />);
    expect(screen.getByRole("img", { name: `Simplified illustration of ${board.name}` })).toBeTruthy();
    const geometry = buildBoardGeometry(board)!;
    const firstPins = geometry.anchors.filter(a => a.pin.position === 1);
    expect(firstPins.length).toBeGreaterThan(1);
    const picker = screen.getByRole("combobox", { name: "Select a pin" }) as HTMLSelectElement;
    for (const anchor of firstPins) {
      expect([...picker.options].find(o => o.value === anchor.key)?.text).toContain(anchor.group);
      fireEvent.change(picker, { target: { value: anchor.key } });
      expect(container.querySelector(`[data-pin-key="${anchor.key}"]`)?.getAttribute("aria-pressed")).toBe("true");
    }
  });

  it("keeps function-grouped schematics at touch size with no physical zoom toggle", () => {
    const board = byId("beaglebone-black");
    const { container } = render(<BoardPinoutVisualization board={board} />);
    expect(container.querySelector<HTMLElement>("[data-board-view]")!.dataset.boardView).toBe("touch");
    expect(screen.queryByRole("button", { name: "Zoom to touch size" })).toBeNull();
  });
});
