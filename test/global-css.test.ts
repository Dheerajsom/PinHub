import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

/** Top-level rules outside any `@layer` block, as selector and declarations. */
function unlayeredRules(source: string): Array<{ selectors: string[]; body: string }> {
  const rules: Array<{ selectors: string[]; body: string }> = [];
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "");
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf("{", index);
    if (open === -1) break;
    const prelude = text.slice(index, open).split(";").at(-1)!.trim();
    // Find the matching close brace so nested blocks are skipped whole.
    let depth = 1;
    let close = open + 1;
    while (depth > 0 && close < text.length) {
      if (text[close] === "{") depth += 1;
      else if (text[close] === "}") depth -= 1;
      close += 1;
    }
    if (!prelude.startsWith("@")) {
      rules.push({ selectors: prelude.split(",").map((part) => part.trim()), body: text.slice(open + 1, close - 1) });
    }
    index = close;
  }
  return rules;
}

/** [start, end) offsets of every `@layer … { … }` block. */
function layerRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const found of text.matchAll(/@layer\b[^;{]*\{/g)) {
    let depth = 1;
    let index = found.index + found[0].length;
    while (depth > 0 && index < text.length) {
      if (text[index] === "{") depth += 1;
      else if (text[index] === "}") depth -= 1;
      index += 1;
    }
    ranges.push([found.index, index]);
  }
  return ranges;
}

describe("global stylesheet", () => {
  it("leaves button and input text sizes to their utilities", () => {
    // An unlayered `button { font: inherit }` outranks every layered Tailwind
    // utility, so `text-xs` on a button silently rendered at 16 px.
    const fontResets = unlayeredRules(css).filter(
      ({ selectors, body }) =>
        selectors.some((selector) => selector === "button" || selector === "input") &&
        /(^|[\s;])font(-size)?\s*:/.test(body),
    );
    expect(fontResets).toEqual([]);
  });

  it("keeps text fields at 16 px on touch screens so iOS does not zoom on focus", () => {
    const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const match = /@media \(pointer: coarse\) \{\s*input[^{]*,\s*select,\s*textarea \{\s*font-size: 16px;/.exec(text);
    expect(match, "a coarse-pointer rule sets text fields to 16px").not.toBeNull();
    // Inside a layer it would lose to the `text-sm` utilities it has to beat.
    expect(layerRanges(text).some(([from, to]) => match!.index > from && match!.index < to)).toBe(false);
  });

  it("keeps the guard on field classes that set their own smaller size", () => {
    // `.ph-link-select` drops to 12 px from 640 px up; on a touch screen that
    // is a phone in landscape, which iOS would zoom on focus.
    expect(css).toMatch(/@media \(pointer: coarse\) \{\s*:root \.ph-link-select \{\s*font-size: 16px;/);
  });
});
