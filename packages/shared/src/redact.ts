// Pure redaction of sensitive values before logging. Runtime-agnostic.
// This is a safety net, not a license to log secrets: callers should still
// avoid passing credentials, tokens, or whole request payloads. See /docs/logging.md.

export const REDACTED = "[REDACTED]";

const SENSITIVE_KEY =
  /pass(word|wd)?|secret|token|authorization|cookie|api[-_]?key|private[-_]?key|credential|database[-_]?url|connection[-_]?string|session|jwt|bearer/i;

// Values that look like secrets regardless of the key they sit under.
const SENSITIVE_VALUES: RegExp[] = [
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]*:[^\s/@]*@[^\s]*/gi, // URLs with embedded credentials
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]+/g, // Clerk/Stripe-style secret keys
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, // JWTs
];

const MAX_DEPTH = 6;

export function redactString(value: string): string {
  return SENSITIVE_VALUES.reduce((s, re) => s.replace(re, REDACTED), value);
}

/** Returns a deep, JSON-safe copy of `value` with sensitive keys and values redacted. */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") return redactString(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return undefined;
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  if (depth >= MAX_DEPTH) return "[Truncated]";
  seen.add(value);

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack) : undefined,
      cause: value.cause === undefined ? undefined : redact(value.cause, depth + 1, seen),
    };
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1, seen));

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(v, depth + 1, seen);
  }
  return out;
}
