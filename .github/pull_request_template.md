Closes #

## What changed and why


## Scope
- [ ] Within the issue's scope fence; anything beyond it is listed under "Recommendations", not built

## Definition of done (docs/qa-strategy.md section 3)
- [ ] Every numbered acceptance criterion is proven by a test (number in the title) or a manual step, or is listed as not automated with the reason
- [ ] Every control in the feature is exercised by an action-and-effect test (or "no controls")
- [ ] Every new test passed the breaker: the behavior was broken on purpose, the test failed, then it was restored. Result:
- [ ] A bug fix adds a test that fails without the fix
- [ ] No test, guard or validation was weakened, skipped or disabled to pass

## Validation (exact commands and real results; never claim a check that did not run)
- [ ] `pnpm validate` exit 0:
- [ ] Other checks run (integration, browser, mobile build, accessibility):

## Documentation and rules
- [ ] Documentation matches the change (same pull request)
- [ ] No secrets or credential-shaped values; no new dependency without a stated reason
- [ ] Spending, vendor, policy or product decisions needed from the owner: none / listed below

## Owner review steps (exact steps, expected result)


## Recommendations (out of scope, not built)

