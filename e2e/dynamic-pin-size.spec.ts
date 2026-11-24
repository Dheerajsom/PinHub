import { expect, test, type Locator } from "@playwright/test";

// Check inside the scrollport before clicking. Playwright's automatic scroll
// on click would otherwise conceal a diagram that opens on empty space.
async function expectTappableInsideMap(pad: Locator) {
  await expect.poll(() => pad.evaluate(node => {
    const viewport = node.closest(".board-view-scroll")!;
    const box = viewport.getBoundingClientRect();
    const hit = node.querySelector('circle[fill="transparent"]')!.getBoundingClientRect();
    const left = box.left + viewport.clientLeft;
    const top = box.top + viewport.clientTop;
    return hit.width >= 44 && hit.height >= 44 &&
      hit.left >= left - 1 && hit.right <= left + viewport.clientWidth + 1 &&
      hit.top >= top - 1 && hit.bottom <= top + viewport.clientHeight + 1;
  })).toBe(true);
}

test.use({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
for (const name of ["Orange Pi 5", "Arduino UNO Rev3", "Adafruit Feather RP2040", "BeagleBone Black", "Raspberry Pi 5"]) {
  test(`${name} fits the whole board, then reveals touch-sized picker selections`, async ({ page }) => {
    await page.goto(`/?${new URLSearchParams({ q: name })}`);
    await page.getByRole("button", { name: `Show ${name} details`, exact: true }).tap();
    await page.getByRole("tab", { name: "Dynamic" }).tap();
    const map = page.getByRole("tabpanel", { name: "Dynamic" });
    const frame = map.locator("[data-board-view]");
    await expect(frame).toHaveAttribute("data-board-view", "fit");
    const viewport = map.locator(".board-view-scroll");
    expect(await viewport.evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    await map.getByRole("button", { name: "Zoom to touch size" }).tap();
    const pads = map.locator(".bv-pad");
    await expectTappableInsideMap(pads.first());
    await pads.first().tap();
    await expect(pads.first()).toHaveAttribute("aria-pressed", "true");
    const picker = map.getByRole("combobox").first();
    const key = await picker.locator("option").last().getAttribute("value");
    await picker.selectOption(key!);
    const selected = map.locator('.bv-pad[aria-pressed="true"]');
    await expect(selected).toHaveAttribute("data-pin-key", key!);
    await expectTappableInsideMap(selected);
    await map.getByRole("button", { name: "Fit whole board" }).tap();
    await map.getByRole("button", { name: "Zoom to touch size" }).tap();
    await expectTappableInsideMap(selected);
  });
}
