import { expect, test, type Locator, type Page } from "@playwright/test";
import { boards } from "../src/lib/boards";
import { verificationSourceFor } from "../src/lib/source-trust";
import { expectColor } from "./color";

const pi5 = boards.find((board) => board.id === "raspberry-pi-5")!;
const pi5Source = verificationSourceFor(pi5)!.url;
const issueFormUrl = "https://github.com/Dheerajsom/PinHub/issues/new";
const pinReportName = "Report an error in pin 12 GPIO18 (opens GitHub in a new tab)";

// Neutral utility ink: zinc-400 on charcoal, the slate override on paper.
// Never the probe's cyan or the caution orange.
const reportInk = {
  dark: "lab(65.6464 1.53494 -5.42429)",
  light: "rgb(68, 84, 93)",
} as const;

async function setTheme(page: Page, theme: "dark" | "light") {
  await page.locator("html").evaluate((element, value) => {
    element.setAttribute("data-theme", value);
  }, theme);
}

async function reportQuery(link: Locator) {
  const href = await link.getAttribute("href");
  const url = new URL(href ?? "");
  expect(`${url.origin}${url.pathname}`).toBe(issueFormUrl);
  expect(url.searchParams.get("template")).toBe("pin-data-error.yml");
  return url.searchParams;
}

async function expectExternalLink(link: Locator) {
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  const box = await link.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
}

for (const theme of ["dark", "light"] as const) {
  test.describe(`pin error reports (${theme} theme)`, () => {
    test("a pinned pin on the full pinout links to a pre-filled issue", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/pinout/raspberry-pi-5");
      await setTheme(page, theme);

      const report = page.getByRole("link", { name: pinReportName });
      await expect(report).toHaveCount(0);
      // A cold dev page can render the table before its handlers hydrate, so
      // retry the selection (without toggling an already-pinned row back off).
      const unselect = page.getByRole("button", { name: "Unselect pin 12, GPIO18", exact: true });
      await expect(async () => {
        if ((await unselect.count()) === 0) {
          await page.getByRole("button", { name: "Select pin 12, GPIO18", exact: true }).click();
        }
        await expect(report).toBeVisible({ timeout: 1000 });
      }).toPass();

      const query = await reportQuery(report);
      expect(query.get("title")).toBe("Pin data: Raspberry Pi 5 pin 12 (GPIO18)");
      expect(query.get("board")).toBe("raspberry-pi-5");
      expect(query.get("pin")).toBe("12 · GPIO18");
      expect(query.get("connector")).toBe(pi5.pinout!.connector);
      expect(query.get("pinhub_source")).toBe(pi5Source);
      await expectExternalLink(report);
      await expectColor(report, reportInk[theme]);
      expect(errors).toEqual([]);
    });

    test("the Raspberry Pi workbench and board page offer both report links", async ({ page }) => {
      await page.goto("/boards/raspberry-pi-5");
      await setTheme(page, theme);

      const cautions = page.getByRole("region", { name: "Before you wire" });
      const boardReport = cautions.getByRole("link", { name: /Report a data error/ });
      const boardQuery = await reportQuery(boardReport);
      expect(boardQuery.get("title")).toBe("Board data: Raspberry Pi 5");
      expect(boardQuery.get("board")).toBe("raspberry-pi-5");
      expect(boardQuery.has("pin")).toBe(false);
      expect(boardQuery.get("pinhub_source")).toBe(pi5Source);
      await expectExternalLink(boardReport);
      await expectColor(boardReport, reportInk[theme]);

      const workbench = page.getByRole("region", { name: "Raspberry Pi 5 dynamic pinout" });
      const dynamicTab = page.getByRole("tab", { name: "Dynamic", exact: true });
      await expect(async () => {
        await dynamicTab.click();
        await expect(dynamicTab).toHaveAttribute("aria-selected", "true");
      }).toPass();
      const picker = workbench.getByRole("combobox", { name: "Select physical pin" });
      await expect(async () => {
        await picker.selectOption({ label: "12 · GPIO18 / PWM0" });
        await expect(workbench.getByRole("link", { name: pinReportName })).toBeVisible();
      }).toPass();
      const pinQuery = await reportQuery(workbench.getByRole("link", { name: pinReportName }));
      expect(pinQuery.get("pin")).toBe("12 · GPIO18");
      expect(pinQuery.get("pinhub_source")).toBe(pi5Source);
    });
  });
}

test("the catalog detail panel offers the board-level report", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const search = page.getByRole("textbox", { name: "Search boards" });
  await search.fill("Raspberry Pi 5");
  await search.press("Enter");
  const panel = page.getByRole("complementary").filter({
    has: page.getByRole("heading", { name: "Raspberry Pi 5", exact: true }),
  });
  const report = panel.getByRole("link", { name: /Report a data error/ });
  await expect(async () => {
    const query = await reportQuery(report);
    expect(query.get("board")).toBe("raspberry-pi-5");
  }).toPass();
});
