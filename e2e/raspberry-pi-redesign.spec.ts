import { devices, expect, test, type Page } from "@playwright/test";
import { boards } from "../src/lib/boards";

const viewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 844, height: 390 },
];
const primaryModels = [
  { id: "raspberry-pi-4-model-b", name: "Raspberry Pi 4 Model B", firstPin: "3V3" },
  { id: "raspberry-pi-5", name: "Raspberry Pi 5", firstPin: "3V3" },
  { id: "raspberry-pi-zero-2-w", name: "Raspberry Pi Zero 2 W", firstPin: "3V3" },
  { id: "raspberry-pi-pico-2-w", name: "Raspberry Pi Pico 2 W", firstPin: "GP0" },
  { id: "raspberry-pi-500", name: "Raspberry Pi 500", firstPin: "3V3" },
];
const otherModels = [
  "raspberry-pi-3-model-b-plus", "raspberry-pi-3-model-a-plus",
  "raspberry-pi-2-model-b", "raspberry-pi-1-model-b-plus",
  "raspberry-pi-zero-w", "raspberry-pi-zero", "raspberry-pi-pico",
  "raspberry-pi-pico-w", "raspberry-pi-pico-2", "raspberry-pi-400",
];

async function fitsViewport(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}

async function selectStatic(page: Page) {
  const tab = page.getByRole("tab", { name: "Static", exact: true });
  // A cold streamed page can expose tabs before their handlers hydrate.
  await expect(async () => {
    await tab.tap();
    await expect(tab).toHaveAttribute("aria-selected", "true");
  }).toPass();
}

async function expectStaticPinMap(page: Page, id: string) {
  const reference = page.getByRole("tabpanel", { name: "Static", exact: true });
  const pins = boards.find((board) => board.id === id)!.pinout!.pins!;
  const ordered = pins.left.flatMap((left, index) => [left, pins.right[index]]);
  const pads = reference.locator('span[aria-label^="Pin "]');
  await expect(pads).toHaveCount(ordered.length);
  await expect(pads).toHaveText(ordered.map((pin) => String(pin.position)));
  expect(await pads.evaluateAll((elements) => elements.every((element) => element.classList.contains("rounded-full")))).toBe(true);
  await expect(reference.locator(".pi-workbench, .pi-canvas, .bv-stage-wrap, svg[role='img']")).toHaveCount(0);
  await expect(reference.getByLabel("Pin role legend")).toBeVisible();
  const signals = reference.locator("span.font-mono");
  await expect(signals).toHaveText(ordered.map((pin) => pin.label));
  expect(await signals.evaluateAll((elements) => elements.every((element) => element.scrollWidth <= element.clientWidth))).toBe(true);
  // Preserve physical pairs: Pico is 1/40, 2/39; GPIO is 1/2, 3/4.
  const bounds = await pads.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y };
  }));
  for (let index = 0; index < bounds.length; index += 2) {
    expect(bounds[index].x).toBeLessThan(bounds[index + 1].x);
    expect(Math.abs(bounds[index].y - bounds[index + 1].y)).toBeLessThan(1);
    if (index > 0) expect(bounds[index].y).toBeGreaterThan(bounds[index - 2].y);
  }
  return reference;
}

