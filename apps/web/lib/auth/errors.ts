// Auth failure semantics. Messages are deliberately generic: nothing about the
// session, the resource, or the rule that failed is exposed to clients.
// Future integration point: map these to the application error standard once
// the logging/error-handling work is merged (401 / 403 equivalents).

/** No trusted authenticated identity (maps to HTTP 401). */
export class UnauthenticatedError extends Error {
  readonly code = "UNAUTHENTICATED";
  constructor() {
    super("Authentication required");
    this.name = "UnauthenticatedError";
  }
}

/** Authenticated, but not permitted to perform the operation (maps to HTTP 403). */
export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN";
  constructor() {
    super("Not permitted");
    this.name = "ForbiddenError";
  }
}

export type AuthError = UnauthenticatedError | ForbiddenError;

export const isAuthError = (e: unknown): e is AuthError =>
  e instanceof UnauthenticatedError || e instanceof ForbiddenError;
