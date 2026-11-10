"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { ClipboardCopy, Code2, Lock, Route, Search, X } from "lucide-react";
import type { Board } from "@/lib/boards";
import type { BoardSummary } from "@/lib/board-summary";
import { createBoardDetailLoader, type BoardDetailLoader } from "@/lib/board-detail-loader";
import { createBoardSearchIndex, matchBoardSearchEntry, tokenizeQuery } from "@/lib/board-search";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { boardFromSearch, boardParam } from "@/lib/plan-params";
import { checkCode, displayName, type CheckReport as Report } from "@/lib/code-check/check";
import { codeExamples, type CodeExample } from "@/lib/code-check/examples";
import { placeText, plannerHref, reportMarkdown } from "@/lib/code-check/report-text";
import {
  dialectFamily,
  dialectLabels,
  dialects,
  maxSourceLength,
  scanCode,
  sourceRanges,
  type Dialect,
} from "@/lib/code-check/scan";
import { isOfficialVerificationSource, verificationSourceFor } from "@/lib/source-trust";
import { BoardStage } from "@/components/board-visual/BoardStage";
import { touchDrawingWidth } from "@/components/board-visual/touch-sizing";
import { ChoiceMenu, type ChoiceOption } from "@/components/catalog/SortMenu";
import { VendorLogo } from "@/components/VendorLogo";
import { CodeEditor, type CodeEditorHandle, type EditorHint, type EditorMark } from "@/components/check/CodeEditor";
import { CheckReport } from "@/components/check/CheckReport";

type Detail =
  | { status: "idle" }
  | { status: "loading"; id: string }
  | { status: "ready"; board: Board }
  | { status: "error"; id: string };

type DialectChoice = Dialect | "auto";

const draftKey = "pinhub.check.draft";
const maxHintsPerLine = 2;
const noNet = new Set<string>();

/** The draft survives a reload in this tab only; it is never sent anywhere. */
function readDraft(): { code: string; dialect: DialectChoice } | null {
  try {
    const raw = window.sessionStorage.getItem(draftKey);
    if (!raw || raw.length > maxSourceLength + 256) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const { code, dialect } = parsed as { code?: unknown; dialect?: unknown };
    if (typeof code !== "string" || code.length > maxSourceLength) return null;
    const choice = typeof dialect === "string" && (dialect === "auto" || (dialects as readonly string[]).includes(dialect))
      ? (dialect as DialectChoice)
      : "auto";
    return { code, dialect: choice };
  } catch {
    return null;
  }
}

function writeDraft(code: string, dialect: DialectChoice) {
  try {
    if (!code) window.sessionStorage.removeItem(draftKey);
    else if (code.length <= maxSourceLength) window.sessionStorage.setItem(draftKey, JSON.stringify({ code, dialect }));
  } catch {
    // A refused write only loses the reload convenience.
  }
}

