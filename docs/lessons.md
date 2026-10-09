# Lessons Learned

The rule: **every problem that is found becomes a guard or a written rule, in the same pull request that fixes it.** A guard (a test or check that fails) is preferred over prose. A problem that occurs a second time is a process failure: the first guard was missing or too weak, so strengthen it and record the repeat here.

## How to use this log

1. **Fix** the problem.
2. **Close the gap.** Add a test or check that would have caught it (and prove it by breaking the thing on purpose), or add the rule to the document that owns the topic. Name the guard or rule in the table below.
3. **Record** it here: what happened, the root cause, what now prevents it. One line each.
4. **Repeat offenders.** If the same cause appears again, mark the earlier row "repeated", find why the guard missed it, and widen the guard.
5. The pull request template asks: "Did this reveal a gap? Guard or rule added, or why not."

Nothing secret goes in this log (`/CLAUDE.md` section 18).

## Log

| Date | What happened | Root cause | Now prevented by |
| --- | --- | --- | --- |
| 2026-10-09 | The primary architecture document had backslash-escaped bullets and code fences and bold-wrapped headings in 21 sections | A bad copy from another tool; headings-only review missed it | `lib/text-hygiene.test.ts` (escaped Markdown artifacts); documents are read in full, not by headings |
| 2026-10-09 | Stray invisible control characters and non-breaking spaces appeared inside regular expressions and test files (twice: a script and an editing tool converted escape sequences into real characters) | Scripted edits and tool escaping; invisible in review | `lib/text-hygiene.test.ts` (control, non-breaking, zero-width characters); `code-quality.md` section 13. **Repeated** |
| 2026-10-09 | A test for the request-size limit passed even with the limit deleted | The test failed for a different reason (schema validation), so it protected nothing | The breaker rule (`automation/test-value-review.md` step 8); the test was rewritten |
| 2026-10-09 | Several scan-style guards were narrower than the rules they claimed to enforce (secret scan skipped file types and tests; services scan read only top-level single-line imports; no check that API routes use the wrapper; protection list not tied to the real matcher) | Guards were proven only at the spot where they were sabotaged | Independent verification pass; guards widened (see the scorecard); rule: scope a guard to the rule as written, not to the example |
| 2026-10-09 | A pull request was opened after validation had failed | A chained shell command ran the commit step even though the earlier step failed | `CLAUDE.md` operating rule 5 and the pull request checklist: commit only after validation exits cleanly |
| 2026-10-09 | The route-protection test failed in every generated application | It hard-coded the demo route that the template removes; the full template proof is not part of the normal check | Test fixed; rule: re-run `pnpm prove:init --full` whenever a guard test is added (`docs/boilerplate.md`) |
| 2026-10-09 | A new migration guard failed in a generated application (it assumed the migrations folder exists; a new app has none) | Same cause as the row above: guard tests are written against the reference app only. **Repeated** | Test fixed; the manual re-run caught it before merge; a continuous-integration job (`Template proof`) now runs the full template proof on every pull request |
| 2026-10-09 | A rule document named demo-slice files and tripped the template leak check | Product-specific names outside the reference-only folders | `docs/boilerplate.md` (Maintaining the template) and the leak check |
| 2026-10-09 | Documents described things that were no longer true (an API document called empty, validation called manual, branch protection called aspirational) | No drift check; documents updated late | Every document reviewed against the code; "documentation matches the code" stays Medium confidence; same-pull-request update rule |
| 2026-10-09 | A dependency update proposed a React Native version the Expo SDK does not support | Automatic grouped updates | `docs/stack.md` compatibility rule; Dependabot ignores major versions; peer and Expo checks |
| 2026-10-09 | An unclear merge authorization was blocked by the tool's permission check | The authorization did not name the merge | Merge rule wording (`CLAUDE.md` section 19): name the pull request or a stated class |
| 2026-10-08 | An overstated claim: "local checks passing" when only lint and typecheck had run | Reporting what was intended, not what ran | `CLAUDE.md` operating rule 5; `docs/issues.md` Accuracy |
