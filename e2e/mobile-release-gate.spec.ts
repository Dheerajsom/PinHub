import { devices, expect, test, type Locator, type Page } from "@playwright/test";

async function touchSize(control: Locator) {
  // Catalog rows animate their entrance. Measure the settled target rather
  // than the temporarily scaled transform on the first rendered frame.
  for (const dimension of ["width", "height"] as const) {
    await expect.poll(async () => {
      const box = await control.boundingBox();
      return box ? Math.round(box[dimension] * 1000) / 1000 : 0;
    }, { message: `${control.toString()} ${dimension} must reach 44px` }).toBeGreaterThanOrEqual(44);
  }
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }, { width: 844, height: 390 }]) {
  for (const theme of ["dark", "light"]) {
    test.describe(`${viewport.width}x${viewport.height} ${theme} release gate`, () => {
      test.use({ viewport, isMobile: true, hasTouch: true, userAgent: devices["Pixel 5"].userAgent });
      test("planner, linking, pinout, catalog and discovery remain usable", async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
        await page.addInitScript((value) => localStorage.setItem("pinhub.theme", value), theme);
        await page.goto("/planner");
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        expect(await page.evaluate(() => window.innerWidth)).toBe(viewport.width);
        const search = page.getByRole("combobox", { name: "Search for your board" });
        await search.fill("nucleo g431");
        await expect(page.getByRole("option")).toHaveCount(2);
        for (const option of await page.getByRole("option").all()) {
          expect(await option.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(0);
        }
        await page.screenshot({ path: testInfo.outputPath("picker.png"), fullPage: true });
        await search.fill("raspberry pi pico");
        await search.press("Enter");
        const workspace = page.getByRole("region", { name: "Pin planner" });
        await expect(workspace).toBeVisible();
        const pad = workspace.getByRole("button", { name: /^Pin 6, GP4/ });
        await touchSize(pad.locator('> circle[fill="transparent"]'));
        await pad.tap();
        const editor = workspace.getByRole("region", { name: "Pin editor" });
        await editor.getByLabel("Used for").fill("OLED SDA");
        await page.keyboard.press("Escape");
        await expect(editor).toBeHidden();
        await expect(pad).toBeFocused();
        await pad.tap();
        await editor.getByLabel("Used for").fill("OLED SDA");
        await editor.getByRole("button", { name: "Claim pin" }).tap();
        await workspace.getByRole("button", { name: "Add one I2C", exact: true }).tap();
        await expect(workspace.locator("[data-plan-status]")).toHaveText("Plan ready: 2 pins assigned.");
        await page.reload();
        await expect(workspace.locator('tr[data-kind="manual"]')).toContainText("OLED SDA");
        await workspace.getByText(/Pin function sources/).tap();
        for (const source of await workspace.locator("details a").all()) await touchSize(source);
        await noOverflow(page);
        await page.screenshot({ path: testInfo.outputPath("planner.png"), fullPage: true });
        await page.goto("/planner?board=stm32-nucleo-f303re");
        await expect(page.getByText(/Zephyr v4.2.0/)).toBeVisible();
        await page.getByRole("button", { name: "Add one I2C", exact: true }).tap();
        await page.getByText(/Pin function sources/).tap();
        for (const source of await page.locator("details a").all()) await touchSize(source);
        await noOverflow(page);

        await page.goto("/link?a=libre-computer-le-potato&b=adafruit-grand-central-m4-express&bus=uart");
        await expect(page.getByText("Adafruit Grand Central M4 Express", { exact: true }).first()).toBeVisible();
        const wire = page.getByRole("button", { name: /^Wire 1/ });
        await wire.tap();
        await expect(wire).toHaveAttribute("aria-pressed", "true");
        for (const drawing of await page.locator("figure svg").all()) await touchSize(drawing.locator('.bv-pad > circle[fill="transparent"]').first());
        await page.getByRole("radio", { name: "I2C", exact: true }).tap();
        await noOverflow(page);
        await page.screenshot({ path: testInfo.outputPath("link.png"), fullPage: true });

        await page.goto("/pinout/raspberry-pi-pico");
        const selectPin = page.getByRole("button", { name: /^(Unselect|Select) pin 6, GP4$/ });
        await touchSize(selectPin);
        await touchSize(page.locator('.bv-pad > circle[fill="transparent"]').first());
        await selectPin.tap();
        await expect(selectPin).toHaveAttribute("aria-pressed", "true");
        await page.getByRole("button", { name: "Zoom labels", exact: true }).tap();
        await expect(page.getByText("Labels enlarged — swipe to view the full connector")).toBeVisible();
        await page.getByRole("textbox", { name: "Search pins", exact: true }).fill("GP4");
        await touchSize(page.getByRole("button", { name: "Clear pin search", exact: true }));
        await touchSize(page.getByRole("button", { name: "6 · GP4", exact: true }));
        await page.getByRole("button", { name: "Clear pin search", exact: true }).tap();
        await page.getByRole("group", { name: "Filter pins by category" }).getByRole("button", { name: "PWM", exact: true }).tap();
        await touchSize(page.getByRole("button", { name: "Clear filters", exact: true }));
        await expect(page.getByText("Showing 26 of 40 pins", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Clear filters", exact: true }).tap();
        await noOverflow(page);
        await page.screenshot({ path: testInfo.outputPath("pinout-fit.png"), fullPage: true });
        await touchSize(page.getByRole("link", { name: "Privacy", exact: true }));

        await page.goto("/");
        await touchSize(page.getByRole("button", { name: "Favorites", exact: true }));
        await touchSize(page.getByRole("button", { name: "Add Raspberry Pi Pico to favorites", exact: true }));
        await touchSize(page.getByRole("link", { name: /View PinHub source on GitHub/ }));
        await page.getByRole("textbox", { name: "Search boards", exact: true }).fill("raspberry pi pico");
        await touchSize(page.getByRole("button", { name: "Clear search", exact: true }));
        await page.getByRole("button", { name: "Clear search", exact: true }).tap();
        await page.getByRole("button", { name: "Show Raspberry Pi Pico details", exact: true }).tap();
        await noOverflow(page);
        await page.goto("/boards/raspberry-pi-pico");
        const frame = page.locator(".pi-board-frame");
        const scroll = page.getByRole("group", { name: "Scrollable board detail" });
        await expect(scroll).toHaveAttribute("tabindex", "0");
        await scroll.focus();
        await expect(scroll).toBeFocused();
        await page.keyboard.press("ArrowRight");
        if (await scroll.evaluate((node) => node.scrollWidth > node.clientWidth)) {
          await expect.poll(() => scroll.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
        } else {
          expect(await scroll.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(0);
        }
        const workingWidth = (await frame.boundingBox())!.width;
        await page.getByRole("button", { name: "Zoom board", exact: true }).tap();
        await expect.poll(async () => (await frame.boundingBox())!.width).toBeGreaterThan(workingWidth);
        await touchSize(frame.locator('.bv-pad > circle[fill="transparent"]').first());
        await page.getByRole("button", { name: "Working size", exact: true }).tap();
        await expect.poll(async () => (await frame.boundingBox())!.width).toBeCloseTo(workingWidth, 1);
        await touchSize(frame.locator('.bv-pad > circle[fill="transparent"]').first());
        await noOverflow(page);
        await page.locator(".pi-schedule summary").tap();
        await touchSize(page.getByRole("button", { name: "Select pin 1, GP0", exact: true }));
        await page.goto("/compare");
        const cardCompare = page.getByRole("button", { name: "Compare", exact: true }).first();
        await touchSize(cardCompare);
        await cardCompare.tap();
        await page.getByRole("button", { name: "Compare", exact: true }).first().tap();
        await touchSize(page.getByRole("link", { name: "Compare", exact: true }).last());
        while (await page.getByRole("button", { name: /^Remove .* from comparison$/ }).count()) await page.getByRole("button", { name: /^Remove .* from comparison$/ }).first().tap();
        const filters = page.getByRole("button", { name: /^Filters/ }).first();
        if (await filters.isVisible()) await filters.tap();
        const wireless = page.getByRole("combobox", { name: "Wireless capability", exact: true });
        await touchSize(wireless);
        await wireless.selectOption("none");
        await page.getByRole("combobox", { name: "Documentation", exact: true }).selectOption("has");
        await touchSize(page.locator("summary").filter({ hasText: "Manufacturer" }));
        await page.getByRole("textbox", { name: "Search boards", exact: true }).fill("zzzz-no-board-zzzz");
        await touchSize(page.getByRole("button", { name: "Reset filters", exact: true }));
        await page.getByRole("button", { name: "Reset filters", exact: true }).tap();
        await noOverflow(page);
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto("/");
        await touchSize(page.getByRole("button", { name: /^Use (light|dark) theme$/ }));
        for (const token of await page.locator(".ph-token").all()) await touchSize(token);
        await touchSize(page.locator(".ph-filter-option").first());
        await noOverflow(page);
        await page.setViewportSize(viewport);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        expect(await page.evaluate(() => window.innerWidth)).toBe(viewport.width);
        expect(errors).toEqual([]);
      });
    });
  }
}
