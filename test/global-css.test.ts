import { readFileSync, readdirSync } from "node:fs";
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

  describe("light theme colour coverage", () => {
    const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const lightSelectors = [...text.matchAll(/:root\[data-theme="light"\][^{]*\{/g)].map((found) => found[0]);
    const sourceDir = join(process.cwd(), "src");
    const sources = (readdirSync(sourceDir, { recursive: true }) as string[])
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => readFileSync(join(sourceDir, file), "utf8"));

    function classesMatching(pattern: RegExp): string[] {
      const found = new Set<string>();
      for (const source of sources) for (const match of source.matchAll(pattern)) found.add(match[0]);
      return [...found].sort();
    }

    const escapeClass = (name: string) => name.replace(/([:/[\].#])/g, "\\$1");

    /** The selector a light rule must use so the class only applies in its own state. */
    function gatedSelector(name: string): string {
      const escaped = `.${escapeClass(name)}`;
      const variant = name.includes(":") ? name.slice(0, name.lastIndexOf(":")) : "";
      switch (variant) {
        case "":
          return escaped;
        case "hover":
          return `${escaped}:hover`;
        case "group-hover":
          return `.group:hover ${escaped}`;
        case "focus":
          return `${escaped}:focus`;
        case "focus-visible":
          return `${escaped}:focus-visible`;
        case "disabled":
          return `${escaped}:disabled`;
        default:
          throw new Error(`no light-theme gate known for the ${variant}: variant (${name})`);
      }
    }

    /**
     * Any colour utility with an opacity suffix, in any variant: side borders
     * (`border-t-white/10`), divides, rings, and arbitrary colours
     * (`bg-[#000000]/20`) as well as palette colours.
     */
    const alphaColourClass =
      /(?<![\w/:-])(?:[a-z-]+:)*(?:text|bg|border(?:-[trblxyse])?|ring|fill|stroke|divide|outline|decoration|placeholder|from|via|to|shadow|accent|caret)-(?:white|black|[a-z]+-\d{2,3}|\[#[0-9a-fA-F]{3,8}\])\/(?:\d+|\[[\d.]+\])(?![\w/-])/g;

    it("recognises every opacity-suffixed colour form a class can take", () => {
      // The matcher must see a new form, or a class in that form escapes the guard.
      const sample = "border-t-white/10 hover:border-x-cyan-300/40 bg-[#000000]/20 divide-white/10 focus-visible:ring-cyan-300/80 bg-white/[0.03] text-zinc-400";
      expect([...sample.matchAll(alphaColourClass)].map((match) => match[0])).toEqual([
        "border-t-white/10",
        "hover:border-x-cyan-300/40",
        "bg-[#000000]/20",
        "divide-white/10",
        "focus-visible:ring-cyan-300/80",
        "bg-white/[0.03]",
      ]);
    });

    function uncovered(names: string[]): string[] {
      return names.filter((name) => {
        // The selector must end a compound (`.bg-white\/5` must not count for `.bg-white\/50`).
        const selector = new RegExp(`${gatedSelector(name).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")}(?=[\\s,){])`);
        return !lightSelectors.some((rule) => selector.test(rule));
      });
    }

    it("gives every alpha-suffixed colour class used in src/ a light-theme rule", () => {
      // The light theme overrides colour utilities by class name, so an opacity
      // suffix escapes it: `text-orange-50/80` left the /privacy liability
      // disclaimer near-white on its cream card (~1:1 contrast).
      const used = classesMatching(alphaColourClass);
      expect(used.length).toBeGreaterThan(50);
      expect(uncovered(used)).toEqual([]);
    });

    it("gives every red text class and every pale hover text colour a light-theme rule", () => {
      // `text-red-300` errors and `hover:text-red-200` delete buttons kept their
      // pale dark-theme reds on paper.
      const used = classesMatching(/(?<![\w/:-])(?:(?:group-)?hover:)?text-(?:red-\d{2,3}|white|[a-z]+-(?:50|100|200|300))(?![\w/-])/g)
        .filter((name) => name.includes(":") || name.startsWith("text-red-"));
      expect(used).toContain("hover:text-red-200");
      expect(uncovered(used)).toEqual([]);
    });

    it("gives every pale or mid-tone text colour used in src/ a light-theme ink", () => {
      // `text-orange-300` pin notes measured 1.44:1 on the light well.
      const used = classesMatching(/(?<![\w/:-])text-(?!zinc-|slate-|gray-|neutral-|stone-)[a-z]+-(?:50|100|200|300)(?![\w/-])/g);
      expect(used).toContain("text-orange-300");
      expect(uncovered(used)).toEqual([]);
    });

    it("never matches colour utilities by class substring, which also catches hover: variants at rest", () => {
      // `[class*="bg-white/"]` matched `hover:bg-white/[0.08]` on the catalog
      // star, so its hover fill showed at rest in the light theme.
      const substring = lightSelectors.filter((rule) =>
        /\[class[*^$]?=["'][^"']*(?:text|bg|border|ring|fill|divide)-/.test(rule),
      );
      expect(substring).toEqual([]);
    });

    it("gates every variant rule on its state", () => {
      const ungated = lightSelectors
        .flatMap((rule) => rule.replace(/\{$/, "").split(/,\s*/))
        .map((part) => part.trim())
        .filter((part) => /\.(?:group-)?hover\\:/.test(part) && !/:hover/.test(part.replace(/\\:/g, "")));
      expect(ungated).toEqual([]);
    });
  });
});
