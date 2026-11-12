"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { SourceRange } from "@/lib/code-check/scan";
import { statusGlyph } from "@/components/check/status";

export type EditorMark = {
  start: number;
  end: number;
  status: "fix" | "check" | "clear" | "missing";
  pinId: string | null;
};

export type EditorHint = { text: string; status: EditorMark["status"]; pinId: string | null };

export type CodeEditorHandle = {
  /** Scrolls a line into the middle of the editor without moving focus (no keyboard on phones). */
  revealLine: (line: number) => void;
  /** Scrolls an offset's line and column into view without moving focus. */
  revealOffset: (offset: number) => void;
  /** Empties the editor through the browser's own editing, so undo brings the code back. */
  clear: () => void;
  focus: () => void;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  marks: readonly EditorMark[];
  ranges: readonly SourceRange[];
  hints: ReadonlyMap<number, EditorHint[]>;
  selectedPin: string | null;
  onCaret: (offset: number) => void;
  /** Indenting never grows the code past this; pasted text is bounded by the owner. */
  maxLength: number;
  placeholder: string;
  labelId: string;
  describedBy?: string;
};

/** Matches `--check-line`; the computed value is read when it is available. */
const FALLBACK_LINE_HEIGHT = 22;
const indentUnit = "  ";
const modifierKeys = new Set(["Shift", "Control", "Alt", "Meta"]);

type Piece = { from: number; to: number; className?: string; mark?: EditorMark };

/**
 * Splits [0, length) into pieces carrying comment/string tint and pin marks.
 * Marks never overlap (the scanner reports one argument span per use), and a
 * mark inside a comment cannot occur because comments are masked.
 */
function pieces(length: number, ranges: readonly SourceRange[], marks: readonly EditorMark[]): Piece[] {
  const cuts = new Set<number>([0, length]);
  for (const range of ranges) {
    cuts.add(Math.min(range.start, length));
    cuts.add(Math.min(range.end, length));
  }
  for (const mark of marks) {
    cuts.add(Math.min(mark.start, length));
    cuts.add(Math.min(mark.end, length));
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out: Piece[] = [];
  let r = 0;
  let m = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i];
    const to = points[i + 1];
    if (from === to) continue;
    while (r < ranges.length && ranges[r].end <= from) r += 1;
    while (m < marks.length && marks[m].end <= from) m += 1;
    const range = ranges[r] && ranges[r].start <= from ? ranges[r] : undefined;
    const mark = marks[m] && marks[m].start <= from ? marks[m] : undefined;
    out.push({
      from,
      to,
      className: range ? (range.kind === "comment" ? "ph-check-tok-comment" : "ph-check-tok-string") : undefined,
      mark,
    });
  }
  return out;
}

/** A styled run inside one line, with offsets relative to the line start. */
type Seg = { from: number; to: number; className?: string; status?: EditorMark["status"]; pinId?: string | null };

type LineProps = {
  text: string;
  segs: readonly Seg[];
  /** Identity of `segs`, so a line re-renders only when its own runs change. */
  segKey: string;
  hints: readonly EditorHint[] | undefined;
  /** The selected pin, passed only to the lines that draw it. */
  selectedPin: string | null;
};

