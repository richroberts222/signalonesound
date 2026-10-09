# CLAUDE.md

Guidance for Claude Code in the Signal One repository. This file is the entry point: the rules that always apply, and a map of where the detail lives. When you need a rule's detail, follow the link; do not rely on memory.

---

# Operating rules (read first)

1. **Documentation is the source of truth.** Read the relevant `/docs` file before significant work (§3). A missing or empty document means no rules yet, never invented rules. Undecided stays undecided; ask Rich (§17).
2. **One platform, many clients.** The server is authoritative; clients never touch the database; replaceable boundaries get an interface (port); dependencies point inward (§4, §6, §7, `/docs/code-quality.md` §12).
3. **Stay in scope, then stop.** Work to the issue's scope fence, numbered acceptance criteria and controls; when every item is proven, report "done, with proof" and stop. Recommend the next slice; never start it (`/docs/qa-strategy.md` §3).
4. **Tests must be meaningful.** Every new test must be shown failing when the behavior it protects is broken (`/docs/automation/test-value-review.md`). Never weaken, skip or disable a test, guard or validation to make a failure pass (§12).
5. **Prove before claiming.** Run `pnpm validate`; commit, push and open a pull request only after it exits cleanly; report exact commands and results; never claim CI passed unless it ran.
6. **Secure by default.** No secrets in committed files (§18); meet `/docs/secure-coding.md` (hostile input, data tiers: never store Social Security numbers, card numbers or medical records, no raw HTML).
7. **Git:** work on a branch, open a pull request, never commit or push to `main`. Merge only when Rich has explicitly authorized it (a named pull request or a stated class), and only a pull request that is open, not draft, mergeable and has `Validate` passing (§10, §19; `/docs/git-workflow.md`).
8. **Ask before spending** on any vendor, account, plan, domain or tool.
9. **Database:** change schema only through the documented migration process; never touch `prod` (§13).
10. **Legal gates:** no real user data is collected until the gates in `/docs/risk-and-legal.md` are met. That document is a checklist, not legal advice.
11. **Workflow files, repository settings and security configuration** change only through a reviewed pull request or by the owner.
12. **Every problem becomes a rule.** When a defect or mistake is found, add a guard (preferred) or a rule in the owning document in the same pull request, and log it in `/docs/lessons.md`. A repeat is a process failure: widen the guard.
13. **Surface conflicts.** If instructions, documents and the repository disagree, say what was assumed, what exists and why it matters; stop and ask if the difference is material.

---

# 1. Project Overview

Signal One is **one platform with multiple clients**: a web application, an Android application, an iPhone application, a shared backend/API, shared authentication, and a shared data layer. It is not three independent applications. The user-facing product name is **Signal One Sound** (`/docs/naming-conventions.md`).

---

# 2. Architectural Authority

`/docs/architecture-rules.md` is the primary architectural authority and takes precedence over assumptions about how a framework or feature should be implemented. Before an architectural change, read the relevant documentation in `/docs`.

---

# 3. Documentation-First Development

Before generating or significantly modifying code, check the relevant documentation. Not every listed document exists in every copy of the repository.

| Area | Documents |
| --- | --- |
| Architecture and code | `architecture-rules.md` (authority), `code-quality.md`, `services.md`, `shared-code.md`, `stack.md` |
| Web and mobile | `web.md`, `mobile.md`, `ui.md`, `routing.md`, `server-components.md` |
| Data | `database.md`, `data-fetching.md`, `data-mutations.md` |
| API and integrations | `api.md`, `integrations.md`, `payments.md` |
| Identity and security | `auth.md`, `permissions.md`, `security.md`, `secure-coding.md`, `environment.md` |
| Quality | `testing.md`, `qa-strategy.md`, `unit.md`, `integration.md`, `acceptance.md`, `e2e.md`, `playwright.md`, `coverage.md`, `reporting.md`, `test-value-review.md` (all in `automation/`) |
| Delivery | `git-workflow.md`, `issues.md` (required for any issue or pull request), `deployment.md`, `release.md` |
| Product | `product-development.md`, `naming-conventions.md`, `product/product-plan.md`, `product/roadmap.md`, `features/` |
| Risk, growth and learning | `risk-and-legal.md`, `future-readiness.md`, `lessons.md` |
| Template | <!-- boilerplate:template:start -->`boilerplate.md`, <!-- boilerplate:template:end -->`new-app-setup.md`, `customization-map.md` |

(All paths are under `/docs`.) A test fails if a document in `/docs` is not linked from this table.

**Empty or missing documents.** An empty file means the project has not established rules for that area; it must not be read as containing rules. If a document is missing, do not invent its contents. If a missing or empty document is needed for an architectural decision and the decision cannot safely be made from existing documents, ask for clarification.

---

# 4. Architecture Compatibility

When adding, replacing or significantly changing an architectural component, consider Web, Android, iPhone, API, authentication, database, shared code, business logic, testing, deployment and environment configuration. Use `/docs/architecture-rules.md` for the compatibility check. Do not optimize one client at the expense of the platform. If a proposal creates a conflict, stop and explain it first.

---

# 5. Technology Architecture

Defaults, not permission to introduce incompatible patterns: Next.js (App Router), React and TypeScript with Tailwind and shadcn/ui on Vercel; React Native and Expo for Android and iPhone; Clerk for authentication; Next.js server code and API routes as the backend; PostgreSQL on Neon with Drizzle ORM; Git, GitHub and pull requests; Claude Code as the development agent. How they fit together: `/docs/stack.md`. Before replacing a technology or adding a major framework or service, consult `/docs/architecture-rules.md`.

---

# 6. Backend Boundary

