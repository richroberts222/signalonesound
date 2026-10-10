# How-to: the steps only the owner can do

These are the things Claude cannot do for you, because they need your logins, your accounts, your money or a physical phone. Everything else is built and tested by Claude. Do them in any order, when you are ready. Nothing here is urgent unless it says so.

**Three rules for everything below.** (1) Never paste a password, a secret key, or a token into the chat or into any file in the repository. Public values (marked "public") are fine in the settings files named below, and those files are ignored by git. (2) Anything that costs money: stop and ask Claude first. (3) If a command prints an error, copy the error text (not any key) and send it to Claude.

All commands are typed in PowerShell on your PC.

---

## 1. Already done

* Expo account and project: `eas login` and `eas init` ran, and the project id is in `apps/mobile/app.config.ts` (account `team-jesus`, project `signalone`).

---

## 2. Make the phone app's settings file (public values only)

```
cd E:\dev\signalOneSound\apps\mobile
notepad .env.local
```

Put these three lines in, replacing the placeholders, then save. Git ignores this file.

```
EXPO_PUBLIC_APP_ENV=dev
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=<the pk_test key from the Clerk dashboard, API keys page>
EXPO_PUBLIC_API_BASE_URL=<address of the web app the phone talks to, see section 3>
```

The Clerk publishable key is public by design. Never put the secret key (`sk_...`) here.

---

## 3. Run the web app on your PC (so the phone has something to talk to)

The web app needs its own settings file with the development database and Clerk keys. If you already run the web app locally, you have it. If not, ask Claude and it will walk you through it; it needs values from the Neon and Clerk dashboards.

```
cd E:\dev\signalOneSound
pnpm install
pnpm --filter web dev
```

Open `http://localhost:3000` in your browser to check it works. Leave that window running.

**Find your PC's address on your home network** (the phone reaches your PC at this address):

```
ipconfig
```

Look for "IPv4 Address" under your Wi-Fi or Ethernet adapter, for example `192.168.1.25`. The phone's address setting is then `http://192.168.1.25:3000`. Your phone must be on the same Wi-Fi. If the phone cannot reach it, Windows Firewall is usually blocking port 3000: when Windows asks "allow access" for Node.js, allow it on private networks.

When the Vercel preview limit has reset, you can use the preview address of the latest `main` instead, and then the PC does not need to run the web app.

---

## 4. Test the phone app on Android (free to try; iPhone needs a paid Apple account)

Android is the cheapest first test. iPhone needs the Apple Developer Program (about 99 dollars a year), so leave iPhone until you decide to pay for it.

**4a. Check what your Expo plan includes before building anything.** Open https://expo.dev/accounts/team-jesus/settings/billing and look at the build allowance of your plan. A development build uses one build. Tell Claude what you see; do not build until you have said "go".

**4b. Build the development app (once).** This makes an Android app file you install on the phone. It uses Expo's build service, so it counts against your allowance:

```
cd E:\dev\signalOneSound\apps\mobile
npx eas-cli build --profile development --platform android
```

When it asks to generate an Android keystore, say yes (Expo keeps it for you). The build runs in Expo's cloud and takes about 10 to 20 minutes. When it finishes it prints a link and a QR code.

**4c. Install it on the phone.** Open the link or scan the QR code with the phone, download the file, and install it. Android will ask you to allow installing from this source: allow it for that browser only. The app is called Signal One Sound.

**4d. Start it.**

```
cd E:\dev\signalOneSound\apps\mobile
npx expo start --dev-client
```

Open the Signal One app on the phone and point it at the address shown (or scan the QR code). You should see the sign-in screen. Sign in with a test user from your Clerk development instance. After sign-in the app shows "You are signed in" with a Sign out button.

If something does not work, send Claude the exact error text from the PC window or the phone screen.

---

## 5. Clerk: create the webhook (needed for account deletion to stay in sync)

This needs a public web address, so do it after the web app is deployed (a Vercel preview or production address, not localhost).

1. In the Clerk dashboard, open **Webhooks** and choose **Add Endpoint**.
2. Endpoint URL: `https://<your web address>/api/v1/webhooks/clerk`.
3. Subscribe to the events **user.deleted** and **user.updated**.
4. Create it, then copy the **Signing Secret** (it starts with `whsec_`).
5. In the Vercel project settings, **Environment Variables**, add `CLERK_WEBHOOK_SIGNING_SECRET` with that value, for the Preview environment (and Production when it exists). Do not paste it anywhere else.
6. Redeploy so the new variable is picked up.

