import { expect, type Locator } from "@playwright/test";

type ParsedColor = { space: string; channels: number[] };

function parseColor(value: string): ParsedColor | null {
  const match = /^([a-z]+)\((.*)\)$/i.exec(value.trim());
  if (!match) return null;
  const channels = match[2].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (channels.some(Number.isNaN)) return null;
  return { space: match[1].toLowerCase(), channels };
}

/**
 * Chrome serializes `lab()`/`oklch()` colours with float noise that differs by
 * platform (Windows and Linux disagree in the fifth decimal), so compare
 * channels numerically instead of as strings. Polls, so a colour `transition`
 * after a theme flip settles before the check fails.
 */
export async function expectColor(
  locator: Locator,
  expected: string,
  { property = "color", tolerance = 0.01 }: { property?: string; tolerance?: number } = {},
) {
  const want = parseColor(expected);
  if (!want) throw new Error(`Unparseable expected colour: ${expected}`);
  await expect
    .poll(async () => {
      const actual = await locator.evaluate(
        (element, name) => getComputedStyle(element).getPropertyValue(name),
        property,
      );
      const got = parseColor(actual);
      const matches =
        got !== null &&
        got.space === want.space &&
        got.channels.length === want.channels.length &&
        got.channels.every((channel, index) => Math.abs(channel - want.channels[index]) <= tolerance);
      return matches ? expected : actual;
    }, { message: `${property} ≈ ${expected} (±${tolerance})` })
    .toBe(expected);
}
