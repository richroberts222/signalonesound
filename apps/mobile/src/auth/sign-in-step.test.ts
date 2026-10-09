import { describe, expect, it } from "vitest";

import { nextSignInStep } from "./sign-in-step";

describe("nextSignInStep", () => {
  it("finishes when Clerk says the sign-in is complete", () => {
    expect(nextSignInStep("complete")).toBe("finish");
  });

  it("asks for the emailed code on a new device or when a second factor is required", () => {
    expect(nextSignInStep("needs_client_trust")).toBe("email-code");
    expect(nextSignInStep("needs_second_factor")).toBe("email-code");
  });

  it("does not guess for any other status, so the form shows that the step is not supported", () => {
    for (const status of ["needs_identifier", "needs_first_factor", "needs_new_password", "", null, undefined]) {
      expect(nextSignInStep(status), String(status)).toBe("unsupported");
    }
  });
});
