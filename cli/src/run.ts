import { Command, CommanderError, InvalidArgumentError } from "commander";
import { boards, resolveBoard, searchBoards, suggestBoards } from "./catalog.js";
import {
  COMPLETION_SHELLS,
  completeCommandOutput,
  completionScript,
  resolveCompletionShell,
} from "./complete.js";
import { VERSION } from "./version.js";
import { asciiChars, unicodeChars } from "./render/chars.js";
import { makeChalk } from "./render/theme.js";
import { renderBoard, type RenderOptions } from "./render/board.js";
import { renderBoardTable, renderInfo, renderSources } from "./render/meta.js";
import {
  MAX_TERMINAL_WIDTH,
  MIN_TERMINAL_WIDTH,
  normalizeWidth,
  safeTerminalText,
  safeTerminalValue,
} from "./render/text.js";
import { hasNoColor, isCiEnvironment } from "./status.js";

export type RunOptions = {
  /** Override detected terminal width (defaults to stdout columns or 80). */
  columns?: number;
  /** Override TTY detection (piped output disables color automatically). */
  isTTY?: boolean;
  /** Override environment (for NO_COLOR/CI/TERM handling in tests). */
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
  details?: boolean;
  motion?: boolean;
  width?: number;
};

const MAX_DISPLAY_QUERY_LENGTH = 256;

function displayQuery(query: string): string {
  const safe = safeTerminalValue(query);
  return safe.length > MAX_DISPLAY_QUERY_LENGTH
    ? `${safe.slice(0, MAX_DISPLAY_QUERY_LENGTH - 1)}…`
    : safe;
}

export function parseWidth(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError(
      `Invalid --width: expected a whole number from ${MIN_TERMINAL_WIDTH} to ${MAX_TERMINAL_WIDTH}.`,
    );
  }
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < MIN_TERMINAL_WIDTH ||
    parsed > MAX_TERMINAL_WIDTH
  ) {
    throw new InvalidArgumentError(
      `Invalid --width: expected a whole number from ${MIN_TERMINAL_WIDTH} to ${MAX_TERMINAL_WIDTH}.`,
    );
  }
  return parsed;
}

/**
 * Runs the CLI against captured buffers instead of process streams, so the
 * whole command surface stays deterministic and testable. Executable-only
 * motion lives in cli.ts and never enters these buffers.
 */
