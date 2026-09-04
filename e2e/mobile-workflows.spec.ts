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
      await expect(page.getByRole("button", { name: "Collection", exact: true })).toBeVisible();
      await expectPageFits(page);
      await page.screenshot({ path: testInfo.outputPath("inline-details.png") });
      expect(errors).toEqual([]);
    });

    test("collection creation persists and opens a shareable collection", async ({ page }, testInfo) => {
      await page.goto("/boards/raspberry-pi-pico");
      await page.getByRole("button", { name: "Collection", exact: true }).tap();
      const dialog = page.getByRole("dialog", { name: "Collections for Raspberry Pi Pico" });
      await expect(dialog.getByRole("button", { name: "Create", exact: true })).toBeDisabled();
      await dialog.getByRole("textbox", { name: "New collection name" }).fill("Mobile robotics");
      await dialog.getByRole("button", { name: "Create", exact: true }).tap();
      await expect(dialog.getByRole("button", { name: "Mobile robotics", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expectPageFits(page);
      await page.screenshot({ path: testInfo.outputPath("collection.png") });
      await dialog.getByRole("button", { name: "Close collections" }).tap();
      await page.reload();
      await page.getByRole("button", { name: "Collection", exact: true }).tap();
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
      await page.getByRole("button", { name: "Collection", exact: true }).tap();
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
  });
}
