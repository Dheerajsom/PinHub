/**
 * Shell completion support.
 *
 * `ph completion <shell>` prints a script the user installs once; that script
 * calls the hidden `ph __complete` command on every Tab press. Keeping the
 * candidate logic here (pure, no renderer or commander imports) lets cli.ts
 * answer completion requests without loading the rendering stack, and lets the
 * behavior be tested directly.
 *
 * Wire protocol between the scripts and `__complete`:
 *
 *   ph __complete --prefix=<partial> [preceding words...]
 *
 * The partial word travels inside a single `--prefix=` token rather than as a
 * trailing argument, because an empty trailing argument is exactly what several
 * shells drop on the way to a native command.
 */
import { boards } from "./boards/index.js";

export const COMPLETION_SHELLS = ["bash", "zsh", "fish", "powershell"] as const;

export type CompletionShell = (typeof COMPLETION_SHELLS)[number];

/** Spellings people actually type, mapped to the script we emit. */
const SHELL_ALIASES: Record<string, CompletionShell> = {
  bash: "bash",
  zsh: "zsh",
  fish: "fish",
  powershell: "powershell",
  pwsh: "powershell",
  ps: "powershell",
  ps1: "powershell",
};

const SUBCOMMANDS = ["completion", "help", "info", "list", "search"];

/** Flags that shape any rendered output. */
const PRESENTATION_FLAGS = ["--ascii", "--compact", "--no-color", "--no-motion", "--width"];

/** Flags `run.ts` rejects for `list` and `search`. */
const SINGLE_BOARD_FLAGS = ["--details", "--source"];

export function resolveCompletionShell(shell: string): CompletionShell | undefined {
  return SHELL_ALIASES[shell.trim().toLowerCase()];
}

/**
 * Every string that resolves to a board: canonical ids plus the curated short
 * aliases, which are what people actually type (`rpi5`, `pico`, `uno`).
 */
export function boardCompletionTokens(): string[] {
  const tokens = new Set<string>();
  for (const board of boards) {
    tokens.add(board.id);
    for (const alias of board.aliases) tokens.add(alias);
  }
  return [...tokens].sort();
}

function startingWith(candidates: readonly string[], prefix: string): string[] {
  const needle = prefix.toLowerCase();
  return candidates.filter((candidate) => candidate.toLowerCase().startsWith(needle)).sort();
}

/**
 * Candidates for the word being typed, given the words already completed after
 * `ph`. Matching is case-insensitive on the typed prefix; every candidate is
 * already lowercase, so shells that re-filter case-sensitively still agree.
 */
export function completionCandidates(words: string[], prefix: string): string[] {
  // `--width` takes a column count no catalog can enumerate.
  if (words[words.length - 1] === "--width") return [];

  const positional = words.filter((word) => !word.startsWith("-"));
  const first = positional[0];
  const subcommand = first !== undefined && SUBCOMMANDS.includes(first) ? first : undefined;

  if (prefix.startsWith("-")) {
    if (subcommand === "completion" || subcommand === "help") return [];
    const flags = [...PRESENTATION_FLAGS, "--json", "--help"];
    if (subcommand !== "list" && subcommand !== "search") flags.push(...SINGLE_BOARD_FLAGS);
    if (words.length === 0) flags.push("--version");
    return startingWith(
      flags.filter((flag) => !words.includes(flag)),
      prefix,
    );
  }

  // Both of these take exactly one more word, so stop once it is there.
  if (subcommand === "completion") {
    return positional.length > 1 ? [] : startingWith(COMPLETION_SHELLS, prefix);
  }
  if (subcommand === "help") {
    return positional.length > 1 ? [] : startingWith(SUBCOMMANDS, prefix);
  }
  // `list` takes no operands at all.
  if (subcommand === "list") return [];

  // A board name is expected: bare `ph <board>`, `ph info <board>`, and
  // `ph search <query>` all read best when the catalog is offered. Subcommands
  // join the list only while the first word is still open.
  const boardTokens = boardCompletionTokens();
  return startingWith(
    positional.length === 0 ? [...SUBCOMMANDS, ...boardTokens] : boardTokens,
    prefix,
  );
}

export type CompleteResult = { code: number; stdout: string; stderr: string };

