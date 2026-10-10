// What the browser tests (Playwright) leave behind in the development database, and how it is removed (S15).
// The tests send contact messages under a recognizable name prefix; this removes exactly those and nothing
// else. It runs only through the guarded tooling (dev and qa; production is refused) and never from the
// tests themselves, which must not touch the database directly.
export const E2E_CONTACT_NAME_PREFIX = "e2e-contact-";

export const E2E_CLEANUP_STATEMENTS: readonly string[] = [`delete from contact_message where name like '${E2E_CONTACT_NAME_PREFIX}%'`];
