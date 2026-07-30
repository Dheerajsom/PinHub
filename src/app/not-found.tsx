import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, House } from "lucide-react";
import { CircuitBackground } from "@/components/CircuitBackground";

export default function NotFound() {
  return (
    <main className="relative isolate min-h-screen text-zinc-100">
      <CircuitBackground />
      <header className="relative border-b border-white/10 bg-[#0a0d12] px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-2.5">
            <Image
              src="/pinhub-logo.png"
              alt=""
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="brand-title text-xl text-white">PinHub</span>
          </Link>
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-500">
            Route check / 404
          </span>
        </div>
      </header>
      <div className="relative grid min-h-[calc(100vh-4.1rem)] place-items-center px-4 py-10 sm:px-6">
        <section className="surface-panel w-full max-w-lg rounded-xl p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300">
            Catalog lookup / 404
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            Pinout not found
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            This board route does not exist or is no longer part of the verified
            catalog.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/compare"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 text-sm font-medium text-cyan-50 transition hover:border-cyan-300/60 hover:bg-cyan-300/15"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to discovery
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-4 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:text-white"
            >
              <House className="size-4" aria-hidden="true" />
              Return home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
