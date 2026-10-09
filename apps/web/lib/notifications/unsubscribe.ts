import { createHmac, timingSafeEqual } from "node:crypto";

// One-tap unsubscribe links (S7 AC5). A link works without signing in, so it carries its own proof: the
// action, who and what it applies to, and an expiry, signed with a server secret. Anyone who changes
// any part of it invalidates it. Pure functions of the secret and the clock.
export type UnsubscribeAction = { kind: "church" | "alert"; userId: string; id: string };
export const UNSUBSCRIBE_DAYS = 60;

const encode = (value: object): string => Buffer.from(JSON.stringify(value)).toString("base64url");
const sign = (payload: string, secret: string): string => createHmac("sha256", secret).update(payload).digest("base64url");

export function createUnsubscribeToken(action: UnsubscribeAction, secret: string, now: Date): string {
  const expires = Math.floor(now.getTime() / 1000) + UNSUBSCRIBE_DAYS * 24 * 3600;
  const payload = encode({ k: action.kind, u: action.userId, i: action.id, e: expires });
  return `${payload}.${sign(payload, secret)}`;
}

/** The action a token authorizes, or null if it is malformed, altered, signed with another secret or expired. */
export function verifyUnsubscribeToken(token: string, secret: string, now: Date): UnsubscribeAction | null {
  const [payload, signature, ...extra] = token.split(".");
  if (!payload || !signature || extra.length > 0) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const raw = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { k: string; u: string; i: string; e: number };
    if ((raw.k !== "church" && raw.k !== "alert") || typeof raw.u !== "string" || typeof raw.i !== "string" || typeof raw.e !== "number") return null;
    if (raw.e * 1000 < now.getTime()) return null;
    return { kind: raw.k, userId: raw.u, id: raw.i };
  } catch {
    return null;
  }
}
