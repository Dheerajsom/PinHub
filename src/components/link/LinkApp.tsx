"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Ban, CircleCheck, TriangleAlert } from "lucide-react";
import type { Board } from "@/lib/boards";
import type { BoardSummary } from "@/lib/board-summary";
import { createBoardDetailLoader, type BoardDetailLoader } from "@/lib/board-detail-loader";
import { buildBoardLink, busNames, linkBuses, type BoardLink, type LinkBus, type LinkPort } from "@/lib/board-link";
import { linkSearch, linkStateFromSearch, type LinkState } from "@/lib/link-params";
import { LinkBoardSlot, useLinkSearchIndex } from "@/components/link/LinkBoardSlot";
import { LinkHarness } from "@/components/link/LinkHarness";
import { LinkSheets } from "@/components/link/LinkSheets";

type Detail = { status: "loading" } | { status: "ready"; board: Board } | { status: "error" };

const emptyState: LinkState = { a: null, b: null, bus: "uart", pa: null, pb: null };

/**
 * The link page: two boards and a bus in, the wire list out. Everything lives
 * in the URL so a link can be shared, and each board's full record is fetched
 * on demand, so the page ships only the catalog summaries.
 */
export function LinkApp({
  catalog,
  loader: providedLoader,
}: {
  catalog: readonly BoardSummary[];
  loader?: BoardDetailLoader;
}) {
  const byId = useMemo(() => new Map(catalog.map((board) => [board.id, board])), [catalog]);
  const index = useLinkSearchIndex(catalog);
  const loader = useMemo(() => providedLoader ?? createBoardDetailLoader([]), [providedLoader]);
  const [state, setState] = useState<LinkState>(emptyState);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const mounted = useRef(true);

  const ensure = useCallback(
    (id: string | null, retry = false) => {
      if (!id || !byId.get(id)?.hasPinout) return;
      const cached = loader.peek(id);
      if (cached) {
        setDetails((value) => (value[id]?.status === "ready" ? value : { ...value, [id]: { status: "ready", board: cached } }));
        return;
      }
      setDetails((value) => (value[id] && !retry ? value : { ...value, [id]: { status: "loading" } }));
      loader.load(id).then(
        (board) => {
          if (mounted.current) setDetails((value) => ({ ...value, [id]: { status: "ready", board } }));
        },
        () => {
          if (mounted.current) setDetails((value) => ({ ...value, [id]: { status: "error" } }));
        },
      );
    },
    [byId, loader],
  );

  const apply = useCallback(
    (next: LinkState) => {
      // A board the catalog does not list, or one with no pin map, is dropped.
      const clean = {
        ...next,
        a: next.a && byId.get(next.a)?.hasPinout ? next.a : null,
        b: next.b && byId.get(next.b)?.hasPinout ? next.b : null,
      };
      setState(clean);
      setActiveIndex(null);
      ensure(clean.a);
      ensure(clean.b);
      return clean;
    },
    [byId, ensure],
  );

  // The page is static, so the URL state is only known in the browser.
  useEffect(() => {
    mounted.current = true;
    const sync = () => apply(linkStateFromSearch(location.search));
    const frame = requestAnimationFrame(sync);
    window.addEventListener("popstate", sync);
    return () => {
      mounted.current = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("popstate", sync);
    };
  }, [apply]);

  function update(patch: Partial<LinkState>, mode: "push" | "replace") {
    const clean = apply({ ...state, ...patch });
    const url = `${location.pathname}${linkSearch(clean)}`;
    if (mode === "push") history.pushState(null, "", url);
    else history.replaceState(null, "", url);
  }

  const boardA = state.a ? details[state.a] : undefined;
  const boardB = state.b ? details[state.b] : undefined;
  const a = boardA?.status === "ready" ? boardA.board : null;
  const b = boardB?.status === "ready" ? boardB.board : null;
  const link = useMemo(
    () => (a && b ? buildBoardLink(a, b, state.bus, { a: state.pa ?? undefined, b: state.pb ?? undefined }) : null),
    [a, b, state.bus, state.pa, state.pb],
  );

  const slotStatus = (id: string | null, detail: Detail | undefined) =>
    !id ? "idle" : !detail || detail.status === "loading" ? "loading" : detail.status;

  return (
    <div className="ph-link grid gap-4">
      <header className="max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200">Board link</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-white sm:text-3xl">
          Wire two boards together
        </h1>
        <p className="mt-2 text-[15px] leading-7 text-zinc-400">
          Pick two boards and a bus. PinHub lists the wires from each board’s own pin map, and
          stops where the records cannot vouch for a direct connection.
        </p>
      </header>

      <div className="ph-link-ends">
        <LinkBoardSlot
          side="A"
          index={index}
          board={state.a ? byId.get(state.a) ?? null : null}
          status={slotStatus(state.a, boardA)}
          onPick={(id) => update({ a: id, pa: null }, "push")}
          onChange={() => update({ a: null, pa: null }, "push")}
          onRetry={() => ensure(state.a, true)}
        />
        <button
          type="button"
          onClick={() => update({ a: state.b, b: state.a, pa: state.pb, pb: state.pa }, "replace")}
          disabled={!state.a && !state.b}
          aria-label="Swap boards A and B"
          title="Swap A and B"
          className="ph-link-swap"
        >
          <ArrowLeftRight className="size-4" aria-hidden="true" />
        </button>
        <LinkBoardSlot
          side="B"
          index={index}
          board={state.b ? byId.get(state.b) ?? null : null}
          status={slotStatus(state.b, boardB)}
          onPick={(id) => update({ b: id, pb: null }, "push")}
          onChange={() => update({ b: null, pb: null }, "push")}
          onRetry={() => ensure(state.b, true)}
        />
      </div>

      <div role="radiogroup" aria-label="Bus" className="ph-link-buses">
        {linkBuses.map((bus) => (
          <button
            key={bus}
            type="button"
            role="radio"
            aria-checked={state.bus === bus}
            onClick={() => update({ bus, pa: null, pb: null }, "replace")}
            className="ph-link-bus"
          >
            {busNames[bus]}
          </button>
        ))}
        <p className="ph-link-bus-note">SPI is not offered: which data pin is the input in peripheral mode depends on the chip, and no record states it.</p>
      </div>

      {link && a && b ? (
        <LinkResult
          link={link}
          a={a}
          b={b}
          activeIndex={activeIndex}
          onActivate={setActiveIndex}
          onPort={(side, id) => update(side === "a" ? { pa: id } : { pb: id }, "replace")}
        />
      ) : !state.a || !state.b ? (
        <p className="surface-well rounded-xl px-4 py-3 text-[13px] leading-6 text-zinc-400">
          {state.a || state.b
            ? "Pick the other board to see the wires."
            : "Pick a board for each end. Two of the same board works too."}
        </p>
      ) : null}
    </div>
  );
}

