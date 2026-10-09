# Application Blueprint and Implementation Plan (draft 1)

**Status: proposal for the owner's approval and an independent review. It does not authorize implementation.** Only an approved issue and its feature specification authorize work (`/docs/product-development.md`). Direction comes from `/docs/product/product-plan.md` (derived from `/docs/product/source-product-plan.md`). Every item the source marks UNDECIDED stays UNDECIDED here and is listed in section 10 for the owner. Technical recommendations in this document are marked **Proposed** and are the assistant's to decide unless they involve policy, product shape or spending.

How to read it: sections 1 to 4 say what the platform is and how it is built; 5 to 7 say how it looks and behaves in Phase 1; 8 and 9 say what is built, in what order, with what; 10 lists what only the owner can decide; 11 says what to scrutinize.

## 1. What is being built

One platform, three clients (web, iPhone, Android), one shared API, one identity system, one database. The mission is to connect believers with churches, ministries and revival gatherings. The first problem to solve extremely well is **finding revival events near you and being told when one is coming**; everything else in the source plan builds on that.

| Phase | Source name | Core idea | Plan status |
| --- | --- | --- | --- |
| 1 (months 1 to 12) | Launch | Event discovery map and search, free member accounts, Church/Ministry portal to publish events, notifications | **Detailed in this blueprint** |
| 2 (year 2) | Prayer Movement | 24/7 prayer wall, prayer chain, prayer calendar, revival countdown, premium tiers | Epic outline (section 9) |
| 3 (year 3) | Marketplace | Ministry marketplace, merchandise, digital resources | Epic outline |
| 4 (year 4) | Streaming | Livestreams, revival radio, podcasts | Epic outline |
| 5 (year 5) | Inter-National Network | International map, directories, AI assistant | Epic outline |

Each later phase is gated by its own approvals; nothing beyond Phase 1 is designed in detail until Phase 1 has real users.

## 2. People and roles

| Role | Who | How granted | Notes |
| --- | --- | --- | --- |
| Visitor | Anyone, not signed in | n/a | Can browse public events (the attendee privacy posture in section 6 keeps this anonymous) |
| Member | A signed-in user, 18 or older | Sign-up; self-attested age; terms accepted | Free accounts at launch; paid tiers UNDECIDED |
| Church/Ministry manager | A person who runs a Church/Ministry account | Requests the role; a platform admin approves | An organization may have several managers (default, revisable) |
| Platform admin | The owner and the business partner (one shared login by choice) | Server-side allow-list | Also moderates for now |
| Later roles | Speaker, vendor, evangelist, moderator | Not designed | Appear in later phases |

Rules: `/docs/permissions.md`, `/docs/auth.md`. A user never chooses their own role.

## 3. Architecture of the whole application

```text
 Web (Next.js)        iPhone + Android (Expo)
        \                    /
         API  /api/v1  (apiRoute: authenticate, validate, authorize, safe errors)
              |
         Service layer  (business rules, ports)
              |
   Data access (Drizzle)  ---  Neon PostgreSQL (+ spatial search)
              |
   Ports and adapters:  identity (Clerk) | maps and geocoding | push | email | storage | errors and uptime | payments (later)
```

Existing foundation that carries this: the layered boundaries and their guards, shared contracts with a compatibility test, the data inventory, security headers, environment protection, the template and its CI proofs. Rules: `/docs/architecture-rules.md`, `/docs/code-quality.md` section 12, `/docs/api.md`, `/docs/database.md`.

**Where each capability lives.** Rules and decisions live in services behind the API; the web app and the mobile app are clients of that API and share contracts and validation (`packages/shared`, `packages/validation`) but not UI code. The existing mock screens (Discover, Church/Ministry dashboard, Admin, Member preferences) are reusable web UI shells; they carry no real data or rules and are re-wired to the API slice by slice (decision Q-005, section 10).

## 4. Capability map for Phase 1

Minimum startup scope (source: "Minimum Startup Features") comes first; "Later Phase 1" items follow.

