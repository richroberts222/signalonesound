# Release Process and Automation

How changes reach users on the web, iPhone and Android, and what is automated. Environments and variables: `/docs/deployment.md`, `/docs/environment.md`. Test layers and the definition of done: `/docs/qa-strategy.md`. Mobile specifics: `/docs/mobile.md`.

**Standards followed** (established practice; confirm against current publications before citing externally): the twelve-factor build, release, run separation; continuous delivery with a protected trunk; semantic versioning of interfaces; Apple App Store Review Guidelines and Google Play policies for mobile distribution; DORA delivery measures (lead time, change failure rate, time to restore).

**Status labels:** **Automated now**, **Manual now**, **Planned**. No spending is assumed; every paid item is an owner decision (section 7).

## 1. Principles

1. **One backend, three clients, independent release speeds.** The web updates in minutes; the mobile apps cannot be force-updated, so the API stays backward compatible inside a version (`/docs/api.md`) and an old app keeps working.
2. **A release is a verified, reversible step.** Every release has a checklist, a way to confirm it worked, and a way to go back.
3. **Humans decide.** Merging to `main` and publishing to a store are decisions of the owner (or an explicitly authorized merge); automation prepares and verifies.
4. **No production secrets in automation** beyond what a deployment needs, and none in the repository.

## 2. Web (Vercel)

| Step | Status |
| --- | --- |
| A pull request builds a Vercel Preview on the `qa` data; the owner reviews it | Automated now |
| `Validate` must pass; `main` is protected | Automated now |
| Merge to `main` deploys Production automatically | Automated now (no Stage between merge and Production; F-REL-002) |
| Post-deploy smoke check against `/api/v1/status` (and a sign-in page load) so a misconfigured deploy is noticed, since environment validation is lazy | Planned (F-REL-001) |
| Rollback: promote the previous deployment in Vercel (instant rollback); write the exact steps and the person who can do it | Procedure to write before launch (F-REL-001) |
| Manual promotion with a Stage environment instead of deploy-on-merge | Planned at the trigger "real users exist" (F-REL-002) |

## 3. Mobile (iPhone and Android)

**Toolchain (standard for Expo):**

| Tool | Purpose |
| --- | --- |
| **EAS Build** | Cloud builds of the iPhone and Android apps from the repository; no local Mac required for iPhone builds |
| **EAS Submit** | Uploads a finished build to App Store Connect and Google Play |
| **EAS Update** | Over-the-air updates of the JavaScript and assets, for fixes that do not change native code |
| **TestFlight** (Apple) and **internal testing** (Google Play) | Distribute builds to testers before public release |
| Automatic version and build numbers | `appVersionSource: remote` is already set in `eas.json`; the build number increments on each build |

**Build profiles** (`apps/mobile/eas.json`, already defined, never run): `development` maps to `dev`, `qa` to `qa`, `staging` to `stage`, `production` to `prod`. Each carries only `EXPO_PUBLIC_*` public values; mobile builds never contain `DATABASE_URL` or `CLERK_SECRET_KEY`.

**Stages and what each needs:**

| Stage | Output | Needs | Cost |
| --- | --- | --- | --- |
| 1. Development build on a physical phone (the walking skeleton) | Proves sign-in, the shared API and the database from a real phone | A free Expo account, `eas init`, the development profile | Free |
| 2. Internal testers | TestFlight and Play internal track | Apple Developer account, Google Play developer account, real store identifiers (Q-011) | Owner decision (section 7) |
| 3. Public release | App Store and Google Play listings | Store listings, privacy labels, review, the legal gates in `/docs/risk-and-legal.md` | Owner decision |

**Store identity is permanent.** The iOS bundle identifier and Android package name cannot change after the first published release. They are decided with Q-011 before stage 2, not before.

## 4. Version compatibility between the app and the API

* The API is versioned (`/api/v1`) and additive-only inside a version, so an installed app keeps working after the server is updated.
* **Minimum supported app version** (planned): the API returns the oldest app version it still supports; an older app shows an "update required" screen. Define the rule and the response field before the first store release.
* A breaking API change creates `/api/v2` that runs beside `v1` for as long as supported app versions need it.
* A contract-compatibility test (planned, F-AUTH-005) fails when a field is removed or renamed inside a version.

