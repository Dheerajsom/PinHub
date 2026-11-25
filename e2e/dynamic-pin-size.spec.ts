import { expect, test, type Locator } from "@playwright/test";

// Check inside the scrollport before clicking. Playwright's automatic scroll
// on click would otherwise conceal a diagram that opens on empty space.
async function expectTappableInsideMap(pad: Locator) {
  await expect.poll(() => pad.evaluate(node => {
    const viewport = node.closest(".board-view-scroll")!;
    const box = viewport.getBoundingClientRect();
    const hit = node.querySelector('circle[fill="transparent"]')!.getBoundingClientRect();
    const left = box.left + viewport.clientLeft;
    const top = box.top + viewport.clientTop;
    return hit.width >= 44 && hit.height >= 44 &&
      hit.left >= left - 1 && hit.right <= left + viewport.clientWidth + 1 &&
      hit.top >= top - 1 && hit.bottom <= top + viewport.clientHeight + 1;
  })).toBe(true);
}

test.use({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
for (const name of ["Orange Pi 5", "Arduino UNO Rev3", "Adafruit Feather RP2040", "BeagleBone Black", "Raspberry Pi 5"]) {
  test(`${name} fits the whole board, then reveals touch-sized picker selections`, async ({ page }) => {
    await page.goto(`/?${new URLSearchParams({ q: name })}`);
    await page.getByRole("button", { name: `Show ${name} details`, exact: true }).tap();
    await page.getByRole("tab", { name: "Dynamic" }).tap();
    const map = page.getByRole("tabpanel", { name: "Dynamic" });
    const frame = map.locator("[data-board-view]");
    await expect(frame).toHaveAttribute("data-board-view", "fit");
    const viewport = map.locator(".board-view-scroll");
    expect(await viewport.evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    await map.getByRole("button", { name: "Zoom to touch size" }).tap();
    const pads = map.locator(".bv-pad");
    await expectTappableInsideMap(pads.first());
    await pads.first().tap();
    await expect(pads.first()).toHaveAttribute("aria-pressed", "true");
    const picker = map.getByRole("combobox").first();
    const key = await picker.locator("option").last().getAttribute("value");
    await picker.selectOption(key!);
    const selected = map.locator('.bv-pad[aria-pressed="true"]');
    await expect(selected).toHaveAttribute("data-pin-key", key!);
    await expectTappableInsideMap(selected);
    // Connector diagrams zoom inside their own canvas and fit back to the diagram.
    const fit = map.getByRole("button", { name: /^Fit (whole board|diagram)$/ });
    await fit.tap();
    await expect(frame).toHaveAttribute("data-board-view", "fit");
    await map.getByRole("button", { name: "Zoom to touch size" }).tap();
    await expectTappableInsideMap(selected);
  });
}

test("a connector diagram zooms with the buttons and pans with a finger", async ({ page }) => {
  await page.goto("/boards/stm32-nucleo-h753zi");
  const canvas = page.getByRole("group", { name: "Connector diagram, zoomable" });
  await expect(canvas).toHaveAttribute("data-board-view", "fit");
  const viewBox = () => canvas.locator("svg").getAttribute("viewBox").then(v => v!.split(" ").map(Number));
  const fitBox = await viewBox();
  await page.getByRole("button", { name: "Zoom in" }).tap();
  await page.getByRole("button", { name: "Zoom in" }).tap();
  await expect(canvas).toHaveAttribute("data-board-view", "zoomed");
  const zoomed = await viewBox();
  expect(zoomed[2]).toBeLessThan(fitBox[2]);
  // Once zoomed, the canvas takes the gesture instead of the page.
  expect(await canvas.evaluate(node => getComputedStyle(node).touchAction)).toBe("none");
  const box = (await canvas.boundingBox())!;
  const scroll = await page.evaluate(() => window.scrollY);
  await canvas.dispatchEvent("pointerdown", { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: box.x + 200, clientY: box.y + 200, button: 0 });
  await canvas.dispatchEvent("pointermove", { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: box.x + 120, clientY: box.y + 120, button: 0 });
  await canvas.dispatchEvent("pointerup", { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: box.x + 120, clientY: box.y + 120, button: 0 });
  const panned = await viewBox();
  expect(panned[0]).toBeGreaterThan(zoomed[0]);
  expect(panned[1]).toBeGreaterThan(zoomed[1]);
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  await page.getByRole("button", { name: "Fit diagram" }).tap();
  expect(await viewBox()).toEqual(fitBox);
});

test("a finger swiped across the whole connector diagram scrolls the page", async ({ page }) => {
  await page.goto("/boards/stm32-nucleo-h753zi");
  const canvas = page.getByRole("group", { name: "Connector diagram, zoomable" });
  await expect(canvas).toHaveAttribute("data-board-view", "fit");
  await canvas.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
  for (const name of ["Zoom out", "Zoom in"]) {
    const control = (await page.getByRole("button", { name, exact: true }).boundingBox())!;
    expect(control.width).toBeGreaterThanOrEqual(44);
    expect(control.height).toBeGreaterThanOrEqual(44);
  }
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2;
  const before = await page.evaluate(() => window.scrollY);
  // A real touch sequence, so the browser's own pan and scroll chaining decide.
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", y: number) => cdp.send("Input.dispatchTouchEvent", {
    type, touchPoints: type === "touchEnd" ? [] : [{ x, y }],
  });
  await touch("touchStart", box.y + box.height * 0.8);
  for (let step = 1; step <= 10; step++) await touch("touchMove", box.y + box.height * (0.8 - step * 0.05));
  await touch("touchEnd", 0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 50);
  await expect(canvas).toHaveAttribute("data-board-view", "fit");
});
