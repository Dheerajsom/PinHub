import { PinHubApp } from "@/components/PinHubApp";
import { boards } from "@/lib/boards";
import { assertBoardVisualsValid } from "@/lib/board-visual-validation";
import { assertBoardSourcesValid } from "@/lib/source-trust";
import { summarizeBoard } from "@/lib/board-summary";

// Build-time integrity gates. This server module is evaluated during static
// generation, so invalid board artwork or unsafe/incomplete source links fail
// the build rather than shipping a broken catalog.
assertBoardSourcesValid(boards);
assertBoardVisualsValid();

const catalog = boards.map(summarizeBoard);

export default function Home() {
  const initialBoard = boards[0];
  if (!initialBoard) return null;

  return (
    <PinHubApp catalog={catalog} initialBoard={initialBoard} />
  );
}
