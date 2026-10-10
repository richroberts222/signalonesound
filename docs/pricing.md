# Pricing: what everything costs

A running list of every service the project uses or may use, what it costs, and whether it is being paid for today. It exists so the owner can see the whole monthly and yearly bill at a glance and plan for what comes next.

**Rules.** Prices change, so every figure here is "as of" the date in its row and must be confirmed on the provider's own page before paying. Claude never opens a paid account or spends money without the owner's yes (`/CLAUDE.md` rule 8). Claude keeps this file current: when something is bought, changed or cancelled, the row changes in the same pull request. Never put an account number, card detail, login or key in this file.

Last reviewed: 2026-10-10.

---

## 1. What is being paid for today

| Service | What it is for | Cost | Billing | Notes |
| --- | --- | --- | --- | --- |
| Claude (Anthropic) | The AI developer that builds and tests the app | $20 per month | Monthly | The plan used for this work. Extra usage credits of $40 were bought once, usable only for the most capable model; they are not a recurring charge |
| Vercel Pro | Hosts the website and API; commercial use; spend controls | About $20 per month | Monthly | Upgraded 2026-10-10. Includes $20 of usage each month. The on-demand spend cap is set to $10. Includes one free domain for the first year (not yet claimed) |
| Domain name (`signalonesound.com`) | The web address and `contact@` email forwarding | About $11 the first year; renews at about $15 | Yearly | Bought at Namecheap with privacy protection and auto-renew on. Email forwarding is free |

**Current recurring total: about $40 per month, plus about $15 per year for the domain** (roughly $41 per month on average).

## 2. Free today, with what could change

| Service | What it is for | Today | When it could cost money |
| --- | --- | --- | --- |
| GitHub | Code, pull requests, automatic checks, browser tests | Free (public repository) | Private repositories or much heavier automation |
| Neon (database) | The app's PostgreSQL database | Free plan (6 hours of restore history) | See section 3: a paid plan is a go-live requirement |
| Clerk (sign-in) | Accounts, sign-in, user management | Free plan | A paid plan was offered and declined. Check the free monthly active user limit before launch |
| Expo / EAS (phone builds) | Builds the Android and iPhone apps | Free plan: 15 Android and 15 iOS builds per month | More builds per month, faster builds, or a team need a paid plan; confirm current pricing |
| Expo push notifications | Sends alerts to phones | Free | Very high volume |
| Stripe (payments) | Takes card payments | Sandbox (test mode) is free; no money moves | See section 3: live fees apply once real customers pay |
| Namecheap email forwarding | `contact@signalonesound.com` forwards to the owner's inbox | Free with the domain | Sending mail from the app is separate (section 3) |
| Whisper (local) | Transcription run on the owner's own PC | Free | Uses PC memory only |

## 3. Planned or possible costs (nothing here is bought yet)

| Service | What it is for | Expected cost | When it is needed | Notes |
| --- | --- | --- | --- | --- |
| Neon paid plan (Launch) | Longer restore window, always-on option, protected branches | Usage-based: about $0.106 per compute unit-hour and $0.35 per GB-month. For this app, roughly a few dollars up to about $20 per month depending on whether compute sleeps when idle | Before real user data is stored | Set a spending limit if offered. Tracked in `/docs/release.md` section 9 |
| Email sending: Amazon SES (first adapter) | Alert digests, moderation notices, account emails | About $0.10 per 1,000 emails; reportedly about 3,000 a month free for the first year | Before launch | Needs an AWS account, DNS records and the sandbox lifted. The email connector is swappable (S14) |
| Email sending: Resend (alternative) | Same | Free up to 3,000 a month and 100 a day; Pro about $20 per month for 50,000 | If SES proves a hassle | Simplest setup |
| Email sending: Postmark (alternative) | Same | From about $15 per month for 10,000 (free plan is only 100 a month) | If deliverability becomes a problem | Strong reputation for reaching the inbox |
| Stripe live payments | Charging members and churches | A percentage plus a fixed amount per card charge (in the United States, commonly quoted as about 2.9% plus $0.30), with extra fees for subscription billing tools; confirm on Stripe's pricing page | When real payments start (also needs the legal gates) | Sales tax is a separate owner and accountant question |
| Apple Developer Program | Publishing the iPhone app | $99 per year | Before an iPhone release | Individual or Organization (an Organization needs a free D-U-N-S number) |
| Google Play developer account | Publishing in the Play Store | $25 once | Optional; a direct download link works for demos | New personal accounts may have a testing period before going public; confirm current rules |
| Apple and Google store fees on in-app purchases | Selling subscriptions inside the phone apps | Typically 15% to 30% of each sale | Only if selling inside the apps | Selling on the website avoids this; the store rules limit how the app may point to it |
| Domain: a matching extra name | Redirects and protection against look-alike sites | About $10 to $15 per year, or one free with Vercel Pro in the first year | Optional | |
| Map provider | The Discover map | Undecided; many have free tiers | Optional (list and search work without it) | Owner approves any vendor first |
| Error tracking and uptime monitor | Hearing about breakages | Undecided; pick one with a free tier | Before launch, ideally | Owner approves any vendor first |
| Newsletter tool | Mailing lists | Undecided; free tiers exist | Optional, not needed to launch | Needs a visible unsubscribe and a mailing address |
| Vercel overage | Traffic beyond the included $20 of usage | Capped at $10 extra by the owner's setting | Only if traffic grows | If the cap is hit, extra usage can pause until it is raised or the month resets |
| Claude plan changes | More building capacity | Plans above $20 per month exist; confirm current prices | Only if usage limits get in the way | |

## 4. What the bill could look like

| Stage | Monthly | Yearly or one-time | What changes |
| --- | --- | --- | --- |
| Today (building, demo) | About $40 | About $15 for the domain | Claude and Vercel Pro |
| At launch, low traffic | About $45 to $80 | $99 Apple (if iPhone), $25 Google (if Play Store) | Adds a paid database (a few dollars up to about $20) and email (pennies up to about $20) |
| Once payments are live | The above, plus payment fees as a share of revenue | | Stripe takes its fee from each charge; store fees only if selling inside the phone apps |

These are estimates for planning, not quotes.

## 5. How to keep this current

* When a cost changes or something is bought, update the row and the "last reviewed" date in the same pull request.
* Prices that came from third-party summaries are marked "reportedly" or "about"; confirm them on the provider's page before paying.
* Product pricing (what members and churches pay us) is a separate matter, decided in the admin Billing console and recorded in `/docs/payments.md` and `/docs/product/product-plan.md`.
