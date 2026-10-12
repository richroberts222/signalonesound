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
    - `www.signalonesound.com/privacy` (after the map location picker ships, it has one new paragraph under "Who it is shared with" about the map service; check it says what you are comfortable promising)
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

### Waiting, no action yet: the next Android build

Do not build yet. The free Expo plan allows 15 builds a month, so the next build waits for a big batch of phone changes (owner, 2026-10-11). It will carry: the new app icon (your phone still shows the green Android robot until then), the Saved tab and the Save button on events (both already work through the dev server without a build), and anything else we add for the phone before then. Tell Claude when you want it; Claude will not start a build on its own.

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

### Optional: remove "Secured by Clerk" (Clerk Pro, paid)

Clerk shows a small "Secured by Clerk" line on its sign-in cards. Removing it is a paid Clerk Pro feature (the switch is under Configure, Settings, Branding). It does not affect how anything works and most visitors will not care, so it can wait until money is coming in. Tell Claude if you want it; nothing is bought without your yes.

### Three decisions Claude needs from you (no rush; nothing is blocked)

Claude kept building other things while these wait.

1. **The "Discover" menu item opens a mock page.** The menu's Discover goes to `/discover`, the interactive design mock with fictional churches and a "mock" banner. The real search (real events, real Fire totals, the new "Order by" choice) is at `/events` and is not in the menu. Choose: **A)** point the menu's Discover at the real search and keep the mock for reference, **B)** build the mock's look (map, filters) onto the real data, then replace it (larger), or **C)** leave it as it is until launch. Claude recommends A now, then B.
2. **Search-engine event markup needs a small exception to a security rule.** Google shows events as rich results when a page carries schema.org "Event" markup (a block of JSON in a script tag). Our rule `react/no-danger` forbids injecting raw HTML, and a JSON script tag needs exactly that. Claude can add one tiny, tested component that escapes the data and carries a single, documented exception for this one use. Say yes if you want it; Claude will not change the rule without your yes.
3. **Phase 2 (the Prayer Movement) is not started.** The product plan lists the 24/7 Prayer Chain, the Prayer Calendar, the Revival Countdown for churches and the Prayer Wall as Phase 2 and marks them "Not authorized". The simple event countdown is built. Everything else in Phase 1 that is not undecided or paid is built too, so this is what is left. Tell Claude if you want Phase 2 started and in what order. Claude recommends the Prayer Chain first (members choose a weekly hour; a "Prayer happening right now" count), because it needs no user-written text. The Prayer Wall is last: prayer requests are user-written and can be sensitive (health, family), so it needs moderation, a privacy decision and a new data tier first.

### Go-live: turn the production database approval back on

Until launch the owner has switched off "Required reviewers" on the GitHub production environment (Settings, Environments, production) so Claude can merge database changes and run Migrate production without waiting for a tap. This was agreed on 2026-10-12 to speed up early development, while no real user data exists. Before go-live: tick "Required reviewers" again, add yourself, save, and tell Claude so the hold on production database changes returns.

### Task 7c: Decide how to rate limit the public site before launch (about 10 minutes, not needed for the demo)

A rate limit stops one visitor from hammering the site. Nothing limits the public pages today. The recommended way is Vercel's built-in Firewall (you set it in the Vercel dashboard, no code, and we never store visitors' addresses). Read the short brief in `docs/features/s9-launch-gate.md` ("Rate limits on public endpoints"), check that your Pro plan includes rate limit rules and what they cost, and tell Claude A (Vercel Firewall) or B (our own, in the database). If you choose A, Claude gives you the exact rules to enter and checks them afterwards.

### Task 7b: Choose a dependable map service before launch (about $25 per month)

The event location picker (spec: `docs/features/s17-event-location.md`) starts on MapTiler's free plan, which is for personal and non-commercial use. Before real users arrive, decide on a paid plan (MapTiler's commercial plan was $25 a month when checked on 2026-10-11) or another service. Not needed for the partner demo. Tell Claude your choice; nothing is bought until you say yes.

### Task 6: Decide about the Google Play Store (about $25 once)

Optional. A direct download link works for demos without it.

1. Decide whether you want the app in the Play Store.
2. Tell Claude your choice.
