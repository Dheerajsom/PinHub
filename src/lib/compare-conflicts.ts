import type { Board, Pin, PinRole } from "@/lib/boards";

/** A pin together with the connector context needed to interpret its number. */
export type ComparedPin = {
  boardId: string;
  boardName: string;
  connector: string;
  group?: string;
  pin: Pin;
};

export type PinConflictKind =
  | "connector-position"
  | "alternate-function"
  | "boot-or-reserved"
  | "power-rail"
  | "interface-reuse";

export type PinConflict = {
  kind: PinConflictKind;
  title: string;
  detail: string;
  /** Evidence only; this is intentionally not an electrical compatibility claim. */
  pins: ComparedPin[];
  boards: string[];
};

const genericTokens = new Set([
  "GPIO",
  "GND",
  "POWER",
  "GROUND",
  "PIN",
  "IO",
  "D",
  "GP",
]);

const interfaceTokens = new Set([
  "CANH",
  "CANL",
  "CIPO",
  "COPI",
  "CS",
  "CTS",
  "MISO",
  "MOSI",
  "RX",
  "RXD",
  "SCK",
  "SCL",
  "SDA",
  "SS",
  "SWCLK",
  "SWDIO",
  "TCK",
  "TDI",
  "TDO",
  "TMS",
  "TX",
  "TXD",
]);

const riskPattern = /\b(?:boot|strap|strapping|reserved|flash|psram|jtag|swd|debug|program(?:ming)?)\b/i;
const railPattern = /^(?:\+?\d+(?:\.\d+)?V|\d+V\d+|VBUS|VSYS|VIN|VCC|VDD|AVDD|IOREF|AREF|AGND|GND)$/i;

function normalize(value: string): string {
  return value
    .toUpperCase()
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[^A-Z0-9]+/g, "")
    .trim();
}

function tokens(pin: Pin): string[] {
  return [pin.label, ...(pin.aliases ?? [])]
    .flatMap((value) => value.split(/[\s/,;|]+/))
    .map(normalize)
    .filter(Boolean);
}

function isGenericToken(token: string): boolean {
  return (
    genericTokens.has(token) ||
    /^(?:GPIO|GP|IO|D)\d+$/.test(token) ||
    /^ADC\d+(?:CH\d+)?$/.test(token)
  );
}

function isInterfaceToken(token: string): boolean {
  return (
    interfaceTokens.has(token) ||
    /^(?:I2C|SPI|UART|USART|CAN|QSPI|SWD|JTAG)\d*(?:SDA|SCL|MOSI|MISO|SCK|CS|TX|RX)?$/.test(
      token,
    )
  );
}

function isRiskPin(pin: Pin): boolean {
  return (
    pin.role === "reserved" ||
    pin.role === "system" ||
    riskPattern.test(`${pin.label} ${(pin.aliases ?? []).join(" ")} ${pin.note ?? ""}`)
  );
}

function isPowerPin(pin: Pin): boolean {
  return pin.role === "power" || pin.role === "ground" || railPattern.test(normalize(pin.label));
}

function connectorKey(connector: string): string {
  const value = normalize(connector);
  if (/^(?:J8)?40PINGPIOHEADER|40PINDUALROW|40PHEADER/.test(value)) return "40-pin";
  if (/ARDUINO|UNOR3|SHIELDHEADER/.test(value)) return "arduino-shield";
  if (/FEATHER/.test(value)) return "feather";
  if (/XIAO/.test(value)) return "xiao";
  return value;
}

function comparableConnector(a: string, b: string): boolean {
  const left = connectorKey(a);
  const right = connectorKey(b);
  return Boolean(left && left === right);
}

function flattenBoard(board: Board): ComparedPin[] {
  const pinout = board.pinout;
  if (!pinout) return [];
  const result: ComparedPin[] = [];
  if (pinout.pins) {
    for (const pin of [...pinout.pins.left, ...pinout.pins.right]) {
      result.push({
        boardId: board.id,
        boardName: board.name,
        connector: pinout.connector,
        pin,
      });
    }
  }
  for (const group of pinout.groups ?? []) {
    for (const pin of group.pins) {
      result.push({
        boardId: board.id,
        boardName: board.name,
        connector: `${pinout.connector} · ${group.label}`,
        group: group.label,
        pin,
      });
    }
  }
  return result;
}

