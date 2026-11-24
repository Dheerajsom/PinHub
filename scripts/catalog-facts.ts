import { boards } from "../src/lib/boards";
import { boardVisuals } from "../src/lib/board-visuals";
import { boardPrices } from "../src/lib/board-prices";
import { findBoards, parseFinderQuery } from "../src/lib/board-finder";

// Prints the numbers docs/video-script.md quotes, from the catalog as it is
// now, so the narration can be re-checked the day it is recorded:
//   npm run facts

const finderExamples = [
  "plan=i2c1.adc2",
  "plan=i2c1.spi1.adc2&platform=mcu&wireless=wifi",
  "plan=i2c8.spi8.uart8",
];

const facts: Array<[string, string | number]> = [
  ["Boards", boards.length],
  ["Vendors", new Set(boards.map((board) => board.vendor)).size],
  ["Interfaces", new Set(boards.flatMap((board) => board.interfaces)).size],
  ["Source links", boards.reduce((total, board) => total + board.sourceLinks.length, 0)],
  ["Boards with an interactive pin map", boards.filter((board) => board.pinout && boardVisuals[board.id]).length],
  ["Boards with source-backed pin functions", boards.filter((board) => board.pinFunctions && board.pinout).length],
  ["Price listings", boardPrices.length],
];

for (const search of finderExamples) {
  const started = performance.now();
  const result = findBoards(boards, parseFinderQuery(search));
  const ms = Math.round(performance.now() - started);
  facts.push([`Finder ${search}`, `fits ${result.fits.length} of ${result.checked} (${ms} ms)`]);
}

const width = Math.max(...facts.map(([label]) => label.length));
for (const [label, value] of facts) console.log(`${label.padEnd(width)}  ${value}`);
