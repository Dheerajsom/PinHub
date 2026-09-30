import { expect, test } from "@playwright/test";

test("lazy lookup opens a ringed pin and round-trips role selection", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/pins")) requests.push(request.url()); });
  await page.goto("/");
  const search = page.getByRole("textbox", { name: "Search boards" });
  await search.fill("RP2040");
  await expect(page.getByRole("region", { name: "Pin lookup" })).toHaveCount(0);
  expect(requests).toHaveLength(0);
  await search.fill("pico sda");
  const answer = page.getByRole("region", { name: "Pin lookup" });
  await expect(answer.getByRole("link").first()).toBeVisible();
  await answer.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/pinout\/raspberry-pi-pico\?pin=/);
  await expect(page.locator('svg [role="button"][aria-pressed="true"]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('svg [role="button"][aria-pressed="true"]')).toHaveCount(1);
  const role = page.getByRole("group", { name: "Highlight pins by role" }).getByRole("button", { name: /^I2C/ });
  await role.click();
  await expect(page).toHaveURL(/\?role=i2c$/);
  await page.reload();
  await expect(role).toHaveAttribute("aria-pressed", "true");
  expect((await role.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.goBack();
  await expect(page).toHaveURL(/\?pin=/);
});

test.describe("pin lookup touch controls", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("role links remain at least 44px on coarse pointers", async ({ page }) => {
    await page.goto("/pinout/raspberry-pi-pico?role=i2c");
    const role = page.getByRole("group", { name: "Highlight pins by role" }).getByRole("button", { name: /^I2C/ });
    await expect(role).toHaveAttribute("aria-pressed", "true");
    const box = await role.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  });
});
