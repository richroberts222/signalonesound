import { parseDate } from "@signalone/shared";
import { z } from "zod";

// S8 ADMIN AND MODERATION (docs/features/s8-admin-and-moderation.md). Public and admin wire contracts
// for reporting content and for what platform admins can do about it. Reports carry no reporter
// identity; admin writes always need a reason; everything an admin does is written to the audit log.

export const REPORT_DETAILS_MAX = 1000;
export const REASON_MAX = 500;
/** Reports one network address may send in a day (S8 AC1). */
export const MAX_REPORTS_PER_ADDRESS_PER_DAY = 5;

export const REPORT_REASONS = [
  { value: "not_real", label: "Not a real event, or a scam" },
  { value: "wrong_church", label: "Wrong or misleading church or ministry" },
  { value: "minor_personal_info", label: "Personal information about a child or private person" },
  { value: "harassment_hate", label: "Harassment or hateful content" },
  { value: "copyright_legal", label: "Copyright or other legal concern" },
  { value: "other", label: "Something else" },
] as const;
export const REPORT_REASON_VALUES = REPORT_REASONS.map((r) => r.value) as [string, ...string[]];

const codePoints = (value: string): number => [...value].length;
const hasControlCharacter = (value: string): boolean =>
  [...value].some((char) => {
    const code = char.codePointAt(0) ?? 0;
    if (code === 10) return false; // line breaks are allowed in free text
    return code < 32 || code === 127 || (code >= 128 && code < 160);
  });

const reasonText = z
  .string()
  .trim()
  .min(1, "A reason is required")
  .refine((v) => codePoints(v) <= REASON_MAX, `The reason must be at most ${REASON_MAX} characters`)
  .refine((v) => !hasControlCharacter(v), "The reason must be plain text");

/** Anyone can report an event or a church. No reporter identity is sent or stored. */
export const createReportSchema = z
  .object({
    subjectType: z.enum(["event", "organization"]),
    subjectId: z.string().uuid(),
    reason: z.enum(REPORT_REASON_VALUES, { error: "Choose a reason" }),
    details: z
      .string()
      .trim()
      .refine((v) => codePoints(v) <= REPORT_DETAILS_MAX, `Details must be at most ${REPORT_DETAILS_MAX} characters`)
      .refine((v) => !hasControlCharacter(v), "Details must be plain text")
      .optional(),
  })
  .strict();
export type CreateReportInput = z.infer<typeof createReportSchema>;
export const reportReceivedSchema = z.object({ received: z.literal(true) });

export const reportListQuerySchema = z.object({ status: z.enum(["open", "dismissed", "actioned"]).default("open") });

export const reportViewSchema = z.object({
  id: z.string().uuid(),
  subjectType: z.enum(["event", "organization"]),
  subjectId: z.string().uuid(),
  /** The event title or the church name, so the admin can see what was reported. */
  subjectTitle: z.string(),
  reason: z.string(),
  details: z.string(),
  status: z.enum(["open", "dismissed", "actioned"]),
  createdAt: z.string(),
});
export const reportListSchema = z.object({ items: z.array(reportViewSchema) });
export type ReportList = z.infer<typeof reportListSchema>;

export const reportDecisionSchema = z.object({ decision: z.enum(["dismiss", "action"]), reason: reasonText }).strict();
export type ReportDecisionInput = z.infer<typeof reportDecisionSchema>;
export const moderationReasonSchema = z.object({ reason: reasonText }).strict();
export type ModerationReasonInput = z.infer<typeof moderationReasonSchema>;
export const suspendMemberSchema = z.object({ reason: reasonText, eventsAction: z.enum(["keep", "hide"]) }).strict();
export type SuspendMemberInput = z.infer<typeof suspendMemberSchema>;

export const reportParamsSchema = z.object({ id: z.string().uuid() });
export const moderationEventParamsSchema = z.object({ id: z.string().uuid() });
export const moderationOrgParamsSchema = z.object({ id: z.string().uuid() });
export const moderationMemberParamsSchema = z.object({ userId: z.string().regex(/^user_[A-Za-z0-9]{8,64}$/) });

export const moderationResultSchema = z.object({ id: z.string(), state: z.string() });
export type ModerationResult = z.infer<typeof moderationResultSchema>;

export const overviewSchema = z.object({
  openReports: z.number().int(),
  pendingClaims: z.number().int(),
  hiddenEvents: z.number().int(),
  unpublishedOrganizations: z.number().int(),
  suspendedMembers: z.number().int(),
});
export type Overview = z.infer<typeof overviewSchema>;

const localDate = z.string().refine((v) => parseDate(v) !== null, "Enter a real date");
/** Audit filters. Text filters match as a substring; dates are calendar dates (UTC). */
export const auditQuerySchema = z
  .object({
    actor: z.string().trim().max(100).optional(),
    subject: z.string().trim().max(100).optional(),
    from: localDate.optional(),
    to: localDate.optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
  })
  .strict()
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: "The first date must not be after the last", path: ["from"] });
export type AuditQuery = z.infer<typeof auditQuerySchema>;
