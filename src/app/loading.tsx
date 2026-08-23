/**
 * First paint before the catalog is ready. A skeleton of the actual index
 * shape, not a spinner — the frame the user is about to read appears first and
 * fills in, so nothing jumps when the data lands.
 */
export default function Loading() {
  return (
    <div className="panel-grain flex min-h-screen flex-col">
      <div className="border-b border-rule bg-face px-4 py-2 sm:px-6">
        <span className="readout text-[1.35rem] uppercase tracking-[0.06em] text-ink">
          PinHub
        </span>
      </div>
      <div
        className="mx-auto w-full max-w-[1720px] flex-1 px-4 py-2 sm:px-6"
        role="status"
        aria-live="polite"
      >
        <span className="sr-only">Loading the board index…</span>
        <div className="panel">
          <div className="border-b border-rule px-3 py-1.5">
            <span className="silk">Bench index</span>
          </div>
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="border-b border-rule px-6 py-3">
              <div className="h-3 w-48 bg-rule" />
              <div className="mt-2 h-2.5 w-full max-w-xl bg-rule" />
              <div className="mt-2 h-2.5 w-64 bg-rule" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
