// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WiringCautions } from "@/components/WiringCautions";
import { SaveSharedCollection } from "@/components/SaveSharedCollection";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const warnings = [
  "GPIO is 3.3 V only and is not 5 V tolerant.",
  "GPIO0 is a boot strapping pin.",
  "Flash uses GPIO6-GPIO11.",
  "ADC2 is unavailable while Wi-Fi is active.",
  "Revision 1.1 moves the LED.",
];
const source = { label: "Vendor pinout", url: "https://example.com/pinout", type: "Pinout" as const };

describe("WiringCautions", () => {
  it("lists every caution with the source to verify them against", () => {
    render(<WiringCautions warnings={warnings} verifySource={source} verifySourceOfficial />);
    const panel = screen.getByRole("region", { name: "Before you wire" });
    expect(within(panel).getAllByRole("listitem")).toHaveLength(5);
    const link = within(panel).getByRole("link", { name: /Vendor pinout/ });
    expect(link.getAttribute("href")).toBe(source.url);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(within(panel).getByText("Official")).toBeTruthy();
  });

  it("never folds a long list: every caution is listed with no disclosure button", () => {
    const long = [...warnings, "VIN accepts 6-24 V; the 5 V pin is an output.", "Do not drive GPIO above VDD."];
    render(<WiringCautions warnings={long} verifySource={source} />);
    const panel = screen.getByRole("region", { name: "Before you wire" });
    const items = within(panel).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(long);
    expect(within(panel).queryByRole("button")).toBeNull();
    expect(within(panel).getByText("3rd-party")).toBeTruthy();
  });
});

describe("SaveSharedCollection", () => {
  it("does not style a full library as a completed save", () => {
    window.localStorage.setItem(
      "pinhub.library.v1",
      JSON.stringify({
        version: 1,
        recentBoardIds: [],
        collections: Array.from({ length: 24 }, (_, index) => ({
          id: `c${index}`,
          name: `Set ${index}`,
          boardIds: [],
          createdAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z",
        })),
      }),
    );
    render(<SaveSharedCollection name="Bench" boardIds={["raspberry-pi-5"]} />);
    const button = screen.getByRole("button", { name: "Save this collection" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.className).not.toContain("emerald");
    expect(screen.getByRole("status").textContent).toContain("24 collections");
  });
});

describe("SaveSharedCollection when storage refuses the write", () => {
  it("says the collection is kept for this visit, not saved", async () => {
    vi.resetModules();
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    try {
      const { SaveSharedCollection: Fresh } = await import("@/components/SaveSharedCollection");
      render(<Fresh name="Bench" boardIds={["raspberry-pi-5"]} />);
      fireEvent.click(screen.getByRole("button", { name: "Save this collection" }));
      const button = screen.getByRole("button", { name: "Kept for this visit" });
      expect(button.className).not.toContain("emerald");
      expect(screen.queryByText("Saved locally")).toBeNull();
      expect(screen.getByRole("status").textContent).toContain("gone after a reload");
    } finally {
      setItem.mockRestore();
    }
  });

  it("still says saved when the write succeeds", async () => {
    vi.resetModules();
    const { SaveSharedCollection: Fresh } = await import("@/components/SaveSharedCollection");
    render(<Fresh name="Bench" boardIds={["raspberry-pi-5"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Save this collection" }));
    expect(screen.getByRole("button", { name: "Saved locally" }).className).toContain("emerald");
  });
});
