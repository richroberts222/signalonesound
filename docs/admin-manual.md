# Signal One Sound: Admin Manual

For the people who run the site (platform admins). It assumes you know nothing about the site. Read section 1 first; then use the section for the job in front of you.

Normal visitors and church managers are covered in `/docs/user-manual.md`. Where an admin step relies on what a manager sees, that manual explains it.

**What an admin does, in one sentence:** keep listings trustworthy by approving who may post under a church's name, taking down content that is wrong or harmful, and (when the time comes) setting what things cost.

---

## 1. Before you start

### 1.1 Who is an admin

Admins are decided by a list of sign-in IDs kept in the site's settings (`ADMIN_USER_IDS`). It is not a button on the site. Nobody can make themselves an admin, and the check happens on the server for every action, not only when you sign in.

* To add or remove an admin, the owner changes that setting (see `/docs/how-to.md` and `/docs/environment.md`). This is an owner task, never a code change.
* Today the owner and the business partner share one login. The audit log therefore cannot tell the two of them apart (an accepted, recorded risk).

### 1.2 Sign in as an admin

1. Go to `www.signalonesound.com/sign-in` and sign in with the admin account.
2. Select **Admin** in the menu, or go to `/admin`.
3. If you are not an admin, admin pages say **"This page is only for platform admins."** and show nothing else. That is correct behavior, not a fault.

### 1.3 Real screens and practice screens

Some admin screens work on real data. Others are practice (mock) screens showing sample data; they carry a notice saying so. **Nothing you do on a practice screen changes the real site.**

| Screen | Address | Status |
| --- | --- | --- |
| Manager requests | `/admin/manager-requests` | **Real** |
| Moderation | `/admin/moderation` | **Real** |
| Audit log | `/admin/audit` | **Real** |
| Billing | `/admin/billing` | **Real** |
| Messages | `/admin/messages` | **Real** |
| Overview | `/admin` | Practice (sample counts) |
| Organizations | `/admin/organizations` | Practice |
| Events | `/admin/events` | Practice |
| Submissions | `/admin/submissions` | Practice |
| Import | `/admin/import` | Practice |

Not every real screen has a link in the admin sub-menu. The sub-menu shows Overview, Organizations, Events, Submissions, Import, Billing and Messages. **Open Manager requests, Moderation and Audit log by typing their address** (the table above) until their links are added.

### 1.4 The rules that always apply

* **Every action needs a reason.** A box labelled **Reason (required)** appears on each action. Type a short, factual sentence. An empty reason is refused.
* **Every action is recorded.** The audit log keeps who did it, what it was done to, the reason and the time. Entries cannot be edited or deleted.
* **Repeating a decision is refused.** If you press a button twice, or two admins decide the same thing, the second one is told it was already decided.
* **Do not copy personal information into reasons.** Describe the problem, not the person.

---

## 2. Approve or reject a church manager (Manager requests)

When someone claims a church, it waits here. Nobody can publish events for a church until an admin approves.

1. Open `/admin/manager-requests`.
2. The page lists **Requests waiting for a decision**. If it says **No requests are waiting**, you are done.
3. For each request, read who is asking and which church or ministry they claim.
4. **Check it is real.** Look at the website link they gave, the church's own site, or its public profile. If you cannot tell, do not approve; use the Contact address to ask. (The contact email they gave is for this review only.)
5. Type a short note in **Reason (required)**.
6. Select **Approve** (the page says **Approved.**) or **Reject** (**Rejected.**).
7. The person sees the new status on their **My churches and ministries** page: **You manage this** or **Not approved**.

Approving gives that person power to publish events under the church's name, so check carefully. A church may have several managers. If you approved by mistake, see section 4 (suspend) and ask the owner about revoking.

---

## 3. Handle reports and take content down (Moderation)

Visitors can report an event or church from its page, without signing in. Reports are anonymous, so there is no reporter to contact.

