// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

  it("folds long lists and discloses the rest on request", () => {
    render(<WiringCautions warnings={warnings} verifySource={source} collapseAfter={3} />);
    const panel = screen.getByRole("region", { name: "Before you wire" });
    expect(within(panel).getAllByRole("listitem")).toHaveLength(3);
    const more = within(panel).getByRole("button", { name: "Show 2 more cautions" });
    expect(more.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(more);
    expect(within(panel).getAllByRole("listitem")).toHaveLength(5);
    expect(within(panel).getByRole("button", { name: "Show fewer cautions" }).getAttribute("aria-expanded")).toBe("true");
    expect(within(panel).getByText("3rd-party")).toBeTruthy();
  });

  it("never hides a single leftover caution behind a button", () => {
    render(<WiringCautions warnings={warnings.slice(0, 4)} collapseAfter={3} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.queryByRole("button")).toBeNull();
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
