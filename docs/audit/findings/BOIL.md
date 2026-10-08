# BOIL: Reusable Boilerplate

Examined 2026-10-08 (Pass 2) at `main` `826b53e`. The recorded baseline is `31ec6ba`; the only boilerplate-path change since is PR #84 (`docs/audit` added to `REFERENCE_ONLY_PATHS`, Q-002). Depth: Deep. Home for: extraction, init, export and leak-check tooling; the template boundary (what belongs in every app); generated-app correctness; exported-repository drift; developer experience for a new application; the customization map (`methodology.md` section 4).

## Method note

Evidence was gathered before the prior-input rows for BOIL were re-read. Read in full: `scripts/boilerplate/{manifest,init-app,check-boilerplate,export-template,prove-init}.mjs` and the self-test header; `docs/boilerplate.md`, `docs/boilerplate-gap-report.md`, `docs/customization-map.md` (first sections). Counted: about 1,100 lines of tooling, tests and template documents; 21 doc markers across 14 files.

Run (RUN, 2026-10-08, scratch folders only, all deleted afterwards): the export (`export:boilerplate`) into a scratch folder and a leak check of the result; a clone of the published template repository for comparison; `prove:init` without `--full` from a verified clean clone (init plus leak check passed); `prove:init --full` (**failed to start**, see F-BOIL-003). The owner asked me to stop retrying the full proof, so the generated application's own install, lint, typecheck, test and build were **not run** here.

Not examined, and why: the generated application's build, tests and lint (above); `docs/new-app-setup.md` and `docs/stack.md` beyond their headings; the standalone template's own repository settings. No file in the repository was changed by these runs, and no private file was left behind (one temporary copy that contained the private local environment file was created by the tooling during the failed run and was deleted).

## Findings

### F-BOIL-001 The template machinery now blocks product work: its leak check is part of the required `Validate` check and fails on ordinary content

| Field | Value |
| --- | --- |
| Status | Accepted |
| Severity | Low |
| Confidence | High for the mechanism and the incident; the recurring cost is INFER |
| Timing | Now (the fix is small) |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S to M |

**Evidence**: `pnpm validate` runs `test:boilerplate` between the unit tests and the build (root `package.json`), CI runs `pnpm validate`, and the `Protect main` ruleset requires `Validate` (CONSOLE). The check scans every text file for the words "Signal One", "proof-item" and "migration_proof" and fails the run if a generated application would still contain them (`check-boilerplate.mjs:14-16`). Incident (CONSOLE): PR #82 was red from its first push because the audit documents mention those words; the fix was a separate issue and PR (#83, #84) editing `manifest.mjs`. The same words appear in any new product document, so each new reference-only file, or document that mentions the proof slice, risks the same failure. The footprint: five scripts, a self-test, four template documents and 21 markers inside 14 product documents.

**Observation**: The design is a denylist of words applied to the whole repository. That works while the reference app and the template are the same repository and nobody adds documents. It does not scale with product work: every new document that names the product or the proof slice must be registered in the manifest or wrapped in markers, or the required check fails for reasons unrelated to the change. With the ruleset, a red template test now blocks every merge, product work included. The template is a side project to the product, but it sits in the product's critical path.

**Consequence**: Recurring red CI on unrelated work, time spent on manifest maintenance, and documents cluttered with markers. The owner's priority is shipping the product.

