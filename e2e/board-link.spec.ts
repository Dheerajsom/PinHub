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

test("frames a Nucleo-144 on the linked connector beside the Pi header", async ({ page }) => {
  await page.setViewportSize({ width: 1160, height: 900 });
  await page.goto("/link?a=raspberry-pi-4-model-b&b=stm32-nucleo-h753zi&bus=uart");
  const nucleo = page.getByRole("region", { name: "STM32 Nucleo-H753ZI connector sheet" });
  await expect(nucleo.locator(".bv-planned-ring")).toHaveCount(3);
  // Reported: the sheet was ~1650 px wide in a ~440 px panel, with the linked
  // CN7 pins a sideways scroll away. It now fits, every linked pad in view.
  expect(await nucleo.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  await expect(page.getByText("CN7 Zio (upper right)", { exact: true })).toBeVisible();

  // The two sheets sit side by side, so both ends of each wire are on one screen.
  const pi = await page.getByRole("region", { name: "Raspberry Pi 4 Model B connector sheet" }).boundingBox();
  const st = await nucleo.boundingBox();
  expect(Math.abs(pi!.y - st!.y)).toBeLessThan(80);

  await page.getByRole("button", { name: "Whole board" }).click();
  await expect(nucleo.locator(".bv-planned-ring")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Whole board" })).toHaveAttribute("aria-pressed", "true");

  // The cautions lead with what bears on this link; the rest is one click away.
  await expect(page.getByRole("list", { name: "Board notes for this link" })).toContainText("UART overlays");
  await expect(page.getByText("current-limited")).toBeHidden();
  await page.getByText(/^\d+ more board notes$/).click();
  await expect(page.getByText(/current-limited/)).toBeVisible();
});

test.describe("board link on a phone", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } });
  test("shows long board names in full", async ({ page }) => {
    await page.goto("/link?a=libre-computer-le-potato&b=adafruit-grand-central-m4-express&bus=uart");
    const name = page.getByText("Adafruit Grand Central M4 Express", { exact: true }).first();
    await expect(name).toBeVisible();
    expect(await name.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(0);
  });

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
    // The Mega's headers are drawn as level columns, one titled column group
    // per connector. Its UART pair (D14/D15) and its GND sit in different
    // connectors, wider apart than a 360 px phone, so the sheet opens on as
    // many linked pads as fit — the UART pair — and says the rest is sideways.
    await expect(page.getByText(/linked pins span more than the screen/)).toBeVisible();
    const megaBox = (await mega.boundingBox())!;
    let onScreen = 0;
    for (const ring of await mega.locator(".bv-planned-ring").all()) {
      const box = (await ring.boundingBox())!;
      const centre = box.x + box.width / 2;
      if (centre > megaBox.x && centre < megaBox.x + megaBox.width) onScreen += 1;
    }
    expect(onScreen).toBeGreaterThanOrEqual(2);
    // No label on the sheet is turned on its side.
    expect(await mega.locator('.bv-label[transform*="rotate"]').count()).toBe(0);
    await page.getByRole("button", { name: /^Wire 3/ }).tap();
    await expect.poll(() => mega.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
    const after = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(after).toBeLessThanOrEqual(0);
  });

  test("opens a sheet whose linked pins span the board on as many as fit", async ({ page }) => {
    // Mobile gate: the Grand Central's I2C pads sit at both ends of a strip.
    // Centring on their midpoint opened the sheet with none of them on screen.
    await page.goto("/link?a=raspberry-pi-pico&b=adafruit-grand-central-m4-express&bus=i2c");
    const sheet = page.getByRole("region", { name: "Adafruit Grand Central M4 Express connector sheet" });
    await expect(sheet.locator(".bv-planned-ring")).toHaveCount(3);
    await expect(page.getByText(/linked pins span more than the screen/)).toBeVisible();
    const box = (await sheet.boundingBox())!;
    let visible = 0;
    for (const ring of await sheet.locator(".bv-planned-ring").all()) {
      const r = (await ring.boundingBox())!;
      const centre = r.x + r.width / 2;
      if (centre > box.x && centre < box.x + box.width) visible += 1;
    }
    expect(visible).toBeGreaterThanOrEqual(2);
  });
});
