// Money for display and typing (S10). The application stores and sends WHOLE CENTS; people type dollars.
// Parsing uses string arithmetic, never floating point, so 19.99 can never become 1998.9999.

/** "3", "3.5" or "3.50" as whole cents, or null when the text is not a plain dollar amount up to $10,000. */
export function parseDollarsToMinor(text: string): number | null {
  const m = /^\s*(\d{1,5})(?:\.(\d{1,2}))?\s*$/.exec(text);
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0");
  return cents <= 1_000_000 ? cents : null;
}

/** Whole cents as a currency string, for example 300 -> "$3.00". */
export function formatMinor(amountMinor: number, currency: string): string {
  const symbol = currency === "usd" ? "$" : `${currency.toUpperCase()} `;
  return `${symbol}${Math.floor(amountMinor / 100)}.${String(amountMinor % 100).padStart(2, "0")}`;
}
