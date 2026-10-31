import { devices, expect, test, type Locator } from "@playwright/test";

// Touch controls that earlier mobile gates measured under 44 px: the catalog's
// active-filter Remove chips (34 px), the pin filter chips (36 px), and the
// header's theme and GitHub controls (40 px).

const minimum = 44;

async function expectTouchSize(locator: Locator, label: string) {
  const box = await locator.boundingBox();
  expect(box, label).not.toBeNull();
  expect(box!.height, `${label} height`).toBeGreaterThanOrEqual(minimum);
}

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
]) {
  test.describe(`touch targets at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, isMobile: true, hasTouch: true, userAgent: devices["Pixel 5"].userAgent });

    test("catalog header controls and Remove chips are at least 44 px tall", async ({ page }) => {
      await page.goto("/?pinout=yes");
      const chip = page.getByRole("button", { name: /^Remove .* filter$/ }).first();
      await expect(chip).toBeVisible();
      await expectTouchSize(chip, "Remove filter chip");
      await expectTouchSize(page.getByRole("button", { name: /^Use (light|dark) theme$/ }).first(), "theme toggle");
      await expectTouchSize(page.getByRole("link", { name: /View PinHub source on GitHub/ }).first(), "GitHub link");
    });

    test("pinout filter chips are at least 44 px tall", async ({ page }) => {
      await page.goto("/pinout/raspberry-pi-pico");
      const group = page.getByRole("group", { name: "Filter pins by category" }).first();
      await expect(group).toBeVisible();
      const chips = group.getByRole("button");
      const count = await chips.count();
      expect(count).toBeGreaterThan(0);
      for (let index = 0; index < count; index += 1) {
        await expectTouchSize(chips.nth(index), `pin filter chip ${index + 1}`);
      }
    });
  });
}
