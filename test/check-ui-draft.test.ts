import { describe, expect, it } from "vitest";
import { maxSourceLength } from "@/lib/code-check/scan";
import { draftKey, maxStoredDraftLength, parseDraft, readDraft, serializeDraft, writeDraft } from "@/components/check/draft";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

describe("pin check draft", () => {
  it("round-trips code and language", () => {
    const storage = memoryStorage();
    writeDraft("pinMode(13, OUTPUT);", "arduino", storage);
    expect(readDraft(storage)).toEqual({ code: "pinMode(13, OUTPUT);", dialect: "arduino" });
  });

  it("keeps a draft at the limit whose JSON escaping makes it longer than the limit", () => {
    // Regression: a 99,000-character sketch with 3,000 lines was saved, then
    // discarded on reload because the read bounded the escaped JSON by the code limit.
    const line = `${"x".repeat(32)}\n`;
    const code = line.repeat(3000).slice(0, 99_000);
    const storage = memoryStorage();
    writeDraft(code, "auto", storage);
    expect(storage.map.get(draftKey)!.length).toBeGreaterThan(maxSourceLength + 256);
    expect(readDraft(storage)?.code).toBe(code);
  });

  it("keeps a full-limit draft of characters that escape to six", () => {
    const code = "\u0001".repeat(maxSourceLength);
    const stored = serializeDraft(code, "micropython");
    expect(stored).not.toBeNull();
    expect(stored!.length).toBeLessThanOrEqual(maxStoredDraftLength);
    expect(parseDraft(stored)).toEqual({ code, dialect: "micropython" });
  });

  it("never stores or restores code over the limit", () => {
    const over = "a".repeat(maxSourceLength + 1);
    expect(serializeDraft(over, "auto")).toBeNull();
    const storage = memoryStorage();
    storage.map.set(draftKey, "keep");
    writeDraft(over, "auto", storage);
    expect(storage.map.get(draftKey)).toBe("keep");
    expect(parseDraft(JSON.stringify({ code: over, dialect: "auto" }))).toBeNull();
    expect(parseDraft(`{"code":"a","dialect":"auto","pad":"${"b".repeat(maxStoredDraftLength)}"}`)).toBeNull();
  });

  it("clears the draft when the editor is emptied", () => {
    const storage = memoryStorage();
    writeDraft("led = Pin(2)", "auto", storage);
    writeDraft("", "auto", storage);
    expect(storage.map.has(draftKey)).toBe(false);
  });

  it.each([
    ["malformed JSON", "{code:"],
    ["an array", '["a"]'],
    ["null", "null"],
    ["a number for code", '{"code":5,"dialect":"auto"}'],
    ["empty code", '{"code":"","dialect":"auto"}'],
    ["a non-string", 42],
  ])("drops %s", (_, raw) => {
    expect(parseDraft(raw)).toBeNull();
  });

  it("falls back to auto-detect for an unknown or wrongly typed language", () => {
    expect(parseDraft('{"code":"x","dialect":"cobol"}')).toEqual({ code: "x", dialect: "auto" });
    expect(parseDraft('{"code":"x","dialect":7}')).toEqual({ code: "x", dialect: "auto" });
  });

  it("survives storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(readDraft(broken)).toBeNull();
    expect(() => writeDraft("x", "auto", broken)).not.toThrow();
  });
});
