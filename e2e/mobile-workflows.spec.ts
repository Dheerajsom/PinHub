import { devices, expect, test, type Page } from "@playwright/test";

const viewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 844, height: 390 },
];

async function expectPageFits(page: Page) {
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.width);
}

for (const viewport of viewports) {
  test.describe(`touch workflows at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, isMobile: true, hasTouch: true, userAgent: devices["Pixel 5"].userAgent });

    // RP2040-Zero's connector group names are long enough to push the Label
    // column out of the table's scroll area.
    test("planner pins table shows every column for long connector groups", async ({ page }) => {
      await page.goto(
        "/planner?board=waveshare-rp2040-zero&plan=i2c1.spi1&use=g0:1~Sensor%20A,g1:1~Sensor%20A",
      );
      const table = page.getByRole("table", { name: "Your pins" });
      await expect(table).toBeVisible();
      await expect(table.getByText("Sensor A").first()).toBeVisible();
      const clipped = await table.evaluate((element) => {
        const wrapper = element.parentElement!;
        return wrapper.scrollWidth - wrapper.clientWidth;
      });
      expect(clipped).toBeLessThanOrEqual(0);
      await expectPageFits(page);
    });

    test("catalog search, filters, favorites, and inline details", async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      await expect(page.getByRole("button", { name: "Filters", exact: true })).toBeVisible();
      await expectPageFits(page);
      await page.screenshot({ path: testInfo.outputPath("catalog.png") });
      await page.getByRole("button", { name: "Filters", exact: true }).tap();
      await expect(page.getByText("Manufacturer", { exact: true })).toBeVisible();
      await expectPageFits(page);
      await page.screenshot({ path: testInfo.outputPath("filters.png") });
      await page.getByRole("button", { name: "Filters", exact: true }).tap();
      await page.getByRole("textbox", { name: "Search boards" }).fill("not-a-real-board-xyz");
      await expect(page.getByRole("heading", { name: /No boards match/ })).toBeVisible();
      await page.getByRole("button", { name: "Clear search" }).tap();
      await page.getByRole("button", { name: "Add Raspberry Pi 5 to favorites" }).tap();
      await page.getByRole("button", { name: /^Favorites/ }).tap();
      await expect(page.getByRole("heading", { name: "Raspberry Pi 5", exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByRole("button", { name: "Remove Raspberry Pi 5 from favorites" })).toBeVisible();
      await page.getByRole("button", { name: "Show Raspberry Pi 5 details" }).tap();
      await expect(page.getByRole("button", { name: "More board actions" })).toBeVisible();
      await expectPageFits(page);
      await page.screenshot({ path: testInfo.outputPath("inline-details.png") });
      expect(errors).toEqual([]);
    });

    test("collection creation persists and opens a shareable collection", async ({ page }, testInfo) => {
      await page.goto("/boards/raspberry-pi-pico");
      await page.getByRole("button", { name: "More board actions" }).tap();
      await page.getByRole("button", { name: "Add to collection", exact: true }).tap();
      const dialog = page.getByRole("dialog", { name: "Collections for Raspberry Pi Pico" });
      await expect(dialog.getByRole("button", { name: "Create", exact: true })).toBeDisabled();
      await dialog.getByRole("textbox", { name: "New collection name" }).fill("Mobile robotics");
      await dialog.getByRole("button", { name: "Create", exact: true }).tap();
      await expect(dialog.getByRole("button", { name: "Mobile robotics", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expectPageFits(page);
      await page.screenshot({ path: testInfo.outputPath("collection.png") });
      await dialog.getByRole("button", { name: "Close collections" }).tap();
      await page.reload();
      await page.getByRole("button", { name: "More board actions" }).tap();
      await page.getByRole("button", { name: "Add to collection", exact: true }).tap();
      await expect(dialog.getByRole("button", { name: "Mobile robotics", exact: true })).toHaveAttribute("aria-pressed", "true");
      await page.goto("/collections?name=Mobile%20robotics&boards=raspberry-pi-pico");
      await expect(page.getByRole("heading", { name: "Mobile robotics" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Raspberry Pi Pico" })).toBeVisible();
      await expectPageFits(page);
      await page.screenshot({ path: testInfo.outputPath("shared-collection.png") });
    });

    test("pinout search, pin selection, and inspector dismissal", async ({ page }, testInfo) => {
      await page.goto("/pinout/raspberry-pi-pico");
      await expectPageFits(page);
      await page.screenshot({ path: testInfo.outputPath("pinout.png") });
      await page.getByRole("textbox", { name: "Search pins", exact: true }).fill("GP28");
      await expect(page.getByText("Showing 1 of 40 pins", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Select pin 34, GP28", exact: true }).tap();
      await expect(page.getByRole("button", { name: "Copy pin 34, GP28" })).toBeVisible();
      await expectPageFits(page);
      await page.screenshot({ path: testInfo.outputPath("selected-pin.png") });
      await page.getByRole("button", { name: "Clear pin search" }).tap();
      await expect(page.getByText("Showing 40 of 40 pins", { exact: true })).toBeVisible();
      await page.goto("/boards/raspberry-pi-pico");
      await page.getByRole("button", { name: "Inspect", exact: true }).tap();
      const inspector = page.getByRole("dialog", { name: "Raspberry Pi Pico pinout inspector" });
      await expect(inspector).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath("inspector.png") });
      await inspector.getByRole("button", { name: "Close inspector" }).tap();
      await expect(inspector).toBeHidden();
    });

    test("full collections explain limits and preserve saved boards", async ({ page }, testInfo) => {
      // Seed a realistic capacity boundary; all user actions below use visible controls.
      await page.addInitScript(() => {
        if (localStorage.getItem("pinhub.library.v1")) return;
        const now = new Date().toISOString();
        localStorage.setItem("pinhub.library.v1", JSON.stringify({
          version: 1,
          recentBoardIds: [],
          collections: Array.from({ length: 24 }, (_, index) => ({
            id: `mobile-capacity-${index}`,
            name: `Engineering collection ${index + 1}`,
            boardIds: Array.from({ length: 24 }, (_, board) => `saved-board-${board}`),
            createdAt: now,
            updatedAt: now,
          })),
        }));
      });
      await page.goto("/boards/raspberry-pi-pico");
      await page.getByRole("button", { name: "More board actions" }).tap();
      await page.getByRole("button", { name: "Add to collection", exact: true }).tap();
      const dialog = page.getByRole("dialog", { name: "Collections for Raspberry Pi Pico" });
      await expect(dialog.getByRole("button", { name: "Engineering collection 1 Full (24)", exact: true })).toBeDisabled();
      await dialog.getByRole("textbox", { name: "New collection name" }).fill("Another project");
      await expect(dialog.getByRole("button", { name: "Create", exact: true })).toBeDisabled();
      await expect(dialog.getByRole("status")).toContainText("You have 24 collections");
      await expectPageFits(page);
      await page.screenshot({ path: testInfo.outputPath("collection-capacity.png") });
      await page.goto("/collections?name=Shared%20project&boards=raspberry-pi-pico");
      await expect(page.getByRole("button", { name: "Save this collection" })).toBeDisabled();
      await expect(page.getByRole("status")).toContainText("You have 24 collections");
      await page.reload();
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("pinhub.library.v1")!));
      expect(stored.collections).toHaveLength(24);
      expect(stored.collections.every((item: { boardIds: string[] }) => item.boardIds.length === 24)).toBe(true);
    });

    test("comparison and price search remain usable", async ({ page }, testInfo) => {
      await page.goto("/compare?boards=raspberry-pi-pico,arduino-uno-rev3");
      await expect(page.getByRole("heading", { name: "Pin-conflict analysis" })).toBeVisible();
      await expectPageFits(page);
      await page.getByRole("button", { name: "Show identical", exact: true }).tap();
      await page.screenshot({ path: testInfo.outputPath("comparison.png") });
      await page.getByRole("button", { name: "Remove Arduino UNO Rev3 from comparison" }).filter({ visible: true }).tap();
      await expect(page).not.toHaveURL(/arduino-uno-rev3/);
      // Regression: a long board name sized the stacked "Comparing" list's
      // grid column to its content, pushing the page 25px wide at 360.
      await page.goto("/compare?boards=raspberry-pi-5,nvidia-jetson-agx-orin-devkit");
      await expect(page.getByRole("heading", { name: "Pin-conflict analysis" })).toBeVisible();
      await expectPageFits(page);
      // The list's Overview links and remove buttons were 16px and 40px tall.
      if (viewport.width < 768) {
        const list = page.getByRole("list").filter({ has: page.getByRole("button", { name: /^Remove .* from comparison$/ }) }).filter({ visible: true }).first();
        const targets = [
          ...(await list.getByRole("link", { name: "Overview", exact: true }).all()),
          ...(await list.getByRole("button", { name: /^Remove / }).all()),
        ];
        expect(targets.length).toBe(4);
        for (const target of targets) {
          expect(Math.round((await target.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
        }
      }
      await page.goto("/prices");
      await expectPageFits(page);
      await page.screenshot({ path: testInfo.outputPath("prices.png") });
      await page.getByRole("searchbox", { name: "Search board prices" }).fill("not-a-real-board-xyz");
      await expect(page.getByRole("heading", { name: "No matching listings" })).toBeVisible();
      await page.getByRole("button", { name: "Clear price search" }).tap();
      await page.getByRole("button", { name: "SBCs", exact: true }).tap();
      await expect(page.getByRole("button", { name: "SBCs", exact: true })).toHaveAttribute("aria-pressed", "true");
      await page.reload();
      await expect(page.getByRole("button", { name: "SBCs", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expectPageFits(page);
    });

    test("discovery toolbar wraps every control on screen", async ({ page }) => {
      // Regression: below 640px these controls sat in one horizontally
      // scrolling row that clipped Filters and hid Favorites past the right
      // edge. The page itself never overflowed (the row clipped its content),
      // so expectPageFits alone could not catch it; check each control's box.
      await page.goto("/compare");
      await expectPageFits(page);
      const toolbar = page.locator("main .sticky").first();
      const controls = [
        toolbar.getByRole("link", { name: "Pin Maps", exact: true }),
        toolbar.getByRole("link", { name: "Planner", exact: true }),
        toolbar.getByRole("link", { name: "Compare", exact: true }),
        toolbar.getByRole("link", { name: "Prices", exact: true }),
        toolbar.getByRole("button", { name: /^Favorites/ }),
        toolbar.getByRole("combobox", { name: "Sort boards" }),
      ];
      // Filters collapses into the sidebar from lg up; landscape phones below
      // that still show it.
      if (viewport.width < 1024) controls.push(toolbar.getByRole("button", { name: /^Filters/ }));
      for (const control of controls) {
        await expect(control).toBeVisible();
        const box = await control.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      }
      // The sort menu, including "Best match" (shown once a query exists),
      // opens fully on screen with every option a full touch target.
      await toolbar.getByRole("searchbox", { name: "Search boards" }).or(toolbar.getByRole("textbox", { name: "Search boards" })).fill("esp32");
      const sort = toolbar.getByRole("combobox", { name: "Sort boards" });
      await expect(sort).toHaveText("Best match");
      await sort.tap();
      const menu = toolbar.getByRole("listbox", { name: "Sort boards" });
      await expect(menu).toBeVisible();
      const menuBox = await menu.boundingBox();
      expect(menuBox!.x).toBeGreaterThanOrEqual(0);
      expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(viewport.width);
      for (const option of await menu.getByRole("option").all()) {
        const box = await option.boundingBox();
        // Mobile device scale factors report 44px as 43.99997.
        expect(Math.round(box!.height)).toBeGreaterThanOrEqual(44);
      }
      await menu.getByRole("option", { name: "Recently added" }).tap();
      await expect(sort).toHaveText("Recently added");
      await expect(menu).toBeHidden();
      await toolbar.getByRole("button", { name: /^Filters/ }).tap();
      await expect(page.getByText("Discovery facets", { exact: true })).toBeVisible();
    });
  });
}

test.describe("favorite capacity feedback", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: devices["Pixel 5"].userAgent });

  test("explains a full favorites store on both catalog surfaces", async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem("pinhub.favorites")) {
        localStorage.setItem("pinhub.favorites", JSON.stringify(Array.from({ length: 256 }, (_, index) => `saved-board-${index}`)));
      }
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Add Raspberry Pi 5 to favorites" }).tap();
    await expect(page.getByRole("status").filter({ hasText: "Favorite limit reached (256)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Raspberry Pi 5 to favorites" })).toHaveAttribute("aria-pressed", "false");
    await expectPageFits(page);

    await page.goto("/compare");
    await page.getByRole("button", { name: "Add Adafruit ESP32-S3 Feather to favorites" }).tap();
    await expect(page.getByRole("status").filter({ hasText: "Favorite limit reached (256)" })).toBeVisible();
    await expectPageFits(page);
  });
});
