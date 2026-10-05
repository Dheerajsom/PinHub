import { expect, test } from "@playwright/test";

test("picks two boards, lists the wires, and rings the selected wire on both boards", async ({ page }) => {
  await page.goto("/link");
  await page.getByRole("combobox", { name: "Search for board A" }).fill("raspberry pi 5");
  await page.getByRole("combobox", { name: "Search for board A" }).press("Enter");
  await page.getByRole("combobox", { name: "Search for board B" }).fill("arduino uno rev3");
  await page.getByRole("combobox", { name: "Search for board B" }).press("Enter");
  await expect(page).toHaveURL(/\/link\?a=raspberry-pi-5&b=arduino-uno-rev3&bus=uart$/);

  await expect(page.getByRole("heading", { name: "Level shifter required" })).toBeVisible();
  const wires = page.getByRole("button", { name: /^Wire \d/ });
  await expect(wires).toHaveCount(3);

  await wires.nth(1).click();
  await expect(wires.nth(1)).toHaveAttribute("aria-pressed", "true");
  // Each board sheet marks the selected wire's pad.
  await expect(page.locator('figure svg [role="button"][aria-pressed="true"]')).toHaveCount(2);

  await page.reload();
  await expect(wires).toHaveCount(3);
  await page.goBack();
  await expect(page).toHaveURL(/\/link\?a=raspberry-pi-5&bus=uart$/);
});

test.describe("board link on a phone", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } });
  test("fits 360 px with 44 px controls", async ({ page }) => {
    await page.goto("/link?a=raspberry-pi-pico&b=arduino-mega-2560-rev3&bus=uart");
    await expect(page.getByRole("button", { name: /^Wire 1/ })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    for (const name of ["UART", "I2C"]) {
      const box = await page.getByRole("radio", { name }).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const swap = await page.getByRole("button", { name: "Swap boards A and B" }).boundingBox();
    expect(swap!.height).toBeGreaterThanOrEqual(44);
    const select = await page.locator("select").first().boundingBox();
    expect(select!.height).toBeGreaterThanOrEqual(44);

    // The Mega's long header keeps a tappable size and scrolls inside its
    // panel rather than shrinking to dust at phone width.
    const mega = page.getByRole("region", { name: "Arduino Mega 2560 Rev3 connector sheet" });
    const pad = await mega.locator(".bv-pad circle").first().boundingBox();
    expect(pad!.width).toBeGreaterThanOrEqual(16);
    expect(await mega.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    await expect(page.getByText("Scroll sideways for the rest of the connector.").first()).toBeVisible();
    await page.getByRole("button", { name: /^Wire 3/ }).tap();
    await expect.poll(() => mega.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    const after = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(after).toBeLessThanOrEqual(0);
  });
});
