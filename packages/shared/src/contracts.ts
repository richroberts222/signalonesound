// Transport-contract primitives shared by API, Web, and Mobile.
// Pure types and constants only; runtime schemas live in @signalone/validation.
// See /docs/shared-code.md (Contract conventions).

import type { AppError } from "./result";

/**
 * Wire shape of an API error. Intentionally the same shape as `AppError` so
 * a failed `Result` can be sent as-is; never carries internals or secrets.
 */
export type ApiError = AppError;

/** Versions of the public API contract. Breaking changes require a new entry. */
export const API_VERSIONS = ["v1"] as const;
export type ApiVersion = (typeof API_VERSIONS)[number];
export const CURRENT_API_VERSION: ApiVersion = "v1";

/**
 * Cursor-paginated list envelope. `nextCursor` is opaque to clients and is
 * `null` when there are no more items.
 */
export type Paginated<T> = {
  items: T[];
  nextCursor: string | null;
};

/** Builds a `Paginated` page; `nextCursor` defaults to the end of the list. */
export function paginated<T>(items: T[], nextCursor: string | null = null): Paginated<T> {
  return { items, nextCursor };
}
