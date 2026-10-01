# Notes: Issue 26 "Harden Reusable Security Foundation"

1. Issue: #26 "Harden Reusable Security Foundation"
2. PR: none yet at time of writing (open one from this branch; further @claude requests should come from that PR).
3. Canonical branch: `claude/issue-26-20261001-0633`, base `main`. Not merged.
4. Latest commit: the commit containing this file (base `5a0b76a`); see `git log -1`.

## 5. Work completed

- Security audit (no secret values read or printed): env example, `lib/env/*`, `db/*`, `next.config.ts`, `proxy.ts`, `.gitignore` files, both workflows, dependency audit. No Vercel config file is committed. Existing env validation and production guards were found sound and left unchanged.
- Added `apps/web/lib/security.test.ts`: static checks for public-variable naming, client env allow-list, `next.config` `env` forwarding, server-only/client import boundaries (including `'use client'` files and shared packages), placeholder-only `.env.example`, key/credential-shaped secrets in committed text files, gitignore coverage, and workflow safety (no prod credentials, no merge/force/reset/branch-delete, review workflow read-only).
- `docs/security.md`: added the permanent security architecture (trust boundaries, secrets, public vs private config, client/server, authN vs authZ, production safety, DB credentials, CI expectations and workflow audit findings, future API/mobile, integration points).

## 6. Files changed

`apps/web/lib/security.test.ts` (new), `docs/security.md`, `docs/notes.md`.

## 7. Architecture decisions

- No new runtime abstractions or dependencies; protections are tests plus documented rules.
- `APP_ENV`/`DATABASE_ENV` stay separate; no guard was changed.
- Workflow findings are documented, not applied (humans edit workflows).

## 8. Security verification actually performed

- The new tests pass (see 9); they inspect source text only.
- Manual inspection of workflows and configs. `pnpm audit --prod`: no known vulnerabilities.

## 9. Results (latest run)

- `pnpm -r --if-present test`: shared 22/22 passed (1 file); web 17/17 passed (2 files).
- `pnpm --filter web lint`: no output, passed.
- `pnpm --filter web typecheck`: passed.
- `pnpm --filter web build`: succeeded.

## 10. Not tested, and why

- The new tests were not mutation-checked (no deliberate violation was introduced to see them fail), except that two initial false positives from comment text were observed and fixed.
- Textual import checks do not follow transitive imports.
- Vercel project settings, GitHub secret scoping, and Neon roles are not verifiable from code.
- No production data or infrastructure was touched.

## 11. Unresolved concerns

See "GitHub / CI expectations" in `docs/security.md`: job-level `DATABASE_URL` in `claude.yml`, broad `pnpm *`/`npx *`, `id-token: write`, unpinned action tags. All need a human workflow edit.
Rate limiting, CSP/security headers, and CI dependency scanning remain unimplemented.

## 12. Recommended next steps

1. Open the PR and review.
2. Human applies the `claude.yml` hardening listed in `docs/security.md`.
3. Verify Vercel Preview/Production variables manually.
4. Add security headers/CSP and rate limiting as separate issues.
