# Risk and Legal

The legal gates, the compliance standards that do and do not apply, the accepted risks, and the pre-launch checklist. **This is an engineering checklist, not legal advice.** Items that need a lawyer, an accountant or the owner's signature are marked **Owner action**. Standards are named from established practice and should be confirmed against current publications and by counsel before they are relied on.

Product decisions behind these gates are recorded in `/docs/product/product-plan.md` ("Accepted decisions"). Security rules: `/docs/security.md`. Privacy-relevant data rules: `/docs/auth.md`, `/docs/database.md`.

## 1. The gates (nothing real until these exist)

| Gate | Rule | Status |
| --- | --- | --- |
| Collection gate | No real user data is collected until the privacy policy page, terms acceptance at sign-up, and the 18+ confirmation exist | **Built** (S1: `/privacy`, `/terms`, the "Before you continue" step, recorded acceptance, the 18+ box; tested). **Not yet met in full:** the wording has not been reviewed by a qualified person, and no real data exists. Status as of 2026-10-10 |
| Age | Minimum age 18, confirmed by self-attestation at sign-up and recorded with the policy acceptance | Decided (Q-009); **built** (S1) |
| Terms and privacy | Generic Terms of Service and Privacy Policy now; acceptance (policy version and timestamp) recorded when the first user row is created; attorney review later | Decided; **pages written and acceptance recorded**; attorney review pending (owner action). Wording for newer features is drafted in section 7 and applied when each feature goes live |
| First non-US user | Legal review is required before the first user outside the United States (religious belief is special-category data in several jurisdictions), plus a decision on data location and vendor data-processing terms | Gate recorded (Q-009) |
| Payments | No payment feature until the payments rules (`/docs/payments.md`) are met and the store rules are checked | Built in test mode only (S10, S11); off by default; **nothing is live**. Stays closed until these gates are met |
| Public launch | Everything in section 5 is complete | Not met |

## 2. Standards: what applies, what does not

| Standard | Applies? | Why | Action |
| --- | --- | --- | --- |
| WCAG 2.2 level AA, Section 508 (US federal accessibility), ADA expectations | **Yes, as the target** | Section 508 binds federal agencies and their vendors; WCAG 2.2 AA is the practical standard for any public product and the usual basis of accessibility claims | Adopt WCAG 2.2 AA as the written target; automated checks plus a screen-reader pass before launch; the iOS and Android equivalents for the apps (F-UX-002) |
| HIPAA (US health information) | **Not by default** | It applies to healthcare providers, health plans and their business associates. A church event finder is none of those | Do not collect health information. Any future feature that invites it (prayer or healing testimonies) is reviewed by counsel first; state consumer-health-data laws can apply even where HIPAA does not. Do not claim HIPAA compliance |
| FedRAMP, DoD STIGs, NIST SP 800-53 and 800-171 | **No** | They apply to selling to government or handling government data | Not adopted. NIST frameworks are used as references only; the secure-development practices already follow the spirit of NIST SSDF |
| SOC 2, ISO 27001 | **Later, if asked** | Larger partners may require them | Revisit if a partner requires one |
| PCI DSS | **When taking payments** | Card data scope is avoided entirely by using the provider's hosted checkout | Hosted checkout only (`/docs/payments.md`) |
| COPPA (under-13 data) | Avoided | The 18+ rule keeps children out | Self-attestation plus no features aimed at children |
| GDPR, UK GDPR, CCPA/CPRA and other privacy laws | **Yes, as the product grows beyond the US** | They govern notice, consent, access, deletion and export | Build deletion, export and the data inventory from the first user table (decided, Q-009); region-specific work when a region opens |
| CAN-SPAM and similar messaging rules | **When sending email or text** | Unsubscribe and sender identity | Part of the notifications rules (`/docs/integrations.md`) |
| DMCA / copyright takedown | **When users submit content** | A designated agent and a takedown process protect the platform | Page and process before user submissions go live (F-REQ-006) |
| Apple App Store Review Guidelines, Google Play policies | **Yes, for the apps** | User-generated-content controls, in-app account deletion, privacy labels, in-app purchase rules | Checked at submission time (F-REL-005, F-REQ-006) |

