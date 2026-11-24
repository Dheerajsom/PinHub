import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 844, height: 390 },
  { width: 1280, height: 800 },
];

async function onScreen(page: Page, locator: ReturnType<Page["locator"]>, width: number) {
  await expect(locator).toBeVisible();
  const box = (await locator.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
  expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
}

for (const viewport of viewports) {
  test(`every section and every tool is reachable on screen at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of ["/", "/compare", "/prices", "/check", "/find"]) {
      await page.goto(path);
      const nav = page.getByRole("navigation", { name: "PinHub sections" });
      for (const name of ["Pin Maps", "Compare", "Prices"]) {
        await onScreen(page, nav.getByRole("link", { name, exact: true }), viewport.width);
      }
      const tools = nav.getByRole("button", { name: /^Tools/ });
      await onScreen(page, tools, viewport.width);
      await tools.click();
      for (const name of ["Board finder", "Pin planner", "Code check", "Connect two boards"]) {
        await onScreen(page, nav.getByRole("link", { name: new RegExp(`^${name}`) }), viewport.width);
      }
      await page.keyboard.press("Escape");
      await expect(nav.getByRole("link", { name: /^Code check/ })).toHaveCount(0);
      await expect(tools).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test("every page wears the same compact header outside the catalog", async ({ page }) => {
  for (const path of ["/compare", "/prices", "/planner", "/check", "/link", "/find", "/boards/raspberry-pi-pico"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "PinHub catalog home" }), path).toBeVisible();
    await expect(page.getByRole("navigation", { name: "PinHub sections" }), path).toHaveCount(1);
  }
});

test("light-theme nav links have no fill at rest", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pinhub.theme", "light"));
  // On /compare neither Pin Maps nor Tools is the current section.
  await page.goto("/compare");
  const nav = page.getByRole("navigation", { name: "PinHub sections" });
  for (const control of [nav.getByRole("link", { name: "Pin Maps", exact: true }), nav.getByRole("button", { name: /^Tools/ })]) {
    await expect(control).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  }
});

test("button text follows its size utility", async ({ page }) => {
  await page.goto("/boards/raspberry-pi-pico");
  // `text-[11px]` on the Show pins chips used to render at 16 px.
  const chip = page.getByRole("group", { name: "Show pins", exact: true }).getByRole("button", { name: "GPIO", exact: true });
  await expect(chip).toHaveCSS("font-size", "11px");
});

test("the board page reads cautions, then the pin map, and the old pinout path redirects to it", async ({ page, request }) => {
  const response = await request.get("/pinout/raspberry-pi-pico?pin=g0%3A0", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/boards/raspberry-pi-pico?pin=g0%3A0");

  await page.goto("/boards/esp32-devkit-v1");
  const cautions = page.getByRole("region", { name: "Before you wire" });
  const map = page.getByRole("region", { name: "Pin map" });
  const order = await cautions.evaluate(
    (node, other) => node.compareDocumentPosition(other!) & Node.DOCUMENT_POSITION_FOLLOWING,
    await map.elementHandle(),
  );
  expect(order).toBeTruthy();
  await expect(map.getByRole("group", { name: "Show pins", exact: true })).toBeVisible();
  await expect(map.getByRole("table")).toBeVisible();
});

test.describe("touch landscape (844 × 390)", () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });

  test("the Tools list on the sticky catalog bar stays on screen and scrolls to its last tool", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 400));
    const nav = page.getByRole("navigation", { name: "PinHub sections" });
    await nav.getByRole("button", { name: /^Tools/ }).click();
    const panel = page.locator(".ph-tools-panel");
    const box = (await panel.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(390);
    const last = nav.getByRole("link", { name: /^Connect two boards/ });
    await last.scrollIntoViewIfNeeded();
    const lastBox = (await last.boundingBox())!;
    expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(390);
  });

  test("text fields stay at 16 px on touch so iOS does not zoom on focus", async ({ page }) => {
    await page.goto("/link?a=raspberry-pi-4-model-b&b=stm32-nucleo-h753zi&bus=uart");
    const selects = page.locator("select.ph-link-select");
    expect(await selects.count()).toBeGreaterThan(0);
    for (const select of await selects.all()) await expect(select).toHaveCSS("font-size", "16px");
    await page.goto("/");
    await expect(page.getByRole("textbox", { name: "Search boards" })).toHaveCSS("font-size", "16px");
  });
});

test("controls whose text shrank to its intended size keep a 44 px target", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  const reset = page.getByRole("button", { name: "Reset", exact: true });
  const box = (await reset.boundingBox())!;
  expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
  expect(Math.round(box.width)).toBeGreaterThanOrEqual(44);
  await page.goto("/prices");
  const notes = page.locator('a[href="#price-notes"]').first();
  expect(Math.round((await notes.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
});
