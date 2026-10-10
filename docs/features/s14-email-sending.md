# S14 Email Sending (swappable provider, Amazon SES first)

**Status: APPROVED by the owner on 2026-10-10 ("do your suggestion so that any email connector can be hooked up"; Amazon SES chosen as the first adapter for its cost, with Resend or Postmark as alternatives). Choosing and connecting a real provider account is a separate pre-production requirement (`/docs/release.md` section 9); this slice builds and tests the code without any account.** Source: S7 and S8 (digests, appeal notices), `/docs/integrations.md`.

## Purpose

Let the app send real email through any provider by changing configuration, with safe defaults: nothing is sent unless a provider is chosen, a development or test environment can never email a stranger, and an address that bounced or complained is never emailed again.

## Scope (in)

* The existing `EmailPort` stays the only thing callers depend on. A typed `EmailSendError` tells callers what kind of failure it was (rejected, not allowed, throttled, unavailable, not configured); callers still never let a failed email undo their action.
* An Amazon SES adapter (`lib/messaging/ses.ts`), the only file allowed to import the AWS SDK. Plain-text messages, a configured sender, nothing logged about the recipient or the text.
* Settings: `EMAIL_PROVIDER` (`ses` or `none`, default `none`), `EMAIL_FROM`, `SES_REGION`, and `EMAIL_ALLOWLIST` (extra addresses or domains allowed outside production).
* A safety wrapper outside production: only allowlisted recipients (Amazon's mailbox-simulator addresses by default) can be emailed.
* A suppression list of addresses that bounced or complained, stored only as keyed hashes, checked before every send, filled through an internal endpoint protected by the job secret (the provider's bounce notifications are connected to it when the account is set up).

## Out of scope

Choosing, paying for or configuring a provider account, DNS records, lifting a provider's sandbox, the bounce-notification forwarding (all go-live steps), HTML or templated email, attachments, newsletters.

## Acceptance criteria

* **AC1** With no provider chosen (the default), nothing is sent and the log line holds no address or text.
* **AC2** `EMAIL_PROVIDER=ses` requires `EMAIL_FROM` and `SES_REGION`; a malformed value is reported by name and never echoes a secret; an unknown provider name is refused.
* **AC3** The SES adapter sends a plain-text message with the configured sender, one recipient, the subject and the text, and logs neither address nor text.
* **AC4** Provider failures become typed errors: a rejected address, an account or sending pause, throttling and any other failure each map to their own kind.
* **AC5** Outside production, a message to a recipient that is not on the allowlist is refused before it reaches the provider; the simulator addresses are allowed by default; production sends to everyone not suppressed.
* **AC6** A suppressed address is never sent to, however the address is written (case, spaces); the list stores a keyed hash, never the address.
* **AC7** The suppression endpoint refuses a caller without the job secret (401), validates its input (400), and adding the same address twice is one entry.
* **AC8** No AWS SDK import exists outside `lib/messaging` (guard test, broken on purpose).
* **AC9** A failing provider never undoes the caller's action (existing S8 behavior, re-proven with the SES adapter's typed errors).

## Controls inventory

None: this slice has no screens. The only interface is the internal suppression endpoint (`POST /api/v1/internal/email/suppress`, job secret).

## Owner decisions still open

Which provider account to open and when (pre-production); the sending address (default `no-reply@signalonesound.com`).

## Done checklist

Each acceptance criterion above is ticked off with its test in the pull request that finishes the slice.
