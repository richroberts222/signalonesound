# Signal One Sound: User Manual

For anyone using the site or the phone app. You do not need to know anything about the site first. Every section says what a part does, then gives the steps.

Signal One Sound helps you find church events and revivals near you, save the ones you like, and get told about new ones. The site is at www.signalonesound.com.

**Two kinds of people use it.**

* **Visitors and members** find events and churches. This manual covers them. Browsing needs no account.
* **Church or ministry managers** also post events for their church. They have extra steps in section 8.

Staff tasks (approving churches, moderating) are in `/docs/admin-manual.md`.

**Where things are not finished.** A few pages show a yellow "mock" or "exploratory" notice. They are practice screens, not real data. Section 10 lists them so you are not confused.

---

## 1. The menu

The menu is at the top of every page (on a phone, behind the menu button).

| Menu item | What it opens |
| --- | --- |
| Home | The front page |
| Discover | A practice page with sample events (see section 10) |
| Find a Church | Search for churches near you |
| Fire Map | A dark map showing where revival fire is burning |
| Dashboard | Your signed-in start page (only when signed in) |
| Account | Your details, saved events, alerts (only when signed in) |
| Admin | Staff only; everyone else sees "This page is only for platform admins." |

To search real events, go to `www.signalonesound.com/events`. This is the real event search. (The menu's Discover item still points at the practice page; that is a known item waiting on a decision.)

---

## 2. Create an account and sign in

You only need an account to save events, get alerts, give Fire, or manage a church.

1. Select **Sign up** (top of the page).
2. Enter your email and a password, or choose a sign-in option offered on the page.
3. Check your email for a code if you are asked for one, and type it in.
4. If a page asks you to accept the Terms and Privacy Policy, read them and accept. You cannot continue without accepting.
5. You are now signed in.

To sign in later: select **Sign in** and enter the same details. To sign out, use the account button at the top right.

---

## 3. Find events

1. Go to `/events`.
2. **Where.** Type a city or place in the place box, then pick a distance (the radius). Or select the locate button to use your current position. The site uses your position only to search; it does not store it.
3. **When.** Pick a date choice (for example this week), or enter a From and To date.
4. **Order by.** Choose **Soonest** (the default) or **Most fire** (events the most people have marked as fire).
5. Select **Search**.
6. Results appear as cards. Select **Load more** at the bottom for more.
7. Select a card to open the event page.

If nothing matches, the page says so. Try a bigger radius or wider dates.

---

## 4. An event page

An event page shows the title, the church or ministry, the date and time (in the event's own time zone), the address, a description, the speakers, and a line such as "Starts in 3 days" or "Happening now". Cancelled events are clearly marked.

Buttons on the page:

* **Share.** Opens your phone's share sheet. On a computer it copies the link and says "Link copied."
* **Add to calendar.** Downloads a calendar file (on the phone app, opens Google Calendar). Cancelled events are marked "CANCELLED".
* **Directions.** Opens a map with the venue address. Only the venue address is sent, never your position.
* **Fire** (sign in first). Select it to say this event is on fire. Select it again to take it back. The number shows how many people have done it.
* **Save** (sign in first). Keeps the event in your Saved list.
* **Report.** See section 9.

---

## 5. Find a church

1. Select **Find a Church** in the menu (`/churches`).
2. Search by place and distance the same way as events.
3. Select a church card to see its page: the address, the weekly meeting times, its website, and its upcoming events.
4. Select **Share this church** to share or copy the link.

---

## 6. Saved events, alerts and the Fire Map

**Saved events** (`/saved`, or Account, then Saved).
Everything you saved, soonest first. Select an event to open it. Remove one by opening it and using the Save button again. If the list is empty, **Find events** takes you to the search.

**Alerts** (`/alerts`, or Account, then Alerts). An alert tells you when a new event appears near a place you care about.

1. Select **New alert**.
2. Type a place, choose a distance and a time frame.
3. Choose whether you want an immediate message when a matching event is posted.
4. Select **Save**. Select **Cancel** to back out.

Reminders. Turn **Reminders** on to be told shortly before events you saved.

Quiet hours. Choose a **Quiet hours start** and **end**. The site will not send you anything in that window, in your own time zone. The default is 9 pm to 8 am.

Every alert email has an **Unsubscribe** link that works without signing in. It opens a page where you confirm, or choose **Manage** to change your settings.

**Fire Map** (`/fire-map`). A dark map of places with revival events. Places glow, from silver toward gold, as more people give Fire. The map shows counts only, never who gave Fire.

---

## 7. Your account

Go to Account in the menu, then **Account settings** (`/account/settings`).

* **Display name.** Type a name and select save.
* **Email me about events and updates.** The switch turns these emails on or off. Your sign-in email stays with our sign-in provider and is not copied.
* **Download everything we hold about you.** Select the export button to get a file of your information.
* **Delete my account.** Select the delete button, type the confirmation word it asks for, then confirm. This cannot be undone. Select cancel to stop.

**Invite a friend** (`/account/invite`). Select the invite button to create a personal link, then share or copy it. Someone who opens it sees a welcome page and can browse or sign up.

---

## 8. For church and ministry managers

You post events for your church or ministry. You must be approved first so nobody can publish under a church's name by mistake.

### 8.1 Claim your church

1. Sign in, then go to `/claim-church`.
2. Enter the **Church or ministry name**.
3. Add a short description (optional) and a link to the church website (the link box starts with `https://`). Select **Add** to add more links.
4. Enter a **Contact email**. It is used only for this review.
5. Select **Send request**.
6. The page says **Request received**. A staff member checks it. This can take time.

### 8.2 See your churches

Go to Account, then **My churches and ministries** (`/account/organizations`). Each church shows a status:

* **Waiting for review.** Staff have not decided yet.
* **You manage this.** Approved. You can post events.
* **Not approved.** Staff said no. Contact us from the Contact page.
* **Access removed.** Your management of this church was ended.

### 8.3 Edit your church profile

Open your church from the list and select its profile. Fill in the address (country, street, city, state or region, zip), the **Time zone of the church**, and your weekly meeting times (add each time you meet every week; use an event for special gatherings). Add a location on the map if you can. A church that has no map pin does not appear on the Fire Map yet. Save when finished.

### 8.4 Post an event

1. Open your church, then choose **New event**.
2. Fill in: **Title**, **Venue**, **Street, City, State, Zip, Country**, **Start**, **End**, **Time zone**, a **Description**, and **Speakers** (optional). Add **directions** notes if guests need them. Add links if you have them.
3. Pin the exact place on the location picker (search an address, or use your own location).
4. To repeat the event, choose **Repeats** and an end date (**Until**).
5. Choose **Save draft** to keep it private, or **Publish** to make it public.

### 8.5 Change, cancel or delete an event

Open your church's **Events** list. Use the filter to see **Upcoming**, **Past**, **Drafts**. For each event:

* **Edit / update.** Change details and save. For a repeating event, you choose **This occurrence only**, **This and following occurrences** or **The entire series**.
* **Cancel.** The event stays visible but marked **Cancelled**. People who saved it can see that.
* **Delete.** Removes it.
* **Publish** a draft when it is ready.

Always give a reason if a box for one appears (override reason). It is recorded.

---

## 9. Report a problem

If an event or church page looks wrong, fake, harmful, or shows private information about someone:

1. Select **Report** on that page.
2. Choose **What is wrong?** from the list.
3. Add details (optional, up to 1000 characters).
4. **Do not type personal information about yourself or anyone else.** Your report is anonymous.
5. Select **Submit**. You see a thank-you note. Staff review it.

---

## 10. What is not finished yet

* **Discover (menu) and the practice pages.** `/discover`, the Dashboard church screens, and several staff screens carry a "mock" notice. They show sample data only.
* **Phone app.** Search, Saved, Churches, Fire, Alerts and Add to calendar are built. Phone notifications need a new app build, so alerts reach you by email until then.
* **Not available yet.** Comments, flyers, live-stream links, prayer features, and payments. Nothing on the site charges money today.

If something does not work, use the **Contact** page (`/contact`). The **FAQ** page (`/faq`) answers common questions, and `/privacy` and `/terms` explain how your information is handled.
