import type { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { describe, expect, it, vi } from "vitest";

import { EmailSendError } from "./email";
import { classifySesFailure, createSesEmail, type SesClientLike } from "./ses";

// S14 AC3 and AC4: the SES adapter builds the message the provider needs, never leaks the recipient or the
// text, and turns the provider's failures into typed errors. No network is used: the client is a fake.
const from = "Signal One Sound <no-reply@signalonesound.com>";
const message = { to: "person@example.com", subject: "Your alert", text: "Three new events near you." };
const failure = (name: string) => Object.assign(new Error("provider said no: person@example.com"), { name });

function fakeClient(result: () => Promise<{ MessageId?: string }> = async () => ({ MessageId: "m-1" })) {
  const sent: SendEmailCommand[] = [];
  const client: SesClientLike = { send: vi.fn(async (command: SendEmailCommand) => (sent.push(command), result())) };
  return { client, sent };
}

describe("SES email adapter", () => {
  it("AC3 sends a plain-text message with the configured sender to one recipient", async () => {
    const { client, sent } = fakeClient();
    await createSesEmail({ region: "us-east-1", from, client }).send(message);
    expect(sent).toHaveLength(1);
    expect(sent[0].input).toEqual({
      FromEmailAddress: from,
      Destination: { ToAddresses: ["person@example.com"] },
      Content: { Simple: { Subject: { Data: "Your alert", Charset: "UTF-8" }, Body: { Text: { Data: "Three new events near you.", Charset: "UTF-8" } } } },
    });
  });

  it("AC3 refuses a recipient or subject with a line break (header injection) before the provider is reached", async () => {
    const { client } = fakeClient();
    const email = createSesEmail({ region: "us-east-1", from, client });
    for (const bad of [{ to: "a@example.com\r\nBcc: b@example.com" }, { subject: "Hi\nBcc: b@example.com" }, { to: "" }, { to: "no-at-sign" }]) {
      await expect(email.send({ ...message, ...bad }), JSON.stringify(bad)).rejects.toMatchObject({ kind: "rejected" });
    }
    expect(client.send).not.toHaveBeenCalled();
  });

  it("AC4 maps each provider failure to its own kind", () => {
    const kind = (name: string) => classifySesFailure(failure(name)).kind;
    expect(kind("MessageRejected")).toBe("rejected");
    expect(kind("BadRequestException")).toBe("rejected");
    expect(kind("AccountSuspendedException")).toBe("account");
    expect(kind("SendingPausedException")).toBe("account");
    expect(kind("MailFromDomainNotVerifiedException")).toBe("account");
    expect(kind("TooManyRequestsException")).toBe("throttled");
    expect(kind("LimitExceededException")).toBe("throttled");
    expect(kind("SomethingElse")).toBe("unavailable");
    expect(classifySesFailure("not even an error").kind).toBe("unavailable");
  });

  it("AC4 a failing provider throws a typed error whose message holds neither the address nor the text", async () => {
    const { client } = fakeClient(async () => {
      throw failure("MessageRejected");
    });
    const error = await createSesEmail({ region: "us-east-1", from, client }).send(message).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EmailSendError);
    expect((error as EmailSendError).kind).toBe("rejected");
    expect(String((error as Error).message)).not.toContain("person@example.com");
    expect(String((error as Error).message)).not.toContain("Three new events");
  });
});
