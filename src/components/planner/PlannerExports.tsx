"use client";

import { useEffect, useId, useRef, useState } from "react";
import { clsx } from "clsx";
import { Check, Copy, Download } from "lucide-react";
import type { PlanExport } from "@/lib/pin-plan-export";

/** The plan as a file: pick a format, preview it, copy or download it. */
export function PlannerExports({ exports }: { exports: PlanExport[] }) {
  const [format, setFormat] = useState(exports[0]?.format);
  const [feedback, setFeedback] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelId = useId();
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const current = exports.find((item) => item.format === format) ?? exports[0];
  if (!current) return null;

  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(current.text);
      setFeedback(`Copied the ${current.label} export.`);
    } catch {
      setFeedback("Couldn’t copy. Check clipboard permission and try again.");
    }
    timer.current = setTimeout(() => setFeedback(""), 3000);
  }

  return (
    <section aria-labelledby={labelId} className="surface-panel min-w-0 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={labelId} className="text-[15px] font-semibold tracking-tight text-white">
          Export
        </h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Export format">
          {exports.map((item) => (
            <button
              key={item.format}
              type="button"
              aria-pressed={item.format === current.format}
              onClick={() => setFormat(item.format)}
              className={clsx(
                "min-h-11 rounded-md border px-3 font-medium transition",
                item.format === current.format
                  ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-50"
                  : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/25 hover:text-white",
              )}
            >
              <span className="text-[12px]">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 break-all font-mono text-[11px] text-zinc-500">{current.filename}</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            {feedback.startsWith("Copied") ? (
              <Check className="size-3.5 text-emerald-300" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
            <span className="text-[12px]">Copy</span>
          </button>
          <a
            href={`data:${current.mimeType};charset=utf-8,${encodeURIComponent(current.text)}`}
            download={current.filename}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-[12px] font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Download
          </a>
        </div>
      </div>
      <pre
        tabIndex={0}
        aria-label={`${current.label} export preview`}
        className="surface-well mt-2 max-h-72 overflow-auto rounded-md p-3 font-mono text-[11px] leading-5 text-zinc-300"
      >
        <code>{current.text}</code>
      </pre>
      <p role="status" aria-live="polite" className={feedback ? "mt-1 text-[12px] text-zinc-400" : "sr-only"}>
        {feedback}
      </p>
    </section>
  );
}