## 5. Automation plan

| Automation | Trigger | Status |
| --- | --- | --- |
| `Validate` on every pull request | Pull request, push to `main` | Built |
| Web Preview and Production deploy | Vercel Git integration | Built |
| Integration and browser test job | Pull request (separate job, protected `qa` environment) | Planned (F-TEST-002) |
| Release checklist run (section 6) | Before a web promotion or a mobile build | Manual now; the checklist is the spec for a later script |
| EAS Build workflow | Manual dispatch or a version tag; uses an Expo access token held as a GitHub secret; builds the profile for the chosen environment | Planned for stage 2 |
| EAS Submit workflow | Manual dispatch after a tested build, with the owner's approval | Planned for stage 3 |
| EAS Update | Manual or on tag, for JavaScript-only fixes, with the same checks | Planned after stage 3 |
| Weekly health check (`pnpm audit`, `pnpm peers check`, `expo install --check`), non-blocking | Schedule (`health.yml`) | Built |

Workflow files are changed only through a reviewed pull request (`/docs/security.md`), and each new workflow gets the same least-privilege and pinned-action checks as the existing ones (enforced by `security.test.ts`).

## 6. Release checklist

Web promotion or mobile build; tick each item and report the proof in the pull request.

1. All pull requests intended for the release are merged; `main` passes `Validate`.
2. The full test suite, including the integration and browser jobs once they exist, is green on `main`.
3. The accessibility scan passes; no new high-severity security finding (`/docs/qa-strategy.md` section 7).
4. Database migrations for this release are reviewed, applied to `qa` then `stage`, and verified with `db:migrate:verify`; a restore point exists before production.
5. The API changes are additive inside the version, or a new version is added.
6. Environment values for the target are checked by name against `/docs/environment.md`.
7. Mobile only: the build comes from the correct EAS profile; version and build number are right; the app runs on a physical device against the target API; store listing, privacy answers and screenshots match the build.
8. The rollback or hold step is written down and the person who can run it is named.
9. After release: the smoke check passes, errors and logs are reviewed for the first hour, and the result is recorded.

## 7. Owner decisions and approvals (nothing here is assumed)

| Decision | Detail | When |
| --- | --- | --- |
| Apple Developer account | Paid annual membership; needed for TestFlight and the App Store | Before stage 2 |
| Google Play developer account | One-time registration fee | Before stage 2 |
| Expo/EAS plan | The free tier limits builds and queue priority; a paid plan may be needed for frequent builds | If the free allowance runs out |
| App name and store identifiers (Q-011) | Permanent once published | Before stage 2 |
| Who may publish | The owner approves each store submission | Each release |

## 8. Enforcement and proof status

| Rule | Mechanism | Proof |
| --- | --- | --- |
| `main` is protected and `Validate` is required | Repository ruleset | Read back with the GitHub API; guards proven in earlier work |
| Mobile builds contain no server secrets | `apps/mobile/src/boundary.test.ts` and `security.test.ts` | Proven (boundary breaks fail tests) |
| Workflows are least-privilege and pinned | `security.test.ts` workflow tests | Proven (six breaks in the Wave 1 work) |
| Builds, store submission, over-the-air updates, minimum app version, rollback, smoke check | Not built | Not proven; tracked above |

## 9. Production go-live requirements (none of these are met yet)

These are things that cannot be done, or must not be done, until the project goes public. They are collected here so none is lost; each is owned by the document named in the last column, and nothing in this section is a decision that has been made. The owner decides every item marked "owner".

