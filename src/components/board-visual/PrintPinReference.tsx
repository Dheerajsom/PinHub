import type { Board } from "@/lib/boards";
import { pinCautionTexts } from "@/lib/pin-reference";
import { roleLabels } from "@/components/board-visual/roles";
import { verificationSourceFor } from "@/lib/source-trust";

export function PrintPinReference({ board }: { board: Board }) {
  if (!board.pinout) return null;
  const groups = board.pinout.pins
    ? [{ label: board.pinout.connector, pins: [...board.pinout.pins.left, ...board.pinout.pins.right].sort((a, b) => a.position - b.position) }]
    : board.pinout.groups ?? [];
  const source = verificationSourceFor(board);
  return (
    <section style={{ display: "none" }} className="pin-print-reference">
      <h2>{board.name} — {board.pinout.connector}</h2>
      <p>Logic: {board.logicLevel}. Complete recorded pin schedule; verify orientation and board revision before wiring.</p>
      <h3>Connector orientation and notes</h3>
      <ul>{board.pinout.notes.map((note) => <li key={note}>{note}</li>)}</ul>
      {source ? <p>Verify against {source.label}: <a href={source.url}>{source.url}</a></p> : null}
      {groups.map((group) => <table key={group.label}>
        <colgroup><col style={{ width: "8%" }} /><col style={{ width: "18%" }} /><col style={{ width: "14%" }} /><col style={{ width: "60%" }} /></colgroup>
        <thead>
          <tr><th colSpan={4}>{group.label}</th></tr>
          <tr><th>Pin</th><th>Signal</th><th>Primary role</th><th>Aliases and cautions</th></tr>
        </thead>
        <tbody>{group.pins.map((pin) => <tr key={`${pin.position}-${pin.label}`}>
          <th scope="row">{pin.position}</th><td>{pin.label}</td><td>{roleLabels[pin.role]}</td>
          <td>{[...(pin.aliases ?? []), ...pinCautionTexts(pin, board.pinFunctions?.flagNotes)].join(" · ")}</td>
        </tr>)}</tbody>
      </table>)}
    </section>
  );
}
