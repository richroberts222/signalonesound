// Removes personal data and credentials from text before it is logged or sent to an error-tracking
// service (docs/secure-coding.md, S1 AC9). It is a safety net for messages that might carry
// something sensitive; the first rule is still to not put such data in a log at all.
const PATTERNS: [RegExp, string][] = [
  // Credentials first, so a token is never mistaken for something else.
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [redacted]"],
  [/\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{8,}/g, "[redacted-key]"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}/g, "[redacted-token]"],
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@[^\s]+/gi, "[redacted-url]"],
  // Personal data.
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]"],
  // A phone number has the usual groups (3-3-4 digits, optional country code); dates and ids do not.
  [/(?<![\w.])(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.-])\d{3}[\s.-]\d{4}(?![\w.])/g, "[redacted-phone]"],
];

/** Returns the text with emails, phone numbers, tokens, keys and credentialed URLs replaced. */
export function redactText(text: string): string {
  return PATTERNS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}
