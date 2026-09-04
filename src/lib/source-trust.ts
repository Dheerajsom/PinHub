import type { Board, SourceLink } from "@/lib/boards";

// Classifies a board's source links as vendor-official or third-party from
// the link's host, so the UI can badge provenance without hand-annotating
// every entry in boards.ts. A link is "official" when its host (or, for
// GitHub, its organization) belongs to the board vendor. The two explicit
// carrier-board exceptions below accept the primary chip/module vendor's
// electrical documentation; other references published by someone else (for
// example CircuitPython pins.c for a SparkFun board) remain third-party.

export type SourceProvenance = "official" | "third-party";

// Registrable domains owned by each vendor. Subdomains (docs., wiki., cdn.,
// datasheets., …) match automatically via suffix comparison.
const vendorDomains: Record<string, string[]> = {
  Arduino: ["arduino.cc"],
  "Raspberry Pi": ["raspberrypi.com", "raspberrypi.org"],
  Adafruit: ["adafruit.com", "circuitpython.org"],
  "Seeed Studio": ["seeedstudio.com"],
  SparkFun: ["sparkfun.com"],
  Espressif: ["espressif.com"],
  // DOIT's 30-pin carrier uses an Espressif module; Espressif's module and
  // chip datasheets are the authoritative electrical references.
  DOIT: ["espressif.com"],
  STMicroelectronics: ["st.com"],
  "Lattice Semiconductor": ["latticesemi.com"],
  PJRC: ["pjrc.com"],
  Radxa: ["radxa.com"],
  Particle: ["particle.io"],
  "Nordic Semiconductor": ["nordicsemi.com"],
  NVIDIA: ["nvidia.com"],
  Hardkernel: ["hardkernel.com", "odroid.com"],
  "Texas Instruments": ["ti.com"],
  "NXP Semiconductors": ["nxp.com"],
  Terasic: ["terasic.com", "terasic.com.tw"],
  Pine64: ["pine64.org"],
  LOLIN: ["wemos.cc"],
  "BeagleBoard.org": ["beagleboard.org"],
  BeagleBoard: ["beagleboard.org"],
  "Banana Pi": ["banana-pi.org"],
  Waveshare: ["waveshare.com"],
  "Silicon Labs": ["silabs.com"],
  "Orange Pi": ["orangepi.org", "orangepi.net"],
  "Milk-V": ["milkv.io"],
  "Micro:bit Educational Foundation": ["microbit.org"],
  "Libre Computer": ["libre.computer"],
  Khadas: ["khadas.com"],
  // StarFive publishes VisionFive documentation on its RVspace doc portal;
  // the guides carry StarFive document ids and StarFive copyright.
  StarFive: ["starfivetech.com", "rvspace.org"],
  "Flipper Devices": ["flipperzero.one", "flipper.net"],
  Digilent: ["digilent.com", "digilentinc.com"],
  // Coral's product documentation lives on coral.ai. Broad Google domains
  // include user-published surfaces (for example Sites and Drive), so they
  // must not earn an "official" hardware-source badge automatically.
  "Google Coral": ["coral.ai"],
  // Blue Pill boards are generic STM32F103 designs without a single board
  // vendor; ST's MCU datasheet is their authoritative primary reference.
  Generic: ["st.com"],
};

// GitHub organizations that count as the vendor publishing under github.com.
const vendorGitHubOrgs: Record<string, string[]> = {
  "WeAct Studio": ["weactstudio"],
  LilyGO: ["xinyuan-lilygo"],
  NodeMCU: ["nodemcu"],
  SparkFun: ["sparkfun"],
  Adafruit: ["adafruit"],
  "Raspberry Pi": ["raspberrypi"],
  Digilent: ["digilent"],
  "Flipper Devices": ["flipperdevices"],
};

function hostMatchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function isNonPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return (
    !host.includes(".") ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) ||
    (host.startsWith("[") && host.endsWith("]"))
  );
}

function parseSafeExternalUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname ||
      parsed.port ||
      parsed.username ||
      parsed.password ||
      isNonPublicHost(parsed.hostname)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** True for public, credential-free HTTPS URLs on the default port. */
export function isSafeExternalUrl(url: string): boolean {
  return parseSafeExternalUrl(url) !== null;
}

/**
 * Validates the static link data before it is rendered into external anchors.
 * This makes an unsafe scheme or an accidental duplicate a build failure
 * rather than a client-side surprise.
 */
export function validateBoardSources(boards: readonly Board[]): string[] {
  const errors: string[] = [];

  for (const board of boards) {
    if (board.sourceLinks.length === 0) {
      errors.push(`Board "${board.id}" has no source links.`);
      continue;
    }

    const seenUrls = new Set<string>();
    let hasOfficialSource = false;
    for (const source of board.sourceLinks) {
      if (!isSafeExternalUrl(source.url)) {
        errors.push(
          `Board "${board.id}" has an unsafe source URL for "${source.label}".`,
        );
      }
      if (seenUrls.has(source.url)) {
        errors.push(
          `Board "${board.id}" repeats source URL "${source.url}".`,
        );
      }
      if (classifySource(board.vendor, source.url) === "official") {
        hasOfficialSource = true;
      }
      seenUrls.add(source.url);
    }
    if (!hasOfficialSource) {
      errors.push(`Board "${board.id}" has no official source link.`);
    }
  }

  return errors;
}

/** Throws when source links would be unsafe or incomplete to render. */
export function assertBoardSourcesValid(boards: readonly Board[]): void {
  const errors = validateBoardSources(boards);
  if (errors.length > 0) {
    throw new Error(
      `Board source validation failed (${errors.length}):\n` +
        errors.slice(0, 20).join("\n"),
    );
  }
}

export function classifySource(
  vendor: string,
  url: string,
): SourceProvenance {
  const parsed = parseSafeExternalUrl(url);
  if (!parsed) return "third-party";
  const host = parsed.hostname.toLowerCase();

  const domains = Object.hasOwn(vendorDomains, vendor) ? vendorDomains[vendor] : undefined;
  if (domains?.some((domain) => hostMatchesDomain(host, domain))) {
    return "official";
  }

  if (host === "github.com") {
    const org = parsed.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    const orgs = Object.hasOwn(vendorGitHubOrgs, vendor) ? vendorGitHubOrgs[vendor] : undefined;
    if (org && orgs?.includes(org)) {
      return "official";
    }
  }

  return "third-party";
}

const verificationTypeScore: Record<SourceLink["type"], number> = {
  // A source that depicts the connector itself is more useful for the
  // "verify before wiring" action than a component datasheet, even when the
  // only exact carrier-board map is clearly labeled third-party.
  Pinout: 2000,
  Schematic: 800,
  Datasheet: 70,
  Manual: 60,
  Docs: 50,
};

function verificationSourceScore(board: Board, source: SourceLink): number {
  const official = classifySource(board.vendor, source.url) === "official";
  const searchable = `${source.label} ${source.url}`;
  const connectorSpecific = /pinout|gpio|connector|header/i.test(searchable);

  return (
    (official ? 1000 : 0) +
    (connectorSpecific ? 200 : 0) +
    verificationTypeScore[source.type]
  );
}

/** Select the source most useful for checking the displayed physical map. */
export function verificationSourceFor(board: Board): SourceLink | undefined {
  return board.sourceLinks.reduce<SourceLink | undefined>((best, source) => {
    if (!best) return source;
    return verificationSourceScore(board, source) >
      verificationSourceScore(board, best)
      ? source
      : best;
  }, undefined);
}
