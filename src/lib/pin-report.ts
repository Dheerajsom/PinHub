import type { Board, Pin } from "@/lib/boards";
import { isBoardId } from "@/lib/board-id";
import { repoUrl } from "@/lib/site";
import { isSafeExternalUrl, verificationSourceFor } from "@/lib/source-trust";

// Builds the "Report a pin error" link: a plain URL to a pre-filled GitHub
// issue form. PinHub sends nothing itself; the engineer reviews the form and
// submits it under their own GitHub account. Only catalog data goes into the
// URL, never text a visitor typed.

/** The issue form in `.github/ISSUE_TEMPLATE/`. */
export const pinReportTemplate = "pin-data-error.yml";

/**
 * Issue-form field ids. GitHub prefills a form field from the query parameter
 * with the same id, so each value here must match an `id:` in the template (a
 * unit test reads the YAML to keep them in step).
 */
export const pinReportFields = {
  board: "board",
  pin: "pin",
  connector: "connector",
  problem: "problem",
  expected: "expected",
  evidence: "evidence",
  revision: "revision",
  source: "pinhub_source",
} as const;

/** Longest single prefilled value, in characters. */
export const maxPinReportValueLength = 200;
/** Longest report URL PinHub will link to (browsers and GitHub both cope). */
export const maxPinReportUrlLength = 2000;

export type PinReportPin = Pick<Pin, "position" | "label"> & {
  /** The connector group, for grouped layouts that reuse positions. */
  group?: string;
};

/** What a view knows about the pin map it shows, before a pin is chosen. */
export type PinReportContext = {
  board: Pick<Board, "id" | "name">;
  connector?: string;
  /** URL of the source PinHub cites for this pin map. */
  source?: string;
};

export type PinReportInput = PinReportContext & { pin?: PinReportPin };

// C0/C1 controls (including newlines and tabs), zero-width and bidirectional
// formatting characters, and line/paragraph separators. None belongs in a
// one-line form value, and bidi overrides could disguise what a value says.
const unsafeCharacters =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]+/g;

function clean(value: string | undefined): string {
  if (typeof value !== "string") return "";
  const text = value.replace(unsafeCharacters, " ").replace(/\s+/g, " ").trim();
  // Count code points so a cut never splits a surrogate pair.
  const characters = Array.from(text);
  return characters.length > maxPinReportValueLength
    ? `${characters.slice(0, maxPinReportValueLength - 1).join("").trimEnd()}…`
    : text;
}

function buildUrl(params: [string, string][]): string {
  const query = new URLSearchParams(
    params.filter(([, value]) => value !== ""),
  ).toString();
  // URLSearchParams writes spaces as "+" and a literal plus as "%2B", so every
  // remaining "+" is a space. %20 reads as a space to every query parser.
  return `${repoUrl}/issues/new?${query.replace(/\+/g, "%20")}`;
}

/**
 * The pre-filled "new issue" URL for a pin (or, without `pin`, the whole
 * board), or null when the board id is not a catalog-shaped id or the report
 * cannot fit a safe URL length.
 */
export function pinReportUrl(input: PinReportInput): string | null {
  const id = input.board?.id;
  if (!isBoardId(id)) return null;

  const name = clean(input.board.name) || id;
  let pinValue = "";
  let title = `Board data: ${name}`;
  if (input.pin) {
    const { position } = input.pin;
    if (!Number.isSafeInteger(position) || position < 0) return null;
    const label = clean(input.pin.label);
    pinValue = clean(label ? `${position} · ${label}` : String(position));
    title = `Pin data: ${name} pin ${position}${label ? ` (${label})` : ""}`;
  }

  // Grouped layouts reuse positions across groups (an UNO has a "14" in both
  // Digital and Analog), so the group travels with the connector.
  const connector = clean(
    [input.connector, input.pin?.group]
      .map((part) => clean(part))
      .filter(Boolean)
      .join(" · "),
  );
  // A URL is linked whole or not at all: one that is unsafe, too long to fit a
  // value, or that carries characters `clean` would rewrite is dropped rather
  // than trimmed into a different (broken) address.
  const source =
    typeof input.source === "string" &&
    isSafeExternalUrl(input.source) &&
    input.source.length <= maxPinReportValueLength &&
    clean(input.source) === input.source
      ? input.source
      : "";

  const required: [string, string][] = [
    ["template", pinReportTemplate],
    ["title", clean(title)],
    [pinReportFields.board, id],
    [pinReportFields.pin, pinValue],
  ];
  // Optional context is dropped, least useful first, until the link fits.
  const optional: [string, string][] = [
    [pinReportFields.connector, connector],
    [pinReportFields.source, source],
  ];
  for (let keep = optional.length; keep >= 0; keep -= 1) {
    const url = buildUrl([...required, ...optional.slice(0, keep)]);
    if (url.length < maxPinReportUrlLength) return url;
  }
  return null;
}

/** The report context for a board's pin map: its connector and cited source. */
export function pinReportContextFor(board: Board): PinReportContext {
  return {
    board: { id: board.id, name: board.name },
    connector: board.pinout?.connector,
    source: verificationSourceFor(board)?.url,
  };
}
