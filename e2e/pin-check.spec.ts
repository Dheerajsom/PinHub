import { expect, test, type Page } from "@playwright/test";

// Every test fails on a console error, a React warning, or an uncaught page error.
let problems: string[] = [];

test.beforeEach(async ({ page }) => {
  problems = [];
  page.on("console", (message) => {
    if (message.type() === "error" || (message.type() === "warning" && /react|key|hydrat/i.test(message.text()))) {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
});

test.afterEach(() => {
  expect(problems, problems.join("\n")).toEqual([]);
});

function report(page: Page) {
  return page.getByRole("region", { name: "Check report" });
}

function editor(page: Page) {
  return page.getByRole("textbox", { name: "Your code" });
}

test("loads an example, reports the input-only relay, and links the pin across views", async ({ page }) => {
  await page.goto("/check");
  await page.getByRole("button", { name: /ESP32 weather station/ }).click();
  await expect(page).toHaveURL(/\/check\?board=esp32-devkitc$/);

  await expect(report(page).getByRole("heading", { name: "2 pins to fix" })).toBeVisible();
  const relay = report(page).getByRole("button", { name: /^IO34, Fix\./ });
  await expect(relay).toBeVisible();
  // Scoped to the report: the editor's hint carries the same words.
  await expect(report(page).locator(".ph-check-finding-title", { hasText: "Input-only pin" }).first()).toBeVisible();

  // Selecting a card selects the same pin in the strip and on the sheet.
  await relay.click();
  await expect(relay).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("list", { name: "Pins your code uses" }).getByRole("button", { name: "IO34, Fix" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".ph-check-readout")).toContainText("IO34");

  // The planner link claims the code's pins on the same board.
  const planner = page.getByRole("link", { name: "Open in planner" });
  await expect(planner).toHaveAttribute("href", /^\/planner\?board=esp32-devkitc&use=/);

  // The draft survives a reload in this tab.
  await page.reload();
  await expect(report(page).getByRole("heading", { name: "2 pins to fix" })).toBeVisible();
});

test("asks for a language it cannot detect, then checks once one is chosen", async ({ page }) => {
  await page.goto("/check?board=raspberry-pi-pico");
  await editor(page).fill("led = Pin(22)\nADC(Pin(22))");
  await expect(page.getByRole("heading", { name: "Which language is this?" })).toBeVisible();
  await page.getByRole("combobox", { name: "Code language" }).click();
  await page.getByRole("option", { name: "MicroPython" }).click();
  await expect(report(page).getByRole("heading", { name: "1 pin to fix" })).toBeVisible();
  await expect(report(page).locator(".ph-check-finding-title", { hasText: "No analog input here" })).toBeVisible();
});

test("never calls code clear when its only pin is not matched to the record", async ({ page }) => {
  // Regression: `pinMode(99, OUTPUT)` on an UNO read "All 0 pins match the record" in green.
  await page.goto("/check?board=arduino-uno-rev3");
  await editor(page).fill("void setup() {\n  pinMode(99, OUTPUT);\n}");
  const heading = report(page).getByRole("heading", { level: 2 });
  await expect(heading).toHaveText("The pin reference could not be checked");
  await expect(report(page).locator(".ph-check-summary")).toHaveAttribute("data-tone", "check");
  await expect(report(page).locator(".ph-check-tally")).toContainText("1 not matched");
  await expect(report(page).getByRole("heading", { level: 3, name: "Not matched to this board's record" })).toBeVisible();
  await expect(page.locator(".ph-check-mirror .ph-check-hint[data-status='missing']")).toHaveText("?99 · not matched to the record");
});

test("says so when a paste runs past 100,000 characters", async ({ page, context }) => {
  // Regression: the textarea's maxLength dropped the tail silently.
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/check?board=arduino-uno-rev3");
  const code = `void setup() { pinMode(13, OUTPUT); }\n${"// filler line\n".repeat(10_000)}`;
  expect(code.length).toBeGreaterThan(100_000);
  // A real paste: Playwright's fill types a text this long too slowly.
  await page.evaluate((text) => navigator.clipboard.writeText(text), code);
  await editor(page).focus();
  await page.keyboard.press("Control+v");
  await expect(page.getByRole("status").filter({ hasText: "The pasted code was cut at 100,000 characters. The rest was not checked." })).toBeVisible();
  await expect(report(page).getByRole("heading", { level: 2 })).toHaveText("Only part of the code was checked");
  expect(await editor(page).evaluate((element) => (element as HTMLTextAreaElement).value.length)).toBe(100_000);
});

test("says so when the code has more pin references than the scan records", async ({ page }) => {
  // Regression: references past the scanner's 400 cap were dropped silently,
  // so an input-only pin driven as an output on line 402 read as all clear.
  await page.goto("/check?board=esp32-devkitc");
  await editor(page).fill(`void setup() {\n${"  digitalWrite(13, HIGH);\n".repeat(400)}  pinMode(34, OUTPUT);\n}`);
  await expect(page.getByRole("status").filter({ hasText: "Only the first 400 pin references were checked. The rest of the code was not." })).toBeVisible();
  await expect(report(page).getByRole("heading", { level: 2 })).toHaveText("Only part of the code was checked");
  await expect(report(page).locator(".ph-check-summary")).toHaveAttribute("data-tone", "check");
});

test("indents a selection with Tab, keeps undo, and lets Escape then Tab leave", async ({ page }) => {
  await page.goto("/check?board=arduino-uno-rev3");
  const area = editor(page);
  await area.fill("pinMode(2, OUTPUT);\npinMode(3, OUTPUT);\nloop();");
  await area.evaluate((element) => (element as HTMLTextAreaElement).setSelectionRange(0, 25));
  await page.keyboard.press("Tab");
  await expect(area).toHaveValue("  pinMode(2, OUTPUT);\n  pinMode(3, OUTPUT);\nloop();");
  await page.keyboard.press("Shift+Tab");
  await expect(area).toHaveValue("pinMode(2, OUTPUT);\npinMode(3, OUTPUT);\nloop();");
  await page.keyboard.press("Control+z");
  await expect(area).toHaveValue("  pinMode(2, OUTPUT);\n  pinMode(3, OUTPUT);\nloop();");
  await page.keyboard.press("Control+z");
  await expect(area).toHaveValue("pinMode(2, OUTPUT);\npinMode(3, OUTPUT);\nloop();");

  // Clear keeps undo too.
  await page.getByRole("button", { name: "Clear the code" }).click();
  await expect(area).toHaveValue("");
  await page.keyboard.press("Control+z");
  await expect(area).toHaveValue("pinMode(2, OUTPUT);\npinMode(3, OUTPUT);\nloop();");

  await area.focus();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  await expect(area).not.toBeFocused();
});

test("keeps mirror, gutter and textarea in step on a long hinted sketch", async ({ page }) => {
  await page.goto("/check?board=arduino-uno-rev3");
  const lines = Array.from({ length: 40 }, (_, index) => `pinMode(${2 + (index % 12)}, OUTPUT); // ${index}`);
  await editor(page).fill(lines.join("\n"));
  await expect(page.locator(".ph-check-mirror .ph-check-hint").first()).toBeVisible();
  expect(await page.locator(".ph-check-mirror .ph-check-line:has(.ph-check-hint)").count()).toBeGreaterThanOrEqual(30);
  const drift = await page.evaluate(() => {
    const mirror = [...document.querySelectorAll(".ph-check-mirror .ph-check-line")];
    const gutter = [...document.querySelectorAll(".ph-check-gutter-line")];
    const lineHeight = parseFloat(getComputedStyle(document.querySelector(".ph-check-input")!).lineHeight);
    const input = document.querySelector(".ph-check-input")!;
    const area = input.getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(input).paddingTop);
    const last = mirror.length - 1;
    return {
      count: [mirror.length, gutter.length],
      gutter: mirror[last].getBoundingClientRect().top - gutter[last].getBoundingClientRect().top,
      textarea: mirror[last].getBoundingClientRect().top - (area.top + padding + last * lineHeight - input.scrollTop),
    };
  });
  expect(drift.count).toEqual([40, 40]);
  expect(Math.abs(drift.gutter)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(drift.textarea)).toBeLessThanOrEqual(0.5);
});

test("back and forward restore the board", async ({ page }) => {
  await page.goto("/check");
  await page.getByRole("button", { name: /ESP32 weather station/ }).click();
  await page.getByRole("button", { name: /^Change board, ESP32-DevKitC/ }).click();
  const search = page.getByRole("combobox", { name: "Board" });
  await expect(search).toBeFocused();
  await expect(page).toHaveURL(/\/check$/);
  await page.goBack();
  await expect(page).toHaveURL(/\?board=esp32-devkitc$/);
  await expect(page.getByRole("button", { name: /^Change board, ESP32-DevKitC/ })).toBeVisible();
  await expect(report(page).getByRole("heading", { name: "2 pins to fix" })).toBeVisible();
  await page.goForward();
  await expect(search).toBeVisible();
  await expect(page).toHaveURL(/\/check$/);
});

test("explains a board id it cannot check and removes it from the URL", async ({ page }) => {
  await page.goto("/check?board=no-such-board");
  const notice = page.getByRole("status").filter({ hasText: "can't be checked yet" });
  await expect(notice).toContainText("no-such-board");
  await expect(page).toHaveURL(/\/check$/);
  await notice.getByRole("button", { name: "Dismiss" }).click();
  await expect(notice).toHaveCount(0);
});

test("copies the report with the board name", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/check");
  await page.getByRole("button", { name: /ESP32 weather station/ }).click();
  await page.getByRole("button", { name: "Copy report" }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain("PinHub pin check: ESP32-DevKitC V4");
  expect(text).toContain("2 to fix");
});

for (const width of [1280, 390]) {
  test(`opens the language menu unclipped at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/check?board=raspberry-pi-pico");
    await page.getByRole("combobox", { name: "Code language" }).click();
    const list = page.getByRole("listbox", { name: "Code language" });
    await expect(list).toBeVisible();
    const box = await list.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    // Every option is hit-testable where it is drawn, so nothing clips it.
    for (const option of await list.getByRole("option").all()) {
      await option.scrollIntoViewIfNeeded();
      const optionBox = await option.boundingBox();
      const hit = await page.evaluate(
        ([x, y]) => document.elementFromPoint(x, y)?.closest("[role='option']")?.textContent ?? null,
        [optionBox!.x + optionBox!.width / 2, optionBox!.y + optionBox!.height / 2],
      );
      expect(hit).toBe(await option.textContent());
    }
  });
}

test("renders the light theme with its own colours", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/check?board=arduino-uno-rev3");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const dark = await page.locator(".ph-check-title").evaluate((element) => getComputedStyle(element).color);
  await page.getByRole("button", { name: "Use light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await editor(page).fill("void setup() { pinMode(13, OUTPUT); }");
  await expect(report(page).getByRole("heading", { level: 2 })).toHaveText("The pin matches the record");
  const light = await page.locator(".ph-check-title").evaluate((element) => getComputedStyle(element).color);
  expect(light).not.toBe(dark);
  const glyph = await page.locator(".ph-check-strip-pad span").first().evaluate((element) => getComputedStyle(element).color);
  expect(glyph).toBe("rgb(255, 255, 255)");
});

test.describe("pin check on a phone", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } });
  test("fits 360 px with 44 px controls", async ({ page }) => {
    await page.goto("/check");
    await page.getByRole("button", { name: /UNO lamp dimmer/ }).tap();
    await expect(report(page).getByRole("heading", { name: "2 pins to check" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    // Links inside a sentence are exempt (WCAG 2.5.8 inline exception); every control is checked.
    for (const control of await page.locator(".ph-check button:visible, .ph-check a:visible:not(.ph-check-link)").all()) {
      const box = await control.boundingBox();
      if (!box) continue;
      const name = (await control.getAttribute("aria-label")) ?? (await control.innerText());
      expect(Math.round(box.height), name).toBeGreaterThanOrEqual(44);
      // Icon-only buttons need the width too.
      if (!(await control.innerText()).trim() || /^[✕!✓?]$/.test((await control.innerText()).trim())) {
        expect(Math.round(box.width), name).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe("pin check sheet on a phone", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 800 } });
  test("scrolls the connector sheet to a pin selected from its card", async ({ page }) => {
    // Regression: the sheet stayed at its left edge, so a right-column pin
    // chosen from the report was selected off screen.
    await page.goto("/check");
    await page.getByRole("button", { name: /ESP32 weather station/ }).tap();
    await page.getByRole("button", { name: /^IO21, Clear\./ }).tap();
    const wrap = page.getByRole("group", { name: "Connector sheet, scrollable" });
    const pad = page.locator(".ph-check-sheet svg [aria-pressed=\"true\"]").first();
    await expect(pad).toBeAttached();
    await expect.poll(async () => {
      const box = await wrap.boundingBox();
      const padBox = await pad.boundingBox();
      return Boolean(box && padBox && padBox.x >= box.x && padBox.x + padBox.width <= box.x + box.width);
    }).toBe(true);
  });
});
