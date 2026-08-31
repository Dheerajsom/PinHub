import { describe, expect, it, vi } from "vitest";
import type { Board } from "@/lib/boards";
import { createBoardDetailLoader } from "@/lib/board-detail-loader";

function board(id: string): Board {
  return {
    id,
    name: `Test board ${id}`,
    vendor: "Test vendor",
    category: "Microcontroller",
    family: "Test family",
    processor: "Test processor",
    logicLevel: "3.3 V",
    power: "USB",
    formFactor: "Test",
    description: "Test board fixture",
    tags: ["test"],
    interfaces: ["GPIO"],
    highlights: [],
    warnings: ["Test voltage before wiring."],
    sourceLinks: [
      {
        label: "Vendor documentation",
        url: "https://example.com/docs",
        type: "Docs",
      },
    ],
  };
}

describe("createBoardDetailLoader", () => {
  it("serves initial and fetched records from cache", async () => {
    const initial = board("initial");
    const fetched = board("needs-fetch");
    const fetchBoard = vi.fn(async () => Response.json(fetched));
    const loader = createBoardDetailLoader([initial], fetchBoard);

    await expect(loader.load(initial.id)).resolves.toBe(initial);
    expect(fetchBoard).not.toHaveBeenCalled();

    await expect(loader.load(fetched.id)).resolves.toEqual(fetched);
    await expect(loader.load(fetched.id)).resolves.toEqual(fetched);
    expect(fetchBoard).toHaveBeenCalledOnce();
    expect(loader.peek(fetched.id)).toEqual(fetched);
  });

  it("deduplicates concurrent requests for the same board", async () => {
    const fetched = board("board with/slash");
    let resolveResponse: ((response: Response) => void) | undefined;
    const response = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchBoard = vi.fn(() => response);
    const loader = createBoardDetailLoader([], fetchBoard);

    const first = loader.load(fetched.id);
    const second = loader.load(fetched.id);

    expect(second).toBe(first);
    expect(fetchBoard).toHaveBeenCalledOnce();
    expect(fetchBoard).toHaveBeenCalledWith(
      "/api/boards/board%20with%2Fslash",
      { headers: { Accept: "application/json" } },
    );

    resolveResponse?.(Response.json(fetched));
    await expect(Promise.all([first, second])).resolves.toEqual([
      fetched,
      fetched,
    ]);
  });

  it("clears failed requests so a retry can succeed", async () => {
    const fetched = board("retryable");
    const fetchBoard = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json(fetched));
    const loader = createBoardDetailLoader([], fetchBoard);

    await expect(loader.load(fetched.id)).rejects.toThrow(
      "Board request failed (503)",
    );
    await expect(loader.load(fetched.id)).resolves.toEqual(fetched);
    expect(fetchBoard).toHaveBeenCalledTimes(2);
  });

  it("does not cache an invalid payload and permits a retry", async () => {
    const fetched = board("expected");
    const fetchBoard = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          ...fetched,
          highlights: undefined,
        }),
      )
      .mockResolvedValueOnce(Response.json(fetched));
    const loader = createBoardDetailLoader([], fetchBoard);

    await expect(loader.load(fetched.id)).rejects.toThrow(
      "Board response was invalid",
    );
    expect(loader.peek(fetched.id)).toBeUndefined();
    await expect(loader.load(fetched.id)).resolves.toEqual(fetched);
    expect(fetchBoard).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["unknown board category", { category: "Other" }],
    ["unknown interface", { interfaces: ["GPIO", "INVALID"] }],
    [
      "unknown source type",
      {
        sourceLinks: [
          {
            label: "Vendor documentation",
            url: "https://example.com/docs",
            type: "Blog",
          },
        ],
      },
    ],
    [
      "insecure source URL",
      {
        sourceLinks: [
          {
            label: "Vendor documentation",
            url: "http://example.com/docs",
            type: "Docs",
          },
        ],
      },
    ],
    [
      "credential-bearing source URL",
      {
        sourceLinks: [
          {
            label: "Vendor documentation",
            url: "https://user:secret@example.com/docs",
            type: "Docs",
          },
        ],
      },
    ],
    ["missing wiring warnings", { warnings: [] }],
    ["blank wiring warning", { warnings: ["   "] }],
    [
      "normalized duplicate tags",
      { tags: ["wireless", " wireless "] },
    ],
    ["blank highlight", { highlights: [" "] }],
    ["missing source links", { sourceLinks: [] }],
    [
      "duplicate source URLs",
      {
        sourceLinks: [
          {
            label: "Vendor documentation",
            url: "https://example.com/docs",
            type: "Docs",
          },
          {
            label: "Vendor pinout",
            url: "https://example.com/docs",
            type: "Pinout",
          },
        ],
      },
    ],
    [
      "blank pinout note",
      {
        pinout: {
          connector: "Header",
          layout: "grouped",
          notes: [""],
          groups: [
            {
              label: "Pins",
              pins: [{ position: 1, label: "D1", role: "gpio" }],
            },
          ],
        },
      },
    ],
    [
      "normalized duplicate group labels",
      {
        pinout: {
          connector: "Header",
          layout: "grouped",
          notes: ["Fixture"],
          groups: [
            {
              label: "Pins",
              pins: [{ position: 1, label: "D1", role: "gpio" }],
            },
            {
              label: " Pins ",
              pins: [{ position: 2, label: "D2", role: "gpio" }],
            },
          ],
        },
      },
    ],
    [
      "blank pin alias",
      {
        pinout: {
          connector: "Header",
          layout: "grouped",
          notes: ["Fixture"],
          groups: [
            {
              label: "Pins",
              pins: [
                {
                  position: 1,
                  label: "D1",
                  role: "gpio",
                  aliases: [""],
                },
              ],
            },
          ],
        },
      },
    ],
    [
      "blank pin note",
      {
        pinout: {
          connector: "Header",
          layout: "grouped",
          notes: ["Fixture"],
          groups: [
            {
              label: "Pins",
              pins: [
                {
                  position: 1,
                  label: "D1",
                  role: "gpio",
                  note: " ",
                },
              ],
            },
          ],
        },
      },
    ],
    [
      "invalid pin role",
      {
        pinout: {
          connector: "Header",
          layout: "grouped",
          notes: ["Fixture"],
          groups: [
            {
              label: "Pins",
              pins: [{ position: 1, label: "D1", role: "invalid" }],
            },
          ],
        },
      },
    ],
    [
      "zero pin position",
      {
        pinout: {
          connector: "Header",
          layout: "grouped",
          notes: ["Fixture"],
          groups: [
            {
              label: "Pins",
              pins: [{ position: 0, label: "D0", role: "gpio" }],
            },
          ],
        },
      },
    ],
    [
      "duplicate dual-row pin positions",
      {
        pinout: {
          connector: "Header",
          layout: "dual-row",
          notes: ["Fixture"],
          pins: {
            left: [{ position: 1, label: "D1", role: "gpio" }],
            right: [{ position: 1, label: "GND", role: "ground" }],
          },
        },
      },
    ],
    [
      "unsafe pin position",
      {
        pinout: {
          connector: "Header",
          layout: "grouped",
          notes: ["Fixture"],
          groups: [
            {
              label: "Pins",
              pins: [
                {
                  position: Number.MAX_SAFE_INTEGER + 1,
                  label: "D0",
                  role: "gpio",
                },
              ],
            },
          ],
        },
      },
    ],
  ])("rejects a payload with %s", async (_label, override) => {
    const expected = board("strict-boundary");
    const loader = createBoardDetailLoader(
      [],
      vi.fn(async () => Response.json({ ...expected, ...override })),
    );

    await expect(loader.load(expected.id)).rejects.toThrow(
      "Board response was invalid",
    );
  });
});
