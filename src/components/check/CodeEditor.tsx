"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { SourceRange } from "@/lib/code-check/scan";

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
  maxLength: number;
  placeholder: string;
  labelId: string;
  describedBy?: string;
};

/** Matches `--check-line`; the computed value is read when it is available. */
const FALLBACK_LINE_HEIGHT = 22;

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

const hintGlyph: Record<EditorMark["status"], string> = { fix: "!", check: "!", clear: "✓", missing: "?" };

/**
 * A plain textarea over a mirrored <pre>. The textarea owns editing, caret,
 * selection, IME and undo, with its text made transparent; the mirror draws
 * the same text with pin references underlined in their status color and a
 * hint after each line that names the pins it touches. Lines never wrap, so
 * both layers keep the same geometry and only scroll needs syncing.
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

  useImperativeHandle(
    ref,
    () => ({
      revealLine(line: number) {
        const area = areaRef.current;
        if (!area) return;
        const lineHeight = parseFloat(getComputedStyle(area).lineHeight) || FALLBACK_LINE_HEIGHT;
        const target = Math.max(0, (line - 1) * lineHeight - area.clientHeight / 3);
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        area.scrollTo({ top: target, behavior: reduce ? "auto" : "smooth" });
        if (reduce) sync();
      },
      focus() {
        areaRef.current?.focus();
      },
    }),
    [sync],
  );

  const lines = useMemo(() => value.split("\n"), [value]);
  const lineStarts = useMemo(() => {
    const starts: number[] = [];
    let offset = 0;
    for (const line of lines) {
      starts.push(offset);
      offset += line.length + 1;
    }
    return starts;
  }, [lines]);

  const lineStatus = useMemo(() => {
    const status = new Map<number, "fix" | "check">();
    for (const [line, items] of hints) {
      if (items.some((item) => item.status === "fix")) status.set(line, "fix");
      else if (items.some((item) => item.status === "check" || item.status === "missing")) status.set(line, "check");
    }
    return status;
  }, [hints]);

  const mirror = useMemo(() => {
    const all = pieces(value.length, ranges, marks);
    const nodes: ReactNode[] = [];
    let p = 0;
    lines.forEach((line, index) => {
      const start = lineStarts[index];
      const end = start + line.length;
      const lineNodes: ReactNode[] = [];
      while (p < all.length && all[p].from < end) {
        const piece = all[p];
        const from = Math.max(piece.from, start);
        const to = Math.min(piece.to, end);
        if (to > from) {
          const text = value.slice(from, to);
          const key = `${index}:${from}`;
          if (piece.mark) {
            lineNodes.push(
              <mark
                key={key}
                className="ph-check-mark"
                data-status={piece.mark.status}
                data-selected={piece.mark.pinId !== null && piece.mark.pinId === selectedPin ? "" : undefined}
              >
                {text}
              </mark>,
            );
          } else {
            lineNodes.push(
              <span key={key} className={piece.className}>
                {text}
              </span>,
            );
          }
        }
        if (piece.to <= end) p += 1;
        else break;
      }
      const lineHints = hints.get(index + 1);
      if (lineHints?.length) {
        lineNodes.push(
          <span key={`h${index}`} className="ph-check-hints">
            {lineHints.map((hint, h) => (
              <span
                key={h}
                className="ph-check-hint"
                data-status={hint.status}
                data-selected={hint.pinId !== null && hint.pinId === selectedPin ? "" : undefined}
              >
                <span className="ph-check-hint-glyph" aria-hidden="true">{hintGlyph[hint.status]}</span>
                {hint.text}
              </span>
            ))}
          </span>,
        );
      }
      nodes.push(
        <span key={`l${index}`} className="ph-check-line">
          {lineNodes}
          {index < lines.length - 1 ? "\n" : null}
        </span>,
      );
    });
    return nodes;
  }, [value, ranges, marks, lines, lineStarts, hints, selectedPin]);

  return (
    <div className="ph-check-code">
      <div className="ph-check-gutter" aria-hidden="true">
        <div ref={gutterRef} className="ph-check-gutter-inner">
          {lines.map((_, index) => (
            <span key={index} className="ph-check-gutter-line" data-status={lineStatus.get(index + 1)}>
              {index + 1}
            </span>
          ))}
        </div>
      </div>
      <div className="ph-check-surface">
        <pre ref={mirrorRef} className="ph-check-layer ph-check-mirror" aria-hidden="true">
          {value ? mirror : <span className="ph-check-placeholder">{placeholder}</span>}
          {"\n"}
        </pre>
        <textarea
          ref={areaRef}
          className="ph-check-layer ph-check-input"
          value={value}
          maxLength={maxLength}
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
          onKeyDown={(event) => {
            // Tab indents inside the editor; Escape gives Tab back to page navigation.
            if (event.key === "Escape") {
              event.currentTarget.dataset.tabExit = "";
              return;
            }
            if (event.key !== "Tab" || event.shiftKey || event.currentTarget.dataset.tabExit !== undefined) {
              if (event.key === "Tab") delete event.currentTarget.dataset.tabExit;
              return;
            }
            event.preventDefault();
            const area = event.currentTarget;
            const { selectionStart, selectionEnd } = area;
            const next = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`;
            if (next.length > maxLength) return;
            onChange(next);
            requestAnimationFrame(() => area.setSelectionRange(selectionStart + 2, selectionStart + 2));
          }}
        />
      </div>
    </div>
  );
});
