import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

import { EmailSendError, type EmailMessage, type EmailPort } from "./email";

// Amazon SES adapter for the email port (S14). This is the ONLY file that imports the AWS SDK (a guard test
// keeps it that way), so another provider can replace it without touching any caller. It sends one plain-text
// message to one recipient. It never logs or returns the recipient or the text, and it turns the provider's
// failures into typed errors that callers already know how to ignore safely.
//
// Credentials come from the standard AWS environment (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, with a
// narrow send-only permission); this file never reads or prints them.
export type SesClientLike = { send(command: SendEmailCommand): Promise<{ MessageId?: string }> };
export type SesEmailOptions = { region: string; from: string; client?: SesClientLike };

const REJECTED = new Set(["MessageRejected", "BadRequestException", "InvalidParameterValue"]);
const ACCOUNT = new Set(["AccountSuspendedException", "SendingPausedException", "MailFromDomainNotVerifiedException", "NotFoundException"]);
const THROTTLED = new Set(["TooManyRequestsException", "LimitExceededException", "Throttling", "ThrottlingException"]);

/** A line break in a header field would let a message add recipients or headers, so it is refused before sending. */
const hasLineBreak = (value: string): boolean => /[\r\n]/.test(value);

export function classifySesFailure(error: unknown): EmailSendError {
  const name = typeof error === "object" && error !== null && "name" in error ? String((error as { name: unknown }).name) : "";
  if (REJECTED.has(name)) return new EmailSendError("rejected", "The email provider refused the message", { cause: error });
  if (ACCOUNT.has(name)) return new EmailSendError("account", "The email provider account cannot send right now", { cause: error });
  if (THROTTLED.has(name)) return new EmailSendError("throttled", "The email provider is limiting how fast mail can be sent", { cause: error });
  return new EmailSendError("unavailable", "The email provider could not send the message", { cause: error });
}

export function createSesEmail({ region, from, client = new SESv2Client({ region }) }: SesEmailOptions): EmailPort {
  return {
    async send({ to, subject, text }: EmailMessage): Promise<void> {
      if (hasLineBreak(to) || hasLineBreak(subject) || to.trim() === "" || !to.includes("@")) {
        throw new EmailSendError("rejected", "The message has an invalid recipient or subject");
      }
      try {
        await client.send(
          new SendEmailCommand({
            FromEmailAddress: from,
            Destination: { ToAddresses: [to.trim()] },
            Content: { Simple: { Subject: { Data: subject, Charset: "UTF-8" }, Body: { Text: { Data: text, Charset: "UTF-8" } } } },
          }),
        );
      } catch (error) {
        throw classifySesFailure(error);
      }
    },
  };
}
