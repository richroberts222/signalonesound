import type { Entitlement } from "@signalone/validation";

// The words for a member's membership on the Membership page (S13). The answer itself comes from the server
// (the entitlement); this only turns it into plain language, so a client never decides who is entitled.
export function membershipStatusText(e: Entitlement, timeZone?: string): string {
  const ends = e.trialEndsAt ? new Date(e.trialEndsAt).toLocaleDateString("en-US", { dateStyle: "long", timeZone }) : null;
  if (e.reason === "not_required") return "Membership is free for everyone right now. You do not need to do anything.";
  if (e.reason === "trialing") return ends ? `You are on a free trial. It ends on ${ends}.` : "You are on a free trial.";
  if (e.reason === "active") return "Your membership is active. Thank you for supporting Signal One Sound.";
  if (e.reason === "trial_ended") return "Your free trial has ended. Choose a plan below to keep your membership.";
  if (e.status === "past_due") return "Your last payment did not go through. Open Manage billing to update your card.";
  if (e.status === "cancelled") return "Your membership was cancelled. Choose a plan below to start it again.";
  return "A membership is needed for the paid features. Choose a plan below.";
}

/** Whether the person can start a plan: payment is needed and they are not already paying. */
export function canChoosePlan(e: Entitlement): boolean {
  return e.reason !== "not_required" && e.status !== "active" && e.status !== "past_due";
}

/** Whether the provider's customer page (change card, cancel) applies: they have a paid or late subscription. */
export function canManageBilling(e: Entitlement): boolean {
  return e.status === "active" || e.status === "past_due";
}
