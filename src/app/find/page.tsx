import type { Metadata } from "next";
import { boards } from "@/lib/boards";
import { findBoards, parseFinderQuery } from "@/lib/board-finder";
import { CircuitBackground } from "@/components/CircuitBackground";
import { SiteHeader } from "@/components/SiteHeader";
import { FindControls } from "@/components/find/FindControls";
import { FindResults } from "@/components/find/FindResults";

export const metadata: Metadata = {
  title: "Board finder",
  description:
    "Say how many I2C, SPI, UART, CAN, PWM, ADC, DAC, and GPIO pins your project needs, and see every board where all of them fit at once, planned from source-backed pin functions.",
  alternates: { canonical: "/find" },
};

export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Planned on the server: the finder reads every board's pin functions, which
  // stay out of the browser like the rest of the full pin maps.
  const query = parseFinderQuery(await searchParams);
  const result = findBoards(boards, query);

  return (
    <main className="relative isolate min-h-screen pb-10">
      <CircuitBackground />
      <SiteHeader current="/find" />
      <div className="relative mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="mb-5 max-w-3xl">
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-white sm:text-3xl">
            Board finder
          </h1>
          <p className="mt-2 text-[15px] leading-7 text-zinc-400">
            Say what your project needs to connect. PinHub plans it on every board with
            source-backed pin functions and lists the ones where all of it fits at the same
            time, with the pins it would use.
          </p>
        </header>
        <FindControls query={query}>
          <FindResults query={query} result={result} />
        </FindControls>
      </div>
    </main>
  );
}
