import { ForbiddenError } from "./errors";

// Generic authorization primitives. No Signal One roles or permissions are
// defined here; domain services compose rules from these building blocks.
// Pure (no Clerk, no database) so rules are trivially unit-testable and the
// same service logic can be used for Web and, later, API/mobile requests.

/** The trusted identity performing an operation. Build it from requireUserId(). */
export type Actor = { readonly userId: string };

/** A rule decides whether the actor may act on a resource. */
export type Rule<R = void> = (actor: Actor, resource: R) => boolean | Promise<boolean>;

/** Resolves to true/false without throwing. A rule that throws denies. */
export async function can<R>(actor: Actor, rule: Rule<R>, resource: R): Promise<boolean> {
  try {
    return (await rule(actor, resource)) === true;
  } catch {
    return false;
  }
}

/** Throws ForbiddenError unless the rule allows. Deny by default. */
export async function authorize<R>(actor: Actor, rule: Rule<R>, resource: R): Promise<void> {
  if (!(await can(actor, rule, resource))) throw new ForbiddenError();
}

/** Ownership: the resource's owner Clerk user ID equals the trusted actor. */
export const isOwner =
  <R>(getOwnerId: (resource: R) => string | null | undefined): Rule<R> =>
  (actor, resource) => {
    const ownerId = getOwnerId(resource);
    return typeof ownerId === "string" && ownerId.length > 0 && ownerId === actor.userId;
  };

/** Allows if any rule allows (e.g. owner OR a future admin rule). */
export const anyOf =
  <R>(...rules: Rule<R>[]): Rule<R> =>
  async (actor, resource) => {
    for (const rule of rules) if (await can(actor, rule, resource)) return true;
    return false;
  };

/** Allows only if every rule allows. */
export const allOf =
  <R>(...rules: Rule<R>[]): Rule<R> =>
  async (actor, resource) => {
    for (const rule of rules) if (!(await can(actor, rule, resource))) return false;
    return true;
  };
