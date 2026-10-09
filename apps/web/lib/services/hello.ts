import type { Hello, PutHelloInput } from "@signalone/validation";

import type { HelloNoteRow } from "../../db/hello";
import type { ServiceContext } from "./context";

// Service for the S0 hello note (docs/features/s0-walking-skeleton.md). Business
// rule: a note belongs to the caller and only the caller; the user id always
// comes from the authenticated context, never from the request, so there is no
// way to name another user's note. Framework-free; the repo is injected.

export type HelloServiceDeps = {
  repo: {
    findByUser(userId: string): Promise<HelloNoteRow | null>;
    upsert(userId: string, note: string): Promise<HelloNoteRow>;
    deleteByUser(userId: string): Promise<boolean>;
  };
};

export function createHelloService({ repo }: HelloServiceDeps) {
  return {
    /** The caller's note, or `{ note: null }`. */
    async get(ctx: ServiceContext): Promise<Hello> {
      const row = await repo.findByUser(ctx.actor.userId);
      return { note: row ? row.note : null };
    },

    /** Saves the caller's note; an empty note clears it. */
    async put(ctx: ServiceContext, input: PutHelloInput): Promise<Hello> {
      if (input.note === "") {
        await repo.deleteByUser(ctx.actor.userId);
        return { note: null };
      }
      const row = await repo.upsert(ctx.actor.userId, input.note);
      return { note: row.note };
    },
  };
}

export type HelloService = ReturnType<typeof createHelloService>;
