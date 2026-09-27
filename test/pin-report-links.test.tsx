// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { pinReportContextFor, pinReportFields, pinReportUrl } from "@/lib/pin-report";
import { verificationSourceFor } from "@/lib/source-trust";
import { InspectorBody } from "@/components/board-visual/InspectorBody";
import { PinDetails } from "@/components/board-visual/PinDetails";
import { RaspberryPiPinout } from "@/components/board-visual/RaspberryPiPinout";
import { WiringCautions } from "@/components/WiringCautions";

function catalogBoard(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`${id} missing from the catalog`);
  return found;
}

function geometryOf(board: Board) {
  const geometry = buildBoardGeometry(board);
  if (!geometry) throw new Error(`${board.id} has no geometry`);
  return geometry;
}

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(cleanup);

describe("PinDetails report link", () => {
  const board = catalogBoard("raspberry-pi-5");
  const anchor = geometryOf(board).anchors.find(({ pin }) => pin.position === 12)!;
  const report = pinReportContextFor(board);

  it("appears only once a pin is pinned", () => {
    const { rerender } = render(
      <PinDetails anchor={anchor} pinned={false} net={null} netSize={1} report={report} />,
    );
    expect(screen.queryByRole("link", { name: /Report an error/ })).toBeNull();

    rerender(<PinDetails anchor={anchor} pinned net={null} netSize={1} report={report} />);
    const link = screen.getByRole("link", {
      name: "Report an error in pin 12 GPIO18 (opens GitHub in a new tab)",
    });
    expect(link.textContent).toBe("Report");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.getAttribute("href")).toBe(
      pinReportUrl({ ...report, pin: anchor.pin }),
    );
    const query = new URL(link.getAttribute("href")!).searchParams;
    expect(query.get(pinReportFields.board)).toBe("raspberry-pi-5");
    expect(query.get(pinReportFields.pin)).toBe("12 · GPIO18");
    expect(query.get(pinReportFields.connector)).toBe(board.pinout!.connector);
    expect(query.get(pinReportFields.source)).toBe(verificationSourceFor(board)!.url);
  });

  it("stays hidden without report context", () => {
    render(<PinDetails anchor={anchor} pinned net={null} netSize={1} />);
    expect(screen.queryByRole("link", { name: /Report an error/ })).toBeNull();
  });

  it("names the group for grouped layouts that reuse positions", () => {
    const uno = catalogBoard("arduino-uno-rev3");
    const analog = geometryOf(uno).anchors.find(
      ({ pin, group }) => pin.label === "A0" && group,
    )!;
    render(
      <PinDetails anchor={analog} pinned net={null} netSize={1} report={pinReportContextFor(uno)} />,
    );
    const link = screen.getByRole("link", { name: /Report an error in pin \d+ A0/ });
    const query = new URL(link.getAttribute("href")!).searchParams;
    expect(query.get(pinReportFields.connector)).toBe(
      `${uno.pinout!.connector} · ${analog.group}`,
    );
  });
});

describe("pin maps cite the verification source", () => {
  // Pi Zero's first link is its product page; the connector-specific GPIO
  // documentation is what "Before you wire" tells people to check. The pin
  // readout used to cite the product page, so a report filed from it named a
  // different source than the rest of the page.
  const board = catalogBoard("raspberry-pi-zero");
  const verify = verificationSourceFor(board)!;

  it("uses the verify source in the inspector readout", () => {
    expect(board.sourceLinks[0].url).not.toBe(verify.url);
    const geometry = geometryOf(board);
    render(
      <InspectorBody
        board={board}
        geometry={geometry}
        selectedKey={geometry.anchors[0].key}
        activeKey={geometry.anchors[0].key}
        activeRole={null}
        liveAnchor={geometry.anchors[0]}
        onSelect={() => {}}
        onActiveKey={() => {}}
        onToggleRole={() => {}}
      />,
    );
    const cited = screen.getByRole("link", { name: /Open official .* source:/ });
    expect(cited.getAttribute("href")).toBe(verify.url);
    const report = screen.getByRole("link", { name: /Report an error in pin/ });
    expect(
      new URL(report.getAttribute("href")!).searchParams.get(pinReportFields.source),
    ).toBe(verify.url);
  });

  it("uses the verify source in the Raspberry Pi workbench", () => {
    render(<RaspberryPiPinout board={board} />);
    const workbench = screen.getByRole("region", { name: /dynamic pinout/ });
    const links = within(workbench)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(links).toContain(verify.url);
    expect(links).not.toContain(board.sourceLinks[0].url);
  });
});

describe("WiringCautions report link", () => {
  const source = { label: "Vendor pinout", url: "https://example.com/pinout", type: "Pinout" as const };
  const reportUrl = pinReportUrl({ board: { id: "raspberry-pi-5", name: "Raspberry Pi 5" } })!;

  it("offers a board-level report beside the verify link", () => {
    render(
      <WiringCautions warnings={["GPIO is 3.3 V only."]} verifySource={source} reportUrl={reportUrl} />,
    );
    const panel = screen.getByRole("region", { name: "Before you wire" });
    const link = within(panel).getByRole("link", { name: /Report a data error/ });
    expect(link.getAttribute("href")).toBe(reportUrl);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    // Neutral utility styling: never the caution orange or the probe cyan.
    expect(link.className).not.toMatch(/orange|cyan/);
  });

  it("is omitted when there is no report URL", () => {
    render(<WiringCautions warnings={["GPIO is 3.3 V only."]} verifySource={source} />);
    expect(screen.queryByRole("link", { name: /Report a data error/ })).toBeNull();
  });
});
