// Client-safe barrel: errors and pure authorization primitives only.
// Server-only Clerk helpers must be imported from "@/lib/auth/server".
export * from "./errors";
export * from "./authorize";
