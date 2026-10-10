import type { EmailSuppressionRepo } from "./email-suppression";

// In-memory suppression list that behaves like the real one: a key is stored once, whatever the reason.
export function createFakeEmailSuppressionRepo(entries: Map<string, string> = new Map()): EmailSuppressionRepo & { readonly entries: Map<string, string> } {
  return {
    entries,
    isSuppressed: async (key) => entries.has(key),
    add: async (key, reason) => {
      if (!entries.has(key)) entries.set(key, reason);
    },
  };
}
