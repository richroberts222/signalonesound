// Sending email (S8 notifications, later S7 digests). A port with a do-nothing default so the app runs,
// and is tested, without any email service. A real provider is chosen later with the owner's approval
// (it costs money and sees the recipients) and plugs in here without touching callers.
export type EmailMessage = { to: string; subject: string; text: string };
export type EmailPort = { send(message: EmailMessage): Promise<void> };

/**
 * The default: nothing is sent. It records only that a message was not sent, never who it was for or
 * what it said, so a log can never hold a person's address or the text of a message.
 */
export function createLoggingEmail(write: (line: string) => void = (line) => console.info(line)): EmailPort {
  return {
    async send() {
      write(JSON.stringify({ event: "email.not_sent", reason: "no email provider is configured" }));
    },
  };
}

/** Finds the address of a person from the sign-in provider; null when there is none. */
export type EmailLookup = { getPrimaryEmail(clerkUserId: string): Promise<string | null> };
