import { expect, test, type Page } from "@playwright/test";
import snapshots from "../src/lib/board-prices.json";

// Keep fixture observations newer than a real shared snapshot used by local SSR.
const initialTime = Date.now() + 60 * 60 * 1000;
async function mockPrices(page: Page) {
  await page.clock.install({ time: new Date(initialTime) });
  let amount = 12000;
  let checkedAt = new Date(initialTime).toISOString();
  let failure = false;
  let requests = 0;
  await page.route("**/api/prices", async (route) => {
    requests++;
    if (failure) return route.fulfill({ status: 503, body: "Unavailable" });
    return route.fulfill({ json: { source: "shared", snapshot: {
      schemaVersion: 1, generatedAt: checkedAt,
      prices: snapshots.map((price, i) => ({ ...price, amount: i === 0 ? amount : price.amount, checkedAt })),
    } } });
  });
  return {
    update() { amount = 11900; checkedAt = new Date(initialTime + 60_000).toISOString(); },
    fail() { failure = true; },
    requests: () => requests,
  };
}

test("prices refresh without resetting filters, focus, or the last successful observation", async ({ page }) => {
  const feed = await mockPrices(page);
  await page.goto("/prices?board=raspberry-pi-5&sort=price-asc");
  const row = page.locator("#adafruit-5812");
  await expect(row.getByText("$120.00", { exact: true })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search board prices" });
  await search.fill("4 GB");
  feed.update();
  await page.clock.fastForward(60_000);
  await expect(row.getByText("$119.00", { exact: true })).toBeVisible();
  await expect(search).toHaveValue("4 GB");
  await expect(search).toBeFocused();
  await expect(page).toHaveURL(/board=raspberry-pi-5/);
  const check = await row.locator("time").getAttribute("datetime");
  feed.fail();
  await page.clock.fastForward(60_000);
  await expect(page.getByText("Reference prices · updates unavailable", { exact: true })).toBeVisible();
  await expect(row.getByText("$119.00", { exact: true })).toBeVisible();
  await expect(row.locator("time")).toHaveAttribute("datetime", check!);
});

test("board detail and comparison prices update through one shared feed per page", async ({ page }) => {
  const feed = await mockPrices(page);
  await page.goto("/boards/raspberry-pi-5");
  await expect.poll(feed.requests, { timeout: 15_000 }).toBeGreaterThan(0);
  await expect(page.getByText("$120.00 · Adafruit", { exact: true })).toBeVisible({ timeout: 15_000 });
  feed.update();
  await page.clock.fastForward(60_000);
  await expect(page.getByText("$119.00 · Adafruit", { exact: true })).toBeVisible();
  await page.goto("/compare?boards=raspberry-pi-5,raspberry-pi-pico");
  await expect(page.getByRole("link", { name: "$119.00 at Adafruit (opens in a new tab)", exact: true }).last()).toBeVisible();
  // Two comparison layouts plus all time labels share a single browser request.
  expect(feed.requests()).toBe(3);
});

test("corrupt price responses leave safe dated prices and show unavailable status", async ({ page }) => {
  await page.route("**/api/prices", (route) => route.fulfill({ json: { source: "shared", snapshot: { schemaVersion: 999 } } }));
  await page.goto("/prices");
  await expect(page.getByText("Reference prices · updates unavailable", { exact: true })).toBeVisible();
  await expect(page.locator("#adafruit-5812").getByText(/\$\d/)).toBeVisible();
});
