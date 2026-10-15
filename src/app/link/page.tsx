import type { Metadata } from "next";
import { boards } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { assertBoardVisualsValid } from "@/lib/board-visual-validation";
import { assertBoardSourcesValid } from "@/lib/source-trust";
import { CircuitBackground } from "@/components/CircuitBackground";
import { SiteHeader } from "@/components/SiteHeader";
import { LinkApp } from "@/components/link/LinkApp";

export const metadata: Metadata = {
  title: "Board link",
  description:
    "Wire two development boards together over UART or I2C. PinHub lists the wires from each board's source-backed pin map and flags logic-level mismatches before you connect anything.",
  alternates: { canonical: "/link" },
};

assertBoardSourcesValid(boards);
assertBoardVisualsValid();

const catalog = boards.map(summarizeBoard);

export default function LinkPage() {
  return (
    <main className="relative isolate min-h-screen pb-10">
      <CircuitBackground />
      <SiteHeader current="/link" />
      <div className="relative mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <LinkApp catalog={catalog} />
      </div>
    </main>
  );
}
