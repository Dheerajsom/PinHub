import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CircuitBoard, GitCompareArrows, Search } from "lucide-react";
import { boards } from "@/lib/boards";
import { CircuitBackground } from "@/components/CircuitBackground";

export const metadata: Metadata = {
  title: "Board route not found",
};

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-screen flex-col">
      <CircuitBackground />
      {/* The same header the catalog, board, and compare pages wear, so a dead
          route still looks like part of PinHub rather than a bare server page. */}
      <header className="relative border-b border-white/10 bg-[#0a0d12] px-4 py-3 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-cyan-200"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to discovery
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/pinhub-logo.png"
              alt=""
              width={28}
              height={28}
              aria-hidden="true"
            />
            <span className="brand-title text-xl text-white">PinHub</span>
          </Link>
        </div>
      </header>

      <div className="relative mx-auto flex w-full max-w-[1280px] flex-1 items-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="surface-panel mx-auto w-full max-w-xl rounded-2xl p-6 sm:p-8">
          <p className="pin-eyebrow">Error 404</p>
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
            Pinout not found
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            This board route does not exist or is no longer part of the verified
            catalog. Every pin map PinHub publishes is checked against official
            vendor documentation first, so nothing is served from a guessed
            board id.
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link
              href="/"
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/20"
            >
              <CircuitBoard className="size-4" aria-hidden="true" />
              Return home
            </Link>
            <Link
              href="/compare"
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-4 text-sm font-medium text-zinc-200 transition hover:border-cyan-300/40 hover:text-white"
            >
              <GitCompareArrows className="size-4" aria-hidden="true" />
              Back to discovery
            </Link>
          </div>

          <p className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 font-mono text-xs text-zinc-500">
            <Search className="size-3.5 shrink-0" aria-hidden="true" />
            {boards.length} boards are searchable from the catalog.
          </p>
        </section>
      </div>
    </main>
  );
}
