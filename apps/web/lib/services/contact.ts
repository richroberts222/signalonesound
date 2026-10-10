import { createHmac } from "node:crypto";
import {
  MAX_CONTACT_MESSAGES_PER_DAY,
  type ContactMessage,
  type CreateContactInput,
  type UpdateContactInput,
} from "@signalone/validation";

import type { ContactRepo, ContactRow } from "../../db/contact";
import type { ServiceContext } from "./context";
import { notFound, rateLimited } from "./errors";
import type { AdminDirectory } from "./organizations";

// Service for the public contact form and the admin Messages inbox (S15, docs/features/s15-public-pages.md).
// Rules:
//   * the form is closed unless it is switched on (it collects personal information, so production keeps it
//     off until the legal gates are met); a closed form answers "not found";
//   * a filled hidden "website" field means a bot: the message is dropped and the reply looks the same;
//   * one person (a keyed hash of the network address, never the address) may send a few messages a day;
//   * only admins read, mark done or delete messages; everyone else is told "not found";
//   * the reply never echoes what was sent.
// Framework-free; the repo, the admin list, the open/closed switch, the salt and the clock are injected.
export type ContactServiceDeps = { repo: ContactRepo; admins: AdminDirectory; isOpen: () => boolean; addressSalt: string; now?: () => Date };

const DAY_MS = 24 * 60 * 60 * 1000;

const toMessage = (r: ContactRow): ContactMessage => ({ id: r.id, topic: r.topic, name: r.name, replyEmail: r.replyEmail, message: r.message, status: r.status as "new" | "done", createdAt: r.createdAt.toISOString() });

export function createContactService({ repo, admins, isOpen, addressSalt, now = () => new Date() }: ContactServiceDeps) {
  const requireAdmin = (ctx: ServiceContext): void => {
    if (!admins.isAdmin(ctx.actor.userId)) throw notFound(); // admin tools do not reveal themselves
  };

  return {
    /** Whether the form is open, so the page can show it or only the address. */
    isOpen,

    async submit(input: CreateContactInput, address: string | null): Promise<{ received: true }> {
      if (!isOpen()) throw notFound("The contact form is not open yet");
      if (input.website && input.website.trim() !== "") return { received: true }; // a bot filled the trap field
      const addressKey = createHmac("sha256", addressSalt).update(`contact:${address ?? "unknown"}`).digest("hex");
      const stored = await repo.createLimited(
        { topic: input.topic, name: input.name, replyEmail: input.replyEmail ?? null, message: input.message, addressKey },
        MAX_CONTACT_MESSAGES_PER_DAY,
        new Date(now().getTime() - DAY_MS),
      );
      if (!stored) throw rateLimited("You have sent several messages today. Please try again tomorrow, or email us directly.");
      return { received: true };
    },

    async list(ctx: ServiceContext, status: "new" | "done" | "all"): Promise<{ items: ContactMessage[] }> {
      requireAdmin(ctx);
      return { items: (await repo.list(status)).map(toMessage) };
    },

    async setStatus(ctx: ServiceContext, id: string, input: UpdateContactInput): Promise<ContactMessage> {
      requireAdmin(ctx);
      const row = await repo.setStatus(id, input.status);
      if (!row) throw notFound();
      return toMessage(row);
    },

    async remove(ctx: ServiceContext, id: string): Promise<{ deleted: true }> {
      requireAdmin(ctx);
      if (!(await repo.remove(id))) throw notFound();
      return { deleted: true };
    },
  };
}

export type ContactService = ReturnType<typeof createContactService>;
