"use client";

import { useMemo, useState } from "react";
import { CONTACT_MESSAGE_MAX, CONTACT_NAME_MAX, CONTACT_TOPICS, createApiClient, createContactClient } from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

// The public contact form (S15). It is only shown when the form is switched on. Plain text only. The hidden
// "website" box is a trap for bots: it is off-screen and out of the tab order, so a person never fills it.
export function ContactForm() {
  const client = useMemo(() => createContactClient(createApiClient({ baseUrl: "" })), []);
  const [topic, setTopic] = useState("question");
  const [name, setName] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await client.send({ topic, name, replyEmail, message, website });
    if (result.ok) {
      setSent(true);
    } else {
      const fields = result.error.fieldErrors;
      setError((fields && Object.values(fields)[0]?.[0]) ?? result.error.message);
    }
    setBusy(false);
  }

  if (sent) {
    return (
      <p role="status" className="rounded-lg border p-4" data-testid="contact-thanks">
        Thank you. We received your message{replyEmail.trim() !== "" ? " and will reply to the address you gave" : ""}.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate data-testid="contact-form">
      <div className="flex flex-col gap-1">
        <Label htmlFor="contact-topic">What is this about?</Label>
        <NativeSelect id="contact-topic" value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="contact-topic">
          {CONTACT_TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="contact-name">Your name</Label>
        <Input id="contact-name" value={name} maxLength={CONTACT_NAME_MAX} autoComplete="name" onChange={(e) => setName(e.target.value)} data-testid="contact-name" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="contact-reply">Your email, if you would like a reply (optional)</Label>
        <Input id="contact-reply" type="email" value={replyEmail} maxLength={254} autoComplete="email" onChange={(e) => setReplyEmail(e.target.value)} data-testid="contact-reply" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="contact-message">Your message</Label>
        <Textarea id="contact-message" value={message} maxLength={CONTACT_MESSAGE_MAX} onChange={(e) => setMessage(e.target.value)} data-testid="contact-message" />
        <p className="text-xs text-muted-foreground">Plain text only. Please do not include passwords or payment details.</p>
      </div>
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <Label htmlFor="contact-website">Leave this empty</Label>
        <Input id="contact-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} data-testid="contact-website" />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="contact-error">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={busy} data-testid="contact-send">
          {busy ? "Sending..." : "Send message"}
        </Button>
      </div>
    </form>
  );
}
