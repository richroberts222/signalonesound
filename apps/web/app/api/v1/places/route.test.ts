import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }), clerkClient: async () => ({}) }));

import * as search from "../events/route";
import * as publicEvent from "../events/[id]/public/route";
import * as places from "./search/route";

// Wiring for the S4 public routes: they answer without any sign-in, and bad input is refused before
// the database is touched. The place search works entirely from data shipped with the app.
describe("S4 public route wiring", () => {
  it("exports the documented methods", () => {
    expect(Object.keys(search)).toEqual(["GET"]);
    expect(Object.keys(publicEvent)).toEqual(["GET"]);
    expect(Object.keys(places)).toEqual(["GET"]);
  });

  it("finds a place with no sign-in and no database", async () => {
    const res = await places.GET(new Request("http://localhost/api/v1/places/search?q=37201"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, data: { items: [{ label: "ZIP 37201" }] } });
  });

  it("refuses a malformed search before it reaches the database", async () => {
    for (const query of ["?lat=abc&lng=1", "?q=free+text", "?limit=500"]) {
      const res = await search.GET(new Request(`http://localhost/api/v1/events${query}`));
      expect(res.status, query).toBe(400);
    }
  });

  it("a malformed event id does not exist", async () => {
    const res = await publicEvent.GET(new Request("http://localhost/x"), { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
