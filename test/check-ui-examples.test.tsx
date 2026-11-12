// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { boards } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { createBoardDetailLoader } from "@/lib/board-detail-loader";
import { checkCode, displayName } from "@/lib/code-check/check";
import { codeExamples } from "@/lib/code-check/examples";
import { scanCode } from "@/lib/code-check/scan";
import { CheckApp } from "@/components/check/CheckApp";
import { headline, tally } from "@/components/check/verdict";

// Each built-in example, run end to end on its own board: the headline, the
// tally, the summary strip, the cards and the editor's hints must all tell the
// same story as the library's report, and each example must show the slip its
// teaser promises.

const checkable = boards.filter((board) => board.pinFunctions && board.pinout);
const catalog = checkable.map(summarizeBoard);

/** The finding each example's teaser on the page promises. */
const promised: Record<string, string[]> = {
  "esp32-weather": ["Input-only pin", "ADC2 read with Wi-Fi on"],
  "pico-plants": ["No analog input here"],
  "pi-doorbell": ["Reserved pin"],
  "uno-dimmer": ["No PWM recorded"],
};

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.scrollTo = () => {};
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  window.sessionStorage.clear();
});

describe("built-in examples", () => {
  it("covers every example with a promised finding", () => {
    expect(Object.keys(promised).sort()).toEqual(codeExamples.map((example) => example.id).sort());
  });

  it.each(codeExamples.map((example) => [example.id, example] as const))("%s agrees with its report", async (_id, example) => {
    const board = boards.find((item) => item.id === example.boardId);
    expect(board, example.boardId).toBeDefined();
    const expected = checkCode(board!, scanCode(example.code, null));
    const titles = expected.pins.flatMap((pin) => pin.findings.map((item) => item.title));
    for (const title of promised[example.id]) expect(titles).toContain(title);
    expect(expected.counts.fix + expected.counts.check).toBeGreaterThan(0);
    expect(expected.missing).toEqual([]);

    window.history.replaceState(null, "", "/check");
    render(<CheckApp catalog={catalog} loader={createBoardDetailLoader(checkable)} />);
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(example.title) }));

    const region = await screen.findByRole("region", { name: "Check report" });
    const verdict = headline(expected);
    expect(within(region).getByRole("heading", { level: 2 }).textContent).toBe(verdict.text);
    expect(region.querySelector(".ph-check-summary")?.getAttribute("data-tone")).toBe(verdict.tone);
    expect([...region.querySelectorAll(".ph-check-tally span")].map((item) => item.textContent)).toEqual(
      tally(expected).map((item) => item.text),
    );

    // The strip and the cards carry each pin's status, in the report's order.
    const strip = within(region).getByRole("list", { name: "Pins your code uses" });
    expect(within(strip).getAllByRole("button").map((item) => item.getAttribute("data-status"))).toEqual(
      expected.pins.map((pin) => pin.status),
    );

    // Every hint names a pin the report lists, with that pin's status and its
    // first finding at that status; every reported pin has a hint.
    const hints = [...document.querySelectorAll(".ph-check-mirror .ph-check-hint")].map((item) => ({
      status: item.getAttribute("data-status"),
      text: item.textContent?.replace(/^[✕!✓?]/, "") ?? "",
    }));
    expect(hints.length).toBeGreaterThan(0);
    for (const hint of hints) {
      if (/^\+\d+ more$/.test(hint.text)) continue;
      const pin = expected.pins.find((item) => hint.text.startsWith(`${displayName(item.pin)} · `));
      expect(pin, hint.text).toBeDefined();
      expect(hint.status, hint.text).toBe(pin!.status);
      const first = pin!.findings.find((item) => item.severity === pin!.status);
      if (first) expect(hint.text.endsWith(` · ${first.title}`), hint.text).toBe(true);
    }
    for (const pin of expected.pins) {
      expect(hints.some((hint) => hint.text.startsWith(`${displayName(pin.pin)} · `)), displayName(pin.pin)).toBe(true);
    }
  });
});
