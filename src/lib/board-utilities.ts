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

export function revisionNotesFor(board: Board): string[] {
  const pattern = /\b(rev(?:ision)?|variant|version|silkscreen|batch|module)\b/i;
  return [...board.warnings, ...(board.pinout?.notes ?? [])].filter((note) =>
    pattern.test(note),
  );
}

