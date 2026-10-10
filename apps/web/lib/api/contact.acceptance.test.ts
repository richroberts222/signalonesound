import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { MAX_CONTACT_MESSAGES_PER_DAY } from "@signalone/validation";

import { createFakeContactRepo } from "../../db/contact.fake";
import { createAdminDirectory } from "../auth/admin";
import { createContactService } from "../services/contact";
import { contactRoutes } from "./contact";
import { createApiRoute } from "./handler";

// Executable acceptance criteria for S15's contact form and Messages inbox
// (docs/features/s15-public-pages.md), verified at the API boundary: real Request -> adapter ->
// authentication -> validation -> real service -> repo (a fake that behaves like the table).
//
// AC7 The form is closed unless switched on.  AC8 Submissions are validated, a bot's trap field drops the
// message quietly, one person is limited per day, and the reply never echoes the message.  AC9 Only admins
// read, mark done or delete messages.
type Json = { ok: boolean; data: any; error?: { code: string; message?: string; fieldErrors?: Record<string, string[]> } }; // eslint-disable-line @typescript-eslint/no-explicit-any
const DAY = 24 * 3600 * 1000;

describe("S15 contact form and Messages inbox acceptance criteria (API boundary)", () => {
  const base = "http://localhost/api/v1";
  const admin = `user_${"A".repeat(10)}`;
  const member = `user_${"M".repeat(10)}`;
  const valid = (over: Record<string, unknown> = {}) => ({ topic: "question", name: "Pat Example", replyEmail: "pat@example.com", message: "Do you list events in Idaho?", ...over });

  const setup = (open = true) => {
    let clock = new Date("2026-10-10T12:00:00Z");
    const now = () => clock;
    const repo = createFakeContactRepo(now);
    const state = { open };
    const admins = { list: [admin] };
    const service = createContactService({ repo, admins: { isAdmin: (id) => createAdminDirectory(admins.list).isAdmin(id) }, isOpen: () => state.open, addressSalt: "a-test-salt-of-sufficient-length", now });
    const as = (userId: string | null) => {
      const routes = contactRoutes(createApiRoute({ getUserId: vi.fn().mockResolvedValue(userId), onUnexpected: vi.fn() }), () => service);
      const call = async (pending: Promise<Response>) => {
        const res = await pending;
        return { status: res.status, json: (await res.json()) as Json };
      };
      const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) });
      return {
        send: (body: unknown, address = "203.0.113.7") => call(routes.send.POST(new Request(`${base}/contact`, { method: "POST", headers: { "x-forwarded-for": address }, body: typeof body === "string" ? body : JSON.stringify(body) }))),
        list: (query = "") => call(routes.list.GET(new Request(`${base}/admin/contact-messages${query}`))),
        setStatus: (id: string, body: unknown) => call(routes.one.PATCH(new Request(`${base}/x`, { method: "PATCH", body: JSON.stringify(body) }), ctx({ id }))),
        remove: (id: string) => call(routes.one.DELETE(new Request(`${base}/x`, { method: "DELETE" }), ctx({ id }))),
      };
    };
    return { as, repo, state, admins, advance: (ms: number) => (clock = new Date(clock.getTime() + ms)) };
  };

  it("AC7 a closed form refuses with 'not found' and stores nothing; an open one accepts", async () => {
    const closed = setup(false);
    const refused = await closed.as(null).send(valid());
    expect(refused.status).toBe(404);
    expect(closed.repo.rows).toHaveLength(0);
    const open = setup(true);
    expect((await open.as(null).send(valid())).status).toBe(200);
    open.state.open = false; // switched off again: it closes at once
    expect((await open.as(null).send(valid())).status).toBe(404);
  });

  it("AC8 stores a valid message without any sign-in and the reply never echoes what was sent", async () => {
    const s = setup();
    const r = await s.as(null).send(valid({ message: "Please list our Boise tent revival. It starts Friday." }));
    expect(r).toMatchObject({ status: 200, json: { ok: true, data: { received: true } } });
    expect(JSON.stringify(r.json)).not.toContain("Boise");
    expect(JSON.stringify(r.json)).not.toContain("pat@example.com");
    expect(s.repo.rows).toHaveLength(1);
    expect(s.repo.rows[0]).toMatchObject({ topic: "question", name: "Pat Example", replyEmail: "pat@example.com", status: "new" });
    expect(s.repo.rows[0].addressKey).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(s.repo.rows)).not.toContain("203.0.113.7"); // only a keyed hash of the address
  });

  it("AC8 the reply email is optional, and an empty one is the same as none", async () => {
    const s = setup();
    expect((await s.as(null).send(valid({ replyEmail: undefined }))).status).toBe(200);
    expect((await s.as(null).send(valid({ replyEmail: "" }), "198.51.100.2")).status).toBe(200);
    expect(s.repo.rows.map((r) => r.replyEmail)).toEqual([null, null]);
  });

  it("AC8 validates topic, name, reply email, message and unknown fields", async () => {
    const s = setup();
    const bad: Record<string, unknown>[] = [
      { topic: "sales" },
      { topic: undefined },
      { name: "" },
      { name: "   " },
      { name: "x".repeat(81) },
      { name: `Pat${String.fromCharCode(0)}` },
      { replyEmail: "not-an-email" },
      { message: "short" },
      { message: "x".repeat(2001) },
      { message: `bad${String.fromCharCode(7)}text here` },
      { extra: "field" },
    ];
    for (const over of bad) expect((await s.as(null).send(valid(over))).status, JSON.stringify(over)).toBe(400);
    expect((await s.as(null).send("not json")).status).toBe(400);
    expect(s.repo.rows).toHaveLength(0);
    // the limits are inclusive
    expect((await s.as(null).send(valid({ name: "x".repeat(80), message: "x".repeat(2000) }), "198.51.100.3")).status).toBe(200);
    expect((await s.as(null).send(valid({ message: "1234567890" }), "198.51.100.4")).status).toBe(200);
  });

  it("AC8 text is kept as plain text: markup is stored as typed and never turned into anything else", async () => {
    const s = setup();
    await s.as(null).send(valid({ message: "<script>alert(1)</script> and <b>bold</b>, with a\nsecond line" }));
    expect(s.repo.rows[0].message).toBe("<script>alert(1)</script> and <b>bold</b>, with a\nsecond line");
    const listed = await s.as(admin).list();
    expect(listed.json.data.items[0].message).toBe("<script>alert(1)</script> and <b>bold</b>, with a\nsecond line"); // the page renders text, not markup
  });

  it("AC8 a filled hidden 'website' field is a bot: nothing is stored and the reply looks the same", async () => {
    const s = setup();
    const r = await s.as(null).send(valid({ website: "http://spam.example" }));
    expect(r).toMatchObject({ status: 200, json: { ok: true, data: { received: true } } });
    expect(s.repo.rows).toHaveLength(0);
    expect((await s.as(null).send(valid({ website: "" }))).status).toBe(200); // an empty trap field is a person
    expect(s.repo.rows).toHaveLength(1);
  });

  it("AC8 one address is limited per day; another address and the next day are not", async () => {
    const s = setup();
    for (let i = 0; i < MAX_CONTACT_MESSAGES_PER_DAY; i++) expect((await s.as(null).send(valid())).status).toBe(200);
    const blocked = await s.as(null).send(valid());
    expect(blocked.status).toBe(429);
    expect(blocked.json.error?.code).toBe("rate_limited");
    expect(s.repo.rows).toHaveLength(MAX_CONTACT_MESSAGES_PER_DAY);
    expect((await s.as(null).send(valid(), "198.51.100.9")).status).toBe(200);
    s.advance(DAY + 1000);
    expect((await s.as(null).send(valid())).status).toBe(200);
  });

  it("AC9 only an admin reads the inbox; a member gets 404 and a signed-out caller 401", async () => {
    const s = setup();
    await s.as(null).send(valid());
    expect((await s.as(member).list()).status).toBe(404);
    expect((await s.as(null).list()).status).toBe(401);
    const id = s.repo.rows[0].id;
    for (const who of [member, null]) {
      expect((await s.as(who).setStatus(id, { status: "done" })).status).toBe(who === null ? 401 : 404);
      expect((await s.as(who).remove(id)).status).toBe(who === null ? 401 : 404);
    }
    expect(s.repo.rows[0].status).toBe("new"); // nothing the outsiders tried changed anything
    expect((await s.as(admin).list()).status).toBe(200);
    s.admins.list.length = 0; // read on every request: an admin removed from the list loses access at once
    expect((await s.as(admin).list()).status).toBe(404);
  });

  it("AC9 lists newest first, filters by status, marks done and deletes", async () => {
    const s = setup();
    await s.as(null).send(valid({ name: "First" }), "198.51.100.1");
    s.advance(1000);
    await s.as(null).send(valid({ name: "Second" }), "198.51.100.2");
    const all = (await s.as(admin).list()).json.data.items;
    expect(all.map((m: { name: string }) => m.name)).toEqual(["Second", "First"]);
    const done = await s.as(admin).setStatus(all[0].id, { status: "done" });
    expect(done.json.data).toMatchObject({ name: "Second", status: "done" });
    expect((await s.as(admin).list("?status=new")).json.data.items.map((m: { name: string }) => m.name)).toEqual(["First"]);
    expect((await s.as(admin).list("?status=done")).json.data.items.map((m: { name: string }) => m.name)).toEqual(["Second"]);
    expect((await s.as(admin).list("?status=bogus")).status).toBe(400);
    expect((await s.as(admin).setStatus(all[0].id, { status: "archived" })).status).toBe(400);
    expect((await s.as(admin).setStatus(randomUUID(), { status: "done" })).status).toBe(404);
    expect((await s.as(admin).setStatus("not-a-uuid", { status: "done" })).status).toBe(404);
    expect((await s.as(admin).remove(all[1].id)).json.data).toEqual({ deleted: true });
    expect((await s.as(admin).remove(all[1].id)).status).toBe(404); // already gone
    expect((await s.as(admin).list()).json.data.items).toHaveLength(1);
  });
});
