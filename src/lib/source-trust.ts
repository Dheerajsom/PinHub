import type { Board } from "@/lib/boards";

// Classifies a board's source links as vendor-official or third-party from
// the link's host, so the UI can badge provenance without hand-annotating
// every entry in boards.ts. A link is "official" only when its host (or, for
// GitHub, its organization) belongs to the board's own vendor — an
// authoritative reference published by someone else (e.g. CircuitPython
// pins.c for a SparkFun board) is still labeled third-party, matching the
// content rule that non-vendor references must be clearly marked.

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
  STMicroelectronics: ["st.com"],
  "Lattice Semiconductor": ["latticesemi.com"],
  PJRC: ["pjrc.com"],
  Radxa: ["radxa.com"],
  Particle: ["particle.io"],
  "Nordic Semiconductor": ["nordicsemi.com"],
  NVIDIA: ["nvidia.com"],
  Hardkernel: ["hardkernel.com", "odroid.com"],
  "Texas Instruments": ["ti.com"],
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
  Digilent: ["digilent.com", "digilentinc.com"],
  "Google Coral": ["coral.ai", "google.com", "withgoogle.com"],
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
};

function hostMatchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function parseSafeExternalUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** True when a catalog link is a credential-free, absolute HTTPS URL. */
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
      seenUrls.add(source.url);
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

  const domains = vendorDomains[vendor];
  if (domains?.some((domain) => hostMatchesDomain(host, domain))) {
    return "official";
  }

  if (host === "github.com") {
    const org = parsed.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    const orgs = vendorGitHubOrgs[vendor];
    if (org && orgs?.includes(org)) {
      return "official";
    }
  }

  return "third-party";
}
