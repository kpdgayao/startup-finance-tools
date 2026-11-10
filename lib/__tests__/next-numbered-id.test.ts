import { describe, it, expect } from "vitest";
import { nextNumberedId } from "../utils";

describe("nextNumberedId", () => {
  it("starts at 1 when no id uses the prefix", () => {
    expect(nextNumberedId("line-", ["ex-1", "ex-2"])).toBe("line-1");
  });
  it("goes one past the highest, not the count", () => {
    expect(nextNumberedId("c-", ["c-1", "c-3"])).toBe("c-4");
  });
  it("ignores ids that only share the prefix", () => {
    expect(nextNumberedId("s-", ["s-2", "s-x", "s-1.5"])).toBe("s-3");
  });
});