const MirrorLine = memo(
  function MirrorLine({ text, segs, hints, selectedPin }: LineProps) {
    const nodes: ReactNode[] = segs.length
      ? segs.map((seg) => {
          const part = text.slice(seg.from, seg.to);
          if (seg.status) {
            return (
              <mark
                key={seg.from}
                className="ph-check-mark"
                data-status={seg.status}
                data-selected={seg.pinId && seg.pinId === selectedPin ? "" : undefined}
              >
                {part}
              </mark>
            );
          }
          return seg.className ? (
            <span key={seg.from} className={seg.className}>
              {part}
            </span>
          ) : (
            part
          );
        })
      : [text];
    return (
      <span className="ph-check-line">
        {nodes}
        {hints?.length ? (
          <span className="ph-check-hints">
            {hints.map((hint, index) => (
              <span
                key={index}
                className="ph-check-hint"
                data-status={hint.status}
                data-selected={hint.pinId !== null && hint.pinId === selectedPin ? "" : undefined}
              >
                <span className="ph-check-hint-glyph" aria-hidden="true">{statusGlyph[hint.status]}</span>
                {hint.text}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    );
  },
  (a, b) => a.text === b.text && a.segKey === b.segKey && a.hints === b.hints && a.selectedPin === b.selectedPin,
);

const Gutter = memo(function Gutter({ count, status }: { count: number; status: ReadonlyMap<number, "fix" | "check"> }) {
  const rows: ReactNode[] = [];
  for (let index = 0; index < count; index += 1) {
    rows.push(
      <span key={index} className="ph-check-gutter-line" data-status={status.get(index + 1)}>
        {index + 1}
      </span>,
    );
  }
  return <>{rows}</>;
});

/**
 * Edits through the browser's own editing command so the change joins the
 * textarea's undo stack; falls back to setRangeText plus an input event.
 */
function insertText(area: HTMLTextAreaElement, text: string) {
  const { selectionStart, selectionEnd, value: before } = area;
  if (!text && selectionStart === selectionEnd) return;
  area.focus();
  let done = false;
  try {
    done = typeof document.execCommand === "function" && document.execCommand(text ? "insertText" : "delete", false, text);
  } catch {
    done = false;
  }
  if (done && area.value !== before) return;
  area.setRangeText(text, selectionStart, selectionEnd, "end");
  area.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Tab indents every line the selection touches (or inserts at a caret); Shift+Tab outdents. */
function indentLines(area: HTMLTextAreaElement, outdent: boolean, maxLength: number) {
  const { value, selectionStart: start, selectionEnd: end } = area;
  if (!outdent && start === end) {
    if (value.length + indentUnit.length <= maxLength) insertText(area, indentUnit);
    return;
  }
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lastEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const found = value.indexOf("\n", lastEnd);
  const blockEnd = found === -1 ? value.length : found;
  let firstDelta = 0;
  let total = 0;
  const next = value
    .slice(lineStart, blockEnd)
    .split("\n")
    .map((line, index) => {
      let out: string;
      if (outdent) {
        const remove = line.startsWith("\t") ? 1 : line.startsWith(indentUnit) ? 2 : line.startsWith(" ") ? 1 : 0;
        out = line.slice(remove);
      } else {
        out = indentUnit + line;
      }
      const delta = out.length - line.length;
      if (index === 0) firstDelta = delta;
      total += delta;
      return out;
    })
    .join("\n");
  if (!total || value.length + total > maxLength) return;
  area.setSelectionRange(lineStart, blockEnd);
  insertText(area, next);
  const nextStart = Math.max(lineStart, start + firstDelta);
  area.setSelectionRange(nextStart, start === end ? nextStart : Math.max(nextStart, end + total));
}

function characterWidth(area: HTMLTextAreaElement): number {
  const style = getComputedStyle(area);
  const fallback = (parseFloat(style.fontSize) || 13) * 0.6;
  try {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) return fallback;
    context.font = `${style.fontSize} ${style.fontFamily}`;
    return context.measureText("0").width || fallback;
  } catch {
    return fallback;
  }
}

/**
 * A plain textarea over a mirrored <pre>. The textarea owns editing, caret,
 * selection, IME and undo, with its text made transparent; the mirror draws
 * the same text with pin references underlined in their status color and a
 * hint after each line that names the pins it touches. Lines never wrap and
 * every mirror line is exactly one line tall, so both layers keep the same
 * geometry and only scroll needs syncing.
 */
export const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor(
  { value, onChange, marks, ranges, hints, selectedPin, onCaret, maxLength, placeholder, labelId, describedBy },
  ref,
) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const sync = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    if (mirrorRef.current) {
      mirrorRef.current.scrollTop = area.scrollTop;
      mirrorRef.current.scrollLeft = area.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.style.transform = `translateY(${-area.scrollTop}px)`;
  }, []);

  const scrollArea = useCallback(
    (line: number, column: number | null) => {
      const area = areaRef.current;
      if (!area) return;
      const style = getComputedStyle(area);
      const lineHeight = parseFloat(style.lineHeight) || FALLBACK_LINE_HEIGHT;
      const top = Math.max(0, (line - 1) * lineHeight - area.clientHeight / 3);
      let left = area.scrollLeft;
      if (column !== null) {
        const pad = parseFloat(style.paddingLeft) || 0;
        const x = pad + column * characterWidth(area);
        if (x < area.scrollLeft + pad || x + 6 * characterWidth(area) > area.scrollLeft + area.clientWidth - pad) {
          left = Math.max(0, x - area.clientWidth / 3);
        }
      }
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      area.scrollTo({ top, left, behavior: reduce ? "auto" : "smooth" });
      if (reduce) sync();
    },
    [sync],
  );

  useImperativeHandle(
    ref,
    () => ({
      revealLine(line: number) {
        scrollArea(line, null);
      },
      revealOffset(offset: number) {
        const text = areaRef.current?.value ?? "";
        const at = Math.max(0, Math.min(offset, text.length));
        const lineStart = text.lastIndexOf("\n", at - 1) + 1;
        let line = 1;
        for (let index = text.indexOf("\n"); index !== -1 && index < lineStart; index = text.indexOf("\n", index + 1)) line += 1;
        scrollArea(line, at - lineStart);
      },
      clear() {
        const area = areaRef.current;
        if (!area) return;
        area.focus();
        if (!area.value) return;
        area.select();
        insertText(area, "");
      },
      focus() {
        areaRef.current?.focus();
      },
    }),
    [scrollArea],
  );

  const lines = useMemo(() => value.split("\n"), [value]);

  const lineStatus = useMemo(() => {
    const status = new Map<number, "fix" | "check">();
    for (const [line, items] of hints) {
      if (items.some((item) => item.status === "fix")) status.set(line, "fix");
      else if (items.some((item) => item.status === "check" || item.status === "missing")) status.set(line, "check");
    }
    return status;
  }, [hints]);

  // Runs per line, relative to the line start. Only lines whose text, runs,
  // hints or selection change re-render (MirrorLine is memoised).
  const lineSegs = useMemo(() => {
    const all = pieces(value.length, ranges, marks);
    const out: { segs: Seg[]; key: string; pins: Set<string> | null }[] = [];
    let p = 0;
    let start = 0;
    for (const line of lines) {
      const end = start + line.length;
      const segs: Seg[] = [];
      let styled = false;
      let pins: Set<string> | null = null;
      while (p < all.length && all[p].from < end) {
        const piece = all[p];
        const from = Math.max(piece.from, start) - start;
        const to = Math.min(piece.to, end) - start;
        if (to > from) {
          const seg: Seg = { from, to, className: piece.className, status: piece.mark?.status, pinId: piece.mark?.pinId };
          if (seg.className || seg.status) styled = true;
          if (seg.pinId) (pins ??= new Set()).add(seg.pinId);
          segs.push(seg);
        }
        // A piece that runs past this line is picked up again by the next one.
        if (piece.to <= end) p += 1;
        else break;
      }
      if (!styled) out.push({ segs: [], key: "", pins: null });
      else {
        out.push({
          segs,
          key: segs.map((seg) => `${seg.from},${seg.to},${seg.className ?? ""},${seg.status ?? ""},${seg.pinId ?? ""}`).join(";"),
          pins,
        });
      }
      start = end + 1;
    }
    return out;
  }, [value.length, ranges, marks, lines]);

  return (
    <div className="ph-check-code">
      <div className="ph-check-gutter" aria-hidden="true">
        <div ref={gutterRef} className="ph-check-gutter-inner">
          <Gutter count={lines.length} status={lineStatus} />
        </div>
      </div>
      <div className="ph-check-surface">
        <pre ref={mirrorRef} className="ph-check-layer ph-check-mirror" aria-hidden="true">
          {value
            ? lines.map((text, index) => {
                const run = lineSegs[index];
                const lineHints = hints.get(index + 1);
                const drawsSelected =
                  selectedPin !== null &&
                  (Boolean(run?.pins?.has(selectedPin)) || Boolean(lineHints?.some((hint) => hint.pinId === selectedPin)));
                return (
                  <MirrorLine
                    key={index}
                    text={text}
                    segs={run?.segs ?? []}
                    segKey={run?.key ?? ""}
                    hints={lineHints}
                    selectedPin={drawsSelected ? selectedPin : null}
                  />
                );
              })
            : <span className="ph-check-placeholder">{placeholder}</span>}
          {"\n"}
        </pre>
        <textarea
          ref={areaRef}
          className="ph-check-layer ph-check-input"
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          onScroll={sync}
          onSelect={(event) => onCaret(event.currentTarget.selectionStart)}
          onBlur={(event) => {
            delete event.currentTarget.dataset.tabExit;
          }}
          onKeyDown={(event) => {
            // Tab indents inside the editor; Escape gives the next Tab back to page navigation.
            const area = event.currentTarget;
            if (event.key === "Escape") {
              area.dataset.tabExit = "";
              return;
            }
            if (event.key !== "Tab") {
              if (!modifierKeys.has(event.key)) delete area.dataset.tabExit;
              return;
            }
            if (area.dataset.tabExit !== undefined) {
              delete area.dataset.tabExit;
              return;
            }
            if (event.ctrlKey || event.altKey || event.metaKey) return;
            event.preventDefault();
            indentLines(area, event.shiftKey, maxLength);
          }}
        />
      </div>
    </div>
  );
});
