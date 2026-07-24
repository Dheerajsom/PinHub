import { setTimeout as delay } from "node:timers/promises";
import { makeChalk } from "./render/theme.js";

type Environment = Record<string, string | undefined>;

export type SignalPulseContext = {
  stdoutIsTTY: boolean;
  stderrIsTTY: boolean;
  /** Width of the stream that receives the pulse, when the TTY exposes it. */
  stderrColumns?: number;
  env: Environment;
};

export type SignalPulseStream = {
  write(chunk: string): unknown;
};

// The longest built-in pulse is 24 cells (glyph, space, and label). Keep a
// small margin so terminals that eagerly wrap in their final column never
// leave a ghost line behind.
export const MIN_SIGNAL_PULSE_COLUMNS = 28;

export function hasNoColor(env: Environment): boolean {
  return Object.prototype.hasOwnProperty.call(env, "NO_COLOR");
}

export function isCiEnvironment(env: Environment): boolean {
  const value = env.CI;
  if (value !== undefined && value !== "" && !/^(?:0|false)$/i.test(value)) return true;
  return Boolean(env.GITHUB_ACTIONS || env.BUILDKITE || env.TF_BUILD || env.TEAMCITY_VERSION);
}

/** Pure capability check kept separate from the deterministic runCli API. */
export function shouldAnimateSignalPulse(argv: string[], context: SignalPulseContext): boolean {
  if (!context.stdoutIsTTY || !context.stderrIsTTY || argv.length === 0) return false;
  if (
    context.stderrColumns !== undefined &&
    (!Number.isFinite(context.stderrColumns) || context.stderrColumns < MIN_SIGNAL_PULSE_COLUMNS)
  ) {
    return false;
  }
  if (isCiEnvironment(context.env) || context.env.TERM?.toLowerCase() === "dumb") return false;
  if (hasNoColor(context.env) || context.env.PINHUB_NO_MOTION || context.env.NO_MOTION) return false;

  // `completion`/`__complete` write machine-consumed text; motion would only
  // add latency to a Tab press or noise to a script being piped into a file.
  const disablesMotion = argv.some((argument) =>
    [
      "help",
      "-h",
      "--help",
      "-v",
      "-V",
      "--version",
      "--json",
      "--no-motion",
      "--no-color",
      "completion",
      "__complete",
    ].includes(argument),
  );
  return !disablesMotion;
}

export function signalPulseLabel(argv: string[]): string {
  switch (argv[0]) {
    case "list":
      return "Scanning board catalog";
    case "search":
      return "Tuning board search";
    case "info":
      return "Reading board signals";
    default:
      return "Mapping pin signals";
  }
}

/**
 * A deliberately brief, color-cycling pulse. It writes only to an explicitly
 * approved TTY stream and erases itself before normal CLI output is emitted.
 */
export async function playSignalPulse(
  stream: SignalPulseStream,
  options: {
    ascii: boolean;
    label: string;
    intervalMs?: number;
    sleep?: (milliseconds: number) => Promise<void>;
  },
): Promise<void> {
  const c = makeChalk(true);
  const frames = options.ascii ? [".", "o", "O", "o"] : ["◇", "◈", "◆", "◈"];
  const colors = [c.cyan, c.blueBright, c.magentaBright, c.yellowBright];
  const sleep = options.sleep ?? ((milliseconds: number) => delay(milliseconds));
  const intervalMs = options.intervalMs ?? 45;
  const clear = "\r\u001b[2K";

  try {
    for (let index = 0; index < frames.length; index += 1) {
      stream.write(`${clear}${colors[index](frames[index])} ${c.dim(options.label)}`);
      await sleep(intervalMs);
    }
  } finally {
    stream.write(clear);
  }
}