function uniquePins(pins: ComparedPin[]): ComparedPin[] {
  const seen = new Set<string>();
  return pins.filter((entry) => {
    const key = `${entry.boardId}|${entry.connector}|${entry.group ?? ""}|${entry.pin.position}|${entry.pin.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function conflict(
  kind: PinConflictKind,
  title: string,
  detail: string,
  pins: ComparedPin[],
  boardNames?: string[],
): PinConflict {
  const evidence = uniquePins(pins);
  return {
    kind,
    title,
    detail,
    pins: evidence,
    boards: boardNames ?? [...new Set(evidence.map((pin) => pin.boardName))],
  };
}

function pairKey(a: ComparedPin, b: ComparedPin, token: string): string {
  return [a.boardId, b.boardId, token].sort().join("|");
}

/**
 * Finds conservative, source-backed pin risks between boards.
 *
 * This reports candidate overlaps only. It deliberately never says that two
 * boards are electrically compatible: physical connector context, revision,
 * mux state, external pulls, and module variants can all change the answer.
 */
export function analyzePinConflicts(boards: readonly Board[]): PinConflict[] {
  const pinsByBoard = boards.map((board) => ({ board, pins: flattenBoard(board) }));
  const findings: PinConflict[] = [];
  const seen = new Set<string>();

  for (let leftIndex = 0; leftIndex < pinsByBoard.length; leftIndex += 1) {
    const left = pinsByBoard[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < pinsByBoard.length; rightIndex += 1) {
      const right = pinsByBoard[rightIndex];

      const rightBySignal = new Map<string, ComparedPin[]>();
      for (const entry of right.pins) {
        for (const token of tokens(entry.pin)) {
          if (isGenericToken(token)) continue;
          rightBySignal.set(token, [...(rightBySignal.get(token) ?? []), entry]);
        }
      }

      for (const entry of left.pins) {
        for (const token of tokens(entry.pin)) {
          if (isGenericToken(token)) continue;
          const matches = rightBySignal.get(token) ?? [];
          for (const match of matches) {
            const key = pairKey(entry, match, token);
            if (seen.has(key)) continue;
            seen.add(key);

            const powerOverlap = isPowerPin(entry.pin) || isPowerPin(match.pin);
            if (powerOverlap) {
              if (normalize(entry.pin.label) !== normalize(match.pin.label)) {
                findings.push(
                  conflict(
                    "power-rail",
                    `Power or ground label differs: ${token}`,
                    "The boards expose similarly named power-related pins with different labels. Verify rail voltage, direction, and grounding in the official documentation.",
                    [entry, match],
                  ),
                );
              }
            }
            if (isRiskPin(entry.pin) || isRiskPin(match.pin)) {
              findings.push(
                conflict(
                  "boot-or-reserved",
                  `Risk-marked pin is reused: ${token}`,
                  "At least one matching pin is marked boot, reserved, flash, debug, or otherwise restricted. Do not assume it is available for the same use on both boards.",
                  [entry, match],
                ),
              );
            }
            if (!powerOverlap && isInterfaceToken(token)) {
              findings.push(
                conflict(
                  "alternate-function",
                  `Alternate interface function overlaps: ${token}`,
                  "The same interface signal appears in alternate-function data on both boards. This is a naming overlap only; mux selection and electrical behavior still require source verification.",
                  [entry, match],
                ),
              );
            }
          }
        }
      }

      // A physical position only has meaning when the connector context is
      // comparable. Group labels are part of the context for grouped maps.
      for (const entry of left.pins) {
        for (const match of right.pins) {
          const leftConnector = entry.connector.split(" · ")[0] ?? entry.connector;
          const rightConnector = match.connector.split(" · ")[0] ?? match.connector;
          if (!comparableConnector(leftConnector, rightConnector)) continue;
          if (entry.group !== match.group || entry.pin.position !== match.pin.position) continue;
          if (normalize(entry.pin.label) === normalize(match.pin.label)) continue;
          const key = pairKey(entry, match, `position-${entry.pin.position}`);
          if (seen.has(key)) continue;
          seen.add(key);
          const kind: PinConflictKind =
            isPowerPin(entry.pin) || isPowerPin(match.pin) ? "power-rail" : "connector-position";
          findings.push(
            conflict(
              kind,
              `Connector position ${entry.pin.position} is mapped differently`,
              "The connector context is comparable, but this physical position carries different labels. Verify the exact board revision and connector orientation before reusing wiring.",
              [entry, match],
            ),
          );
        }
      }

      const sharedInterfaces = left.board.interfaces.filter((item) =>
        right.board.interfaces.includes(item),
      );
      for (const item of sharedInterfaces) {
        const key = `${left.board.id}|${right.board.id}|interface|${item}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push(
          conflict(
            "interface-reuse",
            `Both boards expose ${item}`,
            "This is a shared interface capability, not a pin-level wiring match. Confirm the actual pins, mux state, voltage, and attached peripherals independently.",
            [],
            [left.board.name, right.board.name],
          ),
        );
      }
    }
  }

  // A board's own risk-marked pins remain worth surfacing even if no matching
  // token exists on another board. They are evidence for caution, not a claim
  // that the boards conflict electrically.
  for (const { board, pins } of pinsByBoard) {
    const risky = pins.filter((entry) => isRiskPin(entry.pin));
    if (!risky.length) continue;
    findings.push(
      conflict(
        "boot-or-reserved",
        `${board.name} has boot, reserved, or debug-sensitive pins`,
        "This board includes source-backed pins that are restricted or revision-sensitive. Treat those pins as unavailable until the linked documentation confirms the intended use.",
        risky.slice(0, 12),
      ),
    );
  }

  return findings.slice(0, 80);
}

/** Alias kept descriptive for callers that prefer the word "conflicts". */
export const findPinConflicts = analyzePinConflicts;

export function pinRoleIsRisky(role: PinRole): boolean {
  return role === "reserved" || role === "system";
}
