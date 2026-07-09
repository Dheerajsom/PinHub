import { PinHubApp } from "@/components/PinHubApp";
import { boards } from "@/lib/boards";
import { assertBoardVisualsValid } from "@/lib/board-visual-validation";
import { assertBoardSourcesValid } from "@/lib/source-trust";

// Build-time integrity gates. This server module is evaluated during `next`
// static generation, so invalid board artwork or unsafe/incomplete source
// links fail the build rather than shipping a broken catalog.
assertBoardSourcesValid(boards);
assertBoardVisualsValid();

export default function Home() {
  return <PinHubApp />;
}