1. Open `/admin/moderation`.
2. **What needs attention.** The top shows the open reports, plus counts of **Unpublished churches** and **Suspended members**. If it says **No open reports**, the queue is clear.
3. For each report, read the reason the reporter chose (for example not a real event or scam, wrong or misleading church, personal information about a minor or private person, harassment or hateful content, copyright or legal, other) and any details.
4. Open the event or church in another tab and look at it yourself.
5. Type a reason in **Reason (required)**, then decide:
   * **Dismiss.** The report is wrong or minor. The page says **Report dismissed.**
   * **Mark as acted on.** You dealt with it another way. The page says **Report marked as acted on.**
   * **Hide the event** (or **Unpublish the church**). Takes it down straight from the report. The page says **Hidden from the public.**

### 3.1 Hide or restore an event

Use the box titled **Act on an event, a church or a member**.

1. Paste the event's id into the target box. (An event's id is the last part of its web address.)
2. Type a reason.
3. Select **Hide event**. The page says **Hidden from the public.** The event disappears from search, its page, the sitemap and cached lists within about a minute. People who open its old link see a "removed" page.
4. To undo it later, use **Restore event** with a reason.

### 3.2 Unpublish or restore a church

1. Paste the church's id and type a reason.
2. Select **Unpublish church** (**Church unpublished.**). The church disappears from public view.
3. **Restore church** brings it back.

### 3.3 Suspend or reinstate a member

A suspended person cannot change events or submit claims. They can still browse, download their data and delete their account.

1. Paste the member's id (it starts with `user_`) and type a reason.
2. Choose what happens to the events of the churches they manage: **Stay public** or **Are hidden**.
3. Select **Suspend member** (**Member suspended.**).
4. **Reinstate member** reverses it (**Member reinstated.**).

You cannot suspend yourself, and an admin cannot be suspended.

### 3.4 Telling the person

