// @vitest-environment jsdom

import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CodeEditor, type CodeEditorHandle, type EditorHint } from "@/components/check/CodeEditor";

const noHints = new Map<number, EditorHint[]>();
let handle: CodeEditorHandle | null = null;

function Harness({ initial, maxLength = 1000 }: { initial: string; maxLength?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <span id="label">Code</span>
      <CodeEditor
        ref={(instance) => {
          handle = instance;
        }}
        value={value}
        onChange={setValue}
        marks={[]}
        ranges={[]}
        hints={noHints}
        selectedPin={null}
        onCaret={() => {}}
        maxLength={maxLength}
        placeholder=""
        labelId="label"
      />
    </>
  );
}

function area(): HTMLTextAreaElement {
  return screen.getByRole("textbox") as HTMLTextAreaElement;
}

afterEach(() => {
  cleanup();
  handle = null;
});

describe("CodeEditor", () => {
  it("indents every selected line with Tab instead of replacing the selection", () => {
    // Regression: Tab with a selection replaced it with two spaces.
    render(<Harness initial={"pinMode(2, OUTPUT);\npinMode(3, OUTPUT);\nloop();"} />);
    const textarea = area();
    textarea.setSelectionRange(3, 25);
    fireEvent.keyDown(textarea, { key: "Tab" });
    expect(textarea.value).toBe("  pinMode(2, OUTPUT);\n  pinMode(3, OUTPUT);\nloop();");
    expect(textarea.selectionStart).toBe(5);
    expect(textarea.selectionEnd).toBe(29);
  });

  it("outdents the selected lines with Shift+Tab", () => {
    render(<Harness initial={"  a\n    b\nc"} />);
    const textarea = area();
    textarea.setSelectionRange(0, 9);
    fireEvent.keyDown(textarea, { key: "Tab", shiftKey: true });
    expect(textarea.value).toBe("a\n  b\nc");
  });

  it("inserts two spaces at a caret", () => {
    render(<Harness initial="ab" />);
    const textarea = area();
    textarea.setSelectionRange(1, 1);
    fireEvent.keyDown(textarea, { key: "Tab" });
    expect(textarea.value).toBe("a  b");
    expect(textarea.selectionStart).toBe(3);
  });

  it("lets Tab leave the editor after Escape", () => {
    render(<Harness initial="ab" />);
    const textarea = area();
    fireEvent.keyDown(textarea, { key: "Escape" });
    fireEvent.keyDown(textarea, { key: "Shift" });
    const event = fireEvent.keyDown(textarea, { key: "Tab", shiftKey: true });
    // Not prevented: the browser moves focus.
    expect(event).toBe(true);
    expect(textarea.value).toBe("ab");
    // The escape covers one Tab only.
    expect(fireEvent.keyDown(textarea, { key: "Tab" })).toBe(false);
  });

  it("does not indent past the length limit", () => {
    render(<Harness initial="abcd" maxLength={5} />);
    const textarea = area();
    textarea.setSelectionRange(0, 0);
    fireEvent.keyDown(textarea, { key: "Tab" });
    expect(textarea.value).toBe("abcd");
  });

  it("clears through the editing path", () => {
    render(<Harness initial="pinMode(2, OUTPUT);" />);
    act(() => handle?.clear());
    expect(area().value).toBe("");
  });

  it("draws every mirror line as its own fixed-height block", () => {
    const hints = new Map<number, EditorHint[]>([[1, [{ text: "D2 · pin 3", status: "fix", pinId: "D2" }]]]);
    const { container } = render(
      <CodeEditor
        value={"a\nb"}
        onChange={() => {}}
        marks={[]}
        ranges={[]}
        hints={hints}
        selectedPin={null}
        onCaret={() => {}}
        maxLength={100}
        placeholder=""
        labelId="x"
      />,
    );
    const lines = container.querySelectorAll(".ph-check-mirror .ph-check-line");
    expect(lines).toHaveLength(2);
    expect(lines[0].querySelector(".ph-check-hint-glyph")?.textContent).toBe("✕");
  });
});
