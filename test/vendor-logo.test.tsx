// @vitest-environment jsdom

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VendorLogo, vendorMonogram } from "@/components/VendorLogo";
import { boards } from "@/lib/boards";
import { vendorDomains } from "@/lib/vendor-domains";

afterEach(cleanup);

// Vendors whose own sites have no mark in Google's favicon service (checked
// 2026-10-29), plus "Generic", which names no maker.
const unmarkedVendors = new Set(["Generic", "LOLIN", "Terasic", "DOIT"]);

describe("vendor marks", () => {
  it("maps every catalog vendor with a working mark to its site", () => {
    const vendors = new Set(boards.map((board) => board.vendor));
    for (const vendor of vendors) {
      if (unmarkedVendors.has(vendor)) {
        expect(vendorDomains[vendor], vendor).toBeUndefined();
      } else {
        expect(vendorDomains[vendor], vendor).toBeDefined();
      }
    }
  });

  it("no longer points at the four sites the favicon service answers 404 for", () => {
    const domains = Object.values(vendorDomains);
    for (const broken of ["wemos.cc", "microbit.org", "nodemcu.com", "weactstudio.cn", "orangepi.org"]) {
      expect(domains, broken).not.toContain(broken);
    }
  });

  it("shows a monogram, not an empty slot or a request, for a vendor without a mark", () => {
    const { container } = render(<VendorLogo vendor="LOLIN" size={20} />);
    const mark = container.querySelector(".ph-vendor-monogram");
    expect(mark?.textContent).toBe("L");
    expect(mark?.getAttribute("aria-hidden")).toBe("true");
    expect((mark as HTMLElement).style.width).toBe("20px");
    expect(container.querySelector("img")).toBeNull();
  });

  it("falls back to the monogram when a mark fails to load", () => {
    const { container } = render(<VendorLogo vendor="Adafruit" />);
    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    fireEvent.error(image!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".ph-vendor-monogram")?.textContent).toBe("A");
  });

  it("draws nothing for a generic, unbranded board", () => {
    const { container } = render(<VendorLogo vendor="Generic" />);
    expect(container.firstChild).toBeNull();
  });

  it("takes the first letter or digit of the vendor name", () => {
    expect(vendorMonogram("Micro:bit Educational Foundation")).toBe("M");
    expect(vendorMonogram("96Boards")).toBe("9");
    expect(vendorMonogram("  ")).toBe("");
  });
});
