// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChoiceMenu } from "@/components/catalog/SortMenu";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
] as const;

afterEach(cleanup);

describe("ChoiceMenu alignment", () => {
  it("lines the list up with the trigger's right edge when asked", () => {
    // Regression: the pin check's language menu opened rightward out of the
    // editor panel and was clipped; only the viewport was considered.
    render(<ChoiceMenu value="a" options={options} onChange={() => {}} label="Code language" heading="Language" align="end" />);
    fireEvent.click(screen.getByRole("combobox", { name: "Code language" }));
    const list = screen.getByRole("listbox", { name: "Code language" });
    expect(list.className).toContain("right-0");
    expect(list.className).not.toContain("left-0");
  });

  it("keeps the default left alignment when there is room", () => {
    render(<ChoiceMenu value="a" options={options} onChange={() => {}} label="Sort boards" heading="Sort by" />);
    fireEvent.click(screen.getByRole("combobox", { name: "Sort boards" }));
    expect(screen.getByRole("listbox", { name: "Sort boards" }).className).toContain("left-0");
  });
});
