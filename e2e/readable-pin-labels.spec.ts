import { expect, test } from "@playwright/test";

// The Dynamic pin map used to draw the Nucleo-64's shield headers, the
// micro:bit's edge fingers and every 40-pin header with each label turned 90°.
// Whatever a reader can zoom into must read left to right.
test.use({ viewport: { width: 1280, height: 900 } });

const rotatedLabels = (scope: import("@playwright/test").Locator) =>
  scope.locator('.bv-label[transform*="rotate"], .bv-label [transform*="rotate"]').count();

const boards = [
  { name: "STM32 Nucleo-F401RE", q: "F401RE" },
  { name: "Arduino Mega 2560 Rev3", q: "Mega 2560" },
  { name: "BBC micro:bit V2", q: "micro:bit" },
  { name: "Raspberry Pi 5", q: "raspberry pi 5" },
  { name: "Orange Pi 5", q: "Orange Pi 5" },
];
for (const { name, q } of boards) {
  test(`${name}'s Dynamic pin map labels read left to right when zoomed`, async ({ page }) => {
    await page.goto(`/?${new URLSearchParams({ q })}`);
    // Wide screens open the first result beside the list; phones need a tap.
    const show = page.getByRole("button", { name: `Show ${name} details`, exact: true });
    const dynamic = page.getByRole("tab", { name: "Dynamic", exact: true });
    await expect(show.or(dynamic).first()).toBeVisible();
    if (await show.isVisible()) await show.click();
    await expect(page.getByRole("heading", { name, exact: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: "Dynamic", exact: true }).click();
    const map = page.getByRole("tabpanel", { name: "Dynamic" });
    const canvas = map.getByRole("group", { name: "Connector diagram, zoomable" });
    await expect(canvas).toBeVisible();
    await canvas.getByRole("button", { name: /^Pin 1,/ }).first().waitFor();
    expect(await canvas.locator(".bv-label").count()).toBeGreaterThan(10);
    await map.getByRole("button", { name: "Zoom to touch size" }).click();
    await expect(canvas).toHaveAttribute("data-board-view", "zoomed");
    expect(await rotatedLabels(map)).toBe(0);
    // Every label of four or more characters is wider than it is tall on
    // screen: it runs across the page, not up it.
    const upright = await canvas.locator(".bv-label").evaluateAll((labels) => labels
      .filter((label) => (label.textContent ?? "").length >= 4)
      .filter((label) => { const box = label.getBoundingClientRect(); return box.height > box.width; })
      .map((label) => label.textContent));
    expect(upright).toEqual([]);
  });
}
