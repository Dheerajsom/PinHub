"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { clsx } from "clsx";
import type { Board, Pin, Pinout, SourceLink } from "@/lib/boards";
import { roleLabels } from "@/components/board-visual/roles";
import { siteUrl } from "@/lib/site";
import { classifySource } from "@/lib/source-trust";

/**
 * The board an exported table belongs to. Connector maps are shared between
 * boards (every 40-pin Raspberry Pi uses one), so an export without this is
 * ambiguous once it leaves PinHub: the table no longer says which board or
 * which source it was transcribed from.
 */
export type PinExportBoard = Pick<Board, "id" | "name" | "vendor" | "sourceLinks">;

// The reference an exported table cites: an official pinout first, then any
// official document, then whatever the record lists first.
export function primaryExportSource(board: PinExportBoard): SourceLink | undefined {
  const official = board.sourceLinks.filter(
    (source) => classifySource(board.vendor, source.url) === "official",
  );
  return (
    official.find((source) => source.type === "Pinout") ??
    official[0] ??
    board.sourceLinks[0]
  );
}

export function pinoutPageUrl(boardId: string): string {
  return new URL(`/pinout/${encodeURIComponent(boardId)}`, siteUrl).toString();
}

function markdownLinkLabel(value: string): string {
  return markdownCell(value).replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function markdownLinkTarget(url: string): string {
  // Catalog URLs are validated HTTPS links; percent-encode the characters
  // that would end a Markdown link target early.
  return url.replace(/[()<>\s]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`,
  );
}

export function pinExportFilename(pinout: Pinout, board?: PinExportBoard): string {
  const slug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  const connector = slug(pinout.connector) || "pinout";
  const boardSlug = board ? slug(board.id) : "";
  return `${boardSlug ? `${boardSlug}-` : ""}${connector}.csv`;
}

// Serializes a connector map to a Markdown table so engineers can paste the
// pinout into notes, issues, or firmware docs without retyping it.
function markdownCell(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r\n?|\n/g, "<br>");
}

function pinRow(pin: Pin): string {
  const cells = [
    String(pin.position),
    pin.label,
    roleLabels[pin.role],
    pin.aliases?.join(" / ") ?? "",
    pin.note ?? "",
  ].map(markdownCell);
  return `| ${cells.join(" | ")} |`;
}

export function pinoutToMarkdown(pinout: Pinout, board?: PinExportBoard): string {
  const title = board
    ? `${markdownCell(board.name)} — ${markdownCell(pinout.connector)}`
    : markdownCell(pinout.connector);
  const header = [
    `### ${title}`,
    "",
    "| Pin | Signal | Role | Aliases | Note |",
    "| --- | --- | --- | --- | --- |",
  ];

  const rows: string[] = [];
  if (pinout.pins) {
    rows.push(
      ...[...pinout.pins.left, ...pinout.pins.right]
        .sort((a, b) => a.position - b.position)
        .map(pinRow),
    );
  }
  for (const group of pinout.groups ?? []) {
    rows.push(`| — | **${markdownCell(group.label)}** | | | |`);
    rows.push(...group.pins.map(pinRow));
  }

  const notes = pinout.notes.length
    ? ["", ...pinout.notes.map((note) => `> ${markdownCell(note)}`)]
    : [];

  const source = board ? primaryExportSource(board) : undefined;
  const provenance = board
    ? [
        "",
        [
          source
            ? `Source: [${markdownLinkLabel(source.label)}](${markdownLinkTarget(source.url)})`
            : null,
          `PinHub: ${pinoutPageUrl(board.id)}`,
        ]
          .filter(Boolean)
          .join(" · "),
      ]
    : [];

  return [...header, ...rows, ...notes, ...provenance].join("\n");
}

function csvCell(value: string): string {
  const flattened = value.replace(/[\r\n]+/g, " ");
  // Spreadsheet applications interpret cells beginning with these markers as
  // formulas, even in a quoted CSV field. Prefix a text marker so pin labels
  // such as "+3.3V" remain literal and future catalog text cannot become an
  // executable spreadsheet expression.
  const literal =
    /^[ \t]*[=+\-@]/.test(flattened) || flattened.startsWith("\t")
      ? `'${flattened}`
      : flattened;
  return `"${literal.replace(/"/g, '""')}"`;
}

export function pinoutToCsv(pinout: Pinout, board?: PinExportBoard): string {
  const rows = [["Connector", "Group", "Pin", "Signal", "Role", "Aliases", "Note"]];
  if (pinout.pins) {
    for (const pin of [...pinout.pins.left, ...pinout.pins.right].sort(
      (a, b) => a.position - b.position,
    )) {
      rows.push([
        pinout.connector,
        "",
        String(pin.position),
        pin.label,
        roleLabels[pin.role],
        pin.aliases?.join(" / ") ?? "",
        pin.note ?? "",
      ]);
    }
  }
  for (const group of pinout.groups ?? []) {
    for (const pin of group.pins) {
      rows.push([
        pinout.connector,
        group.label,
        String(pin.position),
        pin.label,
        roleLabels[pin.role],
        pin.aliases?.join(" / ") ?? "",
        pin.note ?? "",
      ]);
    }
  }
  for (const note of pinout.notes) {
    rows.push([
      pinout.connector,
      "",
      "",
      "",
      "",
      "",
      `Connector note: ${note}`,
    ]);
  }
  if (board) {
    const source = primaryExportSource(board);
    rows.push([
      pinout.connector,
      "",
      "",
      "",
      "",
      "",
      `Board: ${board.name}${source ? ` \u00B7 Source: ${source.label} <${source.url}>` : ""} \u00B7 PinHub: ${pinoutPageUrl(board.id)}`,
    ]);
  }
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function CopyPinTable({
  pinout,
  board,
}: {
  pinout: Pinout;
  board?: PinExportBoard;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(pinoutToMarkdown(pinout, board));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopyState("idle"), 2000);
  }

  const copied = copyState === "copied";
  const failed = copyState === "failed";

  const csvFilename = pinExportFilename(pinout, board);
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(pinoutToCsv(pinout, board))}`;

  return (
    <div className="flex shrink-0 flex-wrap gap-1.5">
      <button
        type="button"
        onClick={copy}
        aria-label="Copy pin table as Markdown"
        title="Copy pin table as Markdown"
        className={clsx(
          "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border px-3 py-1 text-[11px] font-medium transition",
          copied
            ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
            : failed
              ? "border-red-400/50 bg-red-400/10 text-red-100"
              : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/25 hover:text-white",
        )}
      >
        {copied ? <Check className="size-3.5" aria-hidden="true" /> : failed ? <X className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
        <span aria-live="polite">{copied ? "Copied" : failed ? "Copy failed" : "Copy table"}</span>
      </button>
      <a
        href={csvHref}
        download={csvFilename}
        aria-label="Download pin table as CSV"
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-zinc-400 transition hover:border-white/25 hover:text-white"
      >
        <Download className="size-3.5" aria-hidden="true" />
        CSV
      </a>
    </div>
  );
}
