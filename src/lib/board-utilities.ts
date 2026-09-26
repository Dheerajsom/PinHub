import type { Board, Pin, PinRole } from "@/lib/boards";

function allPins(board: Board): Pin[] {
  if (!board.pinout) return [];
  if (board.pinout.pins) {
    return [...board.pinout.pins.left, ...board.pinout.pins.right].sort(
      (a, b) => a.position - b.position,
    );
  }
  return (board.pinout.groups ?? []).flatMap((group) => group.pins);
}

const starterRoles: PinRole[] = ["i2c", "spi", "uart", "pwm", "adc", "gpio"];

export function boardPinSnippet(board: Board): string | null {
  const pins = allPins(board);
  if (!pins.length) return null;
  const selected = starterRoles.flatMap((role) => {
    const pin = pins.find((candidate) => candidate.role === role);
    return pin ? [{ role, pin }] : [];
  });
  if (!selected.length) return null;
  const lines = selected.map(
    ({ role, pin }) =>
      `  ${role}: { physical: ${pin.position}, signal: ${JSON.stringify(pin.label)}, aliases: ${JSON.stringify(pin.aliases ?? [])} },`,
  );
  return [
    `// ${board.name} — source-backed PinHub lookup; verify warnings before wiring.`,
    "export const pinLookup = {",
    ...lines,
    "} as const;",
  ].join("\n");
}

const statedNotTolerant = /\bnot\s+5\s?V\s+tolerant\b/i;
const statedNotTolerantAll = new RegExp(statedNotTolerant.source, "gi");
const mentionsTolerance = /\b5\s?V\s+toleran(?:t|ce)\b/i;

/**
 * The short caution shown under a board's logic level. It repeats what the
 * record states and never infers tolerance the other way: a 3.3 V board whose
 * record mentions 5 V tolerance at all (tolerant FT pins, "tolerance is
 * limited", "tolerance not documented") gets no caption, because only its own
 * wording is accurate. Otherwise the caption either quotes an explicit "not
 * 5 V tolerant" (from the logic level, warnings, or connector notes) or gives
 * the conservative default for undocumented 3.3 V IO.
 */
export function fiveVoltCaution(
  board: Pick<Board, "logicLevel" | "warnings"> & Partial<Pick<Board, "pinout">>,
): string | null {
  if (!/\b3\.3\s?V\b/i.test(board.logicLevel)) return null;
  // Connector notes count too: many records state tolerance only there.
  const text = [
    board.logicLevel,
    ...board.warnings,
    ...(board.pinout?.notes ?? []),
  ].join(" ");
  if (mentionsTolerance.test(text.replace(statedNotTolerantAll, ""))) return null;
  return statedNotTolerant.test(text)
    ? "Not 5 V tolerant"
    : "Treat as not 5 V tolerant";
}

export function revisionNotesFor(board: Board): string[] {
  const pattern = /\b(rev(?:ision)?|variant|version|silkscreen|batch|module)\b/i;
  return [...board.warnings, ...(board.pinout?.notes ?? [])].filter((note) =>
    pattern.test(note),
  );
}