Web, Android and iPhone are clients of the Signal One backend and must never access the database directly. Authentication is validated at the server boundary; secrets and privileged database access stay server-side.

```text
Web --------\
Android ------> Signal One API ---> Drizzle ---> Neon
iPhone -------/
```

---

# 7. Shared Architecture

Share API contracts, TypeScript types, validation schemas, data models, constants and authoritative business rules where appropriate. Do not duplicate server-authoritative logic across clients, and never expose server-only code or secrets to clients (`/docs/shared-code.md`).

---

# 8. Web and Mobile Independence

Web and mobile may differ in UI, navigation, layout, interaction and platform behavior. Do not force web UI architecture onto mobile, and do not create separate backend or data architectures because the interfaces differ.

---

# 9. Documentation as Source of Truth

When implementation and documentation disagree: identify the discrepancy, decide which is outdated, do not silently establish a new pattern, and update the documentation when an architectural decision changes. Material documentation drift is a defect; update documents in the same work.

---

# 10. Git Workflow

Inspect the issue, read the documents, inspect the implementation, work on the issue's branch, validate, commit, push, open or update the pull request, and report results. One issue is one canonical branch and one pull request. Do not make significant unreviewed changes to `main`. Detail and the merge-authorization rule: `/docs/git-workflow.md` and `/docs/issues.md`.

---

# 11. Vercel

Vercel hosts the web application. Pull requests use Vercel Previews where available. A successful deployment does not by itself prove architectural compatibility.

---

# 12. Testing

Testing protects the whole platform. The strategy, the per-feature definition of done and the layers are in `/docs/qa-strategy.md`; commands and status in `/docs/testing.md`. Never weaken a test or guard to pass; fix the cause.

---

# 13. Database Safety

Database changes follow the documented migration process in `/docs/database.md`. Keep a reliable way to apply migrations, seed development and test data, reset test data and reproduce known states. Never destroy migrations or required configuration when resetting data, and never target `prod` from local tooling or tests.

---

# 14. Simplicity

Prefer the simplest implementation that satisfies the requirements and preserves the architecture. Do not add frameworks, services, dependencies, databases, authentication systems, build systems or abstraction layers without a documented reason. Keep dependencies and tooling compatible with each other (versions, peers, the Expo SDK); upgrade deliberately, not automatically (`/docs/stack.md`).

---

# 15. Architectural Changes

A feature request does not authorize an architectural change. If implementation needs an undocumented significant architectural decision, identify it, check the affected components and clients, document the decision when appropriate, and ask rather than silently choosing.

---

# 16. Priority Order

1. Existing documented architecture. 2. Existing project conventions. 3. Compatibility across all clients. 4. Security and data integrity. 5. Maintainability. 6. Simplicity. 7. Feature-specific convenience. A convenient implementation that violates the architecture is not acceptable.

---

# 17. Do Not Assume Undocumented Rules

Distinguish established rules, technology defaults, existing patterns, suggestions and undecided questions. Do not turn a suggestion into a rule without recording it in the proper document. Treat anything undecided as undecided.

---

# 18. Secrets in Committed Files

Never put real database URLs, credential-shaped URLs (any `scheme://user:password@host/...`, even fake), API keys, tokens, passwords or private keys into documentation, examples, comments, test descriptions or any committed file. Use obvious placeholders (`<DEV_DATABASE_URL>`, `<API_KEY>`, `<TOKEN>`) and describe a value instead of reproducing it. The security tests enforce this; never change them to make a failure pass; remove the offending content.

---

# 19. Product Development System

Detail: `/docs/product-development.md`.

* Naming: `/docs/naming-conventions.md` is authoritative; do not invent terms marked UNDECIDED; ask Rich. Do not rename technical identifiers without a compatibility evaluation.
* Direction: `/docs/product/product-plan.md` is authoritative; approved specs in `/docs/features/` define behavior. Knowledge of a future feature does not authorize implementing it; only an approved issue does.
* One issue is one canonical branch and one pull request. Independent issues may run in parallel only when scopes and files do not overlap; otherwise stay sequential (`/docs/issues.md`).
* Repository facts outrank external assumptions. Exploratory UI is reviewed on a Vercel Preview before merge.
* **Merging:** Claude merges only when Rich explicitly authorizes it, either for a named pull request or for a stated class such as "all pull requests that have passed". Authorization is part of this rule, not an exception; it does not waive any check: the pull request must be open, not draft, mergeable and have `Validate` passing; re-check each one immediately before merging; merge one at a time. The authorization covers pull requests that exist when it is given. The repository ruleset is the technical backstop.
* GitHub (issue, branch, diff, checks, threads) is the live source of truth. `docs/notes.md` is optional and holds only non-discoverable information. Inspect live GitHub state before starting, reviewing, sequencing or merging (`/docs/issues.md`).

---

# 20. Code Quality, Reuse, and Refactoring

`/docs/code-quality.md` is authoritative (Clean Code, SOLID, Clean Architecture; ports at replaceable boundaries) and `/docs/ui.md` for UI. Reuse existing behavior, components, tokens and contracts before creating duplicates, but do not abstract coincidental similarity. Broad or repository-wide refactors need explicit authorization (a separate approved issue). Audit findings are reported, not silently fixed<!-- boilerplate:reference:start -->; `/docs/code-quality-audit.md` records the current baseline<!-- boilerplate:reference:end -->.

---

# 21. Final Rule

Before implementing anything substantial, ask: **"Does this work as part of the Signal One platform, or does it only work for the feature or client I am currently looking at?"** Signal One must stay coherent across Web, Android, iPhone, the API, Clerk, Neon, Drizzle and Vercel. When in doubt, consult `/docs/architecture-rules.md` and the relevant document before proceeding.
