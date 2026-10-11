import { describe, expect, it } from "vitest";

import { DELETE_WORD, GENERIC_FAILURE, canConfirmDelete, exportText, failureText, inviteLink, inviteMessage, needsPolicyAcceptance, policyLink } from "./accountText";

// S1/S5/S6 on the phone: the Account tab's rules and sentences. Deleting an account cannot be undone, so the
// confirmation must be exact; a failed call is worded plainly and never shows server internals.
describe("deleting an account", () => {
  it("needs the exact word, typed, and nothing close to it", () => {
    expect(canConfirmDelete(DELETE_WORD)).toBe(true);
    for (const typed of ["", "delete", "Delete", "DELETE ", " DELETE", "DELET", "DELETED", "yes", "CONFIRM"]) expect(canConfirmDelete(typed), JSON.stringify(typed)).toBe(false);
  });
});

describe("failure wording", () => {
  it("says what to do for the codes a person can act on", () => {
    expect(failureText({ code: "policy_reacceptance_required", message: "x" })).toMatch(/accept the current Terms/i);
    expect(failureText({ code: "unauthenticated", message: "x" })).toMatch(/sign in again/i);
    expect(failureText({ code: "rate_limited", message: "x" })).toMatch(/wait/i);
  });

  it("shows the server's field message for a bad name, and a generic line for an unexpected failure", () => {
    expect(failureText({ code: "validation_failed", message: "Invalid input", fieldErrors: { displayName: ["Name is required"] } })).toBe("Name is required");
    expect(failureText({ code: "internal", message: "SELECT * FROM user_profile failed: password=hunter2" })).toBe(GENERIC_FAILURE);
  });
});

describe("policy", () => {
  const profile = (accepted: boolean) => ({ policy: { currentVersion: "2026-10-09", acceptedVersion: accepted ? "2026-10-09" : null, accepted } });
  it("asks for acceptance only when the current version is not accepted", () => {
    expect(needsPolicyAcceptance(profile(false))).toBe(true);
    expect(needsPolicyAcceptance(profile(true))).toBe(false);
  });
});

describe("export and invite", () => {
  it("writes the export as readable text that parses back to the same data", () => {
    const data = { exportedAt: "2026-10-11T00:00:00Z", data: { saved_event: [{ eventId: "e1" }] } };
    const text = exportText(data);
    expect(text).toContain("\n");
    expect(JSON.parse(text)).toEqual(data);
  });

  it("builds an invite link from the site address and the random token, with no personal data", () => {
    expect(inviteLink("https://www.signalonesound.com/", "abc_DEF-123")).toBe("https://www.signalonesound.com/invite/abc_DEF-123");
    expect(inviteLink("https://x.example", "a b/c")).toBe("https://x.example/invite/a%20b%2Fc"); // a token can never change the path
    const message = inviteMessage("https://x.example/invite/t");
    expect(message).toContain("https://x.example/invite/t");
    expect(message).not.toMatch(/@|\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/); // no email or phone number
  });

  it("links to the Terms and Privacy pages on the site", () => {
    expect(policyLink("https://www.signalonesound.com/", "terms")).toBe("https://www.signalonesound.com/terms");
    expect(policyLink("https://www.signalonesound.com", "privacy")).toBe("https://www.signalonesound.com/privacy");
  });
});
