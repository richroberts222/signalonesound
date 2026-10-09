import { z } from "zod";

// S1 IDENTITY AND POLICY (docs/features/s1-identity-and-policy.md). Public wire contracts for the
// member's own profile, policy acceptance, data export and account deletion. They are independent of
// database row types and shared by web and mobile.

export const ME_PATH = "/api/v1/me";
export const POLICY_ACCEPTANCE_PATH = "/api/v1/me/policy-acceptance";
export const EXPORT_PATH = "/api/v1/me/export";

/** The policy version currently in force. Changing it asks every member to accept again. */
export const CURRENT_POLICY_VERSION = "2026-10-09";
export const POLICY_KINDS = ["terms", "privacy"] as const;
export type PolicyKind = (typeof POLICY_KINDS)[number];

export const DISPLAY_NAME_MAX = 60;

const codePoints = (value: string): number => [...value].length;

const hasControlCharacter = (value: string): boolean =>
  [...value].some((char) => {
    const code = char.codePointAt(0) ?? 0;
    return code < 32 || code === 127 || (code >= 128 && code < 160);
  });

/** True for a real IANA time zone name such as "America/Chicago". */
export function isTimeZone(value: string): boolean {
  if (value.length === 0 || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .refine((v) => codePoints(v) <= DISPLAY_NAME_MAX, `Name must be at most ${DISPLAY_NAME_MAX} characters`)
  .refine((v) => !hasControlCharacter(v), "Name must be plain text on one line");

/** What a member may change about themselves. Unknown fields (for example `role`) are rejected. */
export const patchProfileSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    emailPref: z.boolean().optional(),
    timeZone: z.string().refine(isTimeZone, "Unknown time zone").optional(),
  })
  .strict();
export type PatchProfileInput = z.infer<typeof patchProfileSchema>;

/** Accepting the current Terms and Privacy Policy, and attesting to be 18 or older. */
export const acceptPolicySchema = z
  .object({
    version: z.string().min(1).max(40),
    ageAttested: z.literal(true, { error: "You must confirm you are 18 or older" }),
  })
  .strict();
export type AcceptPolicyInput = z.infer<typeof acceptPolicySchema>;

/** The member's own profile as clients see it. */
export const profileSchema = z.object({
  displayName: z.string().nullable(),
  emailPref: z.boolean(),
  timeZone: z.string().nullable(),
  policy: z.object({
    currentVersion: z.string(),
    acceptedVersion: z.string().nullable(),
    accepted: z.boolean(),
  }),
});
export type Profile = z.infer<typeof profileSchema>;

/** Everything held about the member, by table, for the data export. */
export const dataExportSchema = z.object({
  exportedAt: z.string(),
  data: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});
export type DataExport = z.infer<typeof dataExportSchema>;

export const deletedAccountSchema = z.object({ deleted: z.literal(true) });
