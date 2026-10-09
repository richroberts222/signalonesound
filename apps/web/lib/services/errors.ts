import type { ErrorCode } from "@signalone/shared";

// Expected business failures. Services throw these for conditions a client can
// act on. Messages are safe to show to users: never include SQL, internals, or
// other users' data.
export class ServiceError extends Error {
  constructor(
    readonly code: Exclude<ErrorCode, "internal">,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export const notFound = (message = "Not found") => new ServiceError("not_found", message);
export const conflict = (message = "Conflict") => new ServiceError("conflict", message);
export const validationFailed = (
  message = "Invalid input",
  fieldErrors?: Record<string, string[]>,
) => new ServiceError("validation_failed", message, fieldErrors);
export const policyReacceptanceRequired = () =>
  new ServiceError("policy_reacceptance_required", "Please accept the current Terms and Privacy Policy to continue");
export const rateLimited = (message = "Too many requests. Please try again later.") => new ServiceError("rate_limited", message);
