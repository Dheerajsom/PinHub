import { devices, expect, test, type Page } from "@playwright/test";

// Mobile audit 2026-11-26: once zoomed to touch size, the pin map was a
// second vertical scroller (up to 440 px tall, 215 px in landscape) that
// captured every vertical swipe, so the page could only be scrolled from the
// thin gutters beside it. The zoomed map now pans sideways only.

async function swipe(page: Page, settleMs: number, from: { x: number; y: number }, to: { x: number; y: number }) {
  // Real touch input, so the browser's own scroll latching and chaining decide.
  const cdp = await page.context().newCDPSession(page);
  const point = (p: { x: number; y: number }) => [{ x: Math.round(p.x), y: Math.round(p.y) }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(from) });
  for (let step = 1; step <= 10; step++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: point({ x: from.x + ((to.x - from.x) * step) / 10, y: from.y + ((to.y - from.y) * step) / 10 }),
    });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(settleMs); // let a fling settle before the next gesture
}

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, isMobile: true, hasTouch: true, userAgent: devices["Pixel 5"].userAgent });

    test("a vertical swipe on the zoomed pin map scrolls the page, a sideways one pans the map", async ({ page }) => {
      await page.goto("/boards/raspberry-pi-pico");
      await page.getByRole("button", { name: "Zoom to touch size" }).tap();
      const map = page.locator(".board-view-scroll[data-zoomed]");
      await expect(map).toBeVisible();

      // The drawing keeps its full height: nothing to scroll vertically inside it.
      const inner = await map.evaluate((node) => ({
        overflowY: getComputedStyle(node).overflowY,
        vertical: node.scrollHeight - node.clientHeight,
        horizontal: node.scrollWidth - node.clientWidth,
      }));
      expect(inner.overflowY).toBe("hidden");
      expect(inner.vertical).toBeLessThanOrEqual(1);
      expect(inner.horizontal).toBeGreaterThan(0);

      // Zooming brought a pad into view, so part of the map is on screen.
      await map.evaluate((node) => node.scrollIntoView({ block: "start", behavior: "instant" }));
      const box = (await map.boundingBox())!;
      const top = Math.max(box.y, 0) + 20;
      const bottom = Math.min(box.y + box.height, viewport.height) - 20;
      const x = box.x + box.width / 2;

      const before = await page.evaluate(() => window.scrollY);
      await swipe(page, 1300, { x, y: bottom }, { x, y: top });
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 40);
      expect(await map.evaluate((node) => node.scrollTop)).toBe(0);

      await map.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
      const centred = (await map.boundingBox())!;
      const y = Math.max(Math.min(centred.y + centred.height / 2, viewport.height - 40), 40);
      // Take the page baseline only once any momentum from the first swipe stops.
      let pageY = -1;
      await expect.poll(async () => {
        const now = await page.evaluate(() => window.scrollY);
        const settled = now === pageY;
        pageY = now;
        return settled;
      }, { intervals: [300] }).toBe(true);
      const left = await map.evaluate((node) => node.scrollLeft);
      await swipe(page, 1300, { x: centred.x + centred.width * 0.8, y }, { x: centred.x + centred.width * 0.2, y });
      await expect.poll(() => map.evaluate((node) => node.scrollLeft)).toBeGreaterThan(left + 20);
      expect(Math.abs((await page.evaluate(() => window.scrollY)) - pageY)).toBeLessThanOrEqual(2);
    });
  });
}