| Requirement | Why it waits | Owner of the detail |
| --- | --- | --- |
| A real domain name and a public production deployment | Vercel preview and deployment addresses change with every build and sit behind Vercel's deployment protection, which refuses programs (webhooks, scheduled jobs from outside, link checkers). Buying a domain costs money (owner). | `/docs/deployment.md`, `/docs/how-to.md` section 10 |
| A Clerk production instance | The current Clerk keys are development keys with strict usage limits and are not for production. Creating the production instance and its keys is a separate step from the development instance. | `/docs/auth.md`, `/docs/environment.md` |
| The Clerk webhook (`user.deleted`, `user.updated`) | Needs the stable public address above. Until then a deletion made in the Clerk dashboard does not reach the application database (deletion from the account page still works). Steps in `/docs/how-to.md` section 5. | `/docs/how-to.md` section 5 |
| Production environment values set in Vercel (by name) | `CLERK_WEBHOOK_SIGNING_SECRET`, `CRON_SECRET`, `UNSUBSCRIBE_SECRET`, `ADMIN_USER_IDS`, optionally `RATE_LIMIT_SALT` and `PUSH_PROVIDER`; checked by name against the environment document. | `/docs/environment.md` |
| Scheduled jobs that suit production | The free Vercel plan runs scheduled jobs once a day, so alerts arrive in one daily batch. More frequent jobs need a paid plan (owner, cost). | `/docs/features/s7-alerts-and-push.md` |
| An email provider selected, connected and tested | The alert digests, the emails to people when a moderator acts, and account notices need a real email provider (owner decision and cost; the contact address `contact@signalonesound.com` only receives). The app sends through a swappable email port, so any provider can be hooked up; Amazon SES (about $0.10 per 1,000 emails) is the first adapter being built, and Resend or Postmark are alternatives. Going live needs: the provider account, the sending domain's DNS records (SPF and DKIM), the provider's sandbox lifted if it has one, bounce and complaint handling switched on, a narrow send-only credential in Vercel, and a spending alert. Until then email is a logging stub. | `/docs/features/s7-alerts-and-push.md`, `/docs/features/s8-admin-and-moderation.md` |
| A map provider (if wanted) | The discover map needs a vendor choice (owner, cost). | `/docs/features/s4-discover-web.md` |
| Sitemap, universal links and app links | Need the production domain and the association files on it. | `/docs/features/s4-discover-web.md`, `/docs/features/s5-discover-mobile.md` |
| Store accounts and app identity | Apple Developer Program and Google Play developer account (owner, cost); app name and store identity (Q-011). | Section 7 above |
| The legal and privacy gates | No real user data is collected until the gates in `/docs/risk-and-legal.md` are met, including the contact address (now published on the Contact page), the takedown procedure and the policy review by a qualified person. Claude drafts what can be drafted and marks each gate's real status (owner approved this 2026-10-10); Claude cannot certify a gate as met. | `/docs/risk-and-legal.md` |
| The security gates | GitHub security settings (Dependabot, secret scanning, code scanning, read-only workflow token), the two-factor risk accepted for now revisited at the first real user or payment, and the repository stays public by decision until then. | `/docs/security.md`, `/docs/how-to.md` section 8 |
| A paid database plan with a longer restore window | The free Neon plan keeps only 6 hours of history, too short to undo a mistake found the next day. The Launch plan is usage-based (about $0.106 per compute unit-hour and $0.35 per GB-month; a rough range for this app is a few dollars to about $20 per month, depending on whether compute sleeps when idle). Decide and pay before real user data is stored; set a spending limit if the plan offers one (owner, cost). | `/docs/database.md` section 12.4 |
| A paid website hosting plan | **Done 2026-10-10:** the owner upgraded to Vercel Pro (about $20 per month) and set the on-demand spend cap to $10. Revisit the cap against expected traffic before launch. Vercel team two-factor enforcement is still off (owner: before launch). | `/docs/deployment.md` |
| A tested database restore | The restore drill is a launch requirement. Approved 2026-10-10: Claude prepares it, runs it on a non-production database branch only, and records the result with the GitHub security settings checklist. | `/docs/database.md` section 12.4 |
| Resolve the recorded dependency differences | `@types/node` and `typescript` differ between the phone app and the web app (`KNOWN_DIFFERENCES` in `scripts/dependency-match.mjs`); decide each before release. | `/docs/stack.md` rule 7 |
