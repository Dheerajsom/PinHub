import { Command, CommanderError } from "commander";
import type { ChalkInstance } from "chalk";
import { boards, resolveBoard, searchBoards, suggestBoards } from "./catalog.js";
import { VERSION } from "./version.js";
import { asciiChars, unicodeChars, type CharSet } from "./render/chars.js";
import { makeChalk } from "./render/theme.js";
import { renderBoard, type RenderOptions } from "./render/board.js";
import { renderBoardTable, renderInfo, renderSources } from "./render/meta.js";

export type RunOptions = {
  /** Override detected terminal width (defaults to stdout columns or 80). */
  columns?: number;
  /** Override TTY detection (piped output disables color automatically). */
  isTTY?: boolean;
  /** Override environment (for NO_COLOR handling in tests). */
  env?: Record<string, string | undefined>;
};

export type RunResult = {
  code: number;
  stdout: string;
  stderr: string;
};

type DiagramFlags = {
  compact?: boolean;
  ascii?: boolean;
  color?: boolean;
  json?: boolean;
  source?: boolean;
  width?: string;
};

/**
 * Runs the CLI against captured buffers instead of process streams, so the
 * whole command surface is testable without spawning child processes.
 */
export async function runCli(argv: string[], runOpts: RunOptions = {}): Promise<RunResult> {
  let stdout = "";
  let stderr = "";
  let code = 0;

  const print = (text: string) => {
    stdout += text + "\n";
  };
  const printErr = (text: string) => {
    stderr += text + "\n";
  };

  const env = runOpts.env ?? process.env;
  const isTTY = runOpts.isTTY ?? Boolean(process.stdout.isTTY);
  const detectedColumns = runOpts.columns ?? (isTTY ? process.stdout.columns : undefined) ?? 80;

  const colorEnabled = (flags: DiagramFlags) =>
    flags.color !== false && !env.NO_COLOR && isTTY;

  const buildRender = (flags: DiagramFlags): RenderOptions | { error: string } => {
    let width = detectedColumns;
    if (flags.width !== undefined) {
      const parsed = Number.parseInt(flags.width, 10);
      if (!Number.isFinite(parsed) || parsed < 40) {
        return { error: "Invalid --width: expected a number of at least 40." };
      }
      width = parsed;
    }
    return {
      chalk: makeChalk(colorEnabled(flags)),
      chars: flags.ascii ? asciiChars : unicodeChars,
      width,
      compact: Boolean(flags.compact),
    };
  };

  const resolveOrSuggest = (words: string[]): ReturnType<typeof resolveBoard> => {
    const query = words.join(" ");
    const board = resolveBoard(query);
    if (board) return board;
    printErr(`Board "${query}" was not found.`);
    const suggestions = suggestBoards(query);
    if (suggestions.length > 0) {
      printErr("");
      printErr("Did you mean:");
      for (const suggestion of suggestions) {
        printErr(`  ph ${suggestion.alias}`);
      }
    }
    printErr("");
    printErr("Run `ph list` to see all supported boards.");
    code = 1;
    return undefined;
  };

  const showBoard = (words: string[], flags: DiagramFlags) => {
    const board = resolveOrSuggest(words);
    if (!board) return;
    if (flags.json) {
      // JSON mode must emit only valid JSON to stdout.
      print(JSON.stringify(board, null, 2));
      return;
    }
    const render = buildRender(flags);
    if ("error" in render) {
      printErr(render.error);
      code = 1;
      return;
    }
    if (flags.source) {
      print(renderSources(board, render.chalk));
      return;
    }
    print(renderBoard(board, render));
  };

  const metaChalk = (flags: DiagramFlags = {}): ChalkInstance => makeChalk(colorEnabled(flags));
  const metaChars = (flags: DiagramFlags = {}): CharSet => (flags.ascii ? asciiChars : unicodeChars);

  const program = new Command();
  program
    .name("ph")
    .description("Hardware board pinout diagrams in your terminal.")
    .version(VERSION, "-v, --version", "print the version")
    .helpCommand("help [command]", "display help for a command")
    .exitOverride()
    .configureOutput({
      writeOut: (text) => {
        stdout += text;
      },
      writeErr: (text) => {
        stderr += text;
      },
    })
    .argument("[board...]", "board id or alias (e.g. rpi5, pico, uno, esp32)")
    .option("--compact", "tighter, borderless layout")
    .option("--ascii", "ASCII-only borders and symbols")
    .option("--no-color", "disable ANSI colors (the NO_COLOR env var is also honored)")
    .option("--json", "emit the board data as JSON")
    .option("--source", "print official source links for the board")
    .option("--width <number>", "override the detected terminal width")
    .addHelpText(
      "after",
      "\nExamples:\n  ph rpi5\n  ph raspberry pi 5\n  ph pico --compact\n  ph esp32 --ascii --no-color\n  ph uno --json\n  ph rpi5 --source",
    )
    .action((words: string[], flags: DiagramFlags) => {
      if (words.length === 0) {
        program.outputHelp();
        return;
      }
      showBoard(words, flags);
    });

  program
    .command("list")
    .description("list all boards in the catalog")
    .action(() => {
      print(renderBoardTable(boards, metaChalk()));
    });

  program
    .command("search <query...>")
    .description("search boards by name, alias, or manufacturer")
    .action((words: string[]) => {
      const query = words.join(" ");
      const results = searchBoards(query);
      if (results.length === 0) {
        printErr(`No boards matched "${query}". Run \`ph list\` to see all boards.`);
        code = 1;
        return;
      }
      print(renderBoardTable(results, metaChalk()));
    });

  program
    .command("info <board...>")
    .description("show board details, warnings, sources, and aliases")
    .option("--ascii", "ASCII-only symbols")
    .option("--json", "emit the board data as JSON")
    .action((words: string[], localFlags: DiagramFlags, command: Command) => {
      // Flags like --json are also declared on the root command, which
      // consumes them before dispatch; merge both option scopes.
      const flags = command.optsWithGlobals<DiagramFlags>();
      void localFlags;
      const board = resolveOrSuggest(words);
      if (!board) return;
      if (flags.json) {
        print(JSON.stringify(board, null, 2));
        return;
      }
      print(renderInfo(board, metaChalk(flags), metaChars(flags), detectedColumns));
    });

  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      // Help/version display exits with 0; user mistakes exit non-zero,
      // without a stack trace either way.
      code = error.exitCode;
    } else {
      printErr(error instanceof Error ? error.message : String(error));
      code = 1;
    }
  }

  return { code, stdout, stderr };
}
