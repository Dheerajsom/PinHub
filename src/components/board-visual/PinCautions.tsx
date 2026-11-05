import type { Pin } from "@/lib/boards";
import { pinCautionTexts, type PinFlagNotes } from "@/lib/pin-reference";

export function PinCautions({ pin, flagNotes }: { pin: Pin; flagNotes?: PinFlagNotes }) {
  const cautions = pinCautionTexts(pin, flagNotes);
  return cautions.length ? (
    <ul aria-label={`Cautions for ${pin.label}`} className="mt-2 space-y-1 break-words text-xs leading-5 text-orange-200">
      {cautions.map((caution) => <li key={caution}>{caution}</li>)}
    </ul>
  ) : null;
}
