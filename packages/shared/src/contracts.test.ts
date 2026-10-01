import { describe, expect, it } from "vitest";

import { API_VERSIONS, CURRENT_API_VERSION, paginated } from "./contracts";
import { fail } from "./result";

describe("contracts", () => {
  it("current API version is a supported version", () => {
    expect(API_VERSIONS).toContain(CURRENT_API_VERSION);
  });

  it("paginated defaults to the end of the list", () => {
    expect(paginated([1, 2])).toEqual({ items: [1, 2], nextCursor: null });
    expect(paginated([1], "abc").nextCursor).toBe("abc");
  });

  it("a failed Result error is a valid ApiError", () => {
    const r = fail("not_found", "Missing");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("not_found");
    }
  });
});
