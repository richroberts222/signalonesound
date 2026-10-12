# S20 Plan perks: what paying members and churches get

**Status: APPROVED by the owner on 2026-10-12 ("make it customizable with what paying members and churches get, so if we change the strategy the admin console has that freedom").** Fifth payment slice, after S10 (plans and switches), S11 (Stripe), S13 (membership page, trial grants) and S14 (church plans). Source: `/docs/payments.md`.

## Purpose

Let an admin decide, in the admin console, what each plan includes, and change it any time, without a code change. A **perk** is a named benefit (for example "Ad-free", "Event promotion", "Analytics"). An admin creates perks, switches them on or off, and ticks which plans include each one. The server then tells every client which perks an account has right now.

This slice builds the list, the choices and the answer. It does **not** lock any existing feature: nothing in the product checks a perk yet. When Rich decides that a feature is paid, that feature is built to ask "does this account have perk X?" and the admin console controls who gets X.

## Scope (in)

* **Perks** (admin): create, rename, describe, switch on or off. Each perk belongs to one account type (member or organization) and has a fixed key (a short lowercase code, set once) that code uses to ask for it, plus a label and a description shown to people.
* **Plan perks** (admin): for each plan, tick the perks it includes. Saved in one step with an audit entry.
* **The answer**: the entitlement reply gains `perks`, the list of perk keys the account has now, derived on the server only:
  * not entitled: none;
  * payment not required for that account type (everything is free right now): every active perk of that type;
  * paying (active) on a plan: that plan's active perks;
  * a free-for-life flagship church (no plan): every active organization perk;
  * on a free trial: the perks of the rule's default plan, or every active perk of that type when no default plan is set.
* **Plans show their perks**: the public plans list and the membership pages show what each plan includes, so people see what they are buying.
* **Admin console**: a "Perks" card to create and edit perks, and a "What each plan includes" tick list on each plan.
* **Server helper**: `perksFor(account)` and `requirePerk(ctx, key)` in the billing service, so a later paid feature is one line.

## Out of scope

Gating any existing feature (owner decision, not made); per-person overrides of perks; usage limits or quotas (for example "5 events a month"); perks in the phone apps beyond reading the entitlement reply; taxes, invoices, refunds; coupons at checkout.

## Acceptance criteria

* **AC1** Only an admin can list, create or change perks or a plan's perks; anyone else gets 401 or 404 and nothing is written.
* **AC2** A perk needs a key (`a-z`, `0-9`, `_`, 3 to 40 characters, starting with a letter, unique, never changed after creation), a label (1 to 60) and a description (0 to 300), all plain text. An extra field, a duplicate key (409) or a bad key (400) is refused.
* **AC3** An admin can change a perk's label, description and active flag; the key and account type cannot be changed.
* **AC4** Setting a plan's perks accepts only perks of the same account type as the plan (otherwise 400, nothing changes); it replaces the plan's list in one step and writes one audit entry (actor, plan, perks) in the same statement.
* **AC5** The entitlement reply lists perks derived on the server exactly as in the scope above; an inactive perk is never listed; a client cannot supply them.
* **AC6** Payment not required: every active perk of the account type is listed (nothing is taken away by this slice).
* **AC7** An account that is not entitled has no perks.
* **AC8** `requirePerk` refuses (404) an account without the perk and allows one with it.
* **AC9** The public plans list includes each active plan's active perks (key, label, description) and no admin-only fields.
* **AC10** The admin console shows the perks and the per-plan ticks, saves them, and shows errors in words.

## Controls inventory

| Control | Test id | Action | Effect |
| --- | --- | --- | --- |
| Perk key, label, description, account type | `perk-key`, `perk-label`, `perk-description`, `perk-type` | Type / choose | Fills the new-perk form |
| Add perk | `perk-create` | Click | `POST /admin/billing/perks` |
| Perk on/off | `perk-active-<key>` | Click | `PATCH /admin/billing/perks/:id` |
| Plan perk tick | `plan-perk-<planId>-<key>` | Tick | Marks the perk for the plan |
| Save plan perks | `plan-perks-save-<planId>` | Click | `PUT /admin/billing/plans/:id/perks` |
| Perks error | `perks-error` | View | Says what went wrong |
| Plan perk list (member and church pages) | `plan-perks-<planId>` | View | What the plan includes |

## API

Admin: `GET` and `POST /api/v1/admin/billing/perks`; `PATCH /api/v1/admin/billing/perks/:id` body `{ label?, description?, active? }`; `GET /api/v1/admin/billing/plan-perks` (every plan's ticked perk ids); `PUT /api/v1/admin/billing/plans/:id/perks` body `{ perkIds: uuid[] }`. Everyone signed in: the existing entitlement routes gain `perks: string[]`; the public plans list gains `perks` on each plan.

## Data

Two new tables. `billing_perk` (id, key unique, label, description, account type, active, created at). `billing_plan_perk` (plan id, perk id, together the key). No personal data. Added to `docs/data-inventory.md`.

## Hostile cases

A member or church manager calling admin routes; a key with spaces, capitals, markup or an over-long value; a duplicate key; a perk of the wrong account type on a plan; an unknown or malformed id; an extra field in a body (`strict`); two admins saving the same plan at the same moment (the last save wins and both are audited); an inactive perk still ticked on a plan (never listed).

## Owner decisions still open

Which existing features become perks, and the first set of perks (suggested starters: ad-free, event promotion, analytics, featured listing); when to switch "payment required" on.

## Done checklist

AC1 to AC10 and every control ticked, each with its test, in the pull request that finishes the slice.