| Capability | Source tier | Web | Mobile | Server pieces |
| --- | --- | --- | --- | --- |
| Free member accounts, sign-in | Minimum | Clerk pages | Clerk Expo | Identity, profile with age attestation and policy acceptance |
| Interactive location map of events | Minimum | Map view | Map view | Geocoding, spatial search, map tiles |
| Search by distance (10, 25, 50, X, unlimited miles) | Minimum | Filters | Filters | Radius search; the value "X" is UNDECIDED |
| Search by date | Minimum | Date filter | Date filter | Time-zone-aware filtering |
| Search by multiple revival types | Minimum | Chips | Chips | Event-to-type tagging (12 types in the source) |
| Share event links on and off the app | Minimum | Share link | Native share | Public event page with preview, stable URL |
| Invite friends to join | Minimum | Invite | Invite | Invitation link, referral attribution kept minimal (privacy) |
| Push notification "Revival coming near you!" | Minimum | n/a | Push | Saved alert criteria, matching job, push adapter |
| Set notification criteria by location and timeframe | Minimum | Preferences | Preferences | Alert rules per user |
| Church/Ministry account dashboard | Minimum | Dashboard | (web first) | Organization, managers, events |
| Free church profile (name, dates, address, 1 to 3 links) | Minimum | Profile form | n/a | Organization and event records, address with venue name |
| Submit unlimited events, tag revival types | Minimum | Event editor | n/a | Event CRUD, validation, ownership |
| Manage current and recurring events (edit, remove, update, replace) | Minimum | Manage list | n/a | Recurrence series, expiry |
| Upload flyers; add livestream links | Minimum, **UNDECIDED in source ("??")** | Held | Held | Storage adapter only if approved |
| Search by city, state or ZIP | Later Phase 1 | Location search | Location search | Geocoding of typed places |
| Fire emoji to recommend events | Later Phase 1 | Reaction | Reaction | Reaction records (counts, privacy) |
| Reminder notifications for chosen events | Later Phase 1 | n/a | Push | Reminder jobs |
| Comment on events; filter negative comments | Later Phase 1, limit UNDECIDED | Comments | Comments | Moderation, safety gates |
| Save favorite events; "revival journey log" | Later Phase 1 | Saved list | Saved list | Saved-event records (privacy posture) |
| Paid memberships | Later Phase 1, **UNDECIDED/VOTE** | Checkout | Store purchase | Payments rules (`/docs/payments.md`) |
| Expanded church portal (speakers, directions, tagging speakers) | Later Phase 1 | Portal | n/a | Speaker profiles |
| Reviews, testimonies, prayer requests, photos, short videos, mobilization ideas | Community Optional, placement UNDECIDED | Held | Held | User-generated-content safety, moderation, storage |

**Held** means: not scheduled until the owner decides the undecided source item. User-generated content is held until the moderation and safety rules exist (`/docs/risk-and-legal.md`).

**The twelve revival types (source list, searchable and taggable; an event may carry several):** Tent revivals, Church revivals, Baptisms, Worship nights, Prayer gatherings, Healing & Deliverance, Conferences, Youth events, Women's events, Men's events, Family events, Other.

**Phase 1 revenue items from the source (none scheduled; all depend on the payments decisions and `/docs/payments.md`):** user memberships with features above free accounts (pricing UNDECIDED/VOTE); merchandise (T-shirts with "Revive U.S. again Lord, Psalm 85:6" on the back and the logo on the front pocket, hoodies, hats, coffee mugs and stickers with "Revive U.S." and/or the logo); donations. The source's focus for Phase 1 is adoption, not profit (estimated annual revenue $5,000 to $50,000). Selling physical goods or taking donations needs the payments and tax decisions first.

**Community Optional features from the source, each Held (placement in Phase 1 or Phase 2, and paid or free, is UNDECIDED):**

| Individual concepts | Overall mobilization concepts |
| --- | --- |
| 1 to 5 star reviews per event; testimonies per event (300 characters, with a negative-content filter); prayer requests (300 characters, with a filter); prayer responses (praying hands and/or a 300-word reply); revival photos (3 per user per event, unsafe-photo filter); short video reels (30 seconds, unsafe-video filter) | The "Fire-Map" (pin local needs; nearby believers are alerted); spontaneous prayer walks (GPS routes); evangelism teams (form or join "strike teams"); live-stream "Fire Gatherings"; the "Encounters" testimony feed (30 to 60 second videos; keeping them 30 days is UNDECIDED); instant action alerts (5 to 10 mile radius); a digital Gospel track tool (multiple languages); an individual impact journal dashboard; a local action marketplace (volunteer registry of vetted nonprofits) |

