import type { Metadata } from "next";
import { boards } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { assertBoardVisualsValid } from "@/lib/board-visual-validation";
import { assertBoardSourcesValid } from "@/lib/source-trust";
import { CircuitBackground } from "@/components/CircuitBackground";
import { SiteHeader } from "@/components/SiteHeader";
import { PlannerApp } from "@/components/planner/PlannerApp";

export const metadata: Metadata = {
  title: "Pin planner",
  description:
    "Pick your board, mark the pins your circuit uses, and let PinHub fit I2C, SPI, UART, PWM, and ADC into the pins that are left, from source-backed pin functions.",
  alternates: { canonical: "/planner" },
};

assertBoardSourcesValid(boards);
assertBoardVisualsValid();

const catalog = boards.map(summarizeBoard);
// Auto-assign is offered only where the pin functions are source-backed.
const autoAssignIds = boards
  .filter((board) => board.pinFunctions && board.pinout)
  .map((board) => board.id);

export default function PlannerPage() {
  return (
    <main className="relative isolate min-h-screen pb-10">
      <CircuitBackground />
      <SiteHeader current="/planner" />
      <div className="relative mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <PlannerApp catalog={catalog} autoAssignIds={autoAssignIds} />
      </div>
    </main>
  );
}
