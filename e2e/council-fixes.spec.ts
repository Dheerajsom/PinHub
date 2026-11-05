import { expect, test } from "@playwright/test";

function luminance(rgb: string) {
  const channels = rgb.match(/[\d.]+/g)!.slice(0, 3).map((value) => {
    const s = Number(value) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test("pin lookup keeps board results and known alternate signals coherent", async ({ page }) => {
  await page.goto("/?q=pico+sda");
  const answer = page.getByRole("region", { name: "Pin lookup" });
  await expect(answer.getByRole("link").first()).toContainText("GP4");
  await expect(answer.getByRole("link").first()).toContainText("Recorded default");
  expect((await answer.boundingBox())!.height).toBeLessThan(680);
  await answer.getByRole("button", { name: /Show .* more pins for Raspberry Pi Pico$/, exact: false }).click();
  await expect(answer.getByRole("link").filter({ hasText: "GP0" }).first()).toContainText("Alternate function");
  await expect(page.getByRole("heading", { name: "No boards match that filter" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Select Raspberry Pi Pico$/, exact: false })).toBeVisible();
});

test("banked GPIO and alias-only PWM stay discoverable on Orange Pi", async ({ page }) => {
  await page.goto("/pinout/orange-pi-5");
  const filters = page.getByRole("group", { name: "Filter pins by category" });
  await filters.getByRole("button", { name: "GPIO", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Showing 17 of 26 pins" })).toBeVisible();
  await filters.getByRole("button", { name: "GPIO", exact: true }).click();
  await filters.getByRole("button", { name: "PWM", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Showing 9 of 26 pins" })).toBeVisible();
});

test("exact display names with decimal and plus tokens produce pin answers", async ({ page }) => {
  for (const [query, heading, signal] of [
    ["teensy 3.2 sda1", "Teensy 3.2", "SDA1"],
    ["Raspberry Pi 3 Model B+ GPIO2", "Raspberry Pi 3 Model B+", "GPIO2"],
  ]) {
    await page.goto(`/?${new URLSearchParams({ q: query })}`);
    const answer = page.getByRole("region", { name: "Pin lookup", exact: true });
    await expect(answer.getByRole("heading", { name: `${heading} (1 pin)` })).toBeVisible();
    await expect(answer.getByRole("link").first()).toContainText(signal);
  }
});

test("numbered secondary bus pads stay in their family filters", async ({ page }) => {
  for (const [id, category, expected] of [["teensy-32", "I2C", 4], ["teensy-lc", "UART", 8]] as const) {
    await page.goto(`/pinout/${id}`);
    await page.getByRole("group", { name: "Filter pins by category" }).getByRole("button", { name: category, exact: true }).click();
    await expect(page.getByRole("heading", { name: new RegExp(`^Showing ${expected} of`) })).toBeVisible();
  }
  await page.goto("/pinout/libre-computer-tritium-h5");
  await page.getByRole("group", { name: "Filter pins by category" }).getByRole("button", { name: "I2C", exact: true }).click();
  for (const alias of ["TWI1_SDA", "TWI1_SCK"]) await expect(page.getByRole("row").filter({ hasText: alias })).toBeVisible();
});

test("shorthand lookup explains recorded alternate lines and timer channels", async ({ page }) => {
  await page.goto("/?q=teensy4.1+i2c");
  let answer = page.getByRole("region", { name: "Pin lookup", exact: true });
  await expect(answer.getByRole("heading", { name: "Teensy 4.1 (6 pins)" })).toBeVisible();
  await answer.getByRole("button", { name: /Show 4 more pins for Teensy 4\.1$/ }).click();
  await expect(answer.getByRole("link")).toHaveCount(6);
  for (const row of await answer.getByRole("link").all()) await expect(row).toContainText(/SDA|SCL/);
  await expect(answer.getByRole("link").filter({ hasText: "I2C Wire2 SCL" })).toBeVisible();
  await page.goto("/?q=uno+r3+sda");
  answer = page.getByRole("region", { name: "Pin lookup", exact: true });
  await expect(answer.getByRole("heading", { name: /Arduino UNO Rev3/ })).toBeVisible();
  await expect(answer.getByRole("link").first()).toContainText("SDA");
  await page.goto("/?q=uno+r3+pwm");
  answer = page.getByRole("region", { name: "Pin lookup", exact: true });
  await answer.getByRole("button", { name: /Show 4 more pins for Arduino UNO Rev3$/ }).click();
  await expect(answer.getByRole("link").filter({ hasText: "D10 / CS" })).toContainText("PWM TIMER1 B");
  await expect(answer.getByRole("link").filter({ hasText: "D11 / COPI" })).toContainText("PWM TIMER2 A");
});

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }, { width: 844, height: 390 }]) {
  for (const theme of ["dark", "light"]) {
    test(`decimal family and spaced revision lookup at ${viewport.width} in ${theme}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript((value) => localStorage.setItem("pinhub.theme", value), theme);
      await page.goto("/?q=teensy4+i2c");
      let answer = page.getByRole("region", { name: "Pin lookup", exact: true });
      await expect(answer.getByRole("heading", { name: "Teensy 4.0 (4 pins)" })).toBeVisible();
      await expect(answer.getByRole("heading", { name: "Teensy 4.1 (6 pins)" })).toBeVisible();
      await expect(answer.getByRole("link").first()).toContainText(/SDA|SCL/);
      await page.goto(theme === "light" ? "/?q=uno+rev.+3+sda" : "/?q=uno+rev+3+sda");
      answer = page.getByRole("region", { name: "Pin lookup", exact: true });
      await expect(answer.getByRole("heading", { name: /Arduino UNO Rev3/ })).toBeVisible();
      await expect(answer.getByRole("link").first()).toContainText("SDA");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

test("comparison voltage tolerance follows explicit board restrictions", async ({ page }) => {
  await page.goto("/compare?boards=raspberry-pi-pico,esp32-devkitc,arduino-uno-rev3,raspberry-pi-5");
  const row = page.getByRole("row", { name: /5 V tolerance/ });
  await expect(row).toContainText("NoNoYesNo");
});

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`lookup arrival identifies and reveals a right-header pin at ${viewport.width}`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    const index = await (await request.get("/api/pins")).json();
    const pin = index.find((board: { id: string }) => board.id === "esp32-c3-devkitm-1").pins.find((pin: { label: string }) => pin.label === "IO8");
    expect(pin).toBeTruthy();
    await page.goto(`/pinout/esp32-c3-devkitm-1?pin=${encodeURIComponent(pin.key)}`);
    const summary = page.getByRole("region", { name: "Selected pin", exact: true });
    await expect(summary).toBeInViewport();
    await expect(summary.getByRole("heading")).toContainText(`IO8 · Physical pin ${pin.position}`);
    await summary.getByRole("button", { name: "Show selected pin on diagram" }).click();
    const pad = page.locator(`.bv-pad[data-pin-key="${pin.key}"]`);
    await expect(pad).toBeFocused();
    await expect(pad).toBeInViewport();
    await expect(pad).toHaveAttribute("aria-pressed", "true");
    if (viewport.width < 500) expect(await page.getByRole("group", { name: /connector diagram/ }).evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  });
}

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 412, height: 915 }]) {
  test(`mobile detail clears measured sticky controls at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("textbox", { name: "Search boards" }).fill("DOIT ESP32");
    await page.getByRole("button", { name: /Show DOIT ESP32 DevKit V1/ }).click();
    const detail = page.getByRole("region", { name: /DOIT ESP32 DevKit V1.*details/ });
    await expect(detail).toBeFocused();
    await expect.poll(async () => {
      const bar = await page.locator("[data-sticky-header]").boundingBox();
      const back = await detail.getByRole("button", { name: "Back to results" }).boundingBox();
      return back!.y - (bar!.y + bar!.height);
    }).toBeGreaterThanOrEqual(8);
    await expect(detail.getByRole("heading", { name: /DOIT ESP32 DevKit V1/, level: 2 })).toBeInViewport();
  });
}

test("bench print retains pin signal names and wire endpoints", async ({ page }) => {
  await page.goto("/pinout/esp32-devkit-v1");
  await expect(page.getByRole("region", { name: "Before you wire" })).toContainText("never apply 5 V");
  await page.getByRole("group", { name: "Filter pins by category" }).getByRole("button", { name: "PWM", exact: true }).click();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("cell", { name: "D12", exact: true })).toBeVisible();
  const table = page.getByRole("table");
  await expect(table.locator("tbody tr")).toHaveCount(30);
  await expect(page.getByText("Connector orientation and notes")).toBeVisible();
  await expect(page.locator(".pin-print-reference")).toContainText("USB");
  expect(await table.evaluate((node) => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
  await page.goto("/link?a=arduino-uno-rev3&b=arduino-uno-rev3&bus=uart");
  await expect(page.getByRole("button", { name: /^Wire 1,/ })).toBeVisible();
});

test("light theme fallback interface labels have readable contrast", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pinhub.theme", "light"));
  await page.goto("/boards/raspberry-pi-5");
  const colors = await page.locator('.ph-iface[data-tone="default"]').evaluateAll((nodes) => nodes.map((node) => {
    const style = getComputedStyle(node);
    return { color: style.color, background: style.backgroundColor };
  }));
  expect(colors.length).toBeGreaterThan(0);
  for (const pair of colors) {
    const a = luminance(pair.color), b = luminance(pair.background);
    expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});
