# Handoff notes: Issue 53 (standalone boilerplate repository)

## Status: NOT "BOILERPLATE V1 READY"

The repository tooling and documentation are written, but **nothing was executed or validated**, and the standalone repository **was not created**. In this automation session every command that runs Node/pnpm (`node --test`, `node scripts/...`, `pnpm`) and `gh repo create` required approval and was not granted. Treat all code below as untested until the commands in "Human steps" pass.

## What was added

* `scripts/boilerplate/export-template.mjs` + `pnpm export:boilerplate --out=<dir>`: generates the standalone generic tree from this repo (proof slice removed via shared `stripProofSlice`, neutral identity "App Boilerplate" / `app-boilerplate` / `com.example.appboilerplate`, standalone `docs/boilerplate.md` and `docs/notes.md` from `scripts/boilerplate/templates/standalone/`, README template banner).
* `init-app.mjs`: `applyIdentity` now rewrites both source identities (Signal One and the template identity); `validateIdentity` rejects both; proof stripping extracted into exported `stripProofSlice`; `stripMarkedRegions` takes optional kinds; `package.json` cleanup also drops `export:boilerplate`.
* `check-boilerplate.mjs`: identity rule also detects the template identity.
* `manifest.mjs`: `EXPORT_EXCLUDED_PATHS`.
* `boilerplate.test.mjs`: negative-control now adapts to the standalone (no proof rules there); one new test for export-then-init (skipped in the standalone); one new assertion rejecting the template name.
* New docs kept by every generated app: `docs/customization-map.md` (every identity/external-project location, auto vs manual, secret vs public, per environment) and `docs/stack.md` (stack roles, data flow, auth, environments, migrations, testing, CI, Vercel, EAS). `docs/new-app-setup.md` links to both; `docs/boilerplate.md` documents export and the publishing step.

## Test Value Review (new tests)

* Export test: protects the one property the standalone repo exists for (no Signal One/proof leftovers, still initializes). Kept.
* Template-name rejection assertion: one line in an existing test. Kept.
* No framework-only tests added.

## Success criteria status

1 standalone repo exists: **NO** (not created; human step below). 2 Signal One still separate: yes (nothing converted). 3 init of a different identity: implemented, **unverified**. 4 domain-clean start: by design (#51), unverified for export. 5-7 customization map, external boundaries, stack docs: written. 8-9, 12-14 preserved by construction (files copied unchanged). 10-11 unchanged. 15 leak check extended, unrun. 16 fresh fictional app generated and validated: **NO, not executed**.

## Human steps (exact)

1. In this branch: `node --test scripts/boilerplate/boilerplate.test.mjs` (or `pnpm test:boilerplate`) and fix anything the new code breaks; run `pnpm validate`.
2. `pnpm export:boilerplate --out=../<boilerplate-dir>`, then publish per `/docs/boilerplate.md` ("Human step to publish"). Pick a neutral repo name.
3. In the new repo: `pnpm install`, `pnpm test:boilerplate`, `pnpm prove:init --full` (initializes a fictional "Harbor Notes", installs, lint, typecheck, test, build, offline first migration). Record the real results and the source/boilerplate commits in that repo's `docs/notes.md`.

## Not done / limitations

* Source commit used: `f96b1eb` (main after #51/#52). Boilerplate commit: none (repo not created).
* Possible issue to check first: the export applies the neutral identity by text substitution to files such as `pnpm-lock.yaml`; a fresh `pnpm install --frozen-lockfile` in the export is unverified.
* Mobile, E2E, and CI limitations from #51 are unchanged. No external resources were created or contacted; no secrets were written.
