import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Whether a request carries the scheduler's secret as `Authorization: Bearer <secret>`. The two
 * values are hashed first so the comparison takes the same time whatever was sent. With no secret
 * configured the answer is always no.
 */
export function isJobRequestAuthorized(request: Request, secret: string | null): boolean {
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header.slice("Bearer ".length)), digest(secret));
}