All of these are user-generated content, location-based or both, so each needs the moderation, safety and data-tier work in `/docs/secure-coding.md` and `/docs/risk-and-legal.md` before it is scheduled.

## 5. Information architecture

**Web sitemap (Phase 1)**

| Area | Pages | Access |
| --- | --- | --- |
| Public | Home; Discover (map and list with filters); Event details; Church/Ministry profile; Sign in; Sign up; Terms; Privacy; About; Report content | Visitor |
| Member | Account; Notification preferences (alerts by place and time); Saved events; Invite friends | Member |
| Church/Ministry | Dashboard; Profile; Events list; New event; Edit event; Managers; Claim a church | Manager |
| Admin | Overview; Manager requests; Organizations; Events; Reports and moderation; Audit log | Platform admin |

**Mobile navigation (Phase 1).** Tabs: Discover (map and list), Saved, Alerts, Account. Event details open as a screen from Discover or from a shared link (deep link). Church/Ministry management stays on the web in Phase 1; mobile managers can view their events. Sign-in is by Clerk; the app calls the same API with a bearer token.

**Design.** The visual identity is in `/docs/ui.md` section 22 (dark charcoal foundation, luminous gold, controlled warmth, readable and accessible first). Web uses shadcn/ui and the semantic tokens; mobile uses native components with a token module that mirrors the semantic names (decided with the walking skeleton). Accessibility target: WCAG 2.2 AA, with large-text and high-contrast defaults for older users (`/docs/future-readiness.md` section 6).

## 6. Core behaviors and policies (Phase 1)

