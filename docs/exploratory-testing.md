# Exploratory testing guide

For the owner, acting as the exploratory tester. Exploratory testing means using the product like a curious, slightly mischievous person and writing down everything that surprises you. You do not need to follow a script, and you do not need to be technical. This guide gives you places to look and ideas to try.

**What you are looking for:** bugs (it does something wrong or confusing), feature requests (it works but you wish it did more), and "this feels off" notes (wording, colors, speed, anything). All three are useful.

---

## 1. How to report what you find

Tell Claude in the chat, as you go, in your own words. A short note is enough, and a screenshot helps. Claude logs each one as a GitHub issue and keeps the running list.

For a bug, the most useful note says four things:

1. **Where you were** (the page or screen, web or phone, and which phone).
2. **What you did** (the steps, in order).
3. **What you expected.**
4. **What happened instead** (and the exact message, if there was one).

Example: "Phone, Discover tab. I typed Boise and pressed the keyboard's search key. I expected events. It showed 'We could not load events.'"

**Severity, so Claude can order the fixes:**

| Level | Meaning | Example |
| --- | --- | --- |
| Blocker | Cannot continue, or data is lost or exposed | Signing in fails; someone else's data is visible |
| Major | A main feature does not work | Search returns nothing when it should |
| Minor | Works, but wrong or awkward | A button looks stale when tapped |
| Polish | Wording, spacing, colors | Phone colors differ from the web |

You do not have to pick a level. Claude will propose one.

---

## 2. Where to test

| Place | Has sample events? | Use it for |
| --- | --- | --- |
| Your PC's dev server (`http://192.168.50.165:3000`, started by Claude on request) | Yes (sample churches in Nashville, Tampa, Memphis, Atlanta, Dallas, Charlotte, Birmingham, Louisville, Oklahoma City, Phoenix, and Boise, Nampa and Meridian, Idaho) | Everything: search, events, saving, alerts, claiming, admin |
| The phone app on your Android (connects to the same dev server) | Yes | The phone screens |
| The live site (`www.signalonesound.com`) | No (empty on purpose) | Sign-up, sign-in, empty states, public pages, how it looks and feels for a stranger |

All sample churches are labeled "(Sample)". Nothing you do on the dev server touches real people.

**Never type a real person's private information into any test.** Use made-up names and the test email style `name+clerk_test@example.com`.

---

## 3. Test charters

A charter is a short mission: "explore this area looking for these kinds of problems." Spend 15 to 30 minutes on one, then write down what you found. Tick the boxes as you go; you do not have to do them all.

### 3.1 Finding events on the web (no account needed)

- [ ] Open the Discover page. Search "Nashville, TN" with the default distance. Do you see events? Do they look right (dates, times, church names)?
- [ ] Try a ZIP code, a city with no state, a misspelled city, and a city with no sample churches (for example Anchorage). Is each result or message helpful?
- [ ] Change **How far**, **When** and the **Kind of gathering** filters, one at a time and then together. Do the results change sensibly? Is the result count believable?
- [ ] Press **Find events** with no place at all. What do you get?
- [ ] Open an event. Check the date and time (is it clear which time zone?), the church link, the map or directions link, and the share and add-to-calendar buttons.
- [ ] Use the browser's Back button after opening an event. Are your search and filters still there?
- [ ] Copy an event's address from the address bar and open it in a private window. Does it still work when signed out?
- [ ] Try the page on a narrow window or your phone's browser. Does anything overflow, overlap, or become unreachable?
- [ ] Try keyboard only (Tab, Enter, Space). Can you do a whole search without the mouse? Can you always see where the focus is?

### 3.2 Signing up, signing in and your account (web)

- [ ] Sign up with a test email (`yourname+clerk_test@example.com`; the emailed code is always `424242`). Is each step clear?
- [ ] After signing in, you should see the "Before you continue" screen (age and terms). Try pressing **Continue** with neither box ticked, then with one. Are the messages clear?
- [ ] Open **Account**. Look at every setting. Try changing and saving each one.
- [ ] Try **Download my information** (export). Does the file make sense? Is anything in it surprising?
- [ ] Sign out, then try to open an account page directly by its address. Where does it send you?
- [ ] Sign in on a second browser or private window at the same time. Do both work?
- [ ] **Delete account:** try it with a throwaway test account only. Is the warning clear? Does it really remove you?

