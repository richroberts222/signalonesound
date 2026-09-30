// Transport-neutral result and error shapes shared by API, Web, and Mobile.
// See /docs/data-mutations.md (Mutation Results, Expected vs. Unexpected Errors).

export const ERROR_CODES = [
  "validation_failed",
  "unauthenticated",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "internal",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export type AppError = {
  code: ErrorCode;
  /** Safe to show to users. Never include internals, SQL, or secrets. */
  message: string;
  /** Field-level messages for `validation_failed`, keyed by field path. */
  fieldErrors?: Record<string, string[]>;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail(
  code: ErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): Result<never> {
  return { ok: false, error: { code, message, fieldErrors } };
}
