/**
 * Typed hardware data model shared by all renderers. Designed so the data can
 * eventually be shared with the PinHub Next.js site — no renderer concerns
 * belong in here.
 */

export type PinCategory =
  | "power"
  | "ground"
  | "gpio"
  | "analog"
  | "digital"
  | "communication"
  | "special"
  | "reserved"
  | "nc";

export type WarningSeverity = "danger" | "warning" | "info";

export type Warning = {
  severity: WarningSeverity;
  text: string;
};

export type SourceType = "Docs" | "Datasheet" | "Manual" | "Schematic" | "Pinout";

export type Source = {
  title: string;
  url: string;
  official: boolean;
  /** What the source documents, used to prefer an exact pin map for wiring. */
  type?: SourceType;
};

export type Pin = {
  /** Physical pin number as printed or conventionally counted on the board. */
  physical: number;
  /** Grid position within the header (1-based). */
  position: {
    row: number;
    column: number;
  };
  label: string;
  gpio?: string;
  functions?: string[];
  category: PinCategory;
  voltage?: string;
  notes?: string[];
};

export type Header = {
  id: string;
  name: string;
  description?: string;
  layout: {
    rows: number;
    columns: number;
  };
  pins: Pin[];
};

export type Board = {
  id: string;
  name: string;
  manufacturer: string;
  aliases: string[];
  description?: string;
  revisionNote?: string;
  warnings: Warning[];
  sources: Source[];
  headers: Header[];
};
