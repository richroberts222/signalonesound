import { describe, expect, it } from "vitest";

import { EMPTY_TEXT, ERROR_TEXT, statusFor } from "./status";

// S5 polish: the owner found that an error showed at the bottom of the screen, off to one side of where he had
// tapped, so a person would stare at nothing. The status is decided here and shown right under the search buttons.
describe("Discover status", () => {
  it("shows an error with a retry, never a silent empty screen", () => {
    expect(statusFor("error", 0)).toEqual({ kind: "error", text: ERROR_TEXT, retryLabel: "Try again" });
    expect(statusFor("error", 5).kind).toBe("error"); // an error wins over stale results
    expect(ERROR_TEXT).toMatch(/connection/i);
    expect(ERROR_TEXT).toMatch(/try again/i);
  });

  it("says when it is searching, when nothing matched, and how many were found", () => {
    expect(statusFor("loading", 0).kind).toBe("loading");
    expect(statusFor("ready", 0)).toEqual({ kind: "empty", text: EMPTY_TEXT });
    expect(statusFor("ready", 1)).toEqual({ kind: "count", text: "1 event found" });
    expect(statusFor("ready", 12)).toEqual({ kind: "count", text: "12 events found" });
  });

  it("every state has words, so a screen reader and a person always hear something", () => {
    for (const [state, count] of [["loading", 0], ["error", 0], ["ready", 0], ["ready", 3]] as const) {
      const status = statusFor(state, count);
      expect("text" in status && status.text.length > 0).toBe(true);
    }
  });
});
