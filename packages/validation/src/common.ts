import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@signalone/shared";
import { z } from "zod";

// Generic building blocks. Domain schemas belong with the feature that owns
// them and must be added deliberately (see /docs/shared-code.md).

export const emailSchema = z.string().trim().toLowerCase().email();

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});
export type Pagination = z.infer<typeof paginationSchema>;

/**
 * The first message for a field, including errors reported on its parts: for "links" this also finds
 * "links.0", "links.1" (the key is the path to the item that failed). Forms use this so a real message is
 * shown under the field and not only a generic "Invalid input".
 */
export function firstFieldError(fieldErrors: Record<string, string[]> | undefined, field: string): string | undefined {
  if (!fieldErrors) return undefined;
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (key === field || key.startsWith(`${field}.`)) return messages[0];
  }
  return undefined;
}

/** Flattens a ZodError into a path-keyed map for `AppError.fieldErrors`. */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
