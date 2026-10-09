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
| Weekly dependency compatibility check (`pnpm peers check`, `expo install --check`) | Schedule | Planned |

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
