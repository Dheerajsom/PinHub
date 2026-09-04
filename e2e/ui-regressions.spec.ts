import { expect, test } from "@playwright/test";

test.describe("catalog workspace", () => {
  test("keeps the catalog in its compact layout at 1024px", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/");

    await expect(page.locator("#catalog-workspace")).toBeVisible();
    await expect(page.getByRole("button", { name: /filters/i })).toBeVisible();
    const columns = await page.locator("#catalog-workspace").evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" "),
    );
    expect(columns).toHaveLength(1);
  });

  test("uses the full three-column workspace at 1280px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    await expect(page.locator("#catalog-workspace")).toBeVisible();
    await expect(page.getByRole("button", { name: /filters/i })).toBeHidden();
    const columns = await page.locator("#catalog-workspace").evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" "),
    );
    expect(columns).toHaveLength(3);
  });
});

test("dark-theme muted labels use the accessible contrast token", async ({ page }) => {
  await page.goto("/");
  await page.locator("html").evaluate((element) => {
    element.setAttribute("data-theme", "dark");
  });

  const color = await page
    .getByText("Boards", { exact: true })
    .first()
    .evaluate((element) => getComputedStyle(element).color);
  expect(color).toBe("rgb(156, 163, 175)");
});

test("light-theme price navigation uses readable amber ink", async ({ page }) => {
  await page.goto("/");
  await page.locator("html").evaluate((element) => {
    element.setAttribute("data-theme", "light");
  });
  const color = await page.getByRole("navigation", { name: "PinHub sections" })
    .getByRole("link", { name: "Prices", exact: true })
    .evaluate((element) => getComputedStyle(element).color);
  expect(color).toBe("rgb(133, 77, 14)");
});

test("pinout SVG definitions have unique IDs", async ({ page }) => {
  await page.goto("/pinout/raspberry-pi-pico");

  const ids = await page.locator("svg [id]").evaluateAll((elements) =>
    elements.map((element) => element.id),
  );
  expect(new Set(ids).size).toBe(ids.length);
});

test("board classification does not repeat itself", async ({ page }) => {
  await page.goto("/boards/raspberry-pi-pico");

  await expect(
    page.getByText("Microcontroller · Microcontroller", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Microcontroller", { exact: true }).first(),
  ).toBeVisible();
});

test("a deleted collection can be restored from the shelf", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Collection" }).click();
  await page.getByPlaceholder("Robotics boards").fill("Robotics");
  await page.getByRole("button", { name: "Create" }).click();

  await page.getByRole("button", { name: "Delete Robotics" }).click();
  await expect(page.getByText("Deleted Robotics", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();

  await expect(page.getByRole("heading", { name: "Robotics" })).toBeVisible();
});
