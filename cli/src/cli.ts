#!/usr/bin/env node
import { runCli } from "./run.js";
import {
  playSignalPulse,
  shouldAnimateSignalPulse,
  signalPulseLabel,
} from "./status.js";

const argv = process.argv.slice(2);
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
