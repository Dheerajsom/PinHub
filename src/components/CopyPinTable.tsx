"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { clsx } from "clsx";
import type { Pin, Pinout } from "@/lib/boards";
import { roleLabels } from "@/components/board-visual/roles";

// Serializes a connector map to a Markdown table so engineers can paste the
// pinout into notes, issues, or firmware docs without retyping it.
function markdownCell(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>");
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

export function pinoutToMarkdown(pinout: Pinout): string {
  const header = [
    `### ${pinout.connector}`,
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
    ? ["", ...pinout.notes.map((note) => `> ${note}`)]
    : [];

  return [...header, ...rows, ...notes].join("\n");
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

export function pinoutToCsv(pinout: Pinout): string {
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
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function CopyPinTable({ pinout }: { pinout: Pinout }) {
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
      await navigator.clipboard.writeText(pinoutToMarkdown(pinout));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopyState("idle"), 2000);
  }

  const copied = copyState === "copied";
  const failed = copyState === "failed";

  const csvFilename = `${pinout.connector
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "pinout"}.csv`;
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(pinoutToCsv(pinout))}`;

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