## 3. Business and legal protections (Owner actions)

Most companies put these in place before launch. None is done by the repository.

| Item | Why | Who |
| --- | --- | --- |
| Business entity (for example an LLC) | Separates business liability from personal assets | Owner, with an accountant or lawyer |
| Terms of Service and Privacy Policy reviewed by an attorney | The generic documents are a starting point | Owner |
| Trademark search for "Signal One Sound" | Avoid a naming dispute after launch | Owner or lawyer |
| Business insurance (general liability, possibly cyber) | Covers claims and incidents | Owner |
| Copyright agent registration (for takedown notices) | Needed for DMCA safe-harbor | Owner |
| Vendor terms read for commercial use (Vercel plan, Clerk, Neon, Expo, payment provider) | A free tier may not permit commercial use (F-REL-007) | Claude checks and reports; the owner decides on any paid plan |
| Open-source license decision for this repository and the template repository | No license means "all rights reserved"; publishing under an open license is irreversible for the published copies | **Undecided** by the owner. Default: no license file (all rights reserved). Revisit before the code is shared with anyone or the template is published for others |

## 4. Accepted risks

Decided by the owner and not to be re-raised unless the trigger occurs.

| Risk | Decision | Revisit when |
| --- | --- | --- |
| No two-factor sign-in for the owner's accounts | Accepted; the owner restated on 2026-10-10 that it is to be done before launch. **Check first:** GitHub has required two-factor for people who push code since 2023, so the GitHub account may already have it (Settings, Password and authentication); the accepted-risk row then covers only Clerk, Vercel, Neon and any other account | The first real user's data, the first payment, or a third person joins |
| The template repository (`fullstack-boilerplate`) is public | Accepted; it holds no secrets or proprietary content | It carries anything proprietary, or at the first real user's data |
| The owner and the business partner share one login | Accepted by choice | A third person joins, or the first real user's data |
| Public sign-up is open on the live site (the Production Clerk instance, since 2026-10-09) | Accepted for now; nobody knows the address | The launch gate, or if the address is shared |
| Production project stays live (taking it offline is deferred) | Accepted | Rollout |

## 5. Pre-launch legal and risk checklist

Tick each item and record the proof before real users or real data. Status as of 2026-10-10; "owner" marks what only the owner (or a lawyer) can do.

| # | Item | Status | Proof, or what is left |
| --- | --- | --- | --- |
| 1 | Terms of Service and Privacy Policy pages exist, are linked from sign-up, and acceptance (version and timestamp) is recorded | **Built** | S1 tests and the browser tests (`/terms`, `/privacy`, the acceptance step). Left: attorney review (owner) and the newer-feature wording in section 7 |
| 2 | The 18+ confirmation exists at sign-up and is recorded | **Built** | S1; recorded with the acceptance |
| 3 | Deletion and export of a user's data work end to end and are documented | **Built, partly proven** | Account page export and delete; deletion extends with each slice (S7, S10, S11) and is covered by real-database tests; `/docs/data-inventory.md` lists every column's deletion path. Left: an automated browser journey for delete and export |
| 4 | User-submitted content: report, review and removal process; copyright takedown contact; content rules published | **Mostly built** | Report button, admin moderation and the takedown procedure below (S8); the contact address is published. Left: register a copyright agent (owner) and publish plain content rules in the Terms |
| 5 | WCAG 2.2 AA scan and a screen-reader pass completed; results recorded | **Not done** | Planned in S9 |
| 6 | A dependency license scan found nothing that forbids commercial use; the result is recorded | **Done 2026-10-10** | Section 8; rerun before launch |
| 7 | Vendor terms checked for commercial use; paid plans chosen where required (owner approval) | **Partly** | Section 8. Vercel Pro is bought. Left: the owner confirms the Neon and Clerk free-plan terms (the paid Neon plan is already a go-live requirement) |
| 8 | Incident response page exists (who to contact, how to shut things off, credential list) (F-SEC-007) | **Drafted 2026-10-10** | `/docs/incident-response.md`. Left: rehearse one off switch and record it |
| 9 | Backups and a restore drill completed (F-DATA-002) | **Not done** | Queued; run on a non-production database branch |
| 10 | Production Clerk instance and domain set up (F-AUTH-011) | **Done 2026-10-09** | `www.signalonesound.com`; the production Clerk instance and its webhook are verified |
| 11 | For the apps: store privacy answers, account deletion in-app, user-generated-content controls (F-REL-005, F-REQ-006) | **Not started** | Needs the phone Account screens (S5) and a store account |
| 12 | Owner actions in section 3 completed or consciously deferred, with the decision recorded | **Open** | Business entity, attorney review, trademark search, insurance, copyright agent, the open-source license decision |

