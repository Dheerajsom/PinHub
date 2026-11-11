// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { boards } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { createBoardDetailLoader } from "@/lib/board-detail-loader";
import { maxRefs, maxSourceLength } from "@/lib/code-check/scan";
import { CheckApp } from "@/components/check/CheckApp";

const checkable = boards.filter((board) => board.pinFunctions && board.pinout);
const catalog = checkable.map(summarizeBoard);

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

async function settle() {
  // The page reads the URL and the draft on the first animation frame after mount.
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

describe("CheckApp", () => {
  it("says so when a paste runs past the limit, and never reads as clear", async () => {
    // Regression: the textarea's maxLength and a silent slice dropped the tail
    // of a long paste, so the "only the first 100,000 characters" notice could
    // never show and the report could still say every pin matched.
    window.history.replaceState(null, "", "/check?board=arduino-uno-rev3");
    render(<CheckApp catalog={catalog} loader={createBoardDetailLoader(checkable)} />);
    await settle();
    const head = "void setup() { pinMode(13, OUTPUT); }\n";
    // Long lines keep the mirror small enough for jsdom.
    const pasted = head + `// ${"x".repeat(997)}\n`.repeat(Math.ceil((maxSourceLength * 1.5) / 1000));
    fireEvent.change(screen.getByRole("textbox", { name: "Your code" }), { target: { value: pasted } });
    const notice = await screen.findByText(/The pasted code was cut at 100,000 characters\. The rest was not checked\./);
    expect(notice.getAttribute("role")).toBe("status");
    expect((screen.getByRole("textbox", { name: "Your code" }) as HTMLTextAreaElement).value).toHaveLength(maxSourceLength);
    const heading = await screen.findByRole("heading", { name: "Only part of the code was checked" });
    expect(heading.closest(".ph-check-summary")?.getAttribute("data-tone")).toBe("check");

    // Regression: the copied Markdown said nothing about the cut.
    const writeText = vi.fn<(text: string) => Promise<void>>(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: "Copy report" }));
    await screen.findByRole("button", { name: "Copied" });
    expect(writeText.mock.calls[0][0]).toContain("Only the first 100,000 characters of the code were checked.");

    // Editing back under the limit clears the notice.
    fireEvent.change(screen.getByRole("textbox", { name: "Your code" }), { target: { value: head } });
    await waitFor(() => expect(screen.queryByText(/The pasted code was cut/)).toBeNull());
    expect(await screen.findByRole("heading", { name: "The pin matches the record" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Copy report" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(writeText.mock.calls[1][0]).not.toContain("Only the first");
  }, 20_000);

  it("says so when the scan stops at its reference cap, and never reads as clear", async () => {
    // Regression: the scanner stopped recording after `maxRefs` references and
    // nothing said so, so a problem pin past the cap could read as all clear.
    window.history.replaceState(null, "", "/check?board=esp32-devkitc");
    render(<CheckApp catalog={catalog} loader={createBoardDetailLoader(checkable)} />);
    await settle();
    const live = document.querySelector("p.sr-only[role='status']");
    const lines = "  digitalWrite(13, HIGH);\n".repeat(maxRefs);
    const capped = `void setup() {\n${lines}  pinMode(34, OUTPUT);\n}`;
    fireEvent.change(screen.getByRole("textbox", { name: "Your code" }), { target: { value: capped } });
    const notice = await screen.findByText("Only the first 400 pin references were checked. The rest of the code was not.");
    expect(notice.getAttribute("role")).toBe("status");
    expect(notice.className).toBe("ph-check-cut");
    const heading = await screen.findByRole("heading", { name: "Only part of the code was checked" });
    expect(heading.closest(".ph-check-summary")?.getAttribute("data-tone")).toBe("check");
    expect(live!.textContent).toBe("Only part of the code was checked");

    const writeText = vi.fn<(text: string) => Promise<void>>(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: "Copy report" }));
    await screen.findByRole("button", { name: "Copied" });
    expect(writeText.mock.calls[0][0]).toContain("Only the first 400 pin references were checked. The rest of the code was not.");

    // Exactly at the cap, with nothing after it, everything was checked.
    fireEvent.change(screen.getByRole("textbox", { name: "Your code" }), { target: { value: `void setup() {\n${lines}}` } });
    await waitFor(() => expect(screen.queryByText(/pin references were checked/)).toBeNull());
    expect(await screen.findByRole("heading", { name: "The pin matches the record" })).toBeTruthy();
    expect(live!.textContent).toBe("The pin matches the record");
  }, 20_000);

  it("announces the verdict through one persistent status region", async () => {
    window.history.replaceState(null, "", "/check?board=arduino-uno-rev3");
    render(<CheckApp catalog={catalog} loader={createBoardDetailLoader(checkable)} />);
    await settle();
    const live = document.querySelector("p.sr-only[role='status']");
    expect(live).not.toBeNull();
    expect(live!.textContent).toBe("");
    fireEvent.change(screen.getByRole("textbox", { name: "Your code" }), { target: { value: "void setup() { pinMode(99, OUTPUT); }" } });
    await waitFor(() => expect(live!.textContent).toBe("The pin reference could not be checked"));
    expect(document.querySelector("p.sr-only[role='status']")).toBe(live);
    expect(document.querySelector("h2[aria-live], section[aria-live], .ph-check-readout[aria-live]")).toBeNull();
  });

  it("explains a board it cannot check and drops it from the URL", async () => {
    const unsupported = boards.find((board) => !board.pinFunctions)!;
    window.history.replaceState(null, "", `/check?board=${unsupported.id}&x=1`);
    render(<CheckApp catalog={catalog} loader={createBoardDetailLoader(checkable)} />);
    await settle();
    expect(screen.getByText(unsupported.id).closest("[role='status']")?.textContent).toContain("can't be checked yet");
    expect(window.location.search).toBe("?x=1");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(unsupported.id)).toBeNull();
  });

  it("keeps focus on the board slot when a board is picked and changed", async () => {
    window.history.replaceState(null, "", "/check");
    render(<CheckApp catalog={catalog} loader={createBoardDetailLoader(checkable)} />);
    await settle();
    const search = screen.getByRole("combobox", { name: "Board" });
    search.focus();
    fireEvent.change(search, { target: { value: "raspberry pi pico" } });
    fireEvent.keyDown(search, { key: "Enter" });
    const change = await screen.findByRole("button", { name: /^Change board/ });
    expect(document.activeElement).toBe(change);
    fireEvent.click(change);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("combobox", { name: "Board" })));
  });

  it("offers a retry in the report column when the pin record fails to load", async () => {
    window.history.replaceState(null, "", "/check?board=raspberry-pi-pico");
    const fetchBoard = vi.fn(async () => new Response("nope", { status: 500 }));
    render(<CheckApp catalog={catalog} loader={createBoardDetailLoader([], fetchBoard)} />);
    await settle();
    fireEvent.change(screen.getByRole("textbox", { name: "Your code" }), { target: { value: "from machine import Pin\nled = Pin(25)" } });
    expect(await screen.findByRole("heading", { name: "The pin record didn't load" })).toBeTruthy();
    expect(screen.queryByText(/Pick the board this code runs on/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchBoard).toHaveBeenCalledTimes(2));
  });
});
