import { fail } from "@signalone/shared";
import { toResponse } from "../../../lib/api/handler";

// Anything under /api that no versioned route matches (including unknown
// versions) gets the standard not_found envelope instead of an HTML 404.
const notFound = (request: Request) => {
  void request; // Next passes the request; the response does not depend on it.
  return toResponse(fail("not_found", "Not found"));
};

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
