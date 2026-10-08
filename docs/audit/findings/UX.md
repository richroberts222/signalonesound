# UX: User experience, accessibility and design system

Examined 2026-10-08 (Pass 2) at `main` `826b53e`. Depth: Light (mostly disposable mocks, per `methodology.md` section 5; findings are pattern-level until Q-005 is answered). Home for: UI architecture and the design system; the shadcn/ui requirement; accessibility; responsive behaviour; brand and copy; states and feedback; internationalisation (`methodology.md` section 4).

## Method note

Read: `docs/ui.md` sections 3, 9, 24 and the outline of the rest; `app/layout.tsx`, `components/shell/app-header.tsx`, `components/ui/imports.test.ts`, `app/globals.css` (size and token search), both ESLint configurations. Run (RUN, 2026-10-08): counts of raw HTML controls outside `components/ui`, raw palette colours, accessibility attributes, reduced-motion handling, mobile literal styles, accessibility tooling in dependencies and end-to-end tests, internationalisation packages, skip-link search.

Not examined, and why: visual design quality and colour contrast (no rendered review in this session; contrast of the gold-on-dark brand colours is UNVERIFIED and needs a tool or a person); real assistive-technology behaviour (needs a person with a screen reader, F-UX-002); the mobile app beyond a placeholder screen.

## Findings

### F-UX-001 The "use shadcn/ui for all controls" rule is documented but violated in 19 places, and nothing prevents new violations

| Field | Value |
| --- | --- |
| Status | Accepted |
| Severity | Low |
| Confidence | High on the counts (RUN); High that no guard exists (READ) |
| Timing | Now (the guard); with issue #91 (the conversion) |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S (guard); M (conversion, already scoped as #91) |

