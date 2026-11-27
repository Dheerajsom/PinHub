import { expect, test } from "@playwright/test";

test("reduce motion is applied before first paint and survives a reload", async ({ page }) => {
  await page.goto("/compare");
  await page.getByRole("button", { name: "Settings" }).click();
  const panel = page.getByRole("dialog", { name: "Settings" });
  await panel.getByText("Reduce", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  const duration = await page
    .getByRole("button", { name: "Settings" })
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(duration.split(",").every((part) => parseFloat(part) < 0.001)).toBe(true);
});

test("System theme follows the operating system after the toggle stored a choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("pinhub.theme", "dark");
      sessionStorage.setItem("seeded", "1");
    }
  });
  await page.goto("/compare");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("dialog", { name: "Settings" }).getByText("System", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("settings panel fits a 360 px phone without page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  const box = await page.getByRole("dialog", { name: "Settings" }).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(15);
  expect(box!.x + box!.width).toBeLessThanOrEqual(345);
  // The catalog header clips its overflow; the panel must still be the
  // element actually drawn at its own centre, not just have a box.
  const onTop = await page.getByRole("dialog", { name: "Settings" }).evaluate((panel) => {
    const rect = panel.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + Math.min(rect.height / 2, 120));
    return Boolean(hit && panel.contains(hit));
  });
  expect(onTop).toBe(true);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("a colorway reskins the page at once, in both themes, and survives a reload", async ({ page }) => {
  await page.goto("/compare");
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByText("Dark", { exact: true }).click();
  await dialog.getByText("Blueprint", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-colorway", "blueprint");
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await background()).toBe("rgb(10, 35, 72)");

  await dialog.getByText("Light", { exact: true }).click();
  expect(await background()).toBe("rgb(238, 242, 248)");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-colorway", "blueprint");
  expect(await background()).toBe("rgb(238, 242, 248)");
});

test("tapping the scrim closes settings and returns focus to the gear", async ({ page }) => {
  await page.goto("/compare");
  const gear = page.getByRole("button", { name: "Settings" });
  await gear.click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();
  await expect(gear).toBeFocused();
});
