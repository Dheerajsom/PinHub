import type { Metadata } from "next";
import { boards } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { assertBoardVisualsValid } from "@/lib/board-visual-validation";
import { assertBoardSourcesValid } from "@/lib/source-trust";
import { CircuitBackground } from "@/components/CircuitBackground";
import { SiteHeader } from "@/components/SiteHeader";
import { CheckApp } from "@/components/check/CheckApp";

export const metadata: Metadata = {
  title: "Pin check",
  description:
    "Paste Arduino, MicroPython, CircuitPython, Raspberry Pi, Pico SDK, or ESP-IDF code and check the pin references PinHub recognizes against the board's source-backed pin record: strapping pins, input-only pins, flash pins, and missing ADC or PWM. Values it cannot follow are listed for a hand check.",
  alternates: { canonical: "/check" },
};

assertBoardSourcesValid(boards);
assertBoardVisualsValid();

// A check resolves code to pins through the chip's own pin names, which only
// boards with source-backed pin functions record.
const catalog = boards.filter((board) => board.pinFunctions && board.pinout).map(summarizeBoard);

export default function CheckPage() {
  return (
    <main className="relative isolate min-h-screen pb-10">
      <CircuitBackground />
      <SiteHeader current="/check" />
      <div className="relative mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <CheckApp catalog={catalog} />
      </div>
    </main>
  );
}
