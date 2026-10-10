import { z } from "zod";

// S15 PUBLIC PAGES (docs/features/s15-public-pages.md): the contact form and the admin Messages inbox.
// Plain text only: a message can hold line breaks but no other control characters, and nothing sent here is
// ever shown as formatting. The hidden `website` field is a trap for bots; a person never fills it.

export const CONTACT_TOPICS = [
  { value: "question", label: "A question" },
  { value: "report_listing", label: "Report a listing" },
  { value: "privacy_request", label: "A privacy request (download or delete my information)" },
  { value: "other", label: "Something else" },
] as const;
export const CONTACT_TOPIC_VALUES = CONTACT_TOPICS.map((t) => t.value) as [string, ...string[]];

export const CONTACT_NAME_MAX = 80;
export const CONTACT_MESSAGE_MIN = 10;
export const CONTACT_MESSAGE_MAX = 2000;
/** Messages one person (a keyed hash of the network address) may send in a day. */
export const MAX_CONTACT_MESSAGES_PER_DAY = 3;

const hasControlCharacter = (value: string, allowLineBreaks: boolean): boolean =>
  [...value].some((char) => {
    const code = char.codePointAt(0) ?? 0;
    if (allowLineBreaks && (code === 10 || code === 13)) return false;
    return code < 32 || code === 127 || (code >= 128 && code < 160);
  });

const noEmpty = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const createContactSchema = z
  .object({
    topic: z.enum(CONTACT_TOPIC_VALUES),
    name: z.string().trim().min(1, "Please tell us your name").max(CONTACT_NAME_MAX, `Your name can be at most ${CONTACT_NAME_MAX} characters`).refine((v) => !hasControlCharacter(v, false), "Your name must be plain text"),
    replyEmail: z.preprocess(noEmpty, z.string().trim().max(254).pipe(z.email("Enter a valid email address")).optional()),
    message: z
      .string()
      .trim()
      .min(CONTACT_MESSAGE_MIN, `Please write at least ${CONTACT_MESSAGE_MIN} characters`)
      .max(CONTACT_MESSAGE_MAX, `Your message can be at most ${CONTACT_MESSAGE_MAX} characters`)
      .refine((v) => !hasControlCharacter(v, true), "Your message must be plain text"),
    website: z.string().max(200).optional(),
  })
  .strict();
export type CreateContactInput = z.infer<typeof createContactSchema>;
export const contactReceivedSchema = z.object({ received: z.literal(true) });

export const CONTACT_STATUSES = ["new", "done"] as const;
export const contactMessageSchema = z.object({
  id: z.uuid(),
  topic: z.string(),
  name: z.string(),
  replyEmail: z.string().nullable(),
  message: z.string(),
  status: z.enum(CONTACT_STATUSES),
  createdAt: z.string(),
});
export type ContactMessage = z.infer<typeof contactMessageSchema>;
export const contactMessageListSchema = z.object({ items: z.array(contactMessageSchema) });
export const contactListQuerySchema = z.object({ status: z.enum([...CONTACT_STATUSES, "all"]).default("all") });
export const updateContactSchema = z.object({ status: z.enum(CONTACT_STATUSES) }).strict();
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export const contactParamsSchema = z.object({ id: z.uuid() });
export const contactDeletedSchema = z.object({ deleted: z.literal(true) });
