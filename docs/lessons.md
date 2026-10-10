# Lessons Learned

The rule: **every problem that is found becomes a guard or a written rule, in the same pull request that fixes it.** A guard (a test or check that fails) is preferred over prose. A problem that occurs a second time is a process failure: the first guard was missing or too weak, so strengthen it and record the repeat here.

## How to use this log

1. **Fix** the problem.
2. **Close the gap.** Add a test or check that would have caught it (and prove it by breaking the thing on purpose), or add the rule to the document that owns the topic. Name the guard or rule in the table below.
3. **Record** it here: what happened, the root cause, what now prevents it. One line each.
4. **Repeat offenders.** If the same cause appears again, mark the earlier row "repeated", find why the guard missed it, and widen the guard.
5. The pull request template asks: "Did this reveal a gap? Guard or rule added, or why not."

Nothing secret goes in this log (`/CLAUDE.md` section 18).

## How problems are found and closed (the feedback loop)

A problem can arrive from several places. Whatever the source, it ends the same way: fixed, with a guard or a rule, and logged here.

| Source | How it is noticed | How it is closed |
| --- | --- | --- |
| A pull request check fails (lint, tests, build, template proof) | CI turns red | Fix the cause; if the check missed the underlying risk, widen the check |
| The weekly health run or the monthly tool risk review | Their summary and issue | Open an issue; fix or record the exception |
| An independent review or the owner | A finding or a question | Verify against the code, then fix |
| A user or tester reports a bug | The bug report form | Fix with a regression test |
| A production error (once error tracking exists; open item) | An alert or a weekly errors-by-workflow review | The error becomes a bug issue using the same form, and the fix needs a regression test like any other fix |

**Mechanical enforcement.** A pull request that is a fix (its title or branch starts with fix, bug or hotfix) fails the CI check `Fix has a guard` unless it adds or changes a test, or adds a lesson to this file explaining why no guard is possible. Dependency-only version bumps are exempt. This makes "fix it and make sure it cannot happen again" part of the pipeline instead of a habit. The check is informational until it has been green for a week, and can then be made a required check in the repository ruleset (an owner setting).

**Detecting breaks in logs.** Today the detectors are CI, the weekly health run and reviews. When error tracking and structured logs exist (`/docs/ideas/observability.md`), a recurring error pattern is opened automatically as a bug issue, and the fix pull request must carry the regression test.

## Log

