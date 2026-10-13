# Test coverage map

**What this is.** An honest list of what the tests prove and what they do not, section by section of the two manuals. It exists because "the tests pass" can hide a screen nobody ever clicked. First written on 2026-10-12 after the owner asked for a fine-tooth-comb audit (rule: `docs/qa-strategy.md` section 3, "automation ships with the feature").

## The layers, and what each can and cannot prove

| Layer | Proves | Does not prove | Size today |
| --- | --- | --- | --- |
| Unit and service tests | The rules and the wording | That a screen calls the rules correctly | thousands of checks across the packages |
| API acceptance tests (`lib/api/*.acceptance.test.ts`) | Every route does what the spec says, for the right and wrong person, at the HTTP boundary, with a faked identity | That the screen shows it, or that real sign-in works | 19 files |
| Real-database integration tests (`db/*.integration.test.ts`) | The real SQL does what the in-memory copy does | The screen | 13 files, run by hand and in the dev database |
| Browser tests (`apps/web/e2e`) | A person can do it: real sign-in, real screen, real database | Phones | about 80 tests |
| Phone tests (`apps/mobile`) | The phone app's logic (formatting, queries, saved list) | Any screen, on any device | 76 checks, no screen tests |

**How to read the gap measure.** Every control on a screen has a test id. `node scripts/audit-test-coverage.mjs` lists the ids no test file mentions. That does **not** mean the behaviour is untested (the rule behind it may be well proven below the screen); it means no test drives that control. On 2026-10-12: **399 controls, 220 not driven by any test (161 on the web, 59 on the phone)**, down from 292 after the journeys below.

**The guard.** `apps/web/lib/test-coverage.test.ts` fails when a new control ships without a test that mentions it, and when a control in `docs/test-coverage-baseline.json` has been covered but not removed from the list. The list can only shrink.

## User manual (`docs/user-manual.md`)

| Section | Rules proven below the screen | Driven in a browser | Gap |
| --- | --- | --- | --- |
| 1 Menu | n/a | Yes (menu, footer and home links) | None known |
| 2 Create an account and sign in | Yes (member, policy acceptance) | Partly: signed-out redirects, API refusals. The sign-in form is Clerk's own | Sign-up itself and the terms step are exercised only by the test helper |
| 3 Find events | Yes | Yes (search by place and name, empty states, no-JavaScript form) | None known |
| 4 An event page | Yes (save, fire, report, share link) | **Yes (`e2e/member-journey.spec.ts`)**: save and unsave, light and put out a fire, report, invite link | Add to calendar and share buttons |
| 5 Find a church | Yes | Yes (8 tests) | None known |
| 6 Saved events, alerts, Fire Map | Yes (saved, alerts, fires) | Fire Map yes (7 tests); saved list and alerts (make, pause, remove) yes (`member-journey.spec.ts`) | Alert quiet hours, reminders and radius options; the saved list's load-more |
| 7 Your account | Yes (profile, preferences, delete) | **Yes (`member-journey.spec.ts`)**: change name, email preference, download data, invite link, delete account (a throwaway member is deleted at the end) | The separate notification preferences screen |
| 8.1 to 8.5 Church manager | Yes (claim, profile, events, invites, revoke) | **Yes, as one journey (`e2e/church-journey.spec.ts`)**: apply, approval, post an event, the public finds it, admin hides and restores it, cancel, delete | Also driven: church profile and service times (`admin-actions.spec.ts`), a weekly series and editing one event or this-and-later (`manager-events.spec.ts`). Not driven: manager invites and revoking another manager (revoking has no screen yet, only an API) |
| 8.6 Membership | Yes (S13, S14, S20) | Member page free message; church page signed-out redirect | **Choose a plan and Manage billing (needs Stripe test mode) not driven** |
| 9 Report a problem | Yes (moderation, reports) | Yes: report an event, admin dismisses it (`member-journey.spec.ts`); contact form (public pages) | Reporting a church |

## Admin manual (`docs/admin-manual.md`)

| Section | Rules proven below the screen | Driven in a browser as an admin | Gap |
| --- | --- | --- | --- |
| 1 Access and sub-menu | Yes | Yes (`e2e/admin.spec.ts`) | None |
| 2 Manager requests | Yes (approve, reject, reasons) | Yes: approve (`church-journey.spec.ts`) and reject, with the person seeing Not approved (`admin-actions.spec.ts`) | None known |
| 3 Moderation | Yes (hide, restore, unpublish, suspend, reinstate, reports) | Yes: hide and restore an event, unpublish and restore a church (checked in the public finder and API), suspend and reinstate a member, an admin cannot suspend themselves, dismiss a report | Hide the member's events when suspending, "action" on a report |
| 4 Audit log | Yes | Yes (search, no-match message, export button) | Export file contents |
| 5 Messages | Yes | The inbox opens | **Reading a message and marking it done** |
| 6.1 to 6.6 Billing | Yes | Yes: rules, plans, perks, coupons, trial grant, history, and giving a real church a free-for-life place and taking it back (`manager-events.spec.ts`) | None known |
| 7 Practice screens | n/a | Yes (they open and say they are practice) | None |

## What this audit cannot see

* Tests that exist but are weak. `docs/automation/test-value-review.md` is the standard; a test counts only if breaking the behaviour makes it fail.
* Phones. The phone app has 59 controls and no screen tests. Driving them needs a decision on tooling (a phone-screen test library, or Maestro against an emulator), which adds a dependency and is the owner's call.
* Real money. Checkout is in Stripe test mode and payment is off.
* Accessibility: 3 browser tests only.

## Plan to close the gaps (proposed order, each a separate pull request)

1. **Done 2026-10-12: church journey, three people in one browser test** (member, admin, public). Cleanup of its church and events is in `db/tooling/e2e-cleanup.ts`.
2. **Done 2026-10-12: member journey** with a throwaway member who is deleted at the end (and the admin dismissing the report).
3. **Membership and checkout in Stripe test mode**, including the church page.
4. **Phone screens**, after the tooling decision.
5. **Done 2026-10-12: admin decisions** (reject, unpublish, restore, suspend, reinstate) and the church profile with service times in the public finder. **Also done:** free for life with a real church, a weekly series, editing an event (`manager-events.spec.ts`). **Still to do:** manager invites and revoking a manager.

Each pull request removes the ids it now covers from `docs/test-coverage-baseline.json`; the guard enforces it.