for (const viewport of viewports) {
  test.describe(`Raspberry Pi at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, isMobile: true, hasTouch: true, userAgent: devices["Pixel 5"].userAgent,
      permissions: ["clipboard-read", "clipboard-write"] });

    for (const model of primaryModels) {
      test(`${model.name} reference and interactive workflows`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(`/boards/${model.id}`);
        await selectStatic(page);
        const reference = await expectStaticPinMap(page, model.id);
        await fitsViewport(page);
        await reference.scrollIntoViewIfNeeded();
        await page.screenshot({ path: testInfo.outputPath("static.png"), scale: "css", animations: "disabled" });
        await reference.getByRole("button", { name: `Copy pin 1, ${model.firstPin}`, exact: true }).tap();
        await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain(`Pin 1: ${model.firstPin}`);
        await reference.getByRole("button", { name: "Copy pin table as Markdown" }).tap();
        await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain(model.firstPin);
        await page.getByRole("tab", { name: "Dynamic", exact: true }).tap();
        const interactive = page.getByRole("region", { name: `${model.name} dynamic pinout`, exact: true });
        const picker = interactive.getByRole("combobox", { name: "Select physical pin" });
        await picker.selectOption({ index: 1 });
        await expect(interactive.getByRole("button", { name: `Copy pin 1, ${model.firstPin}`, exact: true })).toBeVisible();
        await interactive.getByRole("button", { name: "Clear selection", exact: true }).tap();
        await interactive.getByRole("button", { name: /^Pin 1,/ }).tap();
        await expect(interactive.getByRole("button", { name: /^Pin 1,/ })).toHaveAttribute("aria-pressed", "true");
        await expect(picker).not.toHaveValue("");
        await interactive.getByRole("button", { name: "Zoom board", exact: true }).tap();
        await expect(interactive.getByRole("button", { name: "Fit board", exact: true })).toBeVisible();
        await fitsViewport(page);
        await interactive.getByRole("button", { name: "Fit board", exact: true }).tap();
        await interactive.getByRole("button", { name: /^Power —/ }).tap();
        await expect(interactive.getByRole("button", { name: "Show all roles", exact: true })).toBeVisible();
        await interactive.getByRole("button", { name: "Show all roles", exact: true }).tap();
        await interactive.scrollIntoViewIfNeeded();
        await page.screenshot({ path: testInfo.outputPath("dynamic.png"), scale: "css", animations: "disabled" });
        const inspect = interactive.getByRole("button", { name: "Inspect", exact: true });
        await inspect.tap();
        const dialog = page.getByRole("dialog", { name: `${model.name} pinout inspector` });
        await expect(dialog.getByRole("button", { name: "Close inspector" })).toBeFocused();
        await fitsViewport(page);
        await page.screenshot({ path: testInfo.outputPath("inspector.png"), scale: "css", animations: "disabled" });
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(inspect).toBeFocused();
        await page.getByRole("tab", { name: "Dynamic", exact: true }).focus();
        await page.keyboard.press("ArrowLeft");
        await expect(page.getByRole("tab", { name: "Static", exact: true })).toHaveAttribute("aria-selected", "true");
        expect(errors).toEqual([]);
      });
    }
  });
}

test.describe("remaining Raspberry Pi models", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: devices["Pixel 5"].userAgent });
  for (const id of otherModels) {
    test(`${id} has source-derived static and dynamic pins`, async ({ page }) => {
      await page.goto(`/boards/${id}`);
      await selectStatic(page);
      await expectStaticPinMap(page, id);
      await fitsViewport(page);
      await page.getByRole("tab", { name: "Dynamic", exact: true }).tap();
      await expect(page.getByRole("combobox", { name: "Select physical pin" }).locator("option")).toHaveCount(41);
      await page.getByRole("combobox", { name: "Select physical pin" }).selectOption({ index: 40 });
      await expect(page.getByRole("button", { name: /^Copy pin 40,/ })).toBeVisible();
      await fitsViewport(page);
    });
  }
});

test("compact non-Pi physical pin map keeps signal names readable", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/boards/esp32-devkit-v1");
  await page.getByRole("tab", { name: "Static", exact: true }).click();
  await expectStaticPinMap(page, "esp32-devkit-v1");
  await fitsViewport(page);
});

test("catalog inline Pi pinout and full inspector share the artwork", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Show Raspberry Pi 5 details", exact: true }).click();
  await page.getByRole("tab", { name: "Static", exact: true }).click();
  await expectStaticPinMap(page, "raspberry-pi-5");
  await fitsViewport(page);
  await page.getByRole("tab", { name: "Dynamic", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Select physical pin" })).toBeVisible();
  await fitsViewport(page);
  await page.getByRole("link", { name: "Open the Raspberry Pi 5 full pinout", exact: true }).click();
  await expect(page).toHaveURL(/\/pinout\/raspberry-pi-5/);
  await expect(page.getByRole("button", { name: /^Pin 1,/ })).toBeVisible();
  await expect(page.locator(".bv-stage-wrap").getByText("BCM2712", { exact: true })).toBeVisible();
  await fitsViewport(page);
  await page.screenshot({ path: testInfo.outputPath("full-inspector.png"), scale: "css", animations: "disabled" });
});

test("desktop dynamic readout sits beside artwork in both themes with keyboard pin selection", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/boards/raspberry-pi-4-model-b");
  await page.getByRole("tab", { name: "Dynamic", exact: true }).click();
  const pin = page.getByRole("button", { name: /^Pin 1,/ });
  await pin.focus();
  await page.keyboard.press("Enter");
  await expect(pin).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Clear selection" })).toBeVisible();
  const canvas = await page.locator(".pi-canvas").boundingBox();
  const readout = await page.locator(".pi-readout").boundingBox();
  expect(readout!.x).toBeGreaterThan(canvas!.x);
  await page.locator(".pi-workbench").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("desktop-light.png"), scale: "css", animations: "disabled" });
  await page.getByRole("button", { name: "Use dark theme", exact: true }).click();
  await page.locator(".pi-workbench").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("desktop-dark.png"), scale: "css", animations: "disabled" });
  await fitsViewport(page);
});
