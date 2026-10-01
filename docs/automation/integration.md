# Integration Testing

Integration tests verify meaningful boundaries with real interactions where appropriate, rather than mocking every layer.

## Boundaries worth testing

* **Services:** the service layer with its real data-access collaborators.
* **API / server boundaries:** route handlers and Server Actions, covering unauthenticated, unauthorized, invalid-input, and success paths.
* **Authentication / authorization:** the server enforces identity and per-resource authorization; hiding UI is never the thing under test.
* **Database / data access:** queries and mutations against a real non-production database.
* **Shared contracts:** API contracts and Zod schemas in `@signalone/validation` / `@signalone/shared` agree between server and clients (Web, Android, iPhone).
* **External integrations:** Clerk, Neon, and similar, via development/test instances or controlled fakes at the edge.

## Rules

* Prefer real collaborators inside the boundary under test; fake only what is outside it or non-deterministic/costly.
* Each test sets up its own known state and does not depend on test order.
* Do not duplicate what unit tests already prove; test the interaction.
* Apply the Test Value Review (`test-value-review.md`) before adding tests; these tests are costlier than unit tests.

## Environment safety (always)

* Database-backed integration tests use a separate category/command (for example `test:integration`), not part of default `pnpm test`/`validate`.
* Set `DATABASE_ENV` explicitly to `dev` or `qa` and go through `assertDestructiveAllowed`; refuse when unset or `prod`/`stage`.
* Start from a known state via the reset/seed process in `/docs/database.md`; never destroy migration history.
* In CI, run only in a separate job with a dedicated qa secret, never in the secret-free unit job.
* Authentication uses a faked boundary or Clerk development/test instances, never production users.
* Guards (`assertNotProd`, `assertDestructiveAllowed`, prod/live-key checks) are never weakened for tests.