/**
 * Handles a raw `["__complete", ...]` argv. Parsed by hand rather than through
 * commander because the preceding words legitimately include flags like
 * `--json`, which an argument parser would try to interpret as its own.
 *
 * Always exits 0: a completion request that fails should complete nothing, not
 * make the user's shell report an error mid-keystroke.
 */
export function completeCommandOutput(argv: string[]): CompleteResult {
  let prefix = "";
  const words: string[] = [];

  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument.startsWith("--prefix=")) {
      prefix = argument.slice("--prefix=".length);
      continue;
    }
    if (argument === "--prefix") {
      prefix = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    words.push(argument);
  }

  const candidates = completionCandidates(words, prefix);
  return {
    code: 0,
    stdout: candidates.length > 0 ? `${candidates.join("\n")}\n` : "",
    stderr: "",
  };
}

const BASH_SCRIPT = `# PinHub (ph) completion for bash.
#
# Install by adding this line to ~/.bashrc:
#   eval "$(ph completion bash)"
#
# Or write it once to the bash-completion directory:
#   ph completion bash > ~/.local/share/bash-completion/completions/ph
_ph_complete() {
  local IFS=$'\\n'
  local args=("--prefix=\${COMP_WORDS[COMP_CWORD]}")
  if (( COMP_CWORD > 1 )); then
    args+=("\${COMP_WORDS[@]:1:COMP_CWORD-1}")
  fi
  COMPREPLY=($(ph __complete "\${args[@]}" 2>/dev/null))
}
complete -F _ph_complete ph
`;

const ZSH_SCRIPT = `# PinHub (ph) completion for zsh.
#
# Install by adding this line to ~/.zshrc, after \`compinit\` has run:
#   eval "$(ph completion zsh)"
#
# If completion is not initialized yet, add these first:
#   autoload -Uz compinit && compinit
_ph_complete() {
  local output
  local -a args candidates
  # words is 1-indexed and includes "ph"; words[CURRENT] is the partial word.
  args=("--prefix=\${words[CURRENT]}" \${words[2,CURRENT-1]})
  output="$(ph __complete "\${args[@]}" 2>/dev/null)"
  # Returning without adding anything keeps zsh from offering an empty match.
  [[ -z $output ]] && return 1
  candidates=("\${(f)output}")
  compadd -a candidates
}
compdef _ph_complete ph
`;

const FISH_SCRIPT = `# PinHub (ph) completion for fish.
#
# Install once:
#   ph completion fish > ~/.config/fish/completions/ph.fish
function __ph_complete
    # -opc gives the finished tokens (including "ph"); -ct the partial word.
    set -l prior (commandline -opc)
    if set -q prior[1]
        set -e prior[1]
    end
    set -l prefix (commandline -ct)
    ph __complete "--prefix=$prefix" $prior 2>/dev/null
end
complete -c ph -f -a '(__ph_complete)'
`;

const POWERSHELL_SCRIPT = `# PinHub (ph) completion for PowerShell.
#
# Install by appending this to your profile:
#   ph completion powershell | Out-File -Append -Encoding utf8 $PROFILE
# Then open a new PowerShell window. If the profile does not exist yet:
#   New-Item -ItemType File -Path $PROFILE -Force
Register-ArgumentCompleter -Native -CommandName @('ph', 'ph.cmd', 'ph.exe') -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $prior = @($commandAst.CommandElements | Select-Object -Skip 1 | ForEach-Object { $_.ToString() })
    # The word under the cursor is already the last element; send it as --prefix.
    if ($prior.Count -gt 0 -and $prior[-1] -eq $wordToComplete) {
        if ($prior.Count -eq 1) { $prior = @() }
        else { $prior = @($prior[0..($prior.Count - 2)]) }
    }

    try {
        & ph __complete "--prefix=$wordToComplete" @prior | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
    } catch {
        # A missing or failing ph should complete nothing, never raise mid-keystroke.
    }
}
`;

const SCRIPTS: Record<CompletionShell, string> = {
  bash: BASH_SCRIPT,
  zsh: ZSH_SCRIPT,
  fish: FISH_SCRIPT,
  powershell: POWERSHELL_SCRIPT,
};

export function completionScript(shell: CompletionShell): string {
  return SCRIPTS[shell];
}
