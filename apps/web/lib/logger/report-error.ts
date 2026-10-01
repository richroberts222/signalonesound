import { isAppException, toAppError, type AppError } from "@signalone/shared";

import type { LogContext, Logger } from "./create-logger";

/**
 * Log a caught error and return its client-safe form. Expected failures log at
 * `warn` (no stack); unexpected failures log at `error` with the full error
 * (redacted by the logger). Use at API route / Server Action boundaries.
 */
export function reportError(logger: Logger, error: unknown, context: LogContext = {}): AppError {
  const safe = toAppError(error);
  if (isAppException(error) && error.expected) {
    logger.warn(`Expected error: ${error.code}`, {
      ...context,
      code: error.code,
      ...error.context,
    });
  } else {
    logger.error("Unexpected error", {
      ...context,
      code: safe.code,
      ...(isAppException(error) && error.context),
      error,
    });
  }
  return safe;
}
