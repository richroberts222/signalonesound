# To-do: what only the owner can do right now

This file holds only the actions still waiting on you. Claude removes an item as soon as it finds the item is done, so if it is in this file, it is still open. The long, permanent guides are in `docs/how-to.md`; this file is the short, current list. Things Claude is doing, and requirements before real users arrive (legal gates, the restore drill, choosing and connecting an email provider, and so on), are tracked in `docs/release.md` section 9, not here.

**How to read it.** Each task is a heading. Numbered steps are things you do in order. Indented lines under a step say where to look and what you should see. If a screen does not match, take a screenshot and tell Claude.

**Rules.**
1. Never paste a password, secret key or token into the chat or into any file in the repository.
2. A line that says **Claude can do this, say yes** is automated once you give permission.
3. Anything that costs money or changes policy waits for your yes or no.

---

## NOW

### Task 1: Read the public pages and tell Claude what to change (about 15 minutes, no rush)

Claude wrote the words on the public pages from the product plan. You and Amy should read them before launch: they are what a stranger sees first. Nothing is broken if you wait.

1. Open each page on the live site and read it.
    - `www.signalonesound.com` (the landing page)
    - `www.signalonesound.com/services`
    - `www.signalonesound.com/about`
    - `www.signalonesound.com/faq` (click each question to open its answer)
    - `www.signalonesound.com/contact`
2. Note anything that sounds wrong, is untrue, or is missing.
    - Does it sound like Signal One Sound?
    - Is every promise true today? (Claude kept them cautious: "free during early access", "coming", "being switched on".)
3. Send your notes to Claude in the chat, in any form (a list is fine). Claude changes the wording and removes this task.

**Optional:** on the dev site (`http://192.168.50.165:3000`, Claude starts it on request) the contact form is on. Send yourself a message, then read it under **Admin**, then **Messages**.

### Task 2: Practice restoring the database (about 15 minutes)

A backup is only real if a restore works. This uses a **copy** of the live database on a temporary branch, so the live data is never touched. The free Neon plan keeps only 6 hours of history, so the copy must be from within the last few hours.

1. Open the Neon console.
    - Go to `console.neon.tech` and open the project **SignalOneSound**.
    - Click **Branches** in the left menu.
2. Create a copy from a past moment.
    - Click **Create branch** (top right).
    - Name: `restore-drill`
    - Parent branch: choose **production**.
    - Look for an option to create it **from a past point in time** (it may say "Time" or "Specify a point in time"). Pick about one hour ago.
    - Click **Create**.
3. Check the copy has the data.
    - Open the new `restore-drill` branch and click **SQL Editor**.
    - Run: `select count(*) from billing_plan;` and then: `select count(*) from user_profile;`
    - The first should say 2 (the two proposed plans). The second is however many accounts existed an hour ago.
4. Delete the copy.
    - Back in **Branches**, open `restore-drill` and delete it, so no extra branch is left running.
5. Tell Claude the result (what the two numbers were, and whether any step was missing or different). Claude records it in `docs/release.md` and removes this task.

If a screen does not match these words, take a screenshot and send it to Claude.

### Task 3: Turn on GitHub's free security features (about 10 minutes)

These are free for a public repository. They watch for known-vulnerable packages and leaked secrets.

1. Open the repository's settings.
    - Go to `github.com/richroberts222/signalonesound`, click **Settings** (the last tab), then **Advanced Security** (or **Code security**) in the left menu.
2. Switch these on, one at a time (each is a toggle or an **Enable** button).
    - **Dependabot alerts**
    - **Dependabot security updates**
    - **Secret scanning**, and its **Push protection**
    - **Code scanning**: choose **Default setup** and accept the defaults.
3. Check one more setting.
    - In **Settings**, then **Actions**, then **General**, scroll to **Workflow permissions**.
    - It should say **Read repository contents and packages permissions**. If it does not, choose that and click **Save**.
4. Tell Claude which ones were available and which you switched on. Claude records it in `docs/risk-and-legal.md` and removes this task.

### Task 4: Try the phone app's new look (when you are at the PC)

Nothing to prepare: say "start the phone server" in the chat, and Claude starts the web and phone code servers. Then reopen the app on your Android phone. You should see the dark theme, buttons that dim when pressed, and the search status right under the buttons. Send Claude anything that looks wrong.

---

==================================================
==================================================

# COSTS MONEY: your yes or no is needed first

Claude never spends money or opens a paid account. Each task here is your decision. None of them is needed for the partner demo.

==================================================
==================================================

### Task 5: Choose the Apple Developer account (about $99 per year)

Needed for the iPhone app. Costs money, so it is your decision (question Q-011).

1. Decide between **Individual** and **Organization**.
    - Organization needs a D-U-N-S number, which is free but takes time to obtain.
2. Tell Claude your choice. Claude then gives the sign-up steps.

### Task 6: Decide about the Google Play Store (about $25 once)

Optional. A direct download link works for demos without it.

1. Decide whether you want the app in the Play Store.
2. Tell Claude your choice.
