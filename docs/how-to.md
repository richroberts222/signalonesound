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

Until this is done the webhook refuses every request (this is the safe default). Account deletion from the account page still works without it; the webhook only handles a deletion that happens in the Clerk dashboard.

---

## 6. Create a test user for the automated browser tests (optional now)

1. In the Clerk **development** instance, create a user with a username and password that is only for tests.
2. Put these in `apps\web\.env.local` (git ignores it): `E2E_CLERK_USER_USERNAME` and `E2E_CLERK_USER_PASSWORD`.
3. See `apps/web/playwright.config.ts` for the other values the browser tests need. Claude can walk you through it.

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
