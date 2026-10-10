import { describe, expect, it, vi } from "vitest";

import { createFakeEmailSuppressionRepo } from "../../db/email-suppression.fake";
import { isJobRequestAuthorized } from "../auth/job-secret";
import { addressKey, createSuppressingEmail } from "../messaging/guards";
import { createApiRoute } from "./handler";
import { emailSuppressionRoutes } from "./email";

// Executable acceptance criteria for S14 (docs/features/s14-email-sending.md), verified at the API
// boundary: real Request -> adapter -> job-secret check -> validation -> repo (a fake that behaves like the table).
//
// AC7 The suppression endpoint refuses callers without the job secret, validates its input, and records
// an address once, as a keyed hash.
type Json = { ok: boolean; data?: { recorded?: boolean }; error?: { code: string } };
const secret = "a-job-secret-of-sufficient-length";
const salt = "a-test-salt-of-sufficient-length";

describe("S14 email suppression endpoint (API boundary)", () => {
  const setup = () => {
    const repo = createFakeEmailSuppressionRepo();
    const routes = emailSuppressionRoutes(createApiRoute({ getUserId: vi.fn(), onUnexpected: vi.fn() }), {
      authorized: (request) => isJobRequestAuthorized(request, secret),
      repo: () => repo,
      salt: () => salt,
    });
    const post = async (body: unknown, token: string | null = secret) => {
      const headers: Record<string, string> = token === null ? {} : { authorization: `Bearer ${token}` };
      const res = await routes.suppress.POST(new Request("http://localhost/api/v1/internal/email/suppress", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) }));
      return { status: res.status, json: (await res.json()) as Json };
    };
    return { repo, post };
  };

  it("AC7 refuses a caller without the job secret, or with the wrong one, and records nothing", async () => {
    const s = setup();
    const body = { address: "bounced@example.com", reason: "bounce" };
    expect((await s.post(body, null)).status).toBe(401);
    expect((await s.post(body, "not-the-secret")).status).toBe(401);
    expect((await s.post(body, "")).status).toBe(401);
    expect(s.repo.entries.size).toBe(0);
  });

  it("AC7 validates its input: a missing or odd address, an unknown reason, extra fields and bad JSON", async () => {
    const s = setup();
    for (const body of [{}, { address: "x", reason: "bounce" }, { address: "a b@example.com", reason: "bounce" }, { address: "a@example.com", reason: "spam" }, { address: "a@example.com", reason: "bounce", extra: 1 }, { address: "a@example.com\r\nBcc: x@y.z", reason: "bounce" }, "not json"]) {
      expect((await s.post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(s.repo.entries.size).toBe(0);
  });

  it("AC6 AC7 records the address once as a keyed hash; the reply never echoes it; the same address is one entry", async () => {
    const s = setup();
    const first = await s.post({ address: "Bounced@Example.com ", reason: "bounce" });
    expect(first).toMatchObject({ status: 200, json: { ok: true, data: { recorded: true } } });
    expect(JSON.stringify(first.json)).not.toContain("ounced");
    await s.post({ address: "bounced@example.com", reason: "complaint" });
    expect([...s.repo.entries.keys()]).toEqual([addressKey("bounced@example.com", salt)]);
    expect(s.repo.entries.get(addressKey("bounced@example.com", salt))).toBe("bounce"); // the first reason stays
    expect(JSON.stringify([...s.repo.entries])).not.toContain("example.com"); // no address anywhere in the table
  });

  it("AC6 an address recorded through the endpoint is then never emailed", async () => {
    const s = setup();
    await s.post({ address: "gone@example.com", reason: "complaint" });
    const send = vi.fn(async () => undefined);
    const email = createSuppressingEmail({ send }, s.repo, salt, () => undefined);
    await email.send({ to: "gone@example.com", subject: "Hi", text: "Body" });
    expect(send).not.toHaveBeenCalled();
    await email.send({ to: "kept@example.com", subject: "Hi", text: "Body" });
    expect(send).toHaveBeenCalledTimes(1);
  });
});