export async function runCli(argv: string[], runOpts: RunOptions = {}): Promise<RunResult> {
  // Answered before commander sees anything: the words being completed are the
  // user's own partial command line, and may include flags that belong to `ph`
  // rather than to `__complete`.
  if (argv[0] === "__complete") return completeCommandOutput(argv);

  let stdout = "";
  let stderr = "";
  let code = 0;

  const print = (text: string) => {
    stdout += `${text}\n`;
  };
  const printErr = (text: string) => {
    stderr += `${safeTerminalText(text)}\n`;
  };

  const env = runOpts.env ?? process.env;
  const isTTY = runOpts.isTTY ?? Boolean(process.stdout.isTTY);
  const detectedColumns = normalizeWidth(
    runOpts.columns ?? (isTTY ? process.stdout.columns : undefined),
  );

  const colorEnabled = (flags: DiagramFlags) =>
    flags.color !== false &&
    !hasNoColor(env) &&
    !isCiEnvironment(env) &&
    env.TERM?.toLowerCase() !== "dumb" &&
    isTTY;

  const buildRender = (flags: DiagramFlags): RenderOptions => ({
    chalk: makeChalk(colorEnabled(flags)),
    chars: flags.ascii ? asciiChars : unicodeChars,
    width: flags.width ?? detectedColumns,
    compact: Boolean(flags.compact),
    details: Boolean(flags.details),
  });

  const resolveOrSuggest = (words: string[]): ReturnType<typeof resolveBoard> => {
    const query = words.join(" ");
    const safeQuery = displayQuery(query);
    const board = resolveBoard(query);
    if (board) return board;
    printErr(`Board "${safeQuery}" was not found.`);
    const suggestions = suggestBoards(query);
    if (suggestions.length > 0) {
      printErr("");
      printErr("Did you mean:");
      for (const suggestion of suggestions) {
        printErr(`  ph ${safeTerminalValue(suggestion.alias)}`);
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
    print(flags.source ? renderSources(board, render) : renderBoard(board, render));
  };

  const rejectIncompatibleFlags = (
    flags: DiagramFlags,
    scope: "single-board" | "multi-board",
  ): boolean => {
    if (scope === "multi-board" && flags.source) {
      printErr("`--source` needs one board. Use `ph <board> --source`.");
      code = 1;
      return true;
    }
    if (scope === "multi-board" && flags.details) {
      printErr("`--details` needs one board. Use `ph <board> --details`.");
      code = 1;
      return true;
    }
    if (flags.source && flags.details) {
      printErr("`--source` and `--details` are separate one-board views; choose one.");
      code = 1;
      return true;
    }

    const jsonConflicts = [
      flags.ascii && "`--ascii`",
      flags.compact && "`--compact`",
      flags.details && "`--details`",
      flags.source && "`--source`",
      flags.width !== undefined && "`--width`",
    ].filter((flag): flag is string => Boolean(flag));
    if (flags.json && jsonConflicts.length > 0) {
      printErr(`\`--json\` cannot be combined with ${jsonConflicts.join(", ")}.`);
      code = 1;
      return true;
    }
    return false;
  };

  const program = new Command();
  program
    .name("ph")
    .description("Hardware board pinout diagrams in your terminal.")
    .version(VERSION, "-v, --version", "print the version")
    .helpCommand("help [command]", "display help for a command")
    .showHelpAfterError("(add --help for usage)")
    .exitOverride()
    .configureOutput({
      writeOut: (text) => {
        stdout += safeTerminalText(text);
      },
      writeErr: (text) => {
        stderr += safeTerminalText(text);
      },
    })
    .argument("[board...]", "board id or alias (e.g. rpi5, pico, uno, esp32)")
    .option("--compact", "tighter, borderless layout")
    .option("--ascii", "ASCII-only output")
    .option("--no-color", "disable ANSI colors (the NO_COLOR env var is also honored)")
    .option("--no-motion", "disable the interactive signal pulse")
    .option("--details", "show additional alternate pin functions")
    .option("--json", "emit machine-readable JSON")
    .option("--source", "print documentation source links for one board")
    .option(
      "--width <columns>",
      `override terminal width (${MIN_TERMINAL_WIDTH}-${MAX_TERMINAL_WIDTH})`,
      parseWidth,
    )
    .addHelpText(
      "after",
      "\nExamples:\n  ph rpi5\n  ph raspberry pi 5\n  ph pico --compact\n  ph esp32 --ascii --no-color\n  ph uno --details\n  ph uno --json\n  ph rpi5 --source\n  ph search raspberry\n\nTab completion:\n  eval \"$(ph completion bash)\"      # add to ~/.bashrc\n  eval \"$(ph completion zsh)\"       # add to ~/.zshrc\n  ph completion fish > ~/.config/fish/completions/ph.fish\n  ph completion powershell | Out-File -Append -Encoding utf8 $PROFILE",
    )
    .action((words: string[], flags: DiagramFlags) => {
      if (words.length === 0) {
        program.outputHelp();
        return;
      }
      if (rejectIncompatibleFlags(flags, "single-board")) return;
      showBoard(words, flags);
    });

  program
    .command("list")
    .description("list all boards in the catalog")
    .action(() => {
      const flags = program.opts<DiagramFlags>();
      if (rejectIncompatibleFlags(flags, "multi-board")) return;
      if (flags.json) {
        print(JSON.stringify(boards, null, 2));
        return;
      }
      print(renderBoardTable(boards, buildRender(flags)));
    });

  program
    .command("search <query...>")
    .description("search boards by name, alias, or manufacturer")
    .action((words: string[]) => {
      const flags = program.opts<DiagramFlags>();
      if (rejectIncompatibleFlags(flags, "multi-board")) return;
      const query = words.join(" ");
      const results = searchBoards(query);
      if (results.length === 0) {
        printErr(
          `No boards matched "${displayQuery(query)}". Run \`ph list\` to see all boards.`,
        );
        code = 1;
        return;
      }
      if (flags.json) {
        print(JSON.stringify(results, null, 2));
        return;
      }
      print(renderBoardTable(results, buildRender(flags)));
    });

  program
    .command("info <board...>")
    .description("show board details, warnings, sources, and aliases")
    .action((words: string[]) => {
      const flags = program.opts<DiagramFlags>();
      if (rejectIncompatibleFlags(flags, "single-board")) return;
      const board = resolveOrSuggest(words);
      if (!board) return;
      if (flags.json) {
        print(JSON.stringify(board, null, 2));
        return;
      }
      const render = buildRender(flags);
      print(flags.source ? renderSources(board, render) : renderInfo(board, render));
    });

  program
    .command("completion <shell>")
    .description(`print a Tab-completion script (${COMPLETION_SHELLS.join(", ")})`)
    .addHelpText(
      "after",
      "\nThe script is printed to stdout; install it once and reopen the shell.\n" +
        "Examples:\n" +
        '  eval "$(ph completion bash)"      # add to ~/.bashrc\n' +
        '  eval "$(ph completion zsh)"       # add to ~/.zshrc\n' +
        "  ph completion fish > ~/.config/fish/completions/ph.fish\n" +
        "  ph completion powershell | Out-File -Append -Encoding utf8 $PROFILE",
    )
    .action((shell: string) => {
      const resolved = resolveCompletionShell(shell);
      if (!resolved) {
        printErr(
          `Unknown shell "${displayQuery(shell)}". Choose one of: ${COMPLETION_SHELLS.join(", ")}.`,
        );
        code = 1;
        return;
      }
      // Scripts are plain text on stdout so they can be piped into a file.
      print(completionScript(resolved).trimEnd());
    });

  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      // Help/version display exits with 0; user mistakes exit non-zero,
      // without a stack trace either way.
      code = error.exitCode;
    } else {
      printErr(
        safeTerminalText(
          error instanceof Error ? error.message : String(error),
        ),
      );
      code = 1;
    }
  }

  return { code, stdout, stderr };
}
