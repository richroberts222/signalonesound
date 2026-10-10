# To-do: what only the owner can do right now

This file holds only the actions still waiting on you. Claude removes an item as soon as it finds the item is done, so if it is in this file, it is still open. The long, permanent guides are in `docs/how-to.md`; this file is the short, current list.

**How to read it.** Each task is a heading. Numbered steps are things you do in order. Indented lines under a step say where to look and what you should see. If a screen does not match, take a screenshot and tell Claude.

**Rules.**
1. Never paste a password, secret key or token into the chat or into any file in the repository.
2. A line that says **Claude can do this, say yes** is automated once you give permission.
3. Anything that costs money or changes policy waits for your yes or no.

---

## NOW

### Task 1: Update the live database (about 2 minutes)

The new payments tables only exist in the development database. Until you run this, deleting an account on the live site would fail. Nobody is using the site yet, so nothing is broken today. Claude cannot approve the run, because you are the required reviewer.

1. Open GitHub.
    - Go to `github.com/richroberts222/signalonesound`.
    - Look at the row of tabs under the repository name. Click **Actions**.
2. Pick the workflow.
    - Look at the list on the left side of the page.
    - Click **Migrate production**.
3. Start it.
    - Look on the right side, above the list of runs. Click the **Run workflow** button.
    - A small box opens. Leave **Branch: main** as it is.
    - Click in the text box and type exactly: `migrate-production`
    - Click the green **Run workflow** button in the box.
4. Approve it.
    - Refresh the page and click the new run at the top. It says **Waiting for review**.
    - Click **Review deployments**, tick the box next to **production**, then click **Approve and deploy**.
5. Tell Claude it is approved. Claude checks the result and removes this task.

**Claude can do this, say yes:** start the run for you (steps 1 to 3). You still do step 4.

---

## BEFORE REAL USERS ARRIVE (no cost)

None of these is needed for the partner demo, and none of them spends money.

### Task 2: Review the legal checklist when Claude has drafted it (later)

You asked Claude to work through the gates in `docs/risk-and-legal.md`, so nothing is needed from you now. Claude drafts what can be drafted and marks each gate with its real status. No real user's data may be collected until a qualified person (a lawyer, for the policy wording) has reviewed it; Claude cannot certify a gate as met. When the drafts are ready, Claude will add the review steps here.

### Task 3: Practice restoring the database and review GitHub security settings

1. Tell Claude when you are ready. **Claude can do this, say yes:** prepare the exact steps from `docs/release.md` for each, one at a time.

==================================================
==================================================

# COSTS MONEY: your yes or no is needed first

Claude never spends money or opens a paid account. Each task here is your decision. None of them is needed for the partner demo.

==================================================
==================================================

### Task 4: Choose the Apple Developer account (about $99 per year)

Needed for the iPhone app. Costs money, so it is your decision (question Q-011).

1. Decide between **Individual** and **Organization**.
    - Organization needs a D-U-N-S number, which is free but takes time to obtain.
2. Tell Claude your choice. Claude then gives the sign-up steps.

### Task 5: Decide about the Google Play Store (about $25 once)

Optional. A direct download link works for demos without it.

1. Decide whether you want the app in the Play Store.
2. Tell Claude your choice.

### Task 6: Choose vendors

1. Choose a map provider and an email provider. Claude can lay out the options and prices for you to compare. Nothing is bought without your yes.
