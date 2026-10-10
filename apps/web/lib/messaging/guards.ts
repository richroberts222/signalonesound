import { createHmac } from "node:crypto";

import { EmailSendError, type EmailPort } from "./email";

// Safety wrappers around any email port (S14). They sit between the callers and a real provider so that
// a development or test environment can never email a stranger, and an address that bounced or complained
// is never emailed again. Neither wrapper logs or keeps an address or message text.

/** Amazon's mailbox simulator: safe addresses that exercise success, bounce and complaint without a real person. */
export const SIMULATOR_DOMAIN = "simulator.amazonses.com";

export const normalizeAddress = (address: string): string => address.trim().toLowerCase();

/** Whether an address is allowed by a list of full addresses and domains (`example.com` or `@example.com`). */
export function isAllowed(address: string, allowlist: readonly string[]): boolean {
  const normalized = normalizeAddress(address);
  const domain = normalized.slice(normalized.lastIndexOf("@") + 1);
  return [SIMULATOR_DOMAIN, ...allowlist].some((entry) => {
    const rule = normalizeAddress(entry).replace(/^@/, "");
    return rule.includes("@") ? rule === normalized : rule === domain;
  });
}

/**
 * Outside production only: refuses (before the provider is reached) any recipient not on the allowlist.
 * Production does not use this wrapper.
 */
export function createAllowlistedEmail(inner: EmailPort, allowlist: readonly string[], write: (line: string) => void = (line) => console.info(line)): EmailPort {
  return {
    async send(message) {
      if (!isAllowed(message.to, allowlist)) {
        write(JSON.stringify({ event: "email.blocked", reason: "recipient is not on the allowlist for this environment" }));
        throw new EmailSendError("not_allowed", "This environment may not email that recipient");
      }
      return inner.send(message);
    },
  };
}

/** A keyed hash of an address, so the suppression list never holds the address itself. */
export function addressKey(address: string, salt: string): string {
  return createHmac("sha256", salt).update(`email-suppression:${normalizeAddress(address)}`).digest("hex");
}

export type SuppressionStore = { isSuppressed(key: string): Promise<boolean> };

/** Skips (silently, as a success for the caller) any recipient that bounced or complained before. */
export function createSuppressingEmail(inner: EmailPort, store: SuppressionStore, salt: string, write: (line: string) => void = (line) => console.info(line)): EmailPort {
  return {
    async send(message) {
      if (await store.isSuppressed(addressKey(message.to, salt))) {
        write(JSON.stringify({ event: "email.suppressed", reason: "the recipient bounced or complained before" }));
        return;
      }
      return inner.send(message);
    },
  };
}