| Date | What happened | Root cause | Now prevented by |
| --- | --- | --- | --- |
| 2026-10-09 | The primary architecture document had backslash-escaped bullets and code fences and bold-wrapped headings in 21 sections | A bad copy from another tool; headings-only review missed it | `lib/text-hygiene.test.ts` (escaped Markdown artifacts); documents are read in full, not by headings |
| 2026-10-09 | Stray invisible control characters and non-breaking spaces appeared inside regular expressions and test files (twice: a script and an editing tool converted escape sequences into real characters) | Scripted edits and tool escaping; invisible in review | `lib/text-hygiene.test.ts` (control, non-breaking, zero-width characters); `code-quality.md` section 13. **Repeated** |
| 2026-10-09 | A test for the request-size limit passed even with the limit deleted | The test failed for a different reason (schema validation), so it protected nothing | The breaker rule (`automation/test-value-review.md` step 8); the test was rewritten |
| 2026-10-09 | A guard written to catch unwrapped API handlers checked each file, not each handler, and its first scanner version missed a second unwrapped handler (its own self-test caught that); the docs-index check matched a name anywhere in the file and missed a document that was only named in prose | Guards tested only against the case that prompted them; a regular expression consumed the text of the next match | Per-handler scan with a self-test of the scanner; the docs-index check is scoped to the table. Rule: every scanner gets a self-test with the shapes it must reject |
| 2026-10-09 | No protection against cross-site scripting or framing, and no hostile-payload tests, although the API is the main attack surface (raised by the owner) | Security rules were written around secrets and access, not around attacks on the browser and the API | Lint rules for raw HTML, eval and unsafe links; security response headers with a test; hostile-payload suite; `docs/secure-coding.md` |
| 2026-10-09 | Several scan-style guards were narrower than the rules they claimed to enforce (secret scan skipped file types and tests; services scan read only top-level single-line imports; no check that API routes use the wrapper; protection list not tied to the real matcher) | Guards were proven only at the spot where they were sabotaged | Independent verification pass; guards widened (see the scorecard); rule: scope a guard to the rule as written, not to the example |
| 2026-10-09 | A pull request was opened after validation had failed | A chained shell command ran the commit step even though the earlier step failed | `CLAUDE.md` operating rule 5 and the pull request checklist: commit only after validation exits cleanly |
| 2026-10-09 | The route-protection test failed in every generated application | It hard-coded the demo route that the template removes; the full template proof is not part of the normal check | Test fixed; rule: re-run `pnpm prove:init --full` whenever a guard test is added (`docs/boilerplate.md`) |
| 2026-10-09 | A new migration guard failed in a generated application (it assumed the migrations folder exists; a new app has none) | Same cause as the row above: guard tests are written against the reference app only. **Repeated** | Test fixed; the manual re-run caught it before merge; a continuous-integration job (`Template proof`) now runs the full template proof on every pull request |
| 2026-10-09 | A rule document named demo-slice files and tripped the template leak check | Product-specific names outside the reference-only folders | `docs/boilerplate.md` (Maintaining the template) and the leak check |
| 2026-10-09 | Documents described things that were no longer true (an API document called empty, validation called manual, branch protection called aspirational) | No drift check; documents updated late | Every document reviewed against the code; "documentation matches the code" stays Medium confidence; same-pull-request update rule |
| 2026-10-09 | A dependency update proposed a React Native version the Expo SDK does not support | Automatic grouped updates | `docs/stack.md` compatibility rule; Dependabot ignores major versions; peer and Expo checks |
| 2026-10-09 | An unclear merge authorization was blocked by the tool's permission check | The authorization did not name the merge | Merge rule wording (`CLAUDE.md` section 19): name the pull request or a stated class |
| 2026-10-08 | An overstated claim: "local checks passing" when only lint and typecheck had run | Reporting what was intended, not what ran | `CLAUDE.md` operating rule 5; `docs/issues.md` Accuracy |
| 2026-10-09 | The contract compatibility check reported an unchanged nullable field as a breaking change | It compared a type that can be an array by identity, not value; no contract had a nullable field until S0 | `contracts.compat.test.ts` compares by value and its self-test covers an unchanged and a changed nullable type |
| 2026-10-09 | A guard that names the product (its user-facing name) failed in a generated application (repeated: the same cause as earlier template-proof lessons) | A new guard was written for the reference app without listing it as reference-only | The generated-app proof caught it; the guard is listed in `scripts/boilerplate/manifest.mjs`. Rule: a test that names this product belongs in the manifest list in the same pull request |
| 2026-10-09 | A scan-style guard (the secret scan) timed out at the default 5 seconds once the repository had grown | A whole-repository scan has a cost that grows with every slice, and the default limit was never reviewed | The test has an explicit 30 second limit. Rule: a guard that reads the whole repository declares its own timeout |
| 2026-10-09 | The phone app showed a red "Incompatible React versions" screen on first run (react 19.2.3, react-dom 19.2.8) | The phone app pins react to the Expo SDK but did not name react-dom, so pnpm paired it with the web app's newer react-dom; no test looked across the apps, and nothing had run the app on a device | `scripts/dependency-match.mjs` (cross-checks every workspace; self-tested and shown failing on a mismatch), `apps/mobile/src/react-versions.test.ts`, and `docs/stack.md` rule 7. The same check found two more differences (`@types/node`, `typescript`), recorded in `KNOWN_DIFFERENCES` for the owner to decide |
| 2026-10-09 | The template proof failed on the text hygiene guard timing out at 5 seconds (repeat of the earlier secret-scan timeout), and I committed before reading the proof's log (the background notice said exit code 0, which was only the wrapper) | The earlier rule ("a guard that reads the whole repository declares its own timeout") was a per-test habit with nothing enforcing it, and a new scanning guard missed it; I treated a notification as the result | `testTimeout: 30_000` in `apps/web/vitest.config.mts` for every web test, with `lib/test-config.test.ts` failing if it is removed or lowered (proven). Rule for me: read the log or the command's own exit status before claiming or committing a result; a background-task notice is not the result |
| 2026-10-10 | The phone app said "We could not load events" for every search while the website and the API worked | The demo data's ids were plain md5 hashes, which look like UUIDs but fail the strict UUID check in the shared contract, so the phone rejected the whole reply (the website's list never parsed through that contract); the app also shows one message for every failure kind, which hid the cause | `apps/web/db/demo-seed.test.ts` (ids must pass the strict UUID check; the old form is shown to fail; broken on purpose to confirm); the seed now builds valid ids and removes the old rows. Open: the phone should tell failure kinds apart (next phone slice) |
