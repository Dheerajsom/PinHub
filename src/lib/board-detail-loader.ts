import type { Board } from "@/lib/boards";
import { isSafeExternalUrl } from "@/lib/source-trust";

const boardCategories = new Set([
  "SBC",
  "Microcontroller",
  "AI Dev Kit",
  "Development Board",
]);
const boardInterfaces = new Set([
  "GPIO",
  "I2C",
  "SPI",
  "UART",
  "ADC",
  "DAC",
  "PWM",
  "CAN",
  "USB",
  "Wi-Fi",
  "Bluetooth",
  "Zigbee",
  "Thread",
  "CSI",
  "PCIe",
  "SWD",
  "JTAG",
  "Ethernet",
]);
const pinRoles = new Set([
  "power",
  "ground",
  "gpio",
  "i2c",
  "spi",
  "uart",
  "adc",
  "dac",
  "pwm",
  "debug",
  "system",
  "special",
  "reserved",
]);
const sourceTypes = new Set([
  "Docs",
  "Pinout",
  "Datasheet",
  "Schematic",
  "Manual",
]);

export type BoardDetailLoader = {
  load: (id: string) => Promise<Board>;
  peek: (id: string) => Board | undefined;
};

type BoardFetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCleanStringArray(
  value: unknown,
  { allowEmpty = true }: { allowEmpty?: boolean } = {},
): value is string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) return false;

  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") return false;
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
  }
  return true;
}

type PayloadPin = {
  position: number;
  label: string;
  role: string;
  aliases?: string[];
  note?: string;
};

function isPin(value: unknown): value is PayloadPin {
  if (!isRecord(value)) return false;
  return (
    typeof value.position === "number" &&
    Number.isSafeInteger(value.position) &&
    value.position > 0 &&
    typeof value.label === "string" &&
    value.label.trim().length > 0 &&
    typeof value.role === "string" &&
    pinRoles.has(value.role) &&
    (value.aliases === undefined || isCleanStringArray(value.aliases)) &&
    (value.note === undefined ||
      (typeof value.note === "string" && value.note.trim().length > 0))
  );
}

function isPinArray(value: unknown): value is PayloadPin[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isPin) &&
    new Set(value.map((pin) => pin.position)).size === value.length
  );
}

function isPinGroup(
  value: unknown,
): value is { label: string; pins: PayloadPin[] } {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    value.label.trim().length > 0 &&
    isPinArray(value.pins)
  );
}

function isPinout(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (
    typeof value.connector !== "string" ||
    value.connector.trim().length === 0 ||
    !isCleanStringArray(value.notes, { allowEmpty: false })
  ) {
    return false;
  }

  if (value.layout === "dual-row") {
    if (
      !isRecord(value.pins) ||
      !isPinArray(value.pins.left) ||
      !isPinArray(value.pins.right)
    ) {
      return false;
    }
    const pins = [...value.pins.left, ...value.pins.right];
    return new Set(pins.map((pin) => pin.position)).size === pins.length;
  }

  if (value.layout === "grouped") {
    const { groups } = value;
    if (
      !Array.isArray(groups) ||
      groups.length === 0 ||
      !groups.every(isPinGroup)
    ) {
      return false;
    }
    return (
      new Set(groups.map((group) => group.label.trim())).size === groups.length
    );
  }

  return false;
}

export function isBoardPayload(value: unknown, expectedId: string): value is Board {
  if (!isRecord(value) || value.id !== expectedId) return false;

  // `category` and `interfaces` are checked below against their allowed value
  // sets, which subsumes the plain string/string[] checks for those two keys.
  const requiredStrings = [
    "name",
    "vendor",
    "family",
    "processor",
    "logicLevel",
    "power",
    "formFactor",
    "description",
  ] as const;
  if (
    !requiredStrings.every(
      (key) => typeof value[key] === "string" && value[key].trim().length > 0,
    )
  ) {
    return false;
  }

  const { category, interfaces } = value;
  if (typeof category !== "string" || !boardCategories.has(category)) {
    return false;
  }
  if (
    !isCleanStringArray(interfaces) ||
    !interfaces.every((item) => boardInterfaces.has(item))
  ) {
    return false;
  }

  const { tags, highlights, warnings } = value;
  if (
    !isCleanStringArray(tags) ||
    !isCleanStringArray(highlights) ||
    !isCleanStringArray(warnings, { allowEmpty: false })
  ) {
    return false;
  }

  if (!Array.isArray(value.sourceLinks) || value.sourceLinks.length === 0) {
    return false;
  }
  if (
    !value.sourceLinks.every(
      (source) =>
        isRecord(source) &&
        typeof source.label === "string" &&
        source.label.trim().length > 0 &&
        typeof source.url === "string" &&
        typeof source.type === "string" &&
        sourceTypes.has(source.type) &&
        isSafeExternalUrl(source.url),
    ) ||
    new Set(value.sourceLinks.map((source) => source.url)).size !==
      value.sourceLinks.length
  ) {
    return false;
  }

  return value.pinout === undefined || isPinout(value.pinout);
}

/**
 * Creates one detail loader for a catalog session. Successful records are
 * cached and concurrent requests for the same board share one promise. Failed
 * or invalid requests are always removed from the pending map so a later user
 * retry can issue a fresh request.
 */
export function createBoardDetailLoader(
  initialBoards: Iterable<Board>,
  fetchBoard: BoardFetcher = globalThis.fetch,
): BoardDetailLoader {
  const cache = new Map(
    Array.from(initialBoards, (board) => [board.id, board] as const),
  );
  const pending = new Map<string, Promise<Board>>();

  const load = (id: string): Promise<Board> => {
    const cached = cache.get(id);
    if (cached) return Promise.resolve(cached);

    const inFlight = pending.get(id);
    if (inFlight) return inFlight;

    const request = fetchBoard(`/api/boards/${encodeURIComponent(id)}`, {
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Board request failed (${response.status})`);
        }

        const payload: unknown = await response.json();
        if (!isBoardPayload(payload, id)) {
          throw new Error("Board response was invalid");
        }

        cache.set(id, payload);
        return payload;
      })
      .finally(() => {
        pending.delete(id);
      });

    pending.set(id, request);
    return request;
  };

  return {
    load,
    peek: (id) => cache.get(id),
  };
}