* **Attendee privacy posture (Proposed, owner decides):** browsing events is anonymous and creates no record; saving an event stores the minimum; location is coarse by default; the privacy promise is one paragraph shown at sign-up. Person-to-church links are sensitive (T3) data (`/docs/secure-coding.md`).
* **Event data quality:** one record per Church/Ministry and per venue; recurring events as a series, not many rows; a duplicate check; automatic expiry of past events; time zones handled once on the server (store the moment in UTC with the event's IANA time zone).
* **Organizer verification:** a Church/Ministry must be claimed and approved before it can publish under its name; two claims on one church go to an admin; a report-and-takedown path exists from day one.
* **Notifications:** digest by default, quiet hours, a cap per organizer per week, one-tap unsubscribe per church, no sensitive content in push payloads.
* **Moderation:** what is held automatically (first post by a new organizer, links, images) is defined before any user-generated content ships.
* **Age and consent:** 18 or older by self-attestation, terms and privacy acceptance recorded with the policy version, before any real data is collected (the collection gate).

## 7. Conceptual data model (Phase 1)

A conceptual list, not a schema. Each feature runs the Database Design Checkpoint (`/docs/product-development.md` section 5) and adds its columns to `/docs/data-inventory.md` with a tier, retention and deletion path.

| Entity | Purpose | Tier | Owner and deletion |
| --- | --- | --- | --- |
| UserProfile | Application data for a Clerk user (age attestation, policy versions accepted, preferences) | T2 | Owned by the user; deleted with the account |
| PolicyAcceptance | Which terms and privacy version was accepted and when | T2 | Retained for the legal period, anonymized on deletion |
| Organization | A Church/Ministry (name, links, description) | T0 | Owned by the organization; handled by admins |
| OrganizationMember | A manager's role in an organization, with request, approval and revocation history | T1 to T2 | Removed with the user's account |
| Venue and Address | Venue name, street, city, state, ZIP, coordinates (whether Venue is its own entity is UNDECIDED) | T0 | With the event or organization |
| Event | Title, description, time (UTC plus time zone), recurrence series, links, status | T0 | Owned by the organization |
| EventRevivalType | The revival types tagged on an event (more than one allowed) | T0 | With the event |
| AlertRule | A member's saved notification criteria (place, radius, timeframe, types) | T3 (derived location) | Owned by the member; coarse by default |
| SavedEvent | A member's saved or favorite event | T3 (person-to-church link) | Owned by the member; minimal |
| PushToken | A device's push address | T2 | Revoked on sign-out and account deletion |
| Invitation | An invite link (no list of who was invited by default) | T2 | Expires |
| Report and ModerationItem | A reported event or profile and the decision | T1 to T2 | Admin-owned; append-only audit |
| AuditLog | Who did what to whom and when for sensitive actions | T1 | Append-only, retained |

Later phases add Comment, Review, PrayerRequest, PrayerSlot, MarketplaceListing, Order and similar; they are designed when their phase is approved.

**Location search (Proposed).** Store coordinates for venues; search by radius with a spatial index on the database (PostGIS or the earthdistance extension, availability on Neon to be verified before the slice starts); geocode typed places (city, state, ZIP) through a geocoding adapter; keep user locations coarse. A bounding-box prefilter keeps queries fast at the expected size.

## 8. API surface (Phase 1, proposed)

Versioned under `/api/v1`, additive-only within a version, every handler built by `apiRoute`, contracts guarded by the compatibility snapshot. Authentication in brackets.

| Group | Operations |
| --- | --- |
| Status | `GET /status` (public), `GET /ready` (public, checks the database; used by monitoring) |
| Profile | `GET /me`, `PATCH /me`, `POST /me/policy-acceptance`, `DELETE /me` (account deletion), `GET /me/export` (member) |
| Organizations | `POST /organizations/claim` (member), `GET /organizations/:id` (public), `PATCH /organizations/:id` (manager), manager requests approved by `POST /admin/manager-requests/:id/decision` (admin) |
| Events | `GET /events` (public; filters: place or coordinates, radius, dates, types, text; cursor pagination), `GET /events/:id` (public), `POST /organizations/:id/events`, `PATCH /events/:id`, `DELETE /events/:id` (manager) |
| Saved and sharing | `PUT/DELETE /me/saved-events/:id` (member); share links are public event URLs |
| Alerts | `GET/POST/PATCH/DELETE /me/alerts` (member); `POST /me/push-tokens`, `DELETE /me/push-tokens/:id` (member) |
| Reports | `POST /reports` (member), `GET/POST /admin/reports...` (admin) |
| Webhooks | `POST /webhooks/clerk` (signature-verified; user deleted or updated) |

Every endpoint's acceptance criteria include the hostile cases (changed ids, extra fields, oversized and malformed bodies) per `/docs/qa-strategy.md`.

## 9. Delivery plan

### Wave 0: before the first feature (foundation)

All of this exists or is on the open list; it is listed so nothing is forgotten. Owner actions are marked.

| Item | State |
| --- | --- |
| Rules reviewed, guards proven, CI proof of the template | Done |
| GitHub security settings (code scanning, secret scanning, alerts, token permission) | **Owner action or permission** |
| Restore drill on Neon | **Owner console** |
| Error tracking and uptime decision (free tier) | **Owner approves vendor** |
| Decisions: Q-005 (which mock code survives), Q-011 (app name and store identity), the open source license | **Owner** |
| Strip the product mocks from the template export (second-app hygiene) | Assistant, small |
| Lift the application-code pause | **Owner** |

### Wave 1: Phase 1 minimum scope, in slices

Each slice is one approved issue with a specification (scope fence, numbered acceptance criteria, controls inventory), tests merged with it, and a Vercel Preview review where it has UI. Sizes: S about a day or two, M several days, L about a week or more of assistant work, plus review waits.

| Slice | Delivers | Depends on | Size | Owner decisions or approvals |
| --- | --- | --- | --- | --- |
| **S0 Walking skeleton** | One small real feature end to end on web and phone: sign in with Clerk on a physical phone (EAS development build), call the shared API, write and read one record in the database, test-id convention in place | Wave 0 | M | Free Expo account; Q-011 only for later store steps |
| **S1 Identity and policy** | Terms, privacy, age attestation, policy acceptance recorded; profile; account deletion and export; the collection gate becomes real | S0, legal documents drafted | M | Terms and privacy text approved (generic now, attorney later) |
| **S2 Organizations and roles** | Claim a Church/Ministry, manager request and admin approval, manager roles, audit log, admin allow-list | S1 | M | Verification policy (section 6) |
| **S3 Events (Church portal)** | Event CRUD with revival types, address and links, recurrence and expiry, duplicate check, validation, ownership, hostile-payload tests; the existing mock screens re-wired | S2 | L | Flyers and livestream links stay held unless decided |
| **S4 Discover (web)** | Map and list, radius, date, type filters, event details, shareable links with previews, spatial search and geocoding adapters | S3 | L | Map and geocoding vendor (cost-free tier first, owner approves) |
| **S5 Discover (mobile)** | The same on iPhone and Android: map, list, filters, details, deep links, native sharing | S4, S0 | L | Q-011 (store identity) before TestFlight |
| **S6 Saved events and invites** | Save, favorites list, invite friends | S4 | S | Attendee privacy posture |
| **S7 Alerts and push** | Alert rules by place and timeframe, matching job, push adapter, notification policy (digest, caps, quiet hours, unsubscribe) | S5, S6 | L | Push vendor decision (Expo push is the natural choice); notification policy |
| **S8 Admin and moderation** | Manager-request queue, reports, takedown, audit views, re-wired from the mock | S2, S3 | M | Moderation policy |
| **S9 Launch gate** | Accessibility scan and screen-reader pass, security headers and script policy, rate limits, monitoring and alerting, backups drilled, incident runbook, cost ceiling, production Clerk and domain, store submission checklist | S1 to S8 | L | Spending approvals (domain, Apple and Google accounts, any paid plan) |

Slices S4 and S5 may overlap once the API contract for events is stable; independent slices may run in parallel only when files do not overlap (`/docs/issues.md`).

### Wave 2: Later Phase 1

Paid memberships (after the payments decisions), reminders, event comments (after moderation), reviews, the expanded portal (speakers), city, state and ZIP search if not already folded into S4, fire-emoji recommendations. Each is its own issue.

### Wave 3 and beyond: later phases (epics only)

| Phase | Epics | Gate |
| --- | --- | --- |
| 2 Prayer Movement | Prayer wall (requests, "prayed", updates, answered prayers), prayer chain (hour slots, live "prayer happening now" dashboard), prayer calendar, revival countdown, premium tiers | Phase 1 live with users; prayer content is T3 data and needs counsel review and a full moderation design |
| 3 Marketplace | Listings and hiring with a service fee, merchandise, digital resources | Payments, tax and marketplace-liability review |
| 4 Streaming | Livestream hosting and "went live" notifications, radio, podcasts | Media delivery vendor and cost approval; rights and moderation |
| 5 Inter-National Network | International map, directories, AI assistant | Worldwide privacy law work, translation, regional compliance |

## 10. Decisions needed from the owner

**Undecided in the source (kept undecided):** flyer uploads and livestream links in the startup portal; the meaning of "Free monthly member/user accounts" beside "Free member/user accounts"; paid membership pricing and trial; church and ministry account pricing and the "first 50 lifetime free" idea; the comment length limit; the "Encounters" testimony retention; the search radius value "X"; whether community optional features land in Phase 1 or 2 and whether placement is paid; the wording of the legacy "Prayed on the ROCK" slogan.

**Open from the review:** Q-005 (which mock code survives), Q-011 (app name and store identity), the open-source license, the Git protection proposals, the GitHub security settings, the restore drill, any spending.

**Decided 2026-10-09 (yes to all five, recorded in `/docs/features/README.md`):** private server-side analytics; no session replay on signed-in screens; error tracking with log redaction before launch; the attendee privacy posture; organizer verification. Draft specifications for slices S0 to S9 are in `/docs/features/`.

**Still proposed, needing a yes or no (policy and product):** the attendee privacy posture (section 6); organizer verification before publishing; the notification policy; whether Venue is its own entity or only an address component; error tracking with log redaction before launch.

**Technical choices the assistant will make and explain:** spatial search approach, recurrence modeling, job scheduling, token module for mobile styling, slice order adjustments.

## 11. For the independent review

Please scrutinize: (1) anything in the source plan that this blueprint drops, reorders or misreads; (2) whether the Phase 1 slices are in a safe order and sized sensibly; (3) data model gaps, especially events, recurrence, time zones, addresses and venues; (4) the API surface (missing operations, wrong authentication levels, missing hostile cases); (5) privacy and safety gaps for religious-affiliation and location data; (6) anything a launch would need that Wave 1 and the launch gate omit; (7) risks of building the mobile and web in parallel; (8) vendor-neutral integration choices; (9) whether any rule documents conflict with this plan.
