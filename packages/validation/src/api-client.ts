import { fail, type Result } from "@signalone/shared";
import type { z } from "zod";

import { resultSchema } from "./contracts";

// Client-safe API client boundary shared by Web and Mobile (/docs/api.md).
// It speaks only the shared Result envelope over standard fetch, validates
// every response against the contract, and never throws: network failures and
// malformed responses become a generic `internal` Result. It holds no server
// code, no secrets, and no database types. Identity is supplied by the caller
// (Web: session cookie sent automatically; Mobile: `getToken` -> bearer token).

type FetchResponse = { json(): Promise<unknown> };
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<FetchResponse>;

export type ApiClientOptions = {
  /** "" for same-origin web; the API base URL for mobile. No trailing slash needed. */
  baseUrl: string;
  /** Returns a bearer token (mobile), or null/undefined to send none (web cookie session). */
  getToken?: () => Promise<string | null | undefined>;
  fetch?: FetchLike;
};

export type RequestOptions<S extends z.ZodType> = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  /** Extra request headers (for example the Idempotency-Key of a create). */
  headers?: Record<string, string>;
  /** Schema of the `data` field on success. */
  schema: S;
};

const GENERIC = "Something went wrong";

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");

  async function request<S extends z.ZodType>(req: RequestOptions<S>): Promise<Result<z.output<S>>> {
    try {
      const doFetch = options.fetch ?? (globalThis as { fetch?: FetchLike }).fetch;
      if (!doFetch) return fail("internal", GENERIC);
      const headers: Record<string, string> = { Accept: "application/json", ...req.headers };
      const token = await options.getToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;
      if (req.body !== undefined) headers["Content-Type"] = "application/json";
      const pairs = Object.entries(req.query ?? {}).map(
        ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`,
      );
      const qs = pairs.length > 0 ? `?${pairs.join("&")}` : "";
      const response = await doFetch(`${baseUrl}${req.path}${qs}`, {
        method: req.method,
        headers,
        body: req.body === undefined ? undefined : JSON.stringify(req.body),
      });
      const parsed = resultSchema(req.schema).safeParse(await response.json());
      return parsed.success ? (parsed.data as Result<z.output<S>>) : fail("internal", GENERIC);
    } catch {
      return fail("internal", GENERIC);
    }
  }

  return { request };
}

export type ApiClient = ReturnType<typeof createApiClient>;