**Evidence**: `docs/ui.md` section 3 says components are added through the shadcn tooling and not replaced by another library; the owner has restated the requirement (all controls, components and elements on the site). `components/ui` holds six components (avatar, badge, button, card, input, tabs). Outside it the application contains 13 raw `<label>`, 4 raw `<input>` (including the radio and checkbox kind, which have no shadcn counterpart installed), 1 raw `<button>` and 1 raw `<table>` (RUN, search; the issue #91 inventory, a local branch, found the same set). The only UI guard test checks that generated components import the right helper (`ui/imports.test.ts`, READ). The ESLint configurations contain no rule about raw elements (READ).

**Observation**: A prose rule that the owner cares about, checkable by a machine, with no machine check. This is the audit's central pattern (DEVOS, SEC). The conversion itself is application code and is paused by the owner's directive; the guard is a test and is not.

**Consequence**: Every new session or contributor can add a raw control and nothing fails. The set of violations only grows, so the eventual cleanup (#91) gets bigger, and the design system stops being the single place to change look and behaviour.

**Recommendation**: (1) Add a ratchet test now: a static test, of the kind already used for security boundaries, that lists the files allowed to contain raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<label>` and `<table>` (the current violators plus `components/ui` itself) and fails on any other file. New violations fail immediately; the allowlist only shrinks. It changes no application code. Pass 4 preferred an ESLint `no-restricted-syntax` rule with a per-file override list; PR #97 implements the same ratchet as a static test (`components/ui/raw-controls.test.ts`), which gives the same effect and is acceptable. (2) When application work resumes, finish #91 and delete each file from the allowlist as it is converted; the allowlist reaching "ui only" is the done signal. (3) Install the missing shadcn components (label, checkbox, radio group, switch, table) in the same pull request as the conversion, not before.

**Alternatives and tradeoffs**: An ESLint `no-restricted-syntax` rule for raw elements (equivalent and arguably more idiomatic; the static test is the repository's established pattern and also covers files ESLint ignores). Convert everything now (blocked by the owner's directive and by Q-005: some of these screens may be discarded).

**Affects**: one new test file; later, 10 component files and `components/ui`.

**Depends on / sequencing**: Issue #91 (the conversion); Q-005.

**Verification**: Add a raw `<button>` to a non-allowlisted component; the test fails. Remove it; it passes. When the allowlist is empty apart from `components/ui`, the rule is fully enforced.

**Decisions needed**: none.

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Downgraded (Medium to Low)
  Strongest case against: Severity measures consequence, and 19 raw elements in mock screens (some of which may be discarded, Q-005) change nothing for users. The owner's priority on shadcn is a priority, not a severity. A per-file allowlist ratchet has its own upkeep as files move.
  Evidence re-checked: RUN grep for raw elements outside `components/ui`: `<label` 13, `<input` 4, `<button` 1, `<table` 1, `<select` 0, `<textarea` 0 (matches the finding). READ `apps/web/eslint.config.mjs`: only `next/core-web-vitals` and `typescript` presets; no restricted-syntax rule.
  Result: Counts are exact and the guard is cheap and owner-directed, so keep it at Now. Prefer an ESLint `no-restricted-syntax` rule with a per-file override list (the same ratchet, one existing mechanism, no custom test). Low severity; priority is high by owner instruction.

Challenge (Pass 4b, 2026-10-08): verdict Upheld (reworded body)
  Re-checked: RUN grep outside `components/ui`: 13 `<label`, 4 `<input`, 1 `<button`, 1 `<table` = 19, as stated. READ PR #97: the guard is a static test (`raw-controls.test.ts`), not the ESLint rule Pass 4 preferred; same ratchet, same effect.
  Result: Low, Now holds. PR #97 is red for a reason outside its own logic (F-BOIL-001), so the roadmap's 'all checks tested and ready' is wrong for #97; corrected. Grade: RUN.

**History**: 2026-10-08 created. Absorbs P-CQ-F2 and the owner directive of 2026-10-08.


**History (Pass 4, 2026-10-08)**: Medium to Low; owner priority recorded separately from severity. ESLint rule preferred over a bespoke test.

**History (Pass 4b, 2026-10-08)**: Recommendation notes the ESLint preference of Pass 4 and that PR #97 implements the ratchet as a static test.

---

### F-UX-002 Accessibility is a documented principle, but nothing enforces or measures it

| Field | Value |
| --- | --- |
| Status | Accepted |
| Severity | Medium |
| Confidence | High that nothing is automated (RUN); Medium on the extent of real defects (not tested with tools or people) |
| Timing | Automation: Before first real users. Human check: Before public launch |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational (automation); Before production (human check) |
| Effort | S (automation); S per round (human check) |

**Evidence**: `docs/ui.md` section 9 lists the intent (labels, keyboard behaviour, focus states, semantic structure, accessible names). No accessibility testing tool is a dependency of any workspace and the end-to-end suite contains only the proof-slice scenario (RUN). Neither ESLint configuration names an accessibility rule set beyond whatever the framework presets include (READ; the exact preset contents were not verified, UNVERIFIED). There is no skip-to-content link and no handling of the reduced-motion preference in the application (RUN, search). The code does show good habits: 113 aria or alt attributes in components, decorative icons marked hidden, the primary navigation labelled and a separate small-screen menu (READ). The mobile app has one accessibility-related property in total (RUN), though it is only a placeholder screen. The brand palette (gold on near-black) has not been contrast-checked (UNVERIFIED).

**Observation**: The people who need this most are not forgiving of it, and a church audience skews older and more often uses larger text and assistive tools than a typical consumer app. The good habits mean the baseline is probably decent; the gap is that a regression would go unseen. Industry practice for a new product is the WCAG 2.2 level AA target, an automated scan on every page that matters, and one human pass with a real screen reader before launch. Exposure to legal claims in the United States and to accessibility law in other markets (the owner's worldwide plan, Q-009) is also real but is a legal question for counsel, not an engineering one.

**Consequence**: Defects accumulate unnoticed through the mock stage and are found after launch by users who then leave, or by a complaint.

**Recommendation**: (1) Record the target in `docs/ui.md`: WCAG 2.2 AA for web, the platform guidelines for mobile. (2) Add the stricter accessibility lint rules to the web configuration (one line in the existing config). (3) Add an automated accessibility scan (axe through Playwright) over a short list of key pages: home, discover, one event, the sign-in page, the church dashboard, the member page, the admin overview. Start as a warning, not a merge gate, then promote once quiet. (4) Add a skip link and respect the reduced-motion preference when next touching the shell. (5) Before public launch, one pass with a real screen reader on web and on each mobile platform, and a contrast check of the brand colours; record the result and date. (6) Add the mobile accessibility properties as the first real mobile screens are built.

**Alternatives and tradeoffs**: Manual testing only (does not stop regressions). A paid accessibility overlay (declined: widely regarded as ineffective and sometimes harmful). Gate every pull request on a full scan immediately (noisy; a ratchet is better).

**Affects**: `apps/web/eslint.config.mjs`, `apps/web/e2e`, `docs/ui.md`, the shell; later, mobile screens.

**Depends on / sequencing**: F-TEST (end-to-end suite); F-UX-001 (converted controls inherit shadcn's accessibility behaviour, which is the main benefit of the rule).

**Verification**: A deliberately unlabelled input fails the lint or the scan; the pre-launch pass is recorded with date, tools and results.

**Decisions needed**: none now.

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Upheld (narrowed)
  Strongest case against: WCAG work for a mock stage is early, the `next/core-web-vitals` preset already carries some accessibility rules (INFER), Playwright is not in CI so an axe scan has no home yet, and an overlay-free approach still needs a human screen-reader pass that this audit cannot perform.
  Evidence re-checked: READ `apps/web/eslint.config.mjs`: presets only. RUN dependency search: no axe or accessibility testing package. Preset rule contents not verified (UNVERIFIED). Contrast of brand colours not measured.
  Result: Keep, sequenced: record the WCAG 2.2 AA target now (one line in `docs/ui.md`), add the stricter lint rules in the same ESLint edit as F-UX-001, and defer the axe scan to the point Playwright runs in CI (F-TEST-003). The human pass stays 'before public launch'. Medium holds for an audience that skews to larger text and assistive tools.

**History**: 2026-10-08 created. Absorbs P-78-M11, P-78-T05 and P-CH-14.

---

### F-UX-003 Colour, brand and mobile styling are not yet fully routed through the design system

| Field | Value |
| --- | --- |
| Status | Accepted |
| Severity | Low |
| Confidence | High on the counts (RUN) |
| Timing | Trigger: the first real success or warning state, and the first real mobile screen |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Maturity |
| Effort | S |

**Evidence**: `docs/ui.md` section 24 requires semantic tokens in place of raw palette colours and says to add `success` and `warning` tokens when first genuinely needed (READ). Nine raw palette colour uses remain outside `components/ui` (for example `text-red-600`, `text-green-700`, `border-amber-500/40`), no hexadecimal or `rgb` literals (RUN). The theme has no `success` or `warning` token (RUN, search). The mobile app uses literal style values with no theme module (RUN; only a placeholder screen today). The product name appears as "Signal One" in the mobile screen title and the dashboard fallback greeting (F-REQ-003). The theme is dark-only by design (`dark` class fixed on the root element, READ).

**Observation**: The mocks use warning and success colours before the tokens exist, which is the situation the rule anticipates. This is the right level of discipline for the stage; the debt is small and tied to a trigger.

**Consequence**: Without the tokens, the first real status feedback (saved, failed, pending review) is coloured per file, and changing the brand later means editing many files.

**Recommendation**: Do nothing now. At the first real success or warning state, add the two tokens with dark-mode values and their foreground pairings and replace the nine sites (the rule in section 24 already says so). At the first real mobile screen, create one small mobile theme module that mirrors the web tokens by name, not by sharing code (`docs/ui.md` section 28). The user-facing copy fix is tracked in F-REQ-003.

**Alternatives and tradeoffs**: Fix now (small, but touches paused application code). A shared cross-platform token package (premature: one mobile screen exists).

**Affects**: `app/globals.css`, nine component sites, a future mobile theme file.

**Depends on / sequencing**: F-UX-001; F-REQ-003.

**Verification**: No raw palette colour outside `components/ui` (a ratchet test of the F-UX-001 kind); the mobile theme is used by every mobile screen.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs P-CQ-F1, P-CQ-F3 (with F-REQ-003) and P-CQ-F4.

---

### F-UX-004 All text is hard-coded in English and date, number and currency formatting has no convention, though the owner plans a worldwide product

| Field | Value |
| --- | --- |
| Status | Accepted |
| Severity | Low |
| Confidence | Medium |
| Timing | Trigger: the decision to support a second language or country |
| Disposition | DEFER |
| Scope | BOTH |
| Trigger class | Maturity |
| Effort | M (when triggered) |

**Evidence**: No internationalisation package exists in either app (RUN, dependency search). The root element declares `lang="en"` (READ). No use of the platform's locale-aware formatting was found in application code (RUN, search); the mocks format dates by hand. The owner's market answer is the United States first with worldwide planned (Q-009). F-ARCH-001 already records that locale and money conventions are undecided.

**Observation**: Full translation support now would be overengineering: the first market is one country and one language. What is cheap now is avoiding the habits that make it expensive later: assembling sentences by joining fragments, formatting dates and amounts by hand, and storing local times without a zone. The first two are UI habits and the third is covered in F-ARCH-001.

**Consequence**: Retrofitting translation into hundreds of inline strings and hand-built date formats is a rewrite of every screen, not a configuration change.

**Recommendation**: Defer the framework. Now, add three lines to `docs/ui.md`: use the platform's locale-aware formatters for dates, numbers and currency; do not build user-visible sentences from fragments; keep user-visible strings in one place per screen when a slice is built for real. Adopt a translation framework when a second language is actually planned, with the right-to-left and plural-rule questions asked at that point.

**Alternatives and tradeoffs**: Adopt a framework now (cost and indirection with one language). Do nothing (the retrofit cost stays high).

**Affects**: `docs/ui.md`; later, all screens.

**Depends on / sequencing**: F-ARCH-001; Q-009.

**Verification**: The documented rule exists; the first real slice's formatting uses the locale-aware formatters.

**Decisions needed**: none now.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created.

---

### F-UX-005 The UI architecture is clearly documented, built on shadcn with semantic tokens, themed consistently and responsive, and should be kept

| Field | Value |
| --- | --- |
| Status | Accepted |
| Severity | Info |
| Confidence | High |
| Timing | n/a |
| Disposition | KEEP |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | n/a |

**Evidence**: `docs/ui.md` is a 637-line standard covering component hierarchy, tokens, brand assets, reuse order and the web and mobile split (READ). The theme is centralised in one stylesheet with variables, third-party sign-in UI is themed from the same variables, and the brand name and wordmark are in one component (READ). The shell adapts at the small breakpoint with a separate menu button of a usable size (READ). The mocks label themselves as mocks and avoid inventing undecided behaviour (F-REQ-007).

**Observation**: The design system is a real asset; the findings above are about enforcement, not direction.

**Recommendation**: Keep.

**Affects**: n/a.

**Verification**: n/a.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created.

---

## Reconciliation of prior inputs (UX)

| Input | Outcome |
| --- | --- |
| P-78-M11 automated accessibility check | Adopted, as a warning first → F-UX-002 |
| P-78-T05 assistive-technology audit before launch | Adopted → F-UX-002 |
| P-CH-14 accessibility | Adopted → F-UX-002 |
| P-CQ-F1 raw palette colours, no success or warning token | Adopted, trigger-gated → F-UX-003 |
| P-CQ-F2 proof panel hand-builds controls | Adopted, widened to every raw control and given a ratchet test → F-UX-001 |
| P-CQ-F3 brand text duplicated, shortened product name | Wordmark component already exists (kept); remaining copy → F-REQ-003, F-UX-003 |
| P-CQ-F4 mobile literal styles, no theme module | Adopted, trigger-gated → F-UX-003 |

Challenges to prior work: none reversed. The earlier audit's raw-control finding was narrower than the real count; the guard recommended here makes the fix self-measuring.