**Not possible yet:** the web app has no stable public address (Vercel preview and deployment addresses change with every build and are behind Vercel's login protection, which also refuses Clerk), so leave this until the production go-live; it is listed in `/docs/release.md` section 9.

Until this is done the webhook refuses every request (this is the safe default). Account deletion from the account page still works without it; the webhook only handles a deletion that happens in the Clerk dashboard.

---

## 6. Create a test user for the automated browser tests (optional now)

1. In the Clerk **development** instance, create a user with a username and password that is only for tests.
2. Put these in `apps\web\.env.local` (git ignores it): `E2E_CLERK_USER_USERNAME` and `E2E_CLERK_USER_PASSWORD`.
3. See `apps/web/playwright.config.ts` for the other values the browser tests need. Claude can walk you through it.

---

## 6b. Make yourself a platform admin (needed to approve church requests)

Admins are people whose Clerk user id is in a list in the settings. Nobody is an admin until you do this.

1. In the Clerk dashboard (development instance), open **Users**, click your user, and copy the **User ID** (it starts with `user_`).
2. Put it in the web app's settings file `apps\web\.env.local` (git ignores it):
   ```
   ADMIN_USER_IDS=<your user id>
   ```
   For a second admin, separate the ids with a comma: `ADMIN_USER_IDS=<id one>,<id two>`.
3. For the Vercel preview and production sites, add the same variable in the Vercel project settings, **Environment Variables**.
4. Restart the web app (`pnpm --filter web dev`) so it picks the value up.

Then sign in, claim a church at `/claim-church`, and approve the request at `/admin/manager-requests`. Anyone who is not on the list sees nothing at that page.

---

## 6d. Moderation (what to do when someone reports something)

Sign in as an admin (see 6b) and open `/admin/moderation` for the report queue and `/admin/audit` for the record of what was done. Every action asks for a reason. Optional: set `RATE_LIMIT_SALT` (a long random value, at least 16 characters) in Vercel and `apps\web\.env.local`; it only makes the report-form limit survive a server restart. The real contact address (for appeals) is yours to choose; see section 10.

---

## 6c. Set the secret for scheduled jobs (needed for the daily clean-up)

The daily clean-up (saved events 30 days after an event, expired invite links) is called by Vercel with a secret. Without it the clean-up refuses to run (the safe default).

1. Make up a long random secret (at least 16 characters; a password manager can generate one). Do not paste it anywhere but the two places below.
2. In the Vercel project settings, **Environment Variables**, add `CRON_SECRET` with that value (Preview and Production). Vercel then sends it automatically to the scheduled calls.
3. Optional, to run a job on your own PC: add `CRON_SECRET=<the value>` to `apps\web\.env.local`.

---

## 6e. Turn on push messages and unsubscribe links (when you are ready to test alerts)

Alerts are built, but nothing is actually sent until you switch it on, so development never messages anyone.

1. In Vercel, **Environment Variables**, add `PUSH_PROVIDER` with the value `expo` (Expo's push service is free at small scale; it sees the phone's push address and the short title and place, nothing else).
2. Add `UNSUBSCRIBE_SECRET`: a long random value (at least 32 characters). Never change it afterwards, or links already sent stop working.
3. Alerts are sent by the daily job (about 9:30 am Central). On the free Vercel plan jobs can run only once a day. If you want alerts to arrive as events are posted, you would need a paid Vercel plan (about 20 dollars a month); tell Claude and it will change the schedule.
4. The phone app asks for permission to send messages when you create your first alert (this arrives with the phone screens).

---

## 6f. Create the tables in the production database (one-time setup, then one button)

Production starts empty. Our rules forbid doing this from your PC, so it is done by a GitHub workflow that only you can approve. Do the steps in order.

1. **Create the approval gate (GitHub).** Open the repository on github.com, then **Settings**, **Environments**, **New environment**, name it exactly `production`, and click **Configure environment**.
2. Tick **Required reviewers** and add **yourself**. Under **Deployment branches and tags**, choose **Selected branches and tags**, and add `main`. Save the protection rules.
3. **Add the database address as an environment secret.** In that same `production` environment, under **Environment secrets**, click **Add secret**: name `DATABASE_URL`, value the **production branch** connection string from Neon (Connect, Branch: production). It is the same value you put in Vercel. Never paste it into chat.
4. **Run it.** Open the repository's **Actions** tab, choose **Migrate production** on the left, click **Run workflow**, pick branch `main`, type `migrate-production` in the box, and run. It will wait for your approval: open the run and click **Review deployments**, tick `production`, and **Approve and deploy**.
5. The log should end with `done; applied=<n> pending=0.` Then the live site's data pages start to work.

Run it again whenever new database changes have been merged and tested; it only applies what is pending. A Neon restore point should exist first (see section 7).

---

## 7. Database restore drill (about 20 minutes, in the Neon console)

This proves the database can be restored, which is a launch requirement. The steps and the log to fill in are in `/docs/database.md` section 12.4. Ask Claude to walk you through it when you are at the PC; it needs your Neon login.

---

## 8. GitHub security settings (needs your OK, then 10 minutes)

When you are ready, tell Claude "you may change the repository security settings", or do it yourself in GitHub, Settings, Code security:

* Turn on **Dependabot alerts** and **Dependabot security updates**.
* Turn on **Secret scanning** and **Push protection**.
* Turn on **Code scanning** (CodeQL, default setup).
* Settings, Actions, General: set the default workflow token to **read-only**, and require actions to be pinned to a full commit.
* Check Settings, Password and authentication: two-factor sign-in (you accepted the risk of not using it for now).

---

## 9. Let Claude read your Expo builds (optional)

Close Claude Code on the PC, open PowerShell, and run:

```
cd E:\dev\signalOneSound
claude --continue
```

Then type `/mcp`, choose **expo**, and sign in through the browser. Choose the narrowest permissions offered. Claude uses only the read tools and asks before starting a build or a store submission.

---

## 10. Decisions only you can make (these are not commands)

* **Contact email address** shown on the Contact page, for questions, takedown requests and privacy requests. Needed before real users.
* The open-source license (default: all rights reserved, no license file).
* Which mock screens survive (Q-005) and the app's final name and store identity (Q-011).
* Any account that costs money: Apple Developer Program, Google Play developer account, a domain name, a paid plan with Vercel, Neon, Expo or Clerk.

Claude will ask before any of these, and records each decision in the repository.
