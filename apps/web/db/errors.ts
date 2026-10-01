// Consistent database error handling for data-access helpers. Raw driver errors
// can embed SQL, parameters, or host details, so callers get a sanitized,
// categorized error instead. The original error is kept as `cause` for logs only
// and must never be returned to clients.
export type DatabaseErrorKind =
  | "unique_violation"
  | "foreign_key_violation"
  | "not_null_violation"
  | "check_violation"
  | "serialization_failure"
  | "connection"
  | "unknown";

const PG_CODE_KINDS: Record<string, DatabaseErrorKind> = {
  "23505": "unique_violation",
  "23503": "foreign_key_violation",
  "23502": "not_null_violation",
  "23514": "check_violation",
  "40001": "serialization_failure",
  "40P01": "serialization_failure",
};

export class DatabaseError extends Error {
  constructor(
    readonly kind: DatabaseErrorKind,
    readonly operation: string,
    cause: unknown,
  ) {
    super(`Database operation "${operation}" failed (${kind}).`, { cause });
    this.name = "DatabaseError";
  }
}

function findCode(error: unknown): string | undefined {
  // Drizzle wraps driver errors; the Postgres code may be on `cause`.
  for (let e = error, i = 0; e && typeof e === "object" && i < 3; i++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code;
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}

export function toDatabaseError(operation: string, error: unknown): DatabaseError {
  if (error instanceof DatabaseError) return error;
  const code = findCode(error);
  const kind: DatabaseErrorKind =
    (code && PG_CODE_KINDS[code]) ||
    (code?.startsWith("08") || code === "ECONNREFUSED" || code === "ENOTFOUND" ? "connection" : "unknown");
  return new DatabaseError(kind, operation, error);
}

// Wrap a data-access operation so failures surface as DatabaseError.
export async function withDbErrors<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toDatabaseError(operation, error);
  }
}