**Recommendation**: Q-012 is answered (another application will be built), so the freeze option is withdrawn. Keep the gate and invert the boundary so ordinary content cannot trip it: put every reference-only document under the directories that init deletes and the scan ignores (`docs/audit`, `docs/features` and `docs/product` are already in `REFERENCE_ONLY_PATHS`), and scan for the identity and proof paths rather than for words in prose. Guard tests that list product paths (for example PR #97, which lists `components/proof/...`) are the next false alarm and need the same treatment.

**Alternatives and tradeoffs**: Keep as is (the template stays continuously proven; the product pays for it on every change). Delete the template machinery entirely (cleanest, loses a working asset and the published copy; reversible from history). Move it to its own repository (clean, the most work).

**Affects**: root `package.json`, `.github/workflows/ci.yml` (no change needed if only the script list changes), `scripts/boilerplate/`, `docs/boilerplate.md`, `docs/testing.md`.

**Depends on / sequencing**: Q-012. The `Validate` change is a `package.json` edit, not a workflow edit.

**Verification**: A product PR that adds a reference-only document, or mentions the proof slice, passes `Validate` without touching the manifest.

**Decisions needed**: Q-012 (answered 2026-10-08: keep the template).

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Downgraded (Medium to Low, reworded)
  Strongest case against: The incident has been fixed structurally: PR #84 added `docs/audit` to `REFERENCE_ONLY_PATHS`, and Q-012 was answered 'another app will be built', which rejects the freeze branch of the recommendation. CI has been green on the audit branch since.
  Evidence re-checked: READ `scripts/boilerplate/manifest.mjs:40`: `REFERENCE_ONLY_PATHS` includes `docs/audit`, `docs/features`, `docs/product`. RUN `gh run list --workflow=CI`: green. READ Q-012 Status: option 2 chosen. `gh pr list`: PR #93 (CRLF/Windows tooling) and #90 (reports) are open.
  Result: The word denylist across all text still means any new document outside the reference-only directories that says 'Signal One' fails the required check. That is a real but small recurring cost, now with a known one-line remedy and a decided direction (invert the boundary). Reword to that: the 'freeze' branch is withdrawn. Low.

Challenge (Pass 4b, 2026-10-08): verdict Upheld (new evidence; reworded body)
  Re-checked: RUN `gh pr checks 97` and the failed log of CI run 37841207249: `Validate` fails in `test:boilerplate` (`scripts/boilerplate/boilerplate.test.mjs:70`) because the classifier gains a `proof-reference` category; the PR adds only a guard test that lists `components/proof/proof-items-panel.tsx`. Every other step (lint, typecheck, unit tests) passed.
  Result: the Pass 4 premise 'incident fixed structurally' is only half true; the same mechanism has now turned red the owner-priority guard (F-UX-001) a day after Pass 4. Still Low (one-line manifest fix, no user impact) but the roadmap must not say all four open PRs are green. Freeze text removed from the body (contradiction 5). Grade: RUN.

**History**: 2026-10-08 created. Absorbs P-78-O04; incident from Pass 1 fact 20 and Q-002.

**History (2026-10-08)**: Q-012 answered: a second application will be built. The freeze recommendation is replaced by: keep the gate, reduce its false alarms structurally (one directory convention), and invest nothing else in the template until Signal One's foundation fixes land.

**History (Pass 4, 2026-10-08)**: Medium to Low; incident fixed by #84, Q-012 answered 'keep the template', freeze option withdrawn.

**History (Pass 4b, 2026-10-08)**: Recommendation, Decisions and Timing rewritten: the freeze option is withdrawn (contradiction 5). New live evidence recorded in the Challenge log (PR #97 red on the leak check).

---

### F-BOIL-002 The copy routines include the private local environment file and untracked files, and the proof script leaves its copy behind on failure

| Field | Value |
| --- | --- |
| Status | Accepted |
| Severity | Low |
| Confidence | High (RUN for each point) |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: (1) `walk()` in `manifest.mjs` skips only build folders, so it returns `apps/web/.env.local` (RUN: `walk()` includes it, 305 files). (2) The self-test in `pnpm validate` and `prove-init.mjs` copy every walked file to the operating system's temp folder, so a copy of the private file (the development database address and the Clerk development keys) exists there during each local validation (READ). The self-test deletes it afterwards; `prove-init.mjs` calls `process.exit` on a failed step without deleting its folder (RUN: during the failed proof a temporary copy containing the private file remained, was found, and was deleted by the auditor). (3) `export-template.mjs` skips local environment files, but copies the **working folder**, not committed files: the export picked up the untracked `.claude/settings.json` (RUN).

**Observation**: The exported template repository is public (F-BOIL-004), and the export copies whatever is in the working folder that is not a local environment file. Today the only extra file is a harmless settings file, but an untracked secret-bearing file other than `.env*` would be published. The leak check catches secret-shaped content in text files, which is a good second line, not a first.

**Consequence**: Development credentials are written to a shared temp folder on every validation and can be left behind; a stray untracked file can reach a public repository.

**Recommendation**: Copy only committed files: use `git ls-files` as the source list in the export, the self-test and the proof script, instead of walking the folder. Wrap the proof script's work in try/finally so the temporary folder is always removed. Keep the local-environment skip as a second guard.

**Alternatives and tradeoffs**: Add more names to the skip list (fragile). Run the tools only from a fresh clone (safe, but a human step).

**Affects**: `manifest.mjs`, `export-template.mjs`, `prove-init.mjs`, `boilerplate.test.mjs`.

**Depends on / sequencing**: None; do with F-BOIL-001 if the template stays in the pipeline.

**Verification**: With a dummy untracked file and a dummy `.env.local` present, neither appears in an export, a self-test copy, or a proof copy; a deliberately failed proof leaves no temp folder.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created.

---

### F-BOIL-003 `prove:init --full` cannot run on Windows, and nothing runs it in CI, so "the generated application builds" is not continuously proven

| Field | Value |
| --- | --- |
| Status | Accepted |
| Severity | Low |
| Confidence | High for the Windows failure; Medium that CI also lacks it |
| Timing | Now (if the template stays in use), otherwise at unfreeze |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: `prove-init.mjs` starts `pnpm` with `spawnSync` and no shell. On Windows `pnpm` is a script shim, so the call fails with `ENOENT` and the proof stops at its first step ("install from the rewritten lockfile"). RUN: `spawnSync('pnpm')` returns status `null`, error `ENOENT`; with `shell: true` it returns `12.6.0`. The proof without `--full` (init plus leak check) works. `docs/boilerplate.md` requires `prove:init --full` "when the template changes materially" and asks that the result be recorded in the PR; no workflow runs it (READ: `ci.yml`).

**Observation**: The only end-to-end proof that a generated application installs, lints, type-checks, tests and builds is a manual command that works on Linux and macOS only. The self-test in `validate` proves the file rewriting, not the result. The claim "the template yields a working app" therefore rests on a run on 2026-10-01 that is not repeated.

**Consequence**: Drift between the reference app and the template can reach a published template without anyone noticing until someone tries to use it.

**Recommendation**: Use `shell: true` for the child processes (or `pnpm.cmd` on Windows). If the template stays in use, run `prove:init --full` on a schedule or on demand in CI (weekly, not per PR). If it is frozen (F-BOIL-001), leave the command documented as "run before any export".

**Alternatives and tradeoffs**: Per-PR run (three minutes or more on every PR; rejected, see F-BOIL-001). No change under a freeze.

**Affects**: `prove-init.mjs`, optionally a new scheduled workflow (human edit).

**Depends on / sequencing**: F-BOIL-001 and Q-012.

**Verification**: `pnpm prove:init --full` completes on a Windows machine and on Linux.

**Decisions needed**: none beyond Q-012.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. The full proof was not completed here; generated-app correctness is UNVERIFIED on this machine.

---

### F-BOIL-004 The published template repository is public, stale, and not marked as a template

| Field | Value |
| --- | --- |
| Status | Accepted |
| Severity | Low |
| Confidence | High |
| Timing | Now (a visibility decision) |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Trigger-gated |
| Effort | S |

**Evidence**: `richroberts222/fullstack-boilerplate` is **public** (the instructions in `docs/boilerplate.md` say to create it `--private`), is not marked as a template repository, and has one commit dated 2026-10-01 (CONSOLE). A fresh export differs from it in 55 places: 25 files exist on only one side, 30 differ, with 21 new or changed files under `apps/web` and new documents such as the code-quality rules (RUN, name-level comparison). Phase 0 fact 5 and fact 18 recorded the same drift.

**Observation**: A public copy of the foundation exposes the project's architecture and security rules (not secrets) and invites readers to reuse an out-of-date version. It is also the only artefact that a second application would be built from.

**Consequence**: Information about the product's structure is public without a decision to publish it; anyone building a second application from the copy inherits the staleness.

**Recommendation**: Decide visibility with Q-012. If the template is frozen or unused: make the repository private (or archive it). If it will be reused: re-export, mark it as a template, and keep it private until a decision to publish.

**Alternatives and tradeoffs**: Leave public (no secrets present, per the leak check at export time; the choice should still be deliberate).

**Affects**: GitHub repository settings (owner action).

**Depends on / sequencing**: Q-012.

**Verification**: The repository's visibility matches the decision.

**Decisions needed**: Q-012.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs P-GAP-09 (export not refreshed since 2026-10-01).

**History (2026-10-08)**: Q-012 answered. The template will be reused, so the repository is kept, refreshed after the foundation fixes, and made private now (owner action in the repository's settings).

**History (2026-10-08, later)**: Owner decision (RECOLLECTION: "not too worried about making the boiler plate private yet because nobody's after my code"): the published template repository stays public for now. Accepted residual risk; revisit before it carries anything proprietary or at the first real user's data.
---

### F-BOIL-005 Two historical reports and a few stale references add reading weight to the template

| Field | Value |
| --- | --- |
| Status | Accepted |
| Severity | Low |
| Confidence | High |
| Timing | Now |
| Disposition | REMOVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: `docs/boilerplate-gap-report.md` (58 lines) lists as "Missing" the test runner, CI, API wrapper, authorization helpers, env validation, the mobile scaffold and the init script, all of which now exist (READ). `docs/boilerplate-references-report.md` (58 lines) is a similar one-time inventory. `docs/customization-map.md` names `components/auth/auth-header.tsx` as the place the visible name is set; that file does not exist (RUN, same drift as F-AUTH-006). `docs/boilerplate.md` itself calls the gap report "historical".

**Observation**: The reports served the extraction and are now misleading, and they are template-only documents that sit in the main documentation set.

**Consequence**: A reader of the gap report believes the platform lacks tests and CI.

**Recommendation**: Delete both reports (the history is in version control and the extraction PR) and correct the customization map's file reference. Update the Known gaps paragraph in `boilerplate.md`. Do it with F-BOIL-001 so the manifest and the documents change once.

**Alternatives and tradeoffs**: Keep with a banner (cheaper, still noise).

**Affects**: `docs/boilerplate-gap-report.md`, `docs/boilerplate-references-report.md`, `docs/boilerplate.md`, `docs/customization-map.md`, `scripts/boilerplate/manifest.mjs`.

**Depends on / sequencing**: Q-012.

**Verification**: The files are gone, `TEMPLATE_ONLY_PATHS` is updated, `pnpm test:boilerplate` passes.

**Decisions needed**: none.

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Upheld
  Strongest case against: Deleting history-bearing documents might lose context.
  Evidence re-checked: READ: both reports still exist in `docs/`; `docs/customization-map.md:15` names `components/auth/auth-header.tsx`, and `apps/web/components/auth` does not exist (RUN `ls`). `gh pr view 90`: OPEN, branch `docs/issue-89-remove-historical-boilerplate-reports`.
  Result: Sound and already in flight: the owner approved removal under Q-012 and PR #90 implements it. Version control keeps the history. No change beyond a status note: when #90 merges, close this finding as done.

**History**: 2026-10-08 created.

**History (2026-10-08)**: Owner approved removal. Applied in issue #89 and PR #90 (open at the time of writing).

**History (Pass 4, 2026-10-08)**: upheld; implementation is PR #90 (issue #89).

---

### F-BOIL-006 The init and export design is sound: one manifest, dry run, identity validation, negative controls

KEEP. Evidence: a single manifest (`manifest.mjs`) is read by init, export and the leak check, so they cannot disagree about proof-only paths; `init` supports `--dry-run`, refuses to run twice, rejects `com.example.*` and product identities (self-test 4), applies the package scope flag, which resolves P-GAP-08, and finishes with the leak check; the self-test includes a negative control (detector flags the unmodified template, test 1) and a post-init credential-shape check (test 5). RUN on this machine: tests 1, 2, 4, 5 and 6 pass; test 3 fails only on Windows (CRLF line endings in the exported template text, issue #87); the proof without `--full` passes from a clean clone; the export excludes local environment files and its leak check shows only the expected template identity. Tripwire: a hand-edited generated application drifting from the manifest, or a second list of proof paths appearing outside `manifest.mjs`.

---

## Reconciliation of prior inputs (BOIL)

| Input | Outcome |
| --- | --- |
| P-78-O04 verify how many apps will be created; freeze if fewer than two | Adopted → F-BOIL-001, Q-012 |
| P-GAP-08 package scope embeds the application name | Resolved → F-BOIL-006 (`--scope` flag, tested) |
| P-GAP-09 maintenance rules; export not refreshed since 2026-10-01 | Adopted → F-BOIL-004; maintenance burden → F-BOIL-001 |
| Phase 0 fact 6 (`manifest.mjs` excludes neither the charter nor the audit) | Resolved by PR #84 for `docs/audit`; the charter file is rewritten by identity substitution and does not trip the check |
| Phase 0 fact 18 (export carries product mocks; 52 paths behind) | Re-measured → F-BOIL-004 (55 differences) |
| Pass 1 fact 19 (Windows-only gate failures) | Extended → F-BOIL-003 (`prove:init --full` also fails on Windows); issue #87 still open for test 3 |

Challenges to prior work: **the documented maintenance rule** ("run `prove:init --full` when the template changes materially") is a process control that cannot run on the owner's operating system, so it has likely not been followed since extraction (INFER). No prior finding was rejected.

## Lens matrix

| Lens | Result |
| --- | --- |
| L1 Drift | F-BOIL-005 (reports, customization map), F-BOIL-004 (published copy). |
| L2 Enforcement | F-BOIL-001 (word-based denylist in the required check), F-BOIL-003 (end-to-end proof is manual), F-BOIL-006 (negative controls that bite). |
| L3 Adversary | F-BOIL-002 (untracked files exported to a public repository; private file in temp). |
| L4 Failure and recovery | F-BOIL-002 (cleanup on failure), F-BOIL-003 (failure at first step on Windows). |
| L5 Scale and cost | Examined, nothing material beyond the maintenance cost in F-BOIL-001. |
| L6 Longevity | F-BOIL-004 (stale published copy), F-BOIL-001 (who maintains the template later). |
| L7 Compatibility | Examined, nothing material: the template carries web and mobile together; Windows is the compatibility gap (F-BOIL-003, issue #87). |
| L8 Simplicity | F-BOIL-001 (the template is a side asset in the product's critical path), F-BOIL-005 (remove historical reports). |
| L9 Boilerplate fit | This subject. The REL, AUTH and DATA carry-forward items are recorded below. |

## Carry-forward to other subjects

* **TEST**: `test:boilerplate` inside `validate`; its Windows failure (issue #87); the proof run as a scheduled job if the template stays.
* **DEVOS**: the marker convention in product documents (F-BOIL-001) and the documentation-volume problem (F-DEVOS-003).
* **REL**: the health route, Node pin and environment table belong in the template (F-REL-001, -003, -006); Stage stays out. The workflow-file edit window is shared (F-SEC-002).
* **AUTH/DATA**: the admin allow-list rule and the authorization matrix test (F-AUTH-001), and the fingerprint step in init (F-DATA-004), are template candidates once the product versions exist.
* **SEC**: public repository visibility of the exported template (F-BOIL-004); untracked-file export (F-BOIL-002).
* **Platform facts still needed**: whether the owner wants the template repository private, archived or kept (Q-012).
