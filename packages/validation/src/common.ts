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

/** Flattens a ZodError into a path-keyed map for `AppError.fieldErrors`. */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
