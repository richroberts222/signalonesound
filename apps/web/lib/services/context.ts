import type { Actor } from "../auth/authorize";

// Per-call authorization context. Transport-neutral: a Web server boundary
// builds it from requireUserId(); a future API/mobile boundary builds it from
// the verified Clerk token. Services never read identity from their input.
export type ServiceContext = { readonly actor: Actor };

export const createServiceContext = (userId: string): ServiceContext => ({
  actor: { userId },
});
