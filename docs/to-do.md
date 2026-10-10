# To-do: what only the owner can do right now

This file holds only the actions still waiting on you. Claude removes an item as soon as it finds the item is done, so if it is in this file, it is still open. The long, permanent guides are in `docs/how-to.md`; this file is the short, current list.

**How to read it.** Each task is a heading. Numbered steps are things you do in order. Indented lines under a step say where to look and what you should see. If a screen does not match, take a screenshot and tell Claude.

**Rules.**
1. Never paste a password, secret key or token into the chat or into any file in the repository.
2. A line that says **Claude can do this, say yes** is automated once you give permission.
3. Anything that costs money or changes policy waits for your yes or no.

---

## SOON

### Task 1: Set up the test user and test keys for the browser tests

Needed when the browser-test slice starts. Everything here uses your **development** Clerk instance, never production. You type the password and the keys yourself; Claude never sees them. Clerk's test mode (on by default in development) lets a test email address with `+clerk_test` in it sign in with the fixed code `424242`, so no real inbox is needed.

**Part A: create the test user**

1. Open the Clerk dashboard.
    - Go to `dashboard.clerk.com` and click the Signal One Sound application.
    - Look at the top of the page for the instance switch. It must say **Development**. If it says Production, click it and choose Development.
2. Open the user list.
    - Look at the left menu. Click **Users**.
3. Create the user.
    - Click **Create user** (top right).
    - In the email box type: `tester+clerk_test@example.com`
    - Choose a password and save it in your password manager. Do not paste it anywhere else.
    - Click **Create**.
4. Check it.
    - You should see `tester+clerk_test@example.com` in the Users list.

**Part B: give GitHub the development keys (two secrets)**

5. Copy the first key from Clerk.
    - In the Clerk dashboard (still **Development**), look at the left menu. Click **Configure**, then **API keys**.
    - Find **Secret keys** and click the copy button. It starts with `sk_test_`.
6. Open GitHub's secret page.
    - Go to `github.com/richroberts222/signalonesound`.
    - Click **Settings** (the last tab), then in the left menu click **Secrets and variables**, then **Actions**.
7. Save the secret key.
    - Click **New repository secret**.
    - Name: `E2E_CLERK_SECRET_KEY`
    - Secret: paste the key you copied, then click **Add secret**.
8. Save the publishable key the same way.
    - Back in Clerk, copy the **Publishable key** (it starts with `pk_test_`).
    - In GitHub click **New repository secret**. Name: `E2E_CLERK_PUBLISHABLE_KEY`. Paste it and click **Add secret**.
9. Tell Claude it is done. Claude checks that both names exist (it can see names, never values), then removes this task.

If a screen does not match these words, take a screenshot and send it to Claude.

### Task 2: Create a Stripe account in test mode (free)

Needed for payments slice S11, not before. Test mode moves no real money and needs no bank account. You make the account and the keys yourself; Claude never sees them.

1. Create the account.
    - Go to `stripe.com` and click **Sign in**, then **Create account** (or **Start now**).
    - Enter your email and a password, then confirm the email Stripe sends.
2. Stay in test mode.
    - Look at the Stripe dashboard header. It should say **Test mode** (or **Sandbox**). Do not click anything that says "Activate your account" or asks for bank details yet.
3. Copy the test keys.
    - Look at the left menu or the search box at the top. Open **Developers**, then **API keys**.
    - You will see a **Publishable key** (`pk_test_...`) and a **Secret key** (`sk_test_...`). Click **Reveal** next to the secret key.
4. Save them in GitHub.
    - Go to `github.com/richroberts222/signalonesound`, click **Settings**, then **Secrets and variables**, then **Actions**.
    - Click **New repository secret**. Name: `STRIPE_TEST_SECRET_KEY`. Paste the `sk_test_` key and click **Add secret**.
    - Click **New repository secret** again. Name: `STRIPE_TEST_PUBLISHABLE_KEY`. Paste the `pk_test_` key and click **Add secret**.
5. Tell Claude it is done. Claude checks that both names exist (never the values) and removes this task.

If a screen does not match these words, take a screenshot and send it to Claude.

---

## BEFORE REAL USERS ARRIVE (no cost)

None of these is needed for the partner demo, and none of them spends money.

### Task 3: Replace the Clerk webhook signing secret

It was shown in the chat once, so it should be replaced. You chose to wait on this.

1. Open the Clerk dashboard.
    - Switch the instance to **Production**.
2. Open webhooks.
    - Look at the left menu. Click **Webhooks**.
    - Click the endpoint for `signalonesound.com`.
3. Replace the secret.
    - Find **Signing Secret** and use its roll or regenerate option.
    - Copy the new value. Do not paste it into the chat or any file.
4. Put it in Vercel.
    - In Vercel, open the project **signalonesound**, then **Settings**, then **Environment Variables**.
    - Edit `CLERK_WEBHOOK_SIGNING_SECRET` for **Production**, paste the new value and save.
    - Click **Deployments**, open the latest one, and choose **Redeploy** (the new value only applies after a redeploy).
5. Tell Claude. Claude sends a test event and removes this task.

### Task 4: Work through the legal checklist

No real user data may be collected until every gate in `docs/risk-and-legal.md` is met.

1. Open `docs/risk-and-legal.md` in the repository.
2. Tell Claude when you want to start. **Claude can do this, say yes:** prepare drafts of the policies and a gate-by-gate list for review.

### Task 5: Small changes Claude can make for you

Each of these needs only your yes. **Claude can do this, say yes.**

1. Add `contact@signalonesound.com` to the Contact page.
2. Replace the old "exploratory mock" banner on the real admin pages. Tell Claude the wording you prefer first (question Q-005).
3. Add a few sample churches near Nampa and Boise for demos.

### Task 6: Practice restoring the database and review GitHub security settings

1. Tell Claude when you are ready. **Claude can do this, say yes:** prepare the exact steps from `docs/release.md` for each, one at a time.

==================================================
==================================================

# COSTS MONEY: your yes or no is needed first

Claude never spends money or opens a paid account. Each task here is your decision. None of them is needed for the partner demo.

==================================================
==================================================

### Task 7: Pay for longer database history (Neon)

The free plan keeps only 6 hours of history, so a mistake could not be undone for long. This costs money, so it is your decision.

1. Open the Neon console.
    - Go to `console.neon.tech` and open the project **SignalOneSound**.
2. Find billing.
    - Look at the left menu or your account menu. Click **Billing** (or **Plans**).
3. Choose a paid plan.
    - Compare the plans on the page and pick one. Tell Claude which, so the documents are updated.

### Task 8: Upgrade the website host (Vercel Pro, about $20 per month)

The free plan is for non-commercial use only, so this is needed before launch. This costs money, so it is your decision.

1. Open Vercel.
    - Go to `vercel.com` and open your team (**TeamJesus**).
2. Find billing.
    - Click **Settings**, then **Billing**.
3. Upgrade.
    - Click **Upgrade** next to the Pro plan and complete the form.

### Task 9: Choose the Apple Developer account (about $99 per year)

Needed for the iPhone app. Costs money, so it is your decision (question Q-011).

1. Decide between **Individual** and **Organization**.
    - Organization needs a D-U-N-S number, which is free but takes time to obtain.
2. Tell Claude your choice. Claude then gives the sign-up steps.

### Task 10: Decide about the Google Play Store (about $25 once)

Optional. A direct download link works for demos without it.

1. Decide whether you want the app in the Play Store.
2. Tell Claude your choice.

### Task 11: Choose vendors

1. Choose a map provider and an email provider. Claude can lay out the options and prices for you to compare. Nothing is bought without your yes.