function LinkResult({
  link,
  a,
  b,
  activeIndex,
  onActivate,
  onPort,
}: {
  link: BoardLink;
  a: Board;
  b: Board;
  activeIndex: number | null;
  onActivate: (index: number | null) => void;
  onPort: (side: "a" | "b", id: string) => void;
}) {
  const busName = busNames[link.bus];
  return (
    <>
      <Verdict link={link} />

      {link.status !== "blocked" ? (
        <>
          <div className="ph-link-ports">
            <PortChoice side="a" board={a} bus={link.bus} ports={link.ports.a} chosen={link.port.a} onPort={onPort} />
            <PortChoice side="b" board={b} bus={link.bus} ports={link.ports.b} chosen={link.port.b} onPort={onPort} />
          </div>
          <LinkHarness link={link} a={a} b={b} activeIndex={activeIndex} onActivate={onActivate} />
          <LinkSheets link={link} a={a} b={b} activeIndex={activeIndex} onActivate={onActivate} />
        </>
      ) : null}

      <section aria-labelledby="link-notes" className="surface-panel rounded-xl px-4 py-3">
        <h2 id="link-notes" className="text-sm font-semibold tracking-tight text-white">
          Before you connect the {busName} link
        </h2>
        <ul className="mt-2 grid gap-1.5 text-[13px] leading-6 text-zinc-400">
          {link.notes.map((note) => (
            <li key={note} className="ph-link-note">{note}</li>
          ))}
        </ul>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {[a, b]
            .filter((board, i, list) => list.findIndex((item) => item.id === board.id) === i)
            .map((board) => (
              <Link key={board.id} href={`/boards/${board.id}`} className="ph-link-text-button inline-flex min-h-11 items-center">
                Check {board.name}’s sources
              </Link>
            ))}
        </p>
      </section>
    </>
  );
}

function Verdict({ link }: { link: BoardLink }) {
  const tone = link.status === "ready" ? "ready" : "caution";
  const Icon = link.status === "blocked" ? Ban : link.status === "ready" ? CircleCheck : TriangleAlert;
  const title =
    link.status === "blocked" ? `No ${busNames[link.bus]} link from these pin maps` : link.level.title;
  return (
    <section aria-label="Link verdict" className="ph-link-verdict" data-tone={tone}>
      <Icon className="ph-link-verdict-icon size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-white">{title}</h2>
        {link.status === "blocked" ? (
          <ul className="mt-1 grid gap-1 text-[13px] leading-6 text-zinc-300">
            {link.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-[13px] leading-6 text-zinc-300">{link.level.detail}</p>
        )}
      </div>
    </section>
  );
}

function PortChoice({
  side,
  board,
  bus,
  ports,
  chosen,
  onPort,
}: {
  side: "a" | "b";
  board: Board;
  bus: LinkBus;
  ports: LinkPort[];
  chosen: LinkPort | null;
  onPort: (side: "a" | "b", id: string) => void;
}) {
  const complete = ports.filter((port) => port.complete);
  const label = `${side === "a" ? "A" : "B"} · ${board.name}`;
  if (complete.length <= 1) {
    return (
      <p className="ph-link-port">
        <span className="truncate text-zinc-500">{label}</span>
        <span className="font-mono text-zinc-200">{chosen?.label ?? busNames[bus]}</span>
      </p>
    );
  }
  return (
    <label className="ph-link-port">
      <span className="truncate text-zinc-500">{label}</span>
      <select
        value={chosen?.id}
        onChange={(event) => onPort(side, event.target.value)}
        className="ph-link-select font-mono"
      >
        {complete.map((port) => (
          <option key={port.id} value={port.id}>
            {port.label}
          </option>
        ))}
      </select>
    </label>
  );
}
