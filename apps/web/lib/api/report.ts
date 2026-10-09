import { DatabaseError } from "../../db/errors";
import { redactText } from "../observability/redact";
import { noopErrorTracker, type ErrorTrackerPort } from "../observability/ports";

// Server-side record of unexpected API failures, wired to the adapter's existing
// `onUnexpected` hook (/docs/api.md). No logging system exists yet, so this is
// the smallest safe sink: one structured line to stderr (captured by Vercel /
// the process manager). It deliberately records only the error class and, for
// database errors, the operation and kind. It never records the message, cause,
// stack, request data, or identity, because those can carry SQL, parameters,
// connection details, or personal data. Replace the sink (not the hook) when a
// real logging foundation is chosen.
export function reportUnexpectedError(
  error: unknown,
  write: (line: string) => void = (line) => console.error(line),
  tracker: ErrorTrackerPort = noopErrorTracker,
): void {
  const record: Record<string, string> = {
    event: "api.unexpected_error",
    errorName: error instanceof Error ? error.name : typeof error,
  };
  if (error instanceof DatabaseError) {
    record.dbOperation = error.operation;
    record.dbKind = error.kind;
  }
  try {
    write(JSON.stringify(record));
  } catch {
    // Reporting must never break the response path.
  }
  try {
    // The tracker only ever receives redacted text (S1 AC9); the default adapter does nothing.
    tracker.capture({
      name: record.errorName,
      message: error instanceof Error ? redactText(error.message) : undefined,
    });
  } catch {
    // A failing tracker must not break the response path either.
  }
}
