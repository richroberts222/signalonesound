import type { DataExport, Profile } from "@signalone/validation";

// What the signed-in Account tab says and decides (S1 and S5: profile, export, delete, policy; S6: invite). Plain data
// with no React Native import, so a test can check every sentence and rule. The server decides everything; these only
// word what it said and guard a step that cannot be undone.

/** Deleting needs this word typed as a second step, as on the web. */
export const DELETE_WORD = "DELETE";
export const canConfirmDelete = (typed: string): boolean => typed === DELETE_WORD;

export const DELETE_WARNING = "This removes your account and your information. It cannot be undone. Type DELETE to confirm.";
export const EXPORT_DONE = "Your data is ready to save or send from the share sheet.";
export const NAME_SAVED = "Name saved.";
export const PREFERENCE_SAVED = "Preference saved.";
export const POLICY_UPDATED_TITLE = "Our Terms and Privacy Policy changed";
export const POLICY_UPDATED_TEXT = "Please read the Terms and the Privacy Policy and accept them to keep using your account. You must be 18 or older.";
export const GENERIC_FAILURE = "We could not do that. Check your connection and try again.";

/** A plain sentence for a failed call, by the shared error code. Never the server's raw text for an unexpected failure. */
export function failureText(error: { code: string; message: string; fieldErrors?: Record<string, string[]> }): string {
  if (error.code === "policy_reacceptance_required") return "Please accept the current Terms and Privacy Policy first.";
  if (error.code === "unauthenticated") return "Please sign in again.";
  if (error.code === "rate_limited") return "Too many tries. Please wait a moment and try again.";
  if (error.code === "validation_failed") return error.fieldErrors?.displayName?.[0] ?? error.message;
  return error.code === "internal" ? GENERIC_FAILURE : error.message;
}

/** Does this member still need to accept the current Terms and Privacy Policy? */
export const needsPolicyAcceptance = (profile: Pick<Profile, "policy">): boolean => !profile.policy.accepted;

/** The member's data, as readable text for the share sheet. */
export const exportText = (data: DataExport): string => JSON.stringify(data, null, 2);

/** The words that go with an invite link when it is shared. No name, no contact, nothing about who it is for. */
export const inviteMessage = (link: string): string => `Come and see what God is doing near you: find revival gatherings on Signal One Sound. ${link}`;

/** The invite link on the site, from the web address and the invite's random token. */
export const inviteLink = (webBase: string, token: string): string => `${webBase.replace(/\/+$/, "")}/invite/${encodeURIComponent(token)}`;

/** The pages the Account tab links to (they open in the browser). */
export const policyLink = (webBase: string, kind: "terms" | "privacy"): string => `${webBase.replace(/\/+$/, "")}/${kind}`;
