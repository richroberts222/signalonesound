import { describe, expect, it } from "vitest";
import { NAV_ITEMS, isNavItemActive } from "./nav-config";

const item = (label: string) => NAV_ITEMS.find((i) => i.label === label)!;

describe("isNavItemActive", () => {
  it("matches Home only on exactly /", () => {
    expect(isNavItemActive(item("Home"), "/")).toBe(true);
    expect(isNavItemActive(item("Home"), "/discover")).toBe(false);
  });

  it("keeps Discover active on Event Details but not on look-alike paths", () => {
    expect(isNavItemActive(item("Discover"), "/discover")).toBe(true);
    expect(isNavItemActive(item("Discover"), "/discover/some-event")).toBe(true);
    expect(isNavItemActive(item("Discover"), "/discoverable")).toBe(false);
  });

  it("lists Account for signed-in users only, active on nested routes", () => {
    expect(item("Account").signedInOnly).toBe(true);
    expect(isNavItemActive(item("Account"), "/account/notifications")).toBe(true);
    expect(isNavItemActive(item("Account"), "/accounting")).toBe(false);
  });

  it("lists the exploratory Admin mock for signed-in users, active on nested routes", () => {
    expect(item("Admin").signedInOnly).toBe(true);
    expect(isNavItemActive(item("Admin"), "/admin/events/evt-fall-harvest")).toBe(true);
    expect(isNavItemActive(item("Admin"), "/administration")).toBe(false);
  });
});