### 3.3 Saving events, invites and alerts (web)

- [ ] Save an event. Find it in your saved list. Remove it. Save it twice quickly. Does anything break?
- [ ] Create an alert (a place, distance, timeframe and kinds of gathering). Edit it, pause it, delete it. Try to create more than 10.
- [ ] Look at the notification settings (reminders, quiet hours). Do the words match what you would expect them to do?
- [ ] Try an invite link if you can make one. Open it signed out and signed in.

### 3.4 Claiming a church and the church dashboard (web)

- [ ] Start claiming a church. Try leaving each field empty, then a website with no `https://`, then a very long name, then odd characters. Are the error messages specific?
- [ ] Look at the dashboard after claiming. What can you do before the claim is approved?
- [ ] Create an event as a church manager. Try a date in the past, an end before the start, a missing place, and a very long description.
- [ ] Try a recurring event. How many events does it create? Can you cancel or delete one of them?
- [ ] Look for anything that tells you who can see what (draft vs published).

### 3.5 The admin pages (web, only if you are a platform admin)

You are an admin on the live site. On the dev server, ask Claude to add you.

- [ ] Open **Moderation**, **Billing** and the audit log. Do they load? Does the notice at the top say which sections are real?
- [ ] **Billing:** turn "Payment is required" on for Members and save, then off again. Watch the change history. (Nothing real is charged: no payment provider is connected.)
- [ ] **Billing:** create a plan. It should start **inactive**. Change its price. Create a coupon with a percentage, then one with dollars. Try a bad code, an empty code, and a percentage over 100.
- [ ] Try the sections marked as previews (Organizations, Events, Submissions, Import). They show sample data and save nothing. Is that obvious enough?
- [ ] Sign in as a normal member and try to open an admin address. You should be told it is for admins only, and nothing should leak.

### 3.6 The phone app

- [ ] Open the app cold (swipe it away first). How long until you see something? Is there a loading message?
- [ ] **Discover tab:** search a place with the keyboard's search key and with the **Search place** button. Try **Use my location** (allow it, then deny it on a second try).
- [ ] Turn on airplane mode and search. What do you see? Is it clear what to do next?
- [ ] Open an event and go back. Rotate the phone. Does anything break?
- [ ] Look at the **Saved**, **Alerts** and **Account** tabs. Some are placeholders for now; note anything that looks half-finished in a confusing way.
- [ ] Use the app with a big text size set in the phone's accessibility settings.
- [ ] Switch the phone between light and dark mode. Is everything readable?
- [ ] Note anything that feels slow, small to tap, or confusing, even if it "works."

### 3.7 Trust, safety and the public pages (web and phone)

- [ ] Read the Terms, Privacy, About and Contact pages. Are they accurate for what the app does today? Is anything missing that you would want to know as a stranger? (The legal wording is still a draft for review.)
- [ ] Find the **Report** option on an event. Send a test report. Is it clear what happens next?
- [ ] Try pasting odd text into search boxes and forms: very long text, emoji, `<b>bold</b>`, quote marks. Nothing should break the page or show up as formatting.

### 3.8 Feel and first impressions (always worth doing)

- [ ] Pretend you are a pastor who has never seen the app. Could you tell in ten seconds what it is for?
- [ ] Pretend you are someone who wants to find a revival this weekend. How many taps or clicks until you have an answer?
- [ ] Does the wording sound like the Signal One Sound you want? Note any word that feels wrong.
- [ ] What is the one thing you most wished it did while you were testing?

---

## 4. Known gaps (no need to report these again)

- **Phone:** the error message appears at the bottom, not near the search box; tapped buttons give no feedback; the colors differ from the web; add-to-calendar, the offline notice, account export and delete, and the Saved and Alerts screens are not finished.
- **Web:** the "Admin" link in the header shows to every signed-in member, even though only platform admins can use the pages behind it (members are told it is for admins only).
- **Not built yet:** real payments (Stripe checkout), email sending (emails go to a log), a map, church screens for choosing a plan, iPhone app, store releases.
- **Live site:** no sample events by design; real data waits for the legal checklist.

## 5. After a testing session

Send Claude your notes in any shape (a list, a paste, photos). Claude will log them as issues, sort them by severity, and propose an order. You choose what comes first. Each bug that gets fixed also gets an automated test, so it cannot quietly come back. The browser tests that run on every pull request are described in `/docs/automation/playwright.md`.
