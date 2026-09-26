import type { Metadata } from "next";
import Link from "next/link";
import { CircuitBoard, GitCompareArrows, Search } from "lucide-react";
import { boards } from "@/lib/boards";
import { CircuitBackground } from "@/components/CircuitBackground";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Board route not found",
};

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-screen flex-col">
      <CircuitBackground />
      <SiteHeader />

      <div className="relative mx-auto flex w-full max-w-[1280px] flex-1 items-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="surface-panel mx-auto w-full max-w-xl rounded-2xl p-6 sm:p-8">
          <p className="pin-eyebrow">Error 404</p>
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
            Pinout not found
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            This address does not match a board in the catalog. The board may
            have been renamed, or the link may be incomplete. Search the catalog
            by name, vendor, or processor to find it.
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link
              href="/"
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/20"
            >
              <CircuitBoard className="size-4" aria-hidden="true" />
              Search the catalog
            </Link>
            <Link
              href="/compare"
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-4 text-sm font-medium text-zinc-200 transition hover:border-cyan-300/40 hover:text-white"
            >
              <GitCompareArrows className="size-4" aria-hidden="true" />
              Browse and compare
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
