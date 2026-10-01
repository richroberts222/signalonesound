import { fail, ok, type AppError, type Result } from "@signalone/shared";
import { DatabaseError } from "../../db/errors";
import { ForbiddenError, UnauthenticatedError } from "../auth/errors";
import { ServiceError } from "./errors";

// Maps anything a service can throw onto the shared AppError contract used by
// Web, API, and Mobile. Unknown errors become a generic "internal" error; the
// original is only passed to `onUnexpected` (for logging), never to clients.
export function toAppError(error: unknown, onUnexpected?: (error: unknown) => void): AppError {
  if (error instanceof ServiceError) {
    return { code: error.code, message: error.message, fieldErrors: error.fieldErrors };
  }
  if (error instanceof UnauthenticatedError) {
    return { code: "unauthenticated", message: error.message };
  }
  if (error instanceof ForbiddenError) {
    return { code: "forbidden", message: error.message };
  }
  if (error instanceof DatabaseError && error.kind === "unique_violation") {
    return { code: "conflict", message: "Conflict" };
  }
  onUnexpected?.(error);
  return { code: "internal", message: "Something went wrong" };
}

/**
 * Transport boundary helper. Runs a service call that returns plain data and
 * converts thrown failures into Result<T>. Server Actions, API route handlers,
 * and later mobile endpoints call this, then map the Result to their own
 * transport (redirect, HTTP status, etc.).
 */
export async function runService<T>(
  fn: () => Promise<T>,
  onUnexpected?: (error: unknown) => void,
): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (error) {
    const { code, message, fieldErrors } = toAppError(error, onUnexpected);
    return fail(code, message, fieldErrors);
  }
}
