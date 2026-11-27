import { expect, test } from "@playwright/test";

// A pad that the layout slides under a resting pointer must not take over the
// readout. It used to: the readout changed height, the diagram below it moved,
// the pad slid back out, and the page shook every frame (it timed out the
// 844x390 Raspberry Pi workflow in CI). Only a pointer that moves previews.
// Below the xl breakpoint, where the detail panel scrolls with the page.
test.use({ viewport: { width: 1200, height: 800 } });

test("a pad scrolled under a resting pointer leaves the readout alone", async ({ page }) => {
  const name = "Raspberry Pi Zero 2 W";
  await page.goto(`/?${new URLSearchParams({ q: name })}`);
  await page.getByRole("button", { name: `Show ${name} details`, exact: true }).click();
  const interactive = page.getByRole("region", { name: `${name} dynamic pinout`, exact: true });
  const connector = interactive.getByRole("group", { name: "Select a physical pin from the connector" });
  await connector.getByRole("button", { name: /^Pin 40,/ }).click();
  const readout = interactive.locator(".pi-readout .pin-readout");
  await expect(readout).toContainText("GPIO21");

  const diagram = interactive.getByRole("group", { name: "Connector diagram, zoomable" });
  const pad = diagram.getByRole("button", { name: /^Pin 36,/ });
  await pad.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  const box = (await pad.boundingBox())!;
  const x = box.x + box.width / 2;
  // Rest the pointer above the pad, on no pad at all, then scroll the pad up
  // under it.
  const shift = await page.evaluate(([px, py]) => {
    for (let dy = 60; dy < py - 20; dy += 8) {
      const under = document.elementFromPoint(px, py - dy);
      if (under && !under.closest("[data-pin-key]")) return dy;
    }
    return 0;
  }, [x, box.y + box.height / 2] as const);
  expect(shift).toBeGreaterThan(0);
  const y = box.y + box.height / 2 - shift;
  await page.mouse.move(x, y);
  await expect(readout).toContainText("GPIO21");
  await page.evaluate((dy) => window.scrollBy({ top: dy, behavior: "instant" }), shift);
  await expect.poll(() => page.evaluate(([px, py]) => {
    const hit = document.elementFromPoint(px, py)?.closest("[aria-label]");
    return hit?.getAttribute("aria-label")?.startsWith("Pin 36,") ?? false;
  }, [x, y] as const)).toBe(true);
  // Give the browser frames to send its synthetic hover, then check.
  await page.evaluate(() => new Promise((done) => setTimeout(done, 400)));
  await expect(readout).toContainText("GPIO21");
  await expect(readout).not.toContainText("GPIO16");

  // A real move onto the pad still previews it.
  await page.mouse.move(4, 4);
  await page.mouse.move(x, y, { steps: 4 });
  await expect(readout).toContainText("GPIO16");
});
