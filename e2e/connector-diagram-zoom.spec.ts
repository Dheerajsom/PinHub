import { expect, test } from "@playwright/test";

// Connector diagrams zoom with the mouse wheel and pan with a drag of any
// button, the way PCB tools do. The page must not scroll while that happens.
test.use({ viewport: { width: 1280, height: 900 } });

test("the Nucleo-144 connector diagram zooms with the wheel and pans with the right button", async ({ page }) => {
  await page.goto("/boards/stm32-nucleo-h753zi");
  const canvas = page.getByRole("group", { name: "Connector diagram, zoomable" });
  await page.waitForLoadState("networkidle");
  await expect(canvas).toHaveAttribute("data-board-view", "fit");
  await canvas.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
  const viewBox = () => canvas.locator("svg").getAttribute("viewBox").then(v => v!.split(" ").map(Number));
  const fit = await viewBox();
  const box = (await canvas.boundingBox())!;
  const scroll = await page.evaluate(() => window.scrollY);

  const px = box.x + box.width * 0.3;
  const py = box.y + box.height * 0.4;
  const sheetPoint = (vb: number[]) => [vb[0] + (px - box.x) / box.width * vb[2], vb[1] + (py - box.y) / box.height * vb[3]];
  const before = sheetPoint(fit);
  await page.mouse.move(px, py);
  for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -120);
  await expect(canvas).toHaveAttribute("data-board-view", "zoomed");
  const zoomed = await viewBox();
  expect(zoomed[2]).toBeLessThan(fit[2] / 1.5);
  // The point under the pointer stays put.
  const after = sheetPoint(zoomed);
  expect(Math.abs(after[0] - before[0])).toBeLessThan(fit[2] * 0.01);
  expect(Math.abs(after[1] - before[1])).toBeLessThan(fit[3] * 0.01);

  await page.mouse.down({ button: "right" });
  await page.mouse.move(px - 120, py - 160, { steps: 6 });
  await page.mouse.up({ button: "right" });
  const panned = await viewBox();
  expect(panned[0]).toBeGreaterThan(zoomed[0]);
  expect(panned[1]).toBeGreaterThan(zoomed[1]);
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);

  // A plain click on a visible pad still selects it.
  const pad = canvas.locator(".bv-pad").filter({ has: page.locator("circle") });
  const target = await pad.evaluateAll((pads, rect) => {
    const inside = pads.find(node => {
      const hit = node.getBoundingClientRect();
      return hit.left > rect.x + 10 && hit.right < rect.x + rect.width - 10 && hit.top > rect.y + 10 && hit.bottom < rect.y + rect.height - 10;
    });
    return inside?.getAttribute("data-pin-key") ?? null;
  }, box);
  expect(target).toBeTruthy();
  const visible = canvas.locator(`.bv-pad[data-pin-key="${target}"]`);
  await visible.click();
  await expect(visible).toHaveAttribute("aria-pressed", "true");

  // Wheel out returns to the whole diagram, then hands the wheel back to the page.
  await page.mouse.move(px, py);
  for (let i = 0; i < 20; i++) await page.mouse.wheel(0, 240);
  await expect(canvas).toHaveAttribute("data-board-view", "fit");
});
