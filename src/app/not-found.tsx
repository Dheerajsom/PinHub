import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#080a0e] px-6 text-zinc-100">
      <section className="max-w-md rounded-xl border border-white/10 bg-[#10131a] p-6 text-center shadow-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Pinout not found</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          This board route does not exist or is no longer part of the verified catalog.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-medium text-cyan-50 hover:bg-cyan-300/15"
        >
          Browse the catalog
        </Link>
      </section>
    </main>
  );
}
