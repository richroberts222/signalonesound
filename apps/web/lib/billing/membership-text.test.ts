import { describe, expect, it } from "vitest";
import type { Entitlement } from "@signalone/validation";

import { canChoosePlan, canManageBilling, membershipStatusText } from "./membership-text";

const e = (over: Partial<Entitlement>): Entitlement => ({ accountType: "member", entitled: true, reason: "not_required", status: "none", trialEndsAt: null, ...over });

describe("membership wording", () => {
  it("says membership is free while payment is not required", () => {
    expect(membershipStatusText(e({}))).toMatch(/free for everyone/);
    expect(canChoosePlan(e({}))).toBe(false);
  });
  it("names the trial end date", () => {
    expect(membershipStatusText(e({ reason: "trialing", status: "trialing", trialEndsAt: "2026-11-04T12:00:00.000Z" }), "UTC")).toBe("You are on a free trial. It ends on November 4, 2026.");
    expect(canChoosePlan(e({ reason: "trialing", status: "trialing" }))).toBe(true);
  });
  it("words active, ended, late and cancelled differently", () => {
    expect(membershipStatusText(e({ reason: "active", status: "active" }))).toMatch(/active/);
    expect(membershipStatusText(e({ entitled: false, reason: "trial_ended", status: "trialing" }))).toMatch(/trial has ended/);
    expect(membershipStatusText(e({ entitled: false, reason: "payment_required", status: "past_due" }))).toMatch(/did not go through/);
    expect(membershipStatusText(e({ entitled: false, reason: "payment_required", status: "cancelled" }))).toMatch(/cancelled/);
    expect(membershipStatusText(e({ entitled: false, reason: "payment_required", status: "none" }))).toMatch(/membership is needed/);
  });
  it("offers Choose only when payment is needed and they are not paying, and Manage only when they are", () => {
    expect(canChoosePlan(e({ reason: "active", status: "active" }))).toBe(false);
    expect(canChoosePlan(e({ entitled: false, reason: "payment_required", status: "past_due" }))).toBe(false);
    expect(canChoosePlan(e({ entitled: false, reason: "payment_required", status: "cancelled" }))).toBe(true);
    expect(canManageBilling(e({ reason: "active", status: "active" }))).toBe(true);
    expect(canManageBilling(e({ status: "past_due", reason: "payment_required", entitled: false }))).toBe(true);
    expect(canManageBilling(e({ reason: "trialing", status: "trialing" }))).toBe(false);
  });
});
