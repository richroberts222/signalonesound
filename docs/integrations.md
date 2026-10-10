# Third-Party Integrations

One set of rules for every external service the platform calls or is called by: email, push notifications, file storage, maps and geocoding, analytics, error tracking, and anything later. The architecture rule behind it is in `/docs/code-quality.md` section 12 (ports and adapters). Payments have their own rules in `/docs/payments.md`.

**Standards followed** (established practice; confirm before citing externally): ports and adapters (hexagonal architecture), the twelve-factor treatment of backing services as attached resources, OWASP ASVS V13 and API Security (webhooks, SSRF, unrestricted consumption of third-party APIs), and least-privilege credentials.

## 1. Inventory

| Service | Role | Status |
| --- | --- | --- |
| Clerk | Identity | In use (web); mobile pending |
| Neon | PostgreSQL hosting | In use |
| Vercel | Web and API hosting | In use |
| GitHub | Source control, CI | In use |
| Email delivery | Account and notification email | Code built and tested (S14, `/docs/features/s14-email-sending.md`): a swappable `EmailPort` with an Amazon SES adapter (about $0.10 per 1,000 emails), a non-production recipient allowlist and a bounce suppression list. **No provider account is connected**; choosing and connecting one is a go-live requirement (`/docs/release.md` section 9). Another provider plugs in by replacing the one adapter file |
| Push notifications | Mobile notifications (Expo push or the platform services) | UNDECIDED; not built |
| File and image storage | Uploads such as flyers | UNDECIDED; not built |
| Maps and geocoding | Event map and distance search | UNDECIDED; not built |
| Analytics | Product usage | UNDECIDED; not built |
| Error tracking and uptime | Production visibility | UNDECIDED; not built (F-OPS-001) |
| Payments | See `/docs/payments.md` | Stripe chosen (test mode only). Built: plans, switches and entitlement (S10); hosted checkout, the customer page and verified, repeat-safe webhooks behind a swappable port (S11). **Not connected**: needs a Stripe webhook endpoint registered and the test keys in the environment; no live keys until the legal gates are met |

Choosing a vendor, and any spending, needs the owner's approval first. Compare cost, free-tier limits, data location, commercial-use terms and exit options, and record the choice here.

## 2. Rules for every integration

1. **A port in our vocabulary, one adapter.** The application depends on a small interface that states what it needs (for example "send this message to this person"), not the vendor's API. One adapter folder is the only code that imports the vendor SDK. A fake adapter backs the tests. The port is created with the first feature that needs it.
2. **Server-side only.** Credentials never reach a browser or mobile bundle. A client talks to our API, and our server talks to the vendor. The only exception is a vendor's documented publishable key.
3. **Credentials per environment,** held in the platform's secret store, scoped to the narrowest permission the vendor allows, never in the repository. Test or sandbox mode in `dev`, `qa` and `stage`; live mode only in `prod`, and a guard refuses live keys elsewhere (as for Clerk).
4. **Webhooks are verified, idempotent and replay-safe.** Check the signature, record the event id, ignore duplicates, answer quickly, and process safely more than once.
5. **Calls fail gracefully.** Every outbound call has a timeout, bounded retries with backoff, and a defined behavior when the vendor is down. The core product must keep working when a non-essential vendor fails (F-OPS-004).
6. **Do not send more personal data than needed.** Data sent to a vendor is minimized and listed in the privacy policy; no secrets, tokens or unneeded personal data go into logs or vendor payloads.
7. **User-supplied URLs are never fetched blindly** (server-side request forgery): validate scheme and host, block internal addresses, set size and time limits. The first feature that fetches a user-supplied URL needs this designed.
8. **Respect vendor limits.** Rate limits and quotas are handled, not discovered in production; costs are monitored.
9. **Exit is possible.** Vendor-specific data formats stay inside the adapter so replacing a vendor changes one folder.
10. **Terms checked.** Commercial-use terms, data-processing terms and, where relevant, regional rules are read before adoption (`/docs/risk-and-legal.md`).

## 3. Adopting a new integration (checklist)

1. Owner approves the vendor and any cost.
2. The port and its fake are written; the adapter implements the port.
3. Credentials are added per environment; the live-key guard is extended and break-tested.
4. Timeout, retry and outage behavior are defined and tested with the fake.
5. Webhooks (if any) have signature, replay and out-of-order tests.
6. The privacy policy and the compliance table in `/docs/risk-and-legal.md` are updated.
7. The import allow-list test gains an entry for the adapter folder (`apps/web/lib/security.test.ts`), proven by importing the SDK elsewhere.

## 4. Enforcement and proof status

| Rule | Mechanism | Proof |
| --- | --- | --- |
| The identity SDK is imported only in its adapter locations; the database libraries only in the data layer | `security.test.ts` import allow-lists | Proven (imports added to the service and data layers fail the tests) |
| No secrets in committed files; no public variable carries a secret-like word | `security.test.ts` | Proven |
| Live keys refused outside prod | `parseServerEnv` | Proven for Clerk; to be extended per vendor |
| Timeouts, retries, webhooks, minimization, exit | Not built | Not proven; applies as each integration is added |
