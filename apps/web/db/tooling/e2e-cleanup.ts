// What the browser tests (Playwright) leave behind in the development database, and how it is removed (S15, S20).
// The tests create things under recognizable prefixes (contact messages, billing plans, perks, coupons and one
// trial grant); this removes exactly those and nothing else. It runs only through the guarded tooling (dev and
// qa; production is refused) and never from the tests themselves, which must not touch the database directly.
// The audit log is append-only and is left alone.
export const E2E_CONTACT_NAME_PREFIX = "e2e-contact-";
export const E2E_PLAN_NAME_PREFIX = "e2e-plan-";
export const E2E_PERK_KEY_PREFIX = "e2e_perk_";
export const E2E_COUPON_CODE_PREFIX = "E2E-";
export const E2E_TRIAL_REASON_MARK = "e2e-trial";

/** Every prefix a cleanup statement may be tied to. The test checks each statement uses one. */
export const E2E_PREFIXES: readonly string[] = [E2E_CONTACT_NAME_PREFIX, E2E_PLAN_NAME_PREFIX, E2E_PERK_KEY_PREFIX, E2E_COUPON_CODE_PREFIX, E2E_TRIAL_REASON_MARK];

const plans = `select id from billing_plan where name like '${E2E_PLAN_NAME_PREFIX}%'`;
const perks = `select id from billing_perk where key like '${E2E_PERK_KEY_PREFIX}%'`;
const coupons = `select id from billing_coupon where code like '${E2E_COUPON_CODE_PREFIX}%'`;

// Children first, so no row is removed while another still points at it.
export const E2E_CLEANUP_STATEMENTS: readonly string[] = [
  `delete from contact_message where name like '${E2E_CONTACT_NAME_PREFIX}%'`,
  `delete from billing_plan_perk where perk_id in (${perks})`,
  `delete from billing_plan_perk where plan_id in (${plans})`,
  `delete from billing_perk where key like '${E2E_PERK_KEY_PREFIX}%'`,
  `delete from billing_subscription where plan_id in (${plans})`,
  `delete from billing_price where plan_id in (${plans})`,
  `delete from billing_plan where name like '${E2E_PLAN_NAME_PREFIX}%'`,
  `delete from billing_coupon_use where coupon_id in (${coupons})`,
  `delete from billing_coupon where code like '${E2E_COUPON_CODE_PREFIX}%'`,
  `delete from billing_subscription where status = 'trialing' and provider_ref is null and account_id in (select substring(subject from 8) from audit_log where action = 'billing.trial.grant' and detail like '%${E2E_TRIAL_REASON_MARK}%')`,
];
