// Application error model. See /docs/logging.md and /docs/data-mutations.md.
//
// `AppException` is thrown inside server code. Only `toAppError()` output (the
// transport-neutral `AppError` from ./result) may cross to a client.

import { ERROR_CODES, type AppError, type ErrorCode } from "./result";

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export type AppExceptionOptions = {
  /** Server-side diagnostics only. Never sent to clients. Redacted when logged. */
  context?: Record<string, unknown>;
  /** The underlying error, preserved for server-side logging only. */
  cause?: unknown;
  /** Field-level messages (safe to show) for `validation_failed`. */
  fieldErrors?: Record<string, string[]>;
};

export class AppException extends Error {
  readonly code: ErrorCode;
  /** Safe to show to users. */
  readonly publicMessage: string;
  readonly context?: Record<string, unknown>;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(code: ErrorCode, publicMessage: string, options: AppExceptionOptions = {}) {
    super(publicMessage, { cause: options.cause });
    this.name = "AppException";
    this.code = code;
    this.publicMessage = publicMessage;
    this.context = options.context;
    this.fieldErrors = options.fieldErrors;
  }

  /** Expected failures are normal control flow; `internal` is a bug or outage. */
  get expected(): boolean {
    return this.code !== "internal";
  }
}

export function isAppException(error: unknown): error is AppException {
  return error instanceof AppException;
}

/** True only for an `AppException` with a non-`internal` code. */
export function isExpectedError(error: unknown): boolean {
  return isAppException(error) && error.expected;
}

/** Classify any thrown value into an `ErrorCode`; unknown values are `internal`. */
export function classifyError(error: unknown): ErrorCode {
  return isAppException(error) && ERROR_CODES.includes(error.code) ? error.code : "internal";
}

/**
 * Convert any thrown value to a client-safe `AppError`. Unexpected errors
 * (including `internal` exceptions and non-AppException values) get a generic
 * message; messages, stacks, context, and causes are never included.
 */
export function toAppError(error: unknown): AppError {
  if (isAppException(error) && error.expected) {
    return {
      code: error.code,
      message: error.publicMessage,
      ...(error.fieldErrors && { fieldErrors: error.fieldErrors }),
    };
  }
  return { code: "internal", message: GENERIC_ERROR_MESSAGE };
}
