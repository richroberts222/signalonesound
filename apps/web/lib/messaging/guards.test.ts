import { describe, expect, it, vi } from "vitest";

import type { EmailPort } from "./email";
import { SIMULATOR_DOMAIN, addressKey, createAllowlistedEmail, createSuppressingEmail, isAllowed } from "./guards";

// S14 AC5 and AC6: outside production only allowlisted recipients can be emailed, and an address that
// bounced or complained is never emailed again. The wrappers never log an address or the text.
const salt = "a-test-salt-of-sufficient-length";
const text = { subject: "Hi", text: "Body text" };
const spy = () => {
  const send = vi.fn(async () => undefined);
  const port: EmailPort = { send };
  return { port, send };
};

describe("allowlist (outside production)", () => {
  it("AC5 the simulator addresses are always allowed; everyone else is refused unless listed", () => {
    expect(isAllowed(`success@${SIMULATOR_DOMAIN}`, [])).toBe(true);
    expect(isAllowed(`BOUNCE@${SIMULATOR_DOMAIN}`, [])).toBe(true);
    expect(isAllowed("stranger@example.com", [])).toBe(false);
    expect(isAllowed("tester@example.com", ["tester@example.com"])).toBe(true);
    expect(isAllowed("  Tester@Example.com ", ["tester@example.com"])).toBe(true);
    expect(isAllowed("other@example.com", ["tester@example.com"])).toBe(false); // a full address allows only that address
    expect(isAllowed("anyone@team.example", ["team.example"])).toBe(true); // a domain allows everyone there
    expect(isAllowed("anyone@team.example", ["@team.example"])).toBe(true);
    expect(isAllowed("anyone@evilteam.example", ["team.example"])).toBe(false); // not a suffix match
    expect(isAllowed("a@team.example.evil.com", ["team.example"])).toBe(false);
  });

  it("AC5 a refused message never reaches the provider and the log holds no address", async () => {
    const { port, send } = spy();
    const lines: string[] = [];
    const guarded = createAllowlistedEmail(port, [], (l) => lines.push(l));
    await expect(guarded.send({ to: "stranger@example.com", ...text })).rejects.toMatchObject({ kind: "not_allowed" });
    expect(send).not.toHaveBeenCalled();
    expect(lines.join(" ")).not.toContain("stranger@example.com");
    expect(lines.join(" ")).not.toContain("Body text");
    await guarded.send({ to: `success@${SIMULATOR_DOMAIN}`, ...text });
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("suppression list", () => {
  it("AC6 a suppressed address is never sent to, however it is written", async () => {
    const { port, send } = spy();
    const keys = new Set([addressKey("bounced@example.com", salt)]);
    const lines: string[] = [];
    const email = createSuppressingEmail(port, { isSuppressed: async (k) => keys.has(k) }, salt, (l) => lines.push(l));
    for (const to of ["bounced@example.com", "BOUNCED@example.com", "  Bounced@Example.com  "]) await email.send({ to, ...text });
    expect(send).not.toHaveBeenCalled();
    expect(lines.join(" ")).not.toContain("bounced@example.com");
    await email.send({ to: "fine@example.com", ...text });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("AC6 the stored key is a keyed hash, not the address, and depends on the secret", () => {
    const key = addressKey("person@example.com", salt);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain("person");
    expect(addressKey("PERSON@example.com ", salt)).toBe(key);
    expect(addressKey("person@example.com", `${salt}-other`)).not.toBe(key);
    expect(addressKey("other@example.com", salt)).not.toBe(key);
  });
});
