# Incident response

What to do when something goes wrong in production: a security problem, a bad release, leaked data, an abusive person, or a vendor outage. **This is an engineering runbook, not legal advice.** If personal data may have been exposed, involve a lawyer early (section 5). It satisfies the pre-launch checklist item in `/docs/risk-and-legal.md` section 5 (F-SEC-007). Keep it short enough to follow while stressed.

**First rule:** stop the harm, then investigate. Do not delete evidence (logs, deployments, database rows) until the problem is understood. Never paste a secret into a chat, an issue or a commit (`/CLAUDE.md` section 18).

## 1. Who decides and who to tell

| Role | Who | Does |
| --- | --- | --- |
| Incident owner | The owner | Decides, flips the off switches, talks to vendors and any lawyer |
| Helper | Claude (in a session) | Reads logs and code, drafts fixes and the write-up; **cannot** log in to vendor dashboards or approve production changes |
| Contact for the public | `contact@signalonesound.com` | Where reports arrive; the owner reads it |

Vendor status pages to check first when something is down: Vercel, Neon, Clerk, Stripe, Amazon Web Services, GitHub.

## 2. The off switches (fastest first)

Settings are in Vercel, project **signalonesound**, Settings, Environment Variables, **Production**. A changed value only applies after a **redeploy** (Deployments, the latest one, Redeploy).

| To stop | Do this | Effect |
| --- | --- | --- |
| Taking payments | Set `PAYMENTS_PROVIDER` to `none` and redeploy. Also pause the Stripe webhook endpoint in Stripe if needed | Checkout and the customer page answer "not found"; webhooks are refused |
| Sending email | Set `EMAIL_PROVIDER` to `none` and redeploy | Nothing is sent (it logs only that a message was not sent) |
| Phone alerts | Set `PUSH_PROVIDER` to `none` and redeploy | No push messages |
| The contact form | Set `CONTACT_FORM_ENABLED` to `off` and redeploy | The page shows only the email address |
| One abusive person | Admin, Moderation: suspend the member (a reason is required and recorded) | They can browse but cannot change listings or claim churches |
| One bad event or church | Admin, Moderation: hide the event or unpublish the church | It disappears from search at once |
| A bad release | Vercel, Deployments: choose the last good deployment and use Instant Rollback (promote it) | The previous version serves again |
| The whole site | Vercel, project Settings, pause the project (or remove the domain from the project) | The site stops answering; data is untouched |
| Scheduled jobs | Remove or change `CRON_SECRET`, redeploy | The daily job refuses to run |

## 3. Credentials: where each lives and how to replace it

Rotate a credential if it may have been seen by anyone else. Put the new value straight from the vendor page into Vercel; never through chat.

| Credential | Lives in | Replace by |
| --- | --- | --- |
| Clerk secret key and publishable key (production) | Vercel Production | Clerk dashboard (Production), API keys, roll; update Vercel; redeploy |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Vercel Production | Clerk, Webhooks, the endpoint, roll the signing secret; update Vercel; redeploy; replay a message to confirm |
| `DATABASE_URL` (production) | Vercel Production, and the GitHub environment secret used by "Migrate production" | Neon, the production branch, reset the role password; update both; redeploy |
| `CRON_SECRET` | Vercel Production | Generate a new random value; update Vercel; redeploy |
| `UNSUBSCRIBE_SECRET` | Vercel Production | New random value (32 or more characters); old unsubscribe links stop working, which is acceptable |
| `RATE_LIMIT_SALT` | Vercel Production | **Caution:** it also keys the list of addresses that bounced; changing it makes the app forget that list. Change only if it leaked, and accept that |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Vercel (test keys outside production) | Stripe dashboard, API keys, roll the key; the webhook endpoint, roll the signing secret; update Vercel; redeploy |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (send-only) | Vercel Production | AWS IAM, create a new key for the same send-only user, update Vercel, delete the old key |
| GitHub Actions secrets (`NEON_DEV_DATABASE_URL`, `E2E_CLERK_*`, `STRIPE_TEST_*`) | GitHub, Settings, Secrets and variables | Replace at the vendor, then update the secret |
| `ADMIN_USER_IDS` | Vercel Production | Edit the list of Clerk user ids (not a secret, but it grants admin) |

After rotating: confirm the site works, then check the vendor's activity log for use of the old credential.

## 4. Steps for any incident

1. **Contain** (section 2). Write down the time you did each thing.
2. **Understand:** what happened, since when, what was reachable. Vercel logs and deployments, Neon history, Clerk's activity, and the app's audit log (`/admin/audit`) show a lot. Ask Claude to read logs and code; never to run anything against production from a laptop.
3. **Fix** through the normal pull request flow, with a test that fails without the fix (`/CLAUDE.md` rule 12). In an emergency the rollback in section 2 comes first and the fix after.
4. **Tell** whoever must be told (section 5), in plain words, without speculating.
5. **Record** it in `/docs/lessons.md`: what happened, the root cause, and the guard that now prevents it. A repeat is a process failure.

## 5. If personal data may have been exposed

1. Contain first; keep logs. Do not edit or delete database rows to "tidy up".
2. Work out **which data** from `/docs/data-inventory.md` (tiers T1 to T4): for example sign-in details are held by Clerk, saved events and alerts are sensitive (T3), card details are never ours (Stripe holds them).
3. **Involve a lawyer** (breach-notification rules differ by state and country, and religious belief can be special-category data). Do not publish a statement before they have seen it.
4. Notify affected people and any required authority within the legal deadline, and tell the vendors whose systems were involved (Clerk, Neon, Vercel, Stripe).
5. Offer what helps: a password reset through Clerk, and the account deletion and export on the Account page.

## 6. Practice

Before launch, rehearse one off switch (for example turn the contact form off, redeploy, check the page, turn it back on) and the database restore drill (`/docs/database.md` section 12.4), and record the result in `/docs/release.md`.