The plan is to email the affected manager with the reason and how to appeal. The email service is not switched on yet (it costs money and is the owner's choice), so **today nobody is emailed automatically**. If a decision affects a real person, tell them yourself through the Contact route and keep your message to the facts.

---

## 4. Read the audit log

The audit log answers "who did what, and when". Use it to check your own work, settle a dispute or answer a legal request.

1. Open `/admin/audit`.
2. Columns: **When**, **Action**, who did it, **What it was done to**, and the reason.
3. Narrow the list: type in the **actor** box (who did it), the **subject** box (what it was done to), and set **from** and **to** dates, then select **Search**.
4. If nothing matches, the page says **No entries match.**
5. **Export** downloads the filtered list as a file for a legal request. An export contains links between people and churches, so it is itself written to the log. Handle the file as private; send it only to the person who is entitled to it.

---

## 5. Read and answer messages

Messages sent from the public Contact page arrive here.

1. Open `/admin/messages`.
2. Read each message. **No messages yet** means none have arrived.
3. Reply from your own email (the site does not send replies for you).
4. When handled, select **Mark done** (**Marked done.**). Changed your mind? Select **Mark new** (**Marked new again.**).
5. Delete spam or finished messages (**Message deleted.**). Delete does not ask twice, so be sure.

Treat the senders' details as private. Do not paste them into reasons, tickets or the public repository.

---

## 6. Billing: prices, trials and coupons

**Nothing charges real money today.** Prices and switches here are set up in advance and start switched off. The payment company (Stripe) is added in test mode first; see `/docs/payments.md` and `/docs/features/s10-payments-plans-and-switches.md`. Do not turn anything on for real until the owner says so.

Open `/admin/billing`. It has three parts.

### 6.1 Billing rules (who pays)

There is a rule for each kind of account: **Churches and ministries**, and members.

* **Payment is required** versus **Free: payment is skipped.** This one setting decides whether the whole group pays. Launching with everyone free is just this setting.
* **Free trial (days, 0 for none).** Whole numbers only.
* **Default plan** (or **No default plan**).

### 6.2 Plans

1. Under plans, select **New plan**.
2. Fill in **Plan name**, **Who it is for** (**Churches and ministries** or members), **Every month** or **Every year**, **Price (dollars)** (like 3 or 3.50, up to $10,000) and the currency (**US dollars**).
3. Save. The page says **Plan created. It is inactive until you turn it on.**
4. Turn on **Active (people can subscribe)** only when you are ready.
5. To change a price, enter the **New price (dollars)**. The page says **New price saved. Current subscribers keep the price they bought.**

### 6.3 Coupons

1. Select **New coupon**.
2. Enter a **Code**, choose **Percentage off** (1 to 100) or **Dollars off** (like 5 or 5.50). One use per account.
3. Optionally set **Expires** and **Most uses in total**.
4. Turn a coupon on or off at any time (**Coupon turned on.** / **Coupon turned off.**).


### 6.4 Give one member another free trial

Use this when a member asks for another look, or you want to treat someone kindly.

1. In **Give a free trial**, enter the **Member id** (it starts with `user_`).
2. Enter **Days of trial** (1 to 365).
3. Enter a **Reason (required)** and select **Give trial**. The page says **Trial given.**
4. The new trial ends that many days from now and replaces any earlier trial end.
5. A member who is already paying (or whose payment is late) cannot be given one: the page tells you so and nothing changes.
6. The grant appears in the change history with your reason.

To turn the automatic first trial off for everyone, set **Free trial (days)** to 0 in the billing rule.

### 6.5 Free for life (the first 50 flagship churches and ministries)

1. In **Free for life**, the line under the title shows how many of the 50 places are used.
2. Enter the **Church or ministry id** (shown in the church's web address) and a **Reason (required)**.
3. Select **Give a place**. The church never pays, whatever the billing rule says.
4. **Remove the place** takes it back, and the normal billing rule applies again.
5. A church that already pays cannot be given a place. When all 50 are used, the page says so.

A church's managers see their plan on **My churches and ministries**, then **Membership**.

### 6.6 Perks: what each plan includes

A perk is a benefit that a plan can include, such as "No ads" or "Event promotion". You decide what exists and what each plan includes, and you can change it any time.

1. In **Perks: what each plan includes**, fill in **Name people see**, a **Key**, who it is **for** (members, or churches and ministries) and an optional **Short description**.
2. The **Key** is a short code: lowercase letters, numbers and underscores, 3 to 40 characters, starting with a letter. It cannot be changed later.
3. Select **Add perk**. The page says **Perk added.**
4. Under **What each plan includes**, tick the perks each plan gives, then select **Save what this plan includes**. Saving replaces that plan's list.
5. Untick **Switched on** next to a perk to stop offering it everywhere without deleting it.
6. While payment is not required, everyone has every perk that is switched on. A free trial gets the perks of the default plan (or every perk when no default plan is set). A free-for-life church gets every church perk.
7. Nothing in the site is locked behind a perk yet. A feature only becomes paid when it is built to ask for a perk; until then these lists show what plans will include and change nothing else.
Every billing change is listed at the bottom as a change history. **No changes yet** means nothing has been changed.

---

## 7. The practice screens (for planning only)

The Overview, Organizations, Events, Submissions and Import screens show sample data so the owner can judge how staff might manage content from many sources (for example imported spreadsheets). They do not change the real site. Use them to explore and give feedback; do not rely on their numbers.

---

## 8. Everyday checklist

Daily (or whenever you are told something is waiting):

1. Open **Manager requests**; decide each one (section 2).
2. Open **Moderation**; clear the report queue (section 3).
3. Open **Messages**; reply and mark done (section 5).

Weekly: skim the **Audit log** for anything you do not recognize (section 4).

If something strange happens (a page that should work does not, an action you did not take shows in the log, or you think someone else has your login), stop and follow `/docs/incident-response.md`, then tell the owner.

---

## 9. Staying safe

* Never share the admin login in a message, screenshot or ticket. Never put passwords, keys or links with passwords into the repository or into a reason box (`/docs/secure-coding.md`).
* Do not collect real people's data outside the site. No real user data is collected until the legal checks in `/docs/risk-and-legal.md` are done.
* Take-downs follow the report-and-takedown steps in `/docs/risk-and-legal.md`.
* The production database and settings change only through the owner's documented steps (`/docs/database.md`, `/docs/how-to.md`). Admin screens never need them.

---

## 10. Words you will see

* **Organization / church / ministry.** A church or ministry account that can post events.
* **Manager.** A person approved to post and edit for one organization.
* **Hide / unpublish.** Remove from public view without deleting. Both can be undone.
* **Suspend.** Stop a member changing events or making claims.
* **Reason.** The sentence you must give for every action.
* **Audit log.** The permanent, uneditable record of every admin action.
* **Mock / practice screen.** A screen with sample data that changes nothing.
