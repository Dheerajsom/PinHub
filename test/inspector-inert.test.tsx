// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { ExpandedInspector } from "@/components/board-visual/BoardPinoutVisualization";
import { inertOutside } from "@/components/board-visual/inert-outside";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

/** The page chrome around <main>, as the root layout renders it. */
function pageChrome() {
  const link = (href: string, text: string) => Object.assign(document.createElement("a"), { href, textContent: text });
  const header = document.createElement("header");
  header.append(link("/", "PinHub"));
  const main = document.createElement("main");
  const footer = document.createElement("footer");
  footer.append(link("/privacy", "Privacy"));
  const previouslyInert = document.createElement("div");
  previouslyInert.inert = true;
  document.body.append(header, main, footer, previouslyInert);
  return { header, main, footer, previouslyInert };
}

describe("inspector dialog", () => {
  it("makes the header and footer inert too, not only <main>, and restores them", () => {
    const chrome = pageChrome();
    const board = boards.find((item) => item.id === "raspberry-pi-pico")!;
    const geometry = buildBoardGeometry(board)!;
    const view = render(
      <ExpandedInspector
        board={board}
        geometry={geometry}
        selectedKey={null}
        activeKey={null}
        activeRole={null}
        liveAnchor={null}
        onSelect={() => {}}
        onActiveKey={() => {}}
        onToggleRole={() => {}}
        onClose={() => {}}
      />,
      { container: chrome.main },
    );
    const dialog = screen.getByRole("dialog");
    expect(chrome.header.inert).toBe(true);
    expect(chrome.footer.inert).toBe(true);
    expect(chrome.main.inert).toBe(true);
    // The dialog itself stays reachable.
    let node: HTMLElement | null = dialog;
    while (node) {
      expect(node.inert).toBeFalsy();
      node = node.parentElement;
    }
    view.unmount();
    // jsdom has no native `inert`, so the restored value is whatever it was: unset.
    expect(chrome.header.inert).toBeFalsy();
    expect(chrome.footer.inert).toBeFalsy();
    expect(chrome.main.inert).toBeFalsy();
    expect(chrome.previouslyInert.inert).toBe(true);
  });

  it("inertOutside skips the modal's own branch", () => {
    const chrome = pageChrome();
    const portal = document.createElement("div");
    const modal = document.createElement("div");
    portal.append(modal);
    document.body.append(portal);
    const restore = inertOutside(modal);
    expect([chrome.header, chrome.main, chrome.footer].every((element) => element.inert)).toBe(true);
    expect(portal.inert).toBeFalsy();
    restore();
    expect(chrome.header.inert).toBeFalsy();
  });
});
