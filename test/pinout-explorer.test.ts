import { describe, expect, it } from "vitest";
import type { PinAnchor } from "@/lib/board-visual-geometry";
import {
  filterPinAnchors,
  pinMatchesCategory,
  pinMatchesQuery,
} from "@/components/board-visual/PinoutTable";

function anchor(
  partial: Partial<PinAnchor["pin"]> &
    Pick<PinAnchor, "key" | "group"> & { position?: number },
): PinAnchor {
  const { key, group, position = 1, ...pin } = partial;
  return {
    key,
    group,
    pin: {
      position,
      label: "GPIO1",
      role: "gpio",
      ...pin,
    },
    cx: 0,
    cy: 0,
    side: "left",
    labelX: 0,
    labelY: 0,
    labelAnchor: "middle",
    rotateLabel: false,
  };
}

describe("pinout explorer search and categories", () => {
  const pins = [
    anchor({ key: "j8-1", group: "Power", position: 1, label: "3V3", role: "power" }),
    anchor({ key: "j8-3", group: "Digital", position: 3, label: "GPIO2", role: "i2c", aliases: ["SDA1"] }),
    anchor({ key: "j8-5", group: "Boot", position: 5, label: "GPIO0", role: "system", note: "Boot strap: keep high at reset" }),
    anchor({ key: "j8-7", group: "Reserved", position: 7, label: "FLASH", role: "reserved", note: "Connected to module flash" }),
    anchor({ key: "j8-9", group: "Analog", position: 9, label: "ADC1", role: "adc" }),
  ];

  it("searches physical position, group, connector, aliases, and notes", () => {
    expect(pinMatchesQuery(pins[1], "3")).toBe(true);
    expect(pinMatchesQuery(pins[2], "boot")).toBe(true);
    expect(pinMatchesQuery(pins[3], "reserved")).toBe(true);
    expect(
      pinMatchesQuery(pins[1], "J8 40-pin GPIO header", "J8 40-pin GPIO header"),
    ).toBe(true);
    expect(pinMatchesQuery(pins[1], "SDA1")).toBe(true);
    expect(pinMatchesQuery(pins[0], "not-present")).toBe(false);
  });

  it("classifies analog, boot/strap, and reserved pins explicitly", () => {
    expect(pinMatchesCategory(pins[4].pin, "analog")).toBe(true);
    expect(pinMatchesCategory(pins[2].pin, "boot")).toBe(true);
    expect(pinMatchesCategory(pins[3].pin, "reserved")).toBe(true);
    expect(pinMatchesCategory(pins[1].pin, "analog")).toBe(false);
  });

  it("filters rows by a query and treats selected categories as an OR set", () => {
    expect(
      filterPinAnchors(pins, {
        query: "J8",
        categories: ["power", "ground"],
        connector: "J8 40-pin GPIO header",
      }).map((item) => item.pin.label),
    ).toEqual(["3V3"]);
    expect(
      filterPinAnchors(pins, { categories: ["analog", "boot"] }).map(
        (item) => item.pin.label,
      ),
    ).toEqual(["GPIO0", "ADC1"]);
  });
});
