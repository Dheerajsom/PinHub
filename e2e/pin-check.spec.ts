import { expect, test } from "@playwright/test";

test("loads an example, reports the input-only relay, and links the pin across views", async ({ page }) => {
  await page.goto("/check");
  await page.getByRole("button", { name: /ESP32 weather station/ }).click();
  await expect(page).toHaveURL(/\/check\?board=esp32-devkitc$/);

  await expect(page.getByRole("heading", { name: "2 pins to fix" })).toBeVisible();
  const relay = page.getByRole("button", { name: /^IO34, Fix\./ });
  await expect(relay).toBeVisible();
  await expect(page.getByText("Input-only pin").first()).toBeVisible();

  // Selecting a card selects the same pin in the strip and on the sheet.
  await relay.click();
  await expect(relay).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("list", { name: "Pins your code uses" }).getByRole("button", { name: "IO34, Fix" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".ph-check-readout")).toContainText("IO34");

  // The planner link claims the code's pins on the same board.
  const planner = page.getByRole("link", { name: "Open in planner" });
  await expect(planner).toHaveAttribute("href", /^\/planner\?board=esp32-devkitc&use=/);

  // The draft survives a reload in this tab.
  await page.reload();
  await expect(page.getByRole("heading", { name: "2 pins to fix" })).toBeVisible();
});

test("asks for a language it cannot detect, then checks once one is chosen", async ({ page }) => {
  await page.goto("/check?board=raspberry-pi-pico");
  await page.getByRole("textbox").fill("led = Pin(22)\nADC(Pin(22))");
  await expect(page.getByRole("heading", { name: "Which language is this?" })).toBeVisible();
  await page.getByRole("combobox", { name: "Code language" }).click();
  await page.getByRole("option", { name: "MicroPython" }).click();
  await expect(page.getByRole("heading", { name: "1 pin to fix" })).toBeVisible();
  await expect(page.locator(".ph-check-finding-title", { hasText: "No analog input here" })).toBeVisible();
});

test.describe("pin check on a phone", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } });
  test("fits 360 px with 44 px controls", async ({ page }) => {
    await page.goto("/check");
    await page.getByRole("button", { name: /UNO lamp dimmer/ }).tap();
    await expect(page.getByRole("heading", { name: "2 pins to check" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // Links inside a sentence are exempt (WCAG 2.5.8 inline exception); every control is checked.
    for (const control of await page.locator(".ph-check button:visible, .ph-check a:visible:not(.ph-check-link)").all()) {
      const box = await control.boundingBox();
      if (!box) continue;
      expect(Math.round(box.height), await control.innerText()).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("pin check sheet on a phone", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } });
  test("scrolls the connector sheet to a pin selected from its card", async ({ page }) => {
    // Regression: the sheet stayed at its left edge, so a right-column pin
    // chosen from the report was selected off screen.
    await page.goto("/check");
    await page.getByRole("button", { name: /ESP32 weather station/ }).tap();
    await page.getByRole("button", { name: /^IO21, Clear\./ }).tap();
    const wrap = page.getByRole("group", { name: "Connector sheet, scrollable" });
    const pad = page.locator(".ph-check-sheet svg [aria-pressed=\"true\"]").first();
    await expect(pad).toBeAttached();
    await expect.poll(async () => {
      const box = await wrap.boundingBox();
      const padBox = await pad.boundingBox();
      return Boolean(box && padBox && padBox.x >= box.x && padBox.x + padBox.width <= box.x + box.width);
    }).toBe(true);
  });
});
