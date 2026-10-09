# Risk and Legal

The legal gates, the compliance standards that do and do not apply, the accepted risks, and the pre-launch checklist. **This is an engineering checklist, not legal advice.** Items that need a lawyer, an accountant or the owner's signature are marked **Owner action**. Standards are named from established practice and should be confirmed against current publications and by counsel before they are relied on.

Product decisions behind these gates are recorded in `/docs/product/product-plan.md` ("Accepted decisions"). Security rules: `/docs/security.md`. Privacy-relevant data rules: `/docs/auth.md`, `/docs/database.md`.

## 1. The gates (nothing real until these exist)

| Gate | Rule | Status |
| --- | --- | --- |
| Collection gate | No real user data is collected until the privacy policy page, terms acceptance at sign-up, and the 18+ confirmation exist | Not met; no real data exists (F-AUTH-003) |
| Age | Minimum age 18, confirmed by self-attestation at sign-up and recorded with the policy acceptance | Decided (Q-009); not built |
| Terms and privacy | Generic Terms of Service and Privacy Policy now; acceptance (policy version and timestamp) recorded when the first user row is created; attorney review later | Decided; documents not written |
| First non-US user | Legal review is required before the first user outside the United States (religious belief is special-category data in several jurisdictions), plus a decision on data location and vendor data-processing terms | Gate recorded (Q-009) |
| Payments | No payment feature until the payments rules (`/docs/payments.md`) are met and the store rules are checked | Not started |
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
| No two-factor sign-in for the owner's accounts | Accepted | The first real user's data, the first payment, or a third person joins |
| The template repository (`fullstack-boilerplate`) is public | Accepted; it holds no secrets or proprietary content | It carries anything proprietary, or at the first real user's data |
| The owner and the business partner share one login | Accepted by choice | A third person joins, or the first real user's data |
| Public sign-up is open on the live Production site (development Clerk instance) | Accepted for now; nobody knows the address | The launch gate, or if the address is shared |
| Production project stays live (taking it offline is deferred) | Accepted | Rollout |

## 5. Pre-launch legal and risk checklist

Tick each item and record the proof before real users or real data.

1. Terms of Service and Privacy Policy pages exist, are linked from sign-up, and acceptance (version and timestamp) is recorded.
2. The 18+ confirmation exists at sign-up and is recorded.
3. Deletion and export of a user's data work end to end and are documented.
4. User-submitted content: report, review and removal process; copyright takedown contact; content rules published.
5. WCAG 2.2 AA scan and a screen-reader pass completed; results recorded.
6. A dependency license scan found nothing that forbids commercial use; the result is recorded.
7. Vendor terms checked for commercial use; paid plans chosen where required (owner approval).
8. Incident response page exists (who to contact, how to shut things off, credential list) (F-SEC-007).
9. Backups and a restore drill completed (F-DATA-002).
10. Production Clerk instance and domain set up (F-AUTH-011).
11. For the apps: store privacy answers, account deletion in-app, user-generated-content controls (F-REL-005, F-REQ-006).
12. Owner actions in section 3 completed or consciously deferred, with the decision recorded.

## 6. Enforcement and proof status

| Rule | Mechanism | Proof |
| --- | --- | --- |
| No secrets or credential-shaped values in committed files | `security.test.ts` | Proven |
| Dependency vulnerabilities are known and handled | Dependabot; `pnpm audit` (not in CI) | Not proven (open gap, F-SEC-004) |
| Dependency licenses allow commercial use | **Planned:** a license scan (for example `license-checker`) run before launch, with the result recorded here | Not yet |
| The collection gate, age confirmation, terms acceptance, deletion and export | Not built | Not proven; tracked as the launch gate |
| Items in sections 3 and 5 that are owner actions | Checklist only | n/a |
