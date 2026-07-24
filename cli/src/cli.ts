#!/usr/bin/env node
const argv = process.argv.slice(2);

if (argv[0] === "__complete") {
  // Shell completion runs on every Tab press, so it takes a lean path: no
  // commander, no chalk, no renderers, and never any motion.
  const { completeCommandOutput } = await import("./complete.js");
  const result = completeCommandOutput(argv);
  if (result.stdout) process.stdout.write(result.stdout);
  process.exitCode = result.code;
} else {
  const [{ runCli }, { playSignalPulse, shouldAnimateSignalPulse, signalPulseLabel }] =
    await Promise.all([import("./run.js"), import("./status.js")]);

  const resultPromise = runCli(argv);
  const pulsePromise =
    shouldAnimateSignalPulse(argv, {
      stdoutIsTTY: Boolean(process.stdout.isTTY),
      stderrIsTTY: Boolean(process.stderr.isTTY),
      stderrColumns: process.stderr.columns,
      env: process.env,
    })
      ? playSignalPulse(process.stderr, {
          ascii: argv.includes("--ascii"),
          label: signalPulseLabel(argv),
        })
      : Promise.resolve();

  // Await both concurrently so an unexpected command failure is observed
  // immediately instead of becoming an unhandled rejection during the pulse.
  const [result] = await Promise.all([resultPromise, pulsePromise]);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.code;
}