## 6. Enforcement and proof status

| Rule | Mechanism | Proof |
| --- | --- | --- |
| No secrets or credential-shaped values in committed files | `security.test.ts` | Proven |
| Dependency vulnerabilities are known and handled | Dependabot; `pnpm audit` (not in CI) | Not proven (open gap, F-SEC-004) |
| Dependency licenses allow commercial use | `pnpm licenses list` scan, result in section 8; rerun before launch | Proven once (2026-10-10) |
| The collection gate, age confirmation, terms acceptance, deletion and export | Built in S1 and extended per slice; tests at every layer | Proven in code; the legal review is the open part and tracked as the launch gate |
| Items in sections 3 and 5 that are owner actions | Checklist only | n/a |

## 7. Policy wording to add when a feature goes live (drafts for review)

The Privacy Policy and Terms (`/privacy`, `/terms`) are accurate for what is switched on today. Each feature below stores or shares more, so its paragraph must be added, and the policy version bumped (which asks every member to accept again), **in the same change that turns the feature on**. These are drafts for the owner and a lawyer to review, not final wording.

| Feature (switch) | Draft paragraph for the Privacy Policy | Also needs |
| --- | --- | --- |
| Contact form (`CONTACT_FORM_ENABLED`) | "If you write to us through the contact form, we keep your name, your message and, if you give one, your email address, so we can read and answer it. We also keep a scrambled one-way fingerprint of your network address with the message, only to limit how many messages one person can send in a day. We keep messages until we delete them." | Agree a retention period (for example delete after the matter is closed or after a set time) |
| Payments (`PAYMENTS_PROVIDER`) | "If you buy a paid plan, the payment is handled by Stripe on its own page. We never see or store your card number. We keep Stripe's reference numbers for your subscription and whether it is active, so we know what you have access to." | Refund and cancellation terms; sales-tax decision; the Terms for paid plans (owner and lawyer) |
| Email (`EMAIL_PROVIDER`) | "We send email through Amazon Web Services. If an address bounces or you mark a message as spam, we keep a one-way fingerprint of it so we do not email it again." | A mailing address and a visible unsubscribe on non-essential email (CAN-SPAM) |
| Phone alerts (`PUSH_PROVIDER`) | "If you turn on phone alerts, we keep the address your phone gives us for notifications and send them through Expo's notification service." | Permission wording in the phone app |
| Reports of events and churches (already on) | "When someone reports an event or a church, we do not keep who reported it. We keep a scrambled fingerprint of the sender's network address for 24 hours to stop one address flooding the form." | Add now: it is already true |
| Everyone | "The services that run Signal One Sound, and what they do: Vercel (hosting), Neon (database), Clerk (sign-in), and, when switched on, Stripe (payments), Amazon Web Services (email) and Expo (phone notifications). They may use your information only to provide their service to us." | Replace the current "hosting, sign-in and the database" sentence |

