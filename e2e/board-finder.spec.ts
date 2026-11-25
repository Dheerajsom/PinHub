import { expect, test, type Locator } from "@playwright/test";

async function touchSize(locator: Locator) {
  const box = (await locator.boundingBox())!;
  expect(Math.round(box.height), `${locator} height`).toBeGreaterThanOrEqual(44);
  expect(Math.round(box.width), `${locator} width`).toBeGreaterThanOrEqual(44);
}

// A finder change replaces the URL only when the server's new plan arrives.
// Under a full parallel run that first plan render has measured almost 5 s, so
// the URL gets longer than Playwright's default; the counts update at once.
const serverPlan = { timeout: 15_000 };

test("the Tools menu reaches the finder, and a fit opens as the same plan in the planner", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "PinHub sections" });
  await nav.getByRole("button", { name: /^Tools/ }).click();
  await nav.getByRole("link", { name: /^Board finder/ }).click();
  await expect(page).toHaveURL(/\/find$/);
  await expect(page.getByRole("heading", { name: "Board finder", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "I2C sensor + 2 analog inputs" }).click();
  await expect(page.getByRole("group", { name: "ADC, 2 needed" })).toBeVisible();
  await expect(page).toHaveURL(/\/find\?plan=i2c1\.adc2$/, serverPlan);
  const status = page.getByRole("status").filter({ hasText: /^Fits on \d+ of \d+ boards checked\.$/ });
  await expect(status).toBeVisible(serverPlan);

  await page.getByRole("button", { name: "Add one SPI" }).click();
  await expect(page.getByRole("group", { name: "SPI, 1 needed" })).toBeVisible();
  await expect(page).toHaveURL(/\/find\?plan=i2c1\.spi1\.adc2$/, serverPlan);
  await page.getByRole("group", { name: "Platform" }).getByRole("button", { name: "Microcontroller" }).click();
  await expect(page).toHaveURL(/\/find\?plan=i2c1\.spi1\.adc2&platform=mcu$/, serverPlan);

  const card = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: /Open this plan/ }) }).first();
  const boardName = (await card.getByRole("link").first().textContent())!.trim();
  await card.getByRole("link", { name: /Open this plan/ }).click();
  await expect(page).toHaveURL(/\/planner\?board=[a-z0-9-]+&plan=i2c1\.spi1\.adc2$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(boardName);
  // The planner places the same plan the finder promised.
  await expect(page.locator('[data-plan-count="I2C"]')).toHaveText("1");
  await expect(page.locator('[data-plan-count="SPI"]')).toHaveText("1");
  await expect(page.locator('[data-plan-count="ADC"]')).toHaveText("2");
  await expect(page.locator("[data-plan-status]")).not.toContainText(/doesn't fit|needs more|stopped after/);
  expect(errors).toEqual([]);
});

test("a request nothing can take explains each miss", async ({ page }) => {
  await page.goto("/find?plan=i2c8.spi8.uart8");
  await expect(page.getByRole("heading", { name: "No board fits all of that" })).toBeVisible();
  const misses = page.locator("details").filter({ hasText: /^Doesn.t fit on \d+ boards/ });
  await expect(misses).toHaveAttribute("open", "");
  await expect(misses.getByRole("listitem").first()).toContainText(/\S/);
});

test("a hostile query is ignored, not half-read", async ({ page }) => {
  await page.goto(`/find?plan=i2c1&logic=<script>&platform=mcu&platform=sbc`);
  await expect(page.getByRole("group", { name: "Logic level" }).getByRole("button", { name: "Any" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "Platform" }).getByRole("button", { name: "Any" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "I2C, 1 needed" })).toBeVisible();
});

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }]) {
  test(`the finder fits a ${viewport.width} px phone with full-size controls`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/find?plan=i2c1.adc2");
    for (const name of ["Add one I2C", "Remove one I2C", "Add one GPIO"]) await touchSize(page.getByRole("button", { name }));
    await touchSize(page.getByRole("group", { name: "Wireless" }).getByRole("button", { name: "Wi-Fi" }));
    await touchSize(page.getByRole("link", { name: /Open this plan/ }).first());
    await touchSize(page.getByRole("link", { name: /Pin map/ }).first());
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("light theme keeps the primary action readable", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pinhub.theme", "light"));
  await page.goto("/find?plan=uart1");
  const open = page.getByRole("link", { name: /Open this plan/ }).first();
  await expect(open).toHaveCSS("background-color", "rgb(14, 116, 144)");
  await expect(open).toHaveCSS("color", "rgb(255, 255, 255)");
});
