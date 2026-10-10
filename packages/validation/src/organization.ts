import { z } from "zod";

import { emailSchema } from "./common";

// S2 ORGANIZATIONS AND ROLES (docs/features/s2-organizations-and-roles.md). Public wire contracts for
// claiming a Church/Ministry, the admin decision on a claim, and what each audience may see. They are
// independent of database row types and shared by web and mobile.

export const ORG_NAME_MIN = 2;
export const ORG_NAME_MAX = 120;
export const ORG_DESCRIPTION_MAX = 1000;
export const ORG_LINK_MIN = 1;
export const ORG_LINK_MAX = 3;
export const DECISION_REASON_MAX = 500;
/** How many claims one member may submit in a day (S2 AC9). */
export const MAX_CLAIMS_PER_DAY = 5;

export const ORG_STATUSES = ["pending", "approved", "unpublished"] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];
export const MEMBERSHIP_STATUSES = ["pending", "approved", "rejected", "revoked"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

const codePoints = (value: string): number => [...value].length;
const hasControlCharacter = (value: string, allowNewline = false): boolean =>
  [...value].some((char) => {
    const code = char.codePointAt(0) ?? 0;
    if (allowNewline && code === 10) return false;
    return code < 32 || code === 127 || (code >= 128 && code < 160);
  });

const nameSchema = z
  .string()
  .trim()
  .refine((v) => codePoints(v) >= ORG_NAME_MIN, `Name must be at least ${ORG_NAME_MIN} characters`)
  .refine((v) => codePoints(v) <= ORG_NAME_MAX, `Name must be at most ${ORG_NAME_MAX} characters`)
  .refine((v) => !hasControlCharacter(v), "Name must be plain text on one line");

const descriptionSchema = z
  .string()
  .trim()
  .refine((v) => codePoints(v) <= ORG_DESCRIPTION_MAX, `Description must be at most ${ORG_DESCRIPTION_MAX} characters`)
  .refine((v) => !hasControlCharacter(v, true), "Description must be plain text");

/**
 * A website or social link: an http(s) address with a real domain name (letters, digits, hyphens and
 * dots, ending in a top-level domain), an optional port, and an optional path. No embedded sign-in
 * details, no spaces, no other schemes. A pattern is used because this package has no URL type.
 */
const LINK_PATTERN = /^https?:\/\/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?::\d{1,5})?(?:[/?#][^\s\u0000-\u001f\u007f]*)?$/i;
/**
 * What a person types is usually "example.org". When there is no scheme at all, https:// is added so the
 * address is accepted; anything that already has a scheme (ftp:, javascript:, http:) is left exactly as
 * typed, so the checks below still decide, and an unsafe scheme is never "repaired" into a safe one.
 */
export function normalizeLink(value: string): string {
  const trimmed = value.trim();
  return trimmed === "" || /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
export function isSafeLink(value: string): boolean {
  return value.length <= 300 && LINK_PATTERN.test(value);
}
const linkSchema = z.string().trim().refine(isSafeLink, "Enter a web address starting with http:// or https://");
const linksSchema = z
  .array(linkSchema)
  .min(ORG_LINK_MIN, `Add at least ${ORG_LINK_MIN} link`)
  .max(ORG_LINK_MAX, `Add at most ${ORG_LINK_MAX} links`);

/** Claim a Church/Ministry. The contact email is for the review only and is removed once decided. */
export const claimOrganizationSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema.default(""),
    links: linksSchema,
    contactEmail: emailSchema,
  })
  .strict();
export type ClaimOrganizationInput = z.infer<typeof claimOrganizationSchema>;

/** What a manager may change about their organization. */
export const patchOrganizationSchema = z
  .object({ name: nameSchema.optional(), description: descriptionSchema.optional(), links: linksSchema.optional() })
  .strict();
export type PatchOrganizationInput = z.infer<typeof patchOrganizationSchema>;

export const decideRequestSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    reason: z
      .string()
      .trim()
      .min(1, "A reason is required")
      .max(DECISION_REASON_MAX, `Reason must be at most ${DECISION_REASON_MAX} characters`)
      .refine((v) => !hasControlCharacter(v, true), "Reason must be plain text"),
  })
  .strict();
export type DecideRequestInput = z.infer<typeof decideRequestSchema>;

export const revokeSchema = z
  .object({
    reason: z.string().trim().min(1, "A reason is required").max(DECISION_REASON_MAX),
  })
  .strict();
export type RevokeInput = z.infer<typeof revokeSchema>;

// Path parameters.
export const orgParamsSchema = z.object({ id: z.string().uuid() });
export const requestParamsSchema = z.object({ id: z.string().uuid() });
export const revokeParamsSchema = z.object({ id: z.string().uuid(), userId: z.string().regex(/^user_[A-Za-z0-9]{8,64}$/) });

/** What anyone may see about an approved organization. Never the contact email or the managers. */
export const publicOrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  links: z.array(z.string()),
  status: z.enum(ORG_STATUSES),
});
export type PublicOrganization = z.infer<typeof publicOrganizationSchema>;

/** The caller's own organizations and their standing in each. */
export const myOrganizationSchema = publicOrganizationSchema.extend({
  membership: z.enum(MEMBERSHIP_STATUSES),
});
export const myOrganizationsSchema = z.object({ items: z.array(myOrganizationSchema) });
export type MyOrganizations = z.infer<typeof myOrganizationsSchema>;

export const claimResultSchema = z.object({
  organizationId: z.string().uuid(),
  requestId: z.string().uuid(),
  status: z.literal("pending"),
});
export type ClaimResult = z.infer<typeof claimResultSchema>;

/** The admin's view of a claim waiting for a decision. */
export const adminRequestSchema = z.object({
  id: z.string().uuid(),
  requesterId: z.string(),
  contactEmail: z.string().nullable(),
  requestedAt: z.string(),
  organization: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    links: z.array(z.string()),
    status: z.enum(ORG_STATUSES),
    otherPendingClaims: z.number().int(),
  }),
});
export const adminRequestsSchema = z.object({ items: z.array(adminRequestSchema) });
export type AdminRequests = z.infer<typeof adminRequestsSchema>;

export const decisionResultSchema = z.object({ id: z.string().uuid(), status: z.enum(MEMBERSHIP_STATUSES) });
export type DecisionResult = z.infer<typeof decisionResultSchema>;

export const auditEntrySchema = z.object({
  id: z.string().uuid(),
  actorId: z.string(),
  action: z.string(),
  subject: z.string(),
  at: z.string(),
  detail: z.string(),
});
export const auditLogSchema = z.object({ items: z.array(auditEntrySchema) });
export type AuditLog = z.infer<typeof auditLogSchema>;
