import { stripVTControlCharacters } from "node:util";
import stringWidth from "string-width";

export const MIN_TERMINAL_WIDTH = 20;
export const MAX_TERMINAL_WIDTH = 1000;
export const DEFAULT_TERMINAL_WIDTH = 80;

/** Clamp externally detected widths to a usable, integer terminal width. */
export function normalizeWidth(value: number | undefined, fallback = DEFAULT_TERMINAL_WIDTH): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(MAX_TERMINAL_WIDTH, Math.max(MIN_TERMINAL_WIDTH, Math.floor(value)));
}

/** Width in terminal cells, ignoring ANSI styling. */
export function visibleWidth(text: string): number {
  return stringWidth(text);
}

export function padEndVisible(text: string, width: number): string {
  return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}

export function padStartVisible(text: string, width: number): string {
  return " ".repeat(Math.max(0, width - visibleWidth(text))) + text;
}

function splitAtWidth(text: string, width: number): [string, string] {
  if (width <= 0) return ["", text];
  let head = "";
  let used = 0;
  let offset = 0;
  let preferredBreak = 0;

  for (const character of text) {
    const characterWidth = visibleWidth(character);
    if (head && used + characterWidth > width) break;
    // A single wide glyph is preferable to an infinite loop at a one-cell edge.
    if (!head && characterWidth > width) {
      head = character;
      offset += character.length;
      break;
    }
    if (used + characterWidth > width) break;
    head += character;
    used += characterWidth;
    offset += character.length;
    if (/[-/_.?&=]/.test(character)) preferredBreak = offset;
  }

  // Keep identifiers and URLs readable by preferring a nearby punctuation
  // boundary over an arbitrary mid-token split.
  if (offset < text.length && preferredBreak > 0) {
    const preferredHead = text.slice(0, preferredBreak);
    if (visibleWidth(preferredHead) >= Math.max(4, Math.floor(width / 2))) {
      return [preferredHead, text.slice(preferredBreak)];
    }
  }
  return [head, text.slice(offset)];
}

/**
 * Word-wrap text to terminal cells and hard-wrap long tokens such as URLs.
 * The first and continuation prefixes may differ, which keeps warning markers
 * aligned without accidentally adding columns after wrapping.
 */
export function wrapText(
  text: string,
  width: number,
  firstIndent = "",
  continuationIndent = firstIndent,
): string[] {
  const targetWidth = Number.isFinite(width) ? Math.max(1, Math.floor(width)) : DEFAULT_TERMINAL_WIDTH;
  const paragraphs = text.replace(/\r\n?/g, "\n").split("\n");
  const output: string[] = [];
  let firstOutputLine = true;

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      output.push("");
      firstOutputLine = false;
      continue;
    }

    let indent = firstOutputLine ? firstIndent : continuationIndent;
    let line = "";

    const flush = () => {
      if (!line) return;
      output.push(indent + line);
      line = "";
      firstOutputLine = false;
      indent = continuationIndent;
    };

    for (const originalWord of words) {
      let word = originalWord;
      const available = () => Math.max(1, targetWidth - visibleWidth(indent));

      if (line && visibleWidth(`${line} ${word}`) <= available()) {
        line += ` ${word}`;
        continue;
      }
      if (line) flush();

      while (visibleWidth(word) > available()) {
        const [head, tail] = splitAtWidth(word, available());
        line = head;
        flush();
        word = tail;
      }
      line = word;
    }
    flush();
  }

  return output;
}

/**
 * Remove terminal control sequences before echoing untrusted text. Preserve
 * layout whitespace so the same guard can safely wrap parser diagnostics.
 */
export function safeTerminalText(text: string): string {
  return Array.from(stripVTControlCharacters(text), (character) => {
    if (character === "\n" || character === "\r" || character === "\t") {
      return character;
    }
    const code = character.codePointAt(0) ?? 0;
    return code <= 0x1f || code === 0x7f ? " " : character;
  }).join("");
}

/**
 * Structural ASCII mode also sanitizes source data punctuation. Replacements
 * stay at one cell so a width-safe render remains width-safe after conversion.
 */
export function toAscii(text: string): string {
  const replacements: Record<string, string> = {
    "—": "-",
    "–": "-",
    "−": "-",
    "…": ".",
    "×": "x",
    "µ": "u",
    "μ": "u",
    "°": "o",
    "→": ">",
    "←": "<",
    "↔": "-",
    "≥": ">",
    "≤": "<",
    "“": "\"",
    "”": "\"",
    "‘": "'",
    "’": "'",
    "Ω": "O",
    "ω": "o",
    "·": ".",
    " ": " ",
  };

  let output = "";
  let inUnknownRun = false;
  for (const character of text.normalize("NFKD")) {
    if (replacements[character] !== undefined) {
      output += replacements[character];
      inUnknownRun = false;
      continue;
    }
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x7f) {
      output += character;
      inUnknownRun = false;
      continue;
    }
    // Combining marks introduced by NFKD can be omitted; unknown glyphs remain
    // visibly represented without breaking strict ASCII output.
    if (/\p{Mark}/u.test(character)) continue;
    if (!inUnknownRun) output += "?";
    inUnknownRun = true;
  }
  return output;
}
