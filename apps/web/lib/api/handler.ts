import { fail, CURRENT_API_VERSION, type ErrorCode, type Result } from "@signalone/shared";
import { parseInput } from "@signalone/validation";
import type { z } from "zod";
import { UnauthenticatedError } from "../auth/errors";
import { createServiceContext, type ServiceContext } from "../services/context";
import { validationFailed } from "../services/errors";
import { runService } from "../services/run";

// Reusable HTTP adapter for API route handlers (/docs/api.md). It owns
// transport concerns only: authenticate, parse and validate input, call the
// service via runService, and serialize the shared Result contract. Business
// rules and authorization decisions stay in services. Framework-independent:
// it uses only the standard Request/Response and takes identity as a dependency.

/** HTTP status for each shared error code. Unknown codes fall back to 500. */
export const STATUS_BY_CODE: Record<ErrorCode, number> = {
  validation_failed: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal: 500,
};

export const API_VERSION_HEADER = "X-API-Version";
/** Request bodies larger than this are rejected before parsing. */
export const MAX_BODY_BYTES = 100_000;

/** Serializes a Result as the wire response: stable envelope, mapped status, never cached. */
export function toResponse<T>(result: Result<T>): Response {
  const status = result.ok ? 200 : (STATUS_BY_CODE[result.error.code] ?? 500);
  return Response.json(result, {
    status,
    headers: { "Cache-Control": "no-store", [API_VERSION_HEADER]: CURRENT_API_VERSION },
  });
}

export type ApiDeps = {
  /** Trusted user ID for the request, or null if unauthenticated. */
  getUserId: () => Promise<string | null>;
  /** Receives the original error for unexpected failures only (logging hook). */
  onUnexpected?: (error: unknown) => void;
};

type Auth = "required" | "public";

export type ApiRouteOptions<A extends Auth, S extends z.ZodType, T> = {
  auth: A;
  /** Untrusted input schema. `body` is parsed JSON; `query` is the URL search params. */
  input?: { schema: S; source?: "body" | "query" };
  /** Thin: call a service with the validated input. Public routes get a null context. */
  handle: (
    ctx: A extends "required" ? ServiceContext : ServiceContext | null,
    input: z.output<S>,
  ) => Promise<T>;
};

async function readInput(request: Request, source: "body" | "query"): Promise<unknown> {
  if (source === "query") return Object.fromEntries(new URL(request.url).searchParams);
  const text = await request.text();
  // Bytes, not characters: multi-byte text must not slip past the cap.
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw validationFailed("Request body too large");
  if (text.length === 0) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw validationFailed("Request body must be valid JSON");
  }
}

/**
 * Builds a route factory bound to the given dependencies. Lifecycle:
 * authenticate (401) -> parse + validate input (400) -> service (incl.
 * authorization, 403/404/409) -> Result -> response. Anything unexpected,
 * including a failing dependency, becomes a generic 500.
 */
export function createApiRoute(deps: ApiDeps) {
  return function route<A extends Auth, S extends z.ZodType, T>(
    options: ApiRouteOptions<A, S, T>,
  ): (request: Request) => Promise<Response> {
    return async (request) => {
      try {
        const result = await runService(async () => {
          let ctx: ServiceContext | null = null;
          if (options.auth === "required") {
            const userId = await deps.getUserId();
            if (!userId) throw new UnauthenticatedError();
            ctx = createServiceContext(userId);
          }
          let input: z.output<S> = undefined as z.output<S>;
          if (options.input) {
            const raw = await readInput(request, options.input.source ?? "body");
            const parsed = parseInput(options.input.schema, raw);
            if (!parsed.ok) {
              throw validationFailed(parsed.error.message, parsed.error.fieldErrors);
            }
            input = parsed.data;
          }
          return options.handle(ctx as Parameters<typeof options.handle>[0], input);
        }, deps.onUnexpected);
        return toResponse(result);
      } catch (error) {
        // Last resort (e.g. serialization failure): never let an error escape raw,
        // and still report it (a throwing hook must not break the response).
        try {
          deps.onUnexpected?.(error);
        } catch {
          // ignore
        }
        return toResponse(fail("internal", "Something went wrong"));
      }
    };
  };
}
