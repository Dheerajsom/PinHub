/**
 * Generates src/boards/generated.ts from the PinHub website catalog
 * (../../src/lib/boards.ts), converting the site's data model into the CLI's
 * typed model. Run from cli/ with: npm run generate:boards
 *
 * The five flagship boards keep their richer hand-written modules in
 * src/boards/ and are skipped here (SKIP_IDS).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  boards as siteBoards,
  type Board as SiteBoard,
  type Pin as SitePin,
  type PinRole,
  type Pinout,
} from "../../src/lib/boards";
import { classifySource } from "../../src/lib/source-trust";
import type { Board, Header, Pin, PinCategory, Source, Warning } from "../src/model.js";
import { curatedAliases } from "./curated-aliases.js";

/** Site ids covered by richer hand-written CLI modules. */
const SKIP_IDS = new Set([
  "raspberry-pi-5",
  "raspberry-pi-pico",
  "raspberry-pi-pico-w",
  "arduino-uno-rev3",
  "esp32-devkit-v1",
]);

const ROLE_TO_CATEGORY: Record<PinRole, PinCategory> = {
  power: "power",
  ground: "ground",
  gpio: "gpio",
  i2c: "communication",
  spi: "communication",
  uart: "communication",
  adc: "analog",
  dac: "analog",
  pwm: "gpio",
  debug: "communication",
  system: "reserved",
  special: "gpio",
  reserved: "reserved",
};

function toPin(sitePin: SitePin, row: number, column: number): Pin {
  const pin: Pin = {
    physical: sitePin.position,
    position: { row, column },
    label: sitePin.label,
    category: ROLE_TO_CATEGORY[sitePin.role],
  };
  if (sitePin.aliases?.length) pin.functions = sitePin.aliases;
  if (sitePin.note) pin.notes = [sitePin.note];
  return pin;
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "header"
  );
}

function toHeaders(pinout: Pinout | undefined): Header[] {
  if (!pinout) return [];
  if (pinout.layout === "dual-row" && pinout.pins) {
    const { left, right } = pinout.pins;
    return [
      {
        id: "main",
        name: pinout.connector,
        layout: { rows: Math.max(left.length, right.length), columns: 2 },
        pins: [
          ...left.map((p, i) => toPin(p, i + 1, 1)),
          ...right.map((p, i) => toPin(p, i + 1, 2)),
        ],
      },
    ];
  }
  return (pinout.groups ?? []).map((group, index) => ({
    id: slug(group.label),
    name: group.label,
    ...(index === 0 ? { description: pinout.connector } : {}),
    layout: { rows: group.pins.length, columns: 1 },
    pins: group.pins.map((p, i) => toPin(p, i + 1, 1)),
  }));
}

function toWarnings(board: SiteBoard): Warning[] {
  const warnings: Warning[] = board.warnings.map((text) => ({
    severity: "warning",
    text,
  }));
  warnings.push({
    severity: "info",
    text: `Logic level: ${board.logicLevel}. Power: ${board.power}.`,
  });
  for (const note of board.pinout?.notes ?? []) {
    warnings.push({ severity: "info", text: note });
  }
  return warnings;
}

function toSources(board: SiteBoard): Source[] {
  return board.sourceLinks.map((link) => {
    const official = classifySource(board.vendor, link.url) === "official";
    return {
      title: link.label,
      url: link.url,
      official,
      type: link.type,
    };
  });
}

function toBoard(board: SiteBoard): Board {
  return {
    id: board.id,
    name: board.name,
    manufacturer: board.vendor,
    aliases: curatedAliases[board.id] ?? [],
    description: board.description,
    warnings: toWarnings(board),
    sources: toSources(board),
    headers: toHeaders(board.pinout),
  };
}

const generated = siteBoards.filter((b) => !SKIP_IDS.has(b.id)).map(toBoard);

// Mirror the catalog invariants early so bad data fails generation, not CI.
const problems: string[] = [];
for (const board of generated) {
  if (board.sources.length === 0) problems.push(`${board.id}: no sources`);
  if (!board.sources.some((s) => s.official)) {
    problems.push(`${board.id}: no official source (${board.sources.map((s) => new URL(s.url).host).join(", ")})`);
  }
  if (board.warnings.length === 0) problems.push(`${board.id}: no warnings`);
  for (const header of board.headers) {
    const physical = header.pins.map((p) => p.physical);
    if (new Set(physical).size !== physical.length) {
      problems.push(`${board.id}/${header.id}: duplicate physical pin numbers`);
    }
  }
}
if (problems.length > 0) {
  console.error("Generation problems:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}

const banner = `// AUTO-GENERATED from the PinHub website catalog (src/lib/boards.ts).\n// Do not edit by hand — run \`npm run generate:boards\` in cli/ instead.\nimport type { Board } from "../model.js";\n\nexport const generatedBoards: Board[] = `;

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "boards", "generated.ts");
const output = banner + JSON.stringify(generated, null, 2) + ";\n";
const checkOnly = process.argv.slice(2).includes("--check");

if (checkOnly) {
  let current = "";
  try {
    current = readFileSync(outPath, "utf8");
  } catch {
    // A missing generated file is reported by the same actionable message.
  }
  // Git may materialize this tracked file with CRLF on Windows. Compare
  // normalized content so --check detects catalog drift, not checkout policy.
  if (current.replace(/\r\n?/g, "\n") !== output) {
    console.error("Generated board data is stale. Run `npm run generate:boards` in cli/.");
    process.exitCode = 1;
  } else {
    console.log(`Verified ${generated.length} generated boards in ${outPath}`);
  }
} else {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, output, "utf8");
  console.log(`Wrote ${generated.length} boards to ${outPath}`);
}
