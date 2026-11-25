import { expect, test } from "@playwright/test";

// Regressions for the P2 findings of the 2026-11-24 council review that only
// show in a real browser.

test.describe("light theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("pinhub.theme", "light"));
  });

  test("the catalog star shows no hover fill or border at rest", async ({ page }) => {
    // `[class*="bg-white/"]` matched the star's `hover:bg-white/[0.08]`, so its
    // hover fill and border were painted at rest on every card.
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const star = page.getByRole("button", { name: /^Add .* to favorites$/ }).first();
    await expect(star).toBeVisible();
    await page.mouse.move(0, 0);
    const rest = await star.evaluate((node) => {
      const style = getComputedStyle(node);
      return { background: style.backgroundColor, border: style.borderTopColor };
    });
    expect(rest.background).toBe("rgba(0, 0, 0, 0)");
    expect(rest.border).toBe("rgba(0, 0, 0, 0)");
    await star.hover();
    await expect.poll(() => star.evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  });
});

test("the inspector makes the header and footer inert while open", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Inspect", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: /pinout inspector$/ });
  await expect(dialog).toBeVisible();
  const outside = await page.evaluate(() => {
    const dialogNode = document.querySelector('[role="dialog"]')!;
    return Array.from(document.body.children)
      .filter((child) => child instanceof HTMLElement && !child.contains(dialogNode) && child.tagName !== "SCRIPT")
      .map((child) => ({ tag: child.tagName, inert: (child as HTMLElement).inert }));
  });
  expect(outside.length).toBeGreaterThan(0);
  expect(outside.filter((item) => !item.inert)).toEqual([]);
  // A header link cannot be reached with the keyboard.
  for (let step = 0; step < 30; step += 1) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
  }
  await dialog.getByRole("button", { name: "Close inspector" }).click();
  expect(await page.evaluate(() => Array.from(document.body.children).some((child) => (child as HTMLElement).inert))).toBe(false);
});

test.describe("board finder", () => {
  test("pages fits through the URL and moves focus to the first new board", async ({ page }) => {
    await page.goto("/find?plan=i2c1");
    const cards = page.locator("[data-fit-index]");
    await expect(cards).toHaveCount(24);
    const more = page.getByRole("link", { name: /^Show 24 more of \d+ boards that fit$/ });
    await more.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/show=48/);
    await expect(cards).toHaveCount(48);
    await expect(page.locator('[data-fit-index="24"] a').first()).toBeFocused();
  });

  test("keeps focus in the form after an example and after Start over", async ({ page }) => {
    await page.goto("/find");
    const heading = page.getByRole("heading", { name: "What does your project need?" });
    await page.getByRole("button", { name: "SPI display + I2C sensor" }).click();
    await expect(heading).toBeFocused();
    await expect(page).toHaveURL(/plan=/);
    await page.getByRole("button", { name: "Start over" }).click();
    await expect(heading).toBeFocused();
  });
});

test.describe("price trigger route", () => {
  test("refuses HEAD rather than running GET, and lists only working methods", async ({ request }) => {
    const head = await request.head("/api/cron/prices", { headers: { authorization: "Bearer not-the-secret" } });
    expect(head.status()).toBe(405);
    expect(head.headers()["allow"]).toBe("GET, OPTIONS");
    const options = await request.fetch("/api/cron/prices", { method: "OPTIONS" });
    expect(options.status()).toBe(204);
    expect(options.headers()["allow"]).toBe("GET, OPTIONS");
  });
});

test("the category facet stays open when its filter is cleared", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?category=Microcontroller");
  const disclosure = page.locator("details", { has: page.locator("summary", { hasText: "Catalog category" }) });
  await expect(disclosure).toHaveAttribute("open", "");
  await disclosure.getByRole("button", { name: /^All/ }).click();
  await expect(page).not.toHaveURL(/category=/);
  await expect(disclosure).toHaveAttribute("open", "");
});

test("on a phone, clearing the category keeps the filter panel and focus; choosing one returns focus to Filters", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto("/?category=Microcontroller");
  const toggle = page.getByRole("button", { name: /^Filters/ });
  await toggle.tap();
  const panel = page.locator("#mobile-filters");
  await expect(panel).toBeVisible();
  const disclosure = panel.locator("details", { has: page.locator("summary", { hasText: "Catalog category" }) });
  const all = disclosure.getByRole("button", { name: /^All/ });
  await all.tap();
  await expect(page).not.toHaveURL(/category=/);
  await expect(panel).toBeVisible();
  await expect(all).toBeFocused();
  await disclosure.getByRole("button", { name: /^Microcontroller/ }).tap();
  await expect(page).toHaveURL(/category=Microcontroller/);
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();
  await context.close();
});
