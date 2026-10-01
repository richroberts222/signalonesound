import { ERROR_CODES, type Result } from "@signalone/shared";
import { z } from "zod";

import { toFieldErrors } from "./common";

// Reusable contract builders. Schemas are the source of truth; derive types
// with `z.infer`. Domain schemas compose these but live with their feature.
// See /docs/shared-code.md (Contract conventions).

/** Opaque, non-empty identifier as seen by clients. Not a database key type. */
export const idSchema = z.string().min(1).max(128);

/** Wire schema matching `ApiError`/`AppError`. */
export const apiErrorSchema = z.object({
  code: z.enum(ERROR_CODES),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

/** Wire schema for `Result<T>` given a schema for `T`. */
export function resultSchema<T extends z.ZodType>(dataSchema: T) {
  return z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data: dataSchema }),
    z.object({ ok: z.literal(false), error: apiErrorSchema }),
  ]);
}

/** Wire schema for `Paginated<T>` given a schema for one item. */
export function paginatedSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().min(1).nullable(),
  });
}

/**
 * Validates untrusted input against a schema and returns a `Result`, mapping
 * failures to a `validation_failed` error with path-keyed field errors.
 * Error output never echoes the submitted values.
 */
export function parseInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
): Result<z.output<S>> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    error: {
      code: "validation_failed",
      message: "Invalid input",
      fieldErrors: toFieldErrors(parsed.error),
    },
  };
}