**Terms additions to draft with a lawyer:** content rules for what churches and members may post (the plan's moderation and report process, S8); paid plans, billing, cancellation and refunds; what happens to a listing when a church is removed; limitation of liability; governing law and the business entity's name (needs the business entity, section 3).

**Decisions only the owner can make:** the contact message retention period; the refund policy; the legal name and address in the Terms; whether to register a copyright agent now.

## 8. Dependency licenses and vendor terms (checked 2026-10-10)

**Dependency license scan** (`pnpm licenses list`, 962 packages in the lockfile): MIT 814, Apache-2.0 67, ISC 31, BSD-2-Clause 15, BSD-3-Clause 12, BlueOak-1.0.0 7, MPL-2.0 3, Unlicense 3, 0BSD 2, and single packages under MIT AND Apache-2.0, Python-2.0, CC-BY-4.0, CC0-1.0 and some dual licenses. **Nothing forbids commercial use.** No AGPL, SSPL, proprietary or non-commercial license is present. Notes for a lawyer or later review:

| Package | License | Note |
| --- | --- | --- |
| `@img/sharp-win32-x64` | Apache-2.0 AND LGPL-3.0-or-later | A Windows-only image binary used on the developer's machine; the production build runs on Linux and uses the Linux build. LGPL permits commercial use when dynamically linked |
| `axe-core`, `lightningcss` (and its Windows build) | MPL-2.0 | File-level copyleft; used as tools, unmodified; allows commercial use |
| `caniuse-lite` | CC-BY-4.0 | Browser-support data; attribution applies if redistributed |
| `node-forge` | BSD-3-Clause OR GPL-2.0 | A choice of licenses; we use the BSD-3-Clause option |

**Vendor terms for commercial use** (from public pricing and documentation pages; the owner confirms on each vendor's own Terms page before launch):

| Vendor | Finding | Left for the owner |
| --- | --- | --- |
| Vercel | The Hobby plan is non-commercial; **the owner upgraded to Pro on 2026-10-10**, which covers commercial use | Nothing |
| Neon | The free plan is described for prototypes and side projects; explicit commercial-use wording was **not confirmed**. A paid plan is already a go-live requirement (`/docs/release.md` section 9) | Read Neon's Terms; upgrade before real users |
| Clerk | The free Hobby plan covers 50,000 monthly retained users per application; explicit commercial-use wording was **not confirmed** (the paid plan was declined) | Read Clerk's Terms; consider the paid plan before launch |
| Expo (EAS) | Free plan: 15 Android and 15 iOS builds a month, **no overage charges** (builds pause until the next month); commercial use is subject to a fair-use policy | Nothing now |
| Stripe | Test mode is free; live use needs a business account and its terms (section 7 and `/docs/payments.md`) | Open the live account only after the gates |
| GitHub | Free for a public repository, including automatic checks | Nothing |

## Report and takedown procedure (S8)

1. **Anyone can report** an event or a church from its public page (no account, no identity kept). Reasons are a fixed list; details are optional.
2. **An admin reviews** the queue at `/admin/moderation`. To remove content, hide the event or unpublish the church (a reason is required and recorded); to stop a person changing listings, suspend them. A person who is suspended can still browse, download their data and delete their account.
3. **The affected people are emailed** what happened, the reason, and how to appeal. They appeal through the contact page, which publishes `contact@signalonesound.com` (since 2026-10-10); the contact form stays off until the privacy wording is reviewed.
4. **A wrong decision is undone** by restoring the event or church or reinstating the member (also recorded).
5. **Legal requests** (for example a court order or a copyright notice): an admin can export the audit log for a period at `/admin/audit`; the export is itself recorded. Respond to a legal request with a lawyer once real users exist.
6. **Speed:** a hidden event disappears from search and its page at once.