export function CheckApp({
  catalog,
  loader: providedLoader,
}: {
  /** Boards whose pin records name chip pins, the only ones a check can resolve. */
  catalog: readonly BoardSummary[];
  loader?: BoardDetailLoader;
}) {
  const byId = useMemo(() => new Map(catalog.map((board) => [board.id, board])), [catalog]);
  const loader = useMemo(() => providedLoader ?? createBoardDetailLoader([]), [providedLoader]);
  const [code, setCode] = useState("");
  const [dialectChoice, setDialectChoice] = useState<DialectChoice>("auto");
  const [detail, setDetail] = useState<Detail>({ status: "idle" });
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const editorRef = useRef<CodeEditorHandle>(null);
  const editorSectionRef = useRef<HTMLElement>(null);
  const sheetWrapRef = useRef<HTMLDivElement>(null);
  const ticket = useRef(0);
  const restored = useRef(false);
  const labelId = useId();
  const helpId = useId();

  const open = useCallback(
    (id: string | null) => {
      const mine = ++ticket.current;
      setSelectedPin(null);
      if (!id || !byId.has(id)) {
        setDetail({ status: "idle" });
        return;
      }
      const cached = loader.peek(id);
      if (cached) {
        setDetail({ status: "ready", board: cached });
        return;
      }
      setDetail({ status: "loading", id });
      loader.load(id).then(
        (board) => {
          if (ticket.current === mine) setDetail({ status: "ready", board });
        },
        () => {
          if (ticket.current === mine) setDetail({ status: "error", id });
        },
      );
    },
    [byId, loader],
  );

  // The page is static: the board and the draft are only known in the browser.
  useEffect(() => {
    const sync = () => open(boardFromSearch(location.search));
    const frame = requestAnimationFrame(() => {
      if (!restored.current) {
        restored.current = true;
        const draft = readDraft();
        if (draft) {
          setCode(draft.code);
          setDialectChoice(draft.dialect);
        }
      }
      sync();
    });
    window.addEventListener("popstate", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("popstate", sync);
    };
  }, [open]);

  // Written on every change: a debounced write is lost to a quick reload.
  useEffect(() => {
    if (restored.current) writeDraft(code, dialectChoice);
  }, [code, dialectChoice]);

  function pickBoard(id: string) {
    history.pushState(null, "", `${location.pathname}?${boardParam}=${encodeURIComponent(id)}`);
    open(id);
  }

  function changeBoard() {
    history.pushState(null, "", location.pathname);
    open(null);
  }

  function loadExample(example: CodeExample) {
    setCode(example.code);
    setDialectChoice("auto");
    setSelectedPin(null);
    setCopyState("idle");
    if (detail.status !== "ready" || detail.board.id !== example.boardId) pickBoard(example.boardId);
    editorRef.current?.revealLine(1);
  }

  // Scanning follows typing a beat behind on very long input; marks are only
  // drawn while the scan matches the text on screen.
  const deferredCode = useDeferredValue(code);
  const scan = useMemo(
    () => scanCode(deferredCode, dialectChoice === "auto" ? null : dialectChoice),
    [deferredCode, dialectChoice],
  );
  const current = deferredCode === code;
  const board = detail.status === "ready" ? detail.board : null;
  const report: Report | null = useMemo(() => (board && scan.dialect ? checkCode(board, scan) : null), [board, scan]);
  const ranges = useMemo(
    () => (scan.dialect && current ? sourceRanges(deferredCode, dialectFamily(scan.dialect)) : []),
    [scan.dialect, deferredCode, current],
  );

  const { marks, hints } = useMemo(() => {
    const marks: EditorMark[] = [];
    const hints = new Map<number, EditorHint[]>();
    if (!current || !scan.dialect) return { marks, hints };
    const pinByRef = new Map<number, Report["pins"][number]>();
    for (const pin of report?.pins ?? []) for (const ref of pin.refs) pinByRef.set(ref.start, pin);
    const missingStarts = new Set(report?.missing.map((item) => item.ref.start) ?? []);
    const seenSpans = new Set<string>();
    const lineHints = new Map<number, Map<string, EditorHint>>();
    const addHint = (line: number, key: string, hint: EditorHint) => {
      const forLine = lineHints.get(line) ?? new Map<string, EditorHint>();
      if (!forLine.has(key)) forLine.set(key, hint);
      lineHints.set(line, forLine);
    };
    for (const ref of scan.refs) {
      const pin = pinByRef.get(ref.start);
      const status: EditorMark["status"] = pin ? pin.status : report && missingStarts.has(ref.start) ? "missing" : "clear";
      const span = `${ref.start}:${ref.end}`;
      if (!seenSpans.has(span) && ref.end > ref.start && ref.end <= code.length) {
        seenSpans.add(span);
        marks.push({ start: ref.start, end: ref.end, status, pinId: pin?.id ?? null });
      }
      if (!report) continue;
      if (pin) {
        const first = pin.findings.find((item) => item.severity === pin.status);
        addHint(ref.line, pin.id, {
          text: `${displayName(pin.pin)} · ${pin.places[0] ? placeText({ ...pin, places: [pin.places[0]] }) : ""}${first ? ` · ${first.title}` : ""}`,
          status: pin.status,
          pinId: pin.id,
        });
      } else if (missingStarts.has(ref.start)) {
        addHint(ref.line, `missing:${ref.text}`, { text: `${ref.text} · not on this board`, status: "missing", pinId: null });
      }
    }
    for (const [line, forLine] of lineHints) {
      const items = [...forLine.values()];
      const shown = items.slice(0, maxHintsPerLine);
      if (items.length > maxHintsPerLine) {
        shown.push({ text: `+${items.length - maxHintsPerLine} more`, status: "clear", pinId: null });
      }
      hints.set(line, shown);
    }
    marks.sort((a, b) => a.start - b.start);
    return { marks, hints };
  }, [current, scan, report, code.length]);

  const selected = report?.pins.find((pin) => pin.id === selectedPin) ?? null;

  const selectPin = useCallback(
    (id: string, reveal = true) => {
      setSelectedPin(id);
      const pin = report?.pins.find((item) => item.id === id);
      if (reveal && pin) editorRef.current?.revealLine(pin.refs[0].line);
    },
    [report],
  );

  const showLine = useCallback((line: number) => {
    editorRef.current?.revealLine(line);
    const section = editorSectionRef.current;
    if (section && section.getBoundingClientRect().top < 0) {
      section.scrollIntoView({ block: "start", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }, []);

  const onCaret = useCallback(
    (offset: number) => {
      const pin = report?.pins.find((item) => item.refs.some((ref) => offset >= ref.start && offset <= ref.end));
      if (pin) setSelectedPin(pin.id);
    },
    [report],
  );

  const geometry = useMemo(() => (board ? buildBoardGeometry(board, { sheet: true }) : null), [board]);
  const usedKeys = useMemo(() => new Set(report?.pins.flatMap((pin) => pin.places.map((place) => place.key)) ?? []), [report]);
  const pinByKey = useMemo(() => {
    const map = new Map<string, Report["pins"][number]>();
    for (const pin of report?.pins ?? []) for (const place of pin.places) map.set(place.key, pin);
    return map;
  }, [report]);
  const selectedKey = selected?.places[0]?.key ?? null;
  const liveKey = hoverKey ?? selectedKey;

  // A phone shows one column of a wide sheet: bring the selected pad into the
  // sheet's own scroll view (never the page's), wherever it was selected from.
  useEffect(() => {
    const wrap = sheetWrapRef.current;
    const anchor = selectedKey ? geometry?.anchors.find((item) => item.key === selectedKey) : undefined;
    if (!wrap || !anchor || !geometry || wrap.scrollWidth <= wrap.clientWidth) return;
    const x = (anchor.cx / geometry.vbw) * wrap.scrollWidth;
    const margin = 56;
    if (x - margin >= wrap.scrollLeft && x + margin <= wrap.scrollLeft + wrap.clientWidth) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    wrap.scrollTo({ left: Math.max(0, x - wrap.clientWidth / 2), behavior: reduce ? "auto" : "smooth" });
  }, [selectedKey, geometry]);
  const liveAnchor = geometry?.anchors.find((anchor) => anchor.key === liveKey) ?? null;
  const livePin = liveKey ? pinByKey.get(liveKey) : undefined;

  async function copyReport() {
    if (!board || !report) return;
    try {
      await navigator.clipboard.writeText(reportMarkdown(board, report, scan.dialect));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 2400);
  }

  const dialectOptions: ChoiceOption<DialectChoice>[] = [
    { value: "auto", label: scan.dialect && dialectChoice === "auto" ? `Auto: ${dialectLabels[scan.dialect]}` : "Auto-detect" },
    ...dialects.map((value) => ({ value, label: dialectLabels[value] })),
  ];

  const source = board ? verificationSourceFor(board) : undefined;
  const lineCount = code ? code.split("\n").length : 0;

  return (
    <div className="ph-check @container">
      <header className="mb-5 max-w-3xl">
        <h1 className="ph-check-title">Pin check</h1>
        <p className="mt-2 text-[15px] leading-7 text-zinc-300">
          Paste a sketch or script and pick the board it runs on. PinHub finds every pin the code uses and checks
          each one against that board&apos;s source-backed pin record.
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-zinc-400">
          <Lock className="size-3.5" aria-hidden="true" />
          Checked in your browser. Your code is never uploaded.
        </p>
      </header>

      <div className="ph-check-grid">
        <section ref={editorSectionRef} aria-labelledby={labelId} className="ph-check-editor surface-panel scroll-mt-4" style={{ gridArea: "editor" }}>
          <div className="ph-check-bar">
            <h2 id={labelId} className="flex items-center gap-2 text-[13px] font-semibold text-white">
              <Code2 className="size-4 text-zinc-400" aria-hidden="true" />
              Your code
            </h2>
            <div className="ml-auto flex min-w-0 items-center gap-2">
              <ChoiceMenu
                value={dialectChoice}
                options={dialectOptions}
                onChange={setDialectChoice}
                label="Code language"
                heading="Language"
                className="w-[11.5rem] max-[420px]:w-[9.5rem]"
              />
              {code ? (
                <button
                  type="button"
                  className="ph-check-icon-button"
                  onClick={() => {
                    setCode("");
                    setSelectedPin(null);
                    editorRef.current?.focus();
                  }}
                  aria-label="Clear the code"
                  title="Clear the code"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
          <CodeEditor
            ref={editorRef}
            value={code}
            onChange={(value) => {
              setCode(value.slice(0, maxSourceLength));
              setCopyState("idle");
            }}
            marks={marks}
            ranges={ranges}
            hints={hints}
            selectedPin={selectedPin}
            onCaret={onCaret}
            maxLength={maxSourceLength}
            placeholder={"// Paste Arduino, MicroPython, CircuitPython,\n// Raspberry Pi Python, Pico SDK, or ESP-IDF code."}
            labelId={labelId}
            describedBy={helpId}
          />
          <p id={helpId} className="ph-check-foot">
            <span>
              {lineCount ? `${lineCount} ${lineCount === 1 ? "line" : "lines"}` : "Empty"}
              {scan.truncated ? " · only the first 100,000 characters are checked" : ""}
            </span>
            <span className="max-sm:hidden">Tab indents. Press Esc, then Tab, to move on.</span>
          </p>
        </section>

        <div style={{ gridArea: "board" }} className="min-w-0">
          <BoardSlot
            catalog={catalog}
            detail={detail}
            byId={byId}
            onPick={pickBoard}
            onChange={changeBoard}
            onRetry={() => detail.status === "error" && open(detail.id)}
          />
        </div>

        <div style={{ gridArea: "report" }} className="min-w-0">
          {!code.trim() ? (
            <Examples onPick={loadExample} />
          ) : !scan.dialect ? (
            <EmptyState title="Which language is this?">
              PinHub couldn&apos;t tell from the code. Choose the language above and the check runs again.
            </EmptyState>
          ) : !board ? (
            detail.status === "loading" ? (
              <EmptyState title="Loading the pin record…" />
            ) : (
              <EmptyState title={`${scan.refs.length ? plural(scan.refs.length, "pin reference") : "No pin calls yet"} in ${dialectLabels[scan.dialect]} code`}>
                Pick the board this code runs on to check each pin.
              </EmptyState>
            )
          ) : report && (report.pins.length || report.missing.length || report.unfollowed.length) ? (
            <>
              <CheckReport report={report} dialect={dialectLabels[scan.dialect]} selectedPin={selectedPin} onSelect={(id) => selectPin(id)} onLine={showLine} />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="ph-check-action" onClick={copyReport}>
                  <ClipboardCopy className="size-4" aria-hidden="true" />
                  {copyState === "copied" ? "Copied" : copyState === "failed" ? "Couldn't copy" : "Copy report"}
                </button>
                {report.pins.length ? (
                  <Link className="ph-check-action" href={plannerHref(board, report)}>
                    <Route className="size-4" aria-hidden="true" />
                    Open in planner
                  </Link>
                ) : null}
                <span className="sr-only" role="status" aria-live="polite">
                  {copyState === "copied" ? "Report copied" : copyState === "failed" ? "The report could not be copied" : ""}
                </span>
              </div>
              <p className="ph-check-fine mt-3">
                {report.numbering ? `${report.numbering} ` : ""}
                Checked against {source ? (
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="ph-check-link">
                    {isOfficialVerificationSource(board, source) ? "the official" : "a third-party"} {source.type.toLowerCase()}
                  </a>
                ) : "the record's sources"}
                . PinHub reads code without running it, so verify against the board&apos;s documentation before wiring.
              </p>
            </>
          ) : (
            <EmptyState title="No pin calls found">
              PinHub looks for calls like <code className="ph-check-code-inline">pinMode</code>,{" "}
              <code className="ph-check-code-inline">Pin(…)</code>, <code className="ph-check-code-inline">ADC</code>,{" "}
              <code className="ph-check-code-inline">I2C</code>, and <code className="ph-check-code-inline">gpio_init</code>.
            </EmptyState>
          )}
        </div>

        {board && geometry && report?.pins.length ? (
          <section aria-label={`${board.name} connector sheet`} className="ph-check-sheet surface-panel" style={{ gridArea: "sheet" }}>
            <p className="ph-check-readout" aria-live="polite">
              {liveAnchor
                ? `${liveAnchor.group ? `${liveAnchor.group} ` : "Pin "}${liveAnchor.pin.position} · ${liveAnchor.pin.label}${
                    livePin ? ` · ${livePin.usages.map((use) => use.label).join(", ")}` : " · not used by this code"
                  }`
                : "Rings mark the pins your code uses. Select one to find it in the code."}
            </p>
            <div ref={sheetWrapRef} className="bv-stage-wrap w-full overflow-auto rounded-md" tabIndex={0} role="group" aria-label="Connector sheet, scrollable">
              <div
                className="mx-auto"
                style={{
                  aspectRatio: `${geometry.vbw} / ${geometry.vbh}`,
                  width: `min(100%, calc(520px * ${(geometry.vbw / geometry.vbh).toFixed(4)}))`,
                  minWidth: touchDrawingWidth(geometry),
                }}
              >
                <BoardStage
                  geometry={geometry}
                  title={`${board.name} pins used by the code`}
                  sheetLabel={board.name}
                  selectedKey={selectedKey}
                  activeKey={liveKey}
                  activeRole={null}
                  showAllLabels
                  netKeys={noNet}
                  claimed={usedKeys}
                  onSelect={(key) => {
                    const pin = key ? pinByKey.get(key) : undefined;
                    if (pin) selectPin(pin.id);
                    else setSelectedPin(null);
                  }}
                  onActiveKey={setHoverKey}
                />
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="ph-check-empty surface-panel" aria-live="polite">
      <h2 className="text-[15px] font-semibold text-white">{title}</h2>
      {children ? <p className="mt-1.5 text-[13px] leading-6 text-zinc-400">{children}</p> : null}
    </section>
  );
}

const exampleTeasers: Record<string, string> = {
  "esp32-weather": "A relay on an input-only pin, and an analog read that Wi-Fi blocks",
  "pico-plants": "A tank sensor on a pin with no analog input",
  "pi-doorbell": "A buzzer on the HAT EEPROM pin",
  "uno-dimmer": "A dimmer on a pin without PWM",
};

function Examples({ onPick }: { onPick: (example: CodeExample) => void }) {
  return (
    <section className="ph-check-empty surface-panel" aria-labelledby="ph-check-examples">
      <h2 id="ph-check-examples" className="text-[15px] font-semibold text-white">
        Start with an example
      </h2>
      <p className="mt-1 text-[13px] leading-6 text-zinc-400">Each one has a mistake the check catches.</p>
      <ul className="mt-3 grid gap-2">
        {codeExamples.map((example) => (
          <li key={example.id}>
            <button type="button" className="ph-check-example" onClick={() => onPick(example)}>
              <span className="block text-[14px] font-medium text-white">{example.title}</span>
              <span className="mt-0.5 block text-[12px] leading-5 text-zinc-400">{exampleTeasers[example.id]}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BoardSlot({
  catalog,
  detail,
  byId,
  onPick,
  onChange,
  onRetry,
}: {
  catalog: readonly BoardSummary[];
  detail: Detail;
  byId: ReadonlyMap<string, BoardSummary>;
  onPick: (id: string) => void;
  onChange: () => void;
  onRetry: () => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const index = useMemo(() => createBoardSearchIndex(catalog), [catalog]);
  const tokens = useMemo(() => tokenizeQuery(query), [query]);
  const results = useMemo(() => {
    if (!tokens.length) return [];
    return index
      .flatMap((entry) => {
        const match = matchBoardSearchEntry(entry, tokens);
        return match ? [{ board: entry.board, score: match.score }] : [];
      })
      .sort((x, y) => y.score - x.score || x.board.name.localeCompare(y.board.name))
      .slice(0, 6)
      .map((item) => item.board);
  }, [index, tokens]);
  const current = results[Math.min(active, results.length - 1)];
  const id = detail.status === "idle" ? null : detail.status === "ready" ? detail.board.id : detail.id;
  const summary = id ? byId.get(id) : undefined;

  if (summary) {
    return (
      <div className="ph-check-board surface-panel">
        <div className="flex items-start gap-3">
          <VendorLogo vendor={summary.vendor} />
          <div className="min-w-0 flex-1">
            <p className="break-words text-[15px] font-semibold text-white">{summary.name}</p>
            <p className="mt-0.5 break-words font-mono text-[11px] text-zinc-400">{summary.logicLevel}</p>
            {detail.status === "error" ? (
              <p role="alert" className="mt-1.5 text-[12px] text-zinc-300">
                The pin record could not be loaded.{" "}
                <button type="button" onClick={onRetry} className="ph-check-link">
                  Try again
                </button>
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onChange} className="ph-check-ghost" aria-label={`Change board, ${summary.name}`}>
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ph-check-board surface-panel">
      <label htmlFor={`${listId}-input`} className="text-[13px] font-semibold text-white">
        Board
      </label>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
        <input
          id={`${listId}-input`}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
          autoComplete="off"
          spellCheck={false}
          maxLength={128}
          value={query}
          placeholder="Search, e.g. ESP32 DevKitC or Pico"
          onChange={(event) => {
            setQuery(event.target.value.slice(0, 128));
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!results.length) return;
              const delta = event.key === "ArrowDown" ? 1 : -1;
              setActive((value) => (Math.min(value, results.length - 1) + delta + results.length) % results.length);
            } else if (event.key === "Enter" && current) {
              event.preventDefault();
              onPick(current.id);
            } else if (event.key === "Escape" && query) {
              event.preventDefault();
              setQuery("");
            }
          }}
          className="ph-check-input-field h-11 w-full rounded-md pl-10 pr-3 text-[16px] outline-none sm:text-sm"
        />
      </div>
      <ul id={listId} role="listbox" aria-label="Boards" className={clsx(results.length ? "surface-well mt-2 rounded-md p-1" : "")}>
        {results.map((item) => (
          <li
            key={item.id}
            id={`${listId}-${item.id}`}
            role="option"
            aria-selected={item === current}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(item.id)}
            className="ph-plan-option flex min-h-11 cursor-pointer items-center gap-3 rounded px-2 py-1.5"
          >
            <VendorLogo vendor={item.vendor} />
            <span className="min-w-0 flex-1">
              <span className="block break-words text-sm font-medium text-white">{item.name}</span>
              <span className="block break-words font-mono text-[11px] text-zinc-500">{item.processor}</span>
            </span>
          </li>
        ))}
      </ul>
      <p role="status" aria-live="polite" className={tokens.length && !results.length ? "mt-2 text-[13px] leading-6 text-zinc-400" : "sr-only"}>
        {tokens.length && !results.length
          ? `No match among the ${catalog.length} boards whose pin records name chip pins.`
          : ""}
      </p>
    </div>
  );
}
