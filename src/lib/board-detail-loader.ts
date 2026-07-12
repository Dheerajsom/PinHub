import type { Board } from "@/lib/boards";

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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPin(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.position === "number" &&
    Number.isFinite(value.position) &&
    typeof value.label === "string" &&
    typeof value.role === "string" &&
    (value.aliases === undefined || isStringArray(value.aliases)) &&
    (value.note === undefined || typeof value.note === "string")
  );
}

function isPinArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isPin);
}

function isPinout(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.connector !== "string" || !isStringArray(value.notes)) {
    return false;
  }

  if (value.layout === "dual-row") {
    return (
      isRecord(value.pins) &&
      isPinArray(value.pins.left) &&
      isPinArray(value.pins.right)
    );
  }

  if (value.layout === "grouped") {
    return (
      Array.isArray(value.groups) &&
      value.groups.every(
        (group) =>
          isRecord(group) &&
          typeof group.label === "string" &&
          isPinArray(group.pins),
      )
    );
  }

  return false;
}

export function isBoardPayload(value: unknown, expectedId: string): value is Board {
  if (!isRecord(value) || value.id !== expectedId) return false;

  const requiredStrings = [
    "name",
    "vendor",
    "category",
    "family",
    "processor",
    "logicLevel",
    "power",
    "formFactor",
    "description",
  ] as const;
  if (!requiredStrings.every((key) => typeof value[key] === "string")) {
    return false;
  }

  const requiredStringArrays = [
    "tags",
    "interfaces",
    "highlights",
    "warnings",
  ] as const;
  if (!requiredStringArrays.every((key) => isStringArray(value[key]))) {
    return false;
  }

  if (
    !Array.isArray(value.sourceLinks) ||
    !value.sourceLinks.every(
      (source) =>
        isRecord(source) &&
        typeof source.label === "string" &&
        typeof source.url === "string" &&
        typeof source.type === "string",
    )
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
