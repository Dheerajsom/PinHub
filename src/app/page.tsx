import { PinHubApp } from "@/components/PinHubApp";
import { assertBoardVisualsValid } from "@/lib/board-visual-validation";

// Build-time integrity gate. This server module is evaluated during
// `next build` static generation, so invalid or incomplete board-visual
// coverage (missing config, unanchored pins, out-of-range coordinates) fails
// the build rather than shipping a broken diagram.
assertBoardVisualsValid();

export default function Home() {
  return <PinHubApp />;
}
