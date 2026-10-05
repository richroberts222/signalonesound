# Naming Conventions

Authoritative for product-facing, domain, and technical terminology. If a needed term is not resolved here or elsewhere in `/docs`, stop and ask Rich; do not invent terminology.

## 1. Product name

| Use | Value |
| --- | --- |
| Official user-facing name (human-readable) | **Signal One Sound** |
| Slug (where appropriate) | `signal-one-sound` |
| Established repository identifier | `signalonesound` (GitHub repository `richroberts222/signalonesound`) |

User-facing text must not shorten the name to "Signal One", "ROCK", "ROCK SOS", or "SOS" unless an explicitly approved branding use requires an abbreviation. Legacy "ROCK" and "ROCK SOS" in source material mean Signal One Sound.

## 2. Existing technical identifiers (observed in the repository)

Observed state, not a target. The in-repo technical brand is "Signal One" / `signalone`, which predates this document:

* Root package `signalone`; shared packages under the `@signalone/*` scope; workspaces `web`, `mobile`.
* Docs and README use "Signal One"; the mobile Expo `name` is "Signal One". The web header wordmark, home page title, and page metadata now read "Signal One Sound" (Issue #66, via `BrandWordmark`). Other user-facing "Signal One" copy may exist in the apps (for example the dashboard, Clerk copy, and mobile); correcting it to "Signal One Sound" is a separate approved application slice, out of scope for documentation work.
* Tooling ledger schema `signalone_tooling`.
* No Expo bundle/application IDs, database names, or Neon/Clerk/Vercel project names are recorded in the repository.

**These are NOT to be renamed to conform to this document.** Renaming package names, URLs, environment variables, database identifiers, application/bundle IDs, or external-service identifiers requires first evaluating migration and compatibility impact, and an approved issue. Existing UI copy that says "Signal One" is not changed by this document; changing it is a separate approved slice. "Signal One" in internal engineering docs is historical platform shorthand.

## 3. Domain terminology

Meanings are resolved here ONLY where `/docs/product/source-product-plan.md` (via `/docs/product/product-plan.md`) actually supports them. Everything else stays **UNDECIDED**. Do not treat similar terms as interchangeable, and do not infer meanings from placeholder or mock data. Resolving a term here defines vocabulary only; it does not authorize implementation or define a data model.

| Term | Canonical meaning (source-supported) | Status |
| --- | --- | --- |
| Event | A listing submitted by a Church/Ministry with dates/times, an address, and one or more Revival Types; users search, share, and get notified about events. Source: Church Portal ("Submit unlimited events", "Manage current/recurring events"). | RESOLVED (basic meaning only). Recurrence rules, lifecycle, and whether non-revival items are Events are not specified. |
| Revival Type | A category tag on an Event; an Event may carry more than one. The source's search list is: Tent revivals, Church revivals, Baptisms, Worship nights, Prayer gatherings, Healing & Deliverance, Conferences, Youth events, Women's events, Men's events, Family events, Other. | RESOLVED (list as given in the source; whether the list is fixed or extensible is not specified). |
| Church/Ministry | The account holder in the Church Portal: the entity that has a dashboard and profile (field "Church/Ministry Name") and submits Events. The source always pairs the two words. | RESOLVED as the portal account/profile term. |
| Speaker | A person named on an Event ("Speaker(s)", "Include guest speakers"), who may optionally have a Signal One Sound profile that can be tagged. Later Phase 1, not minimum scope. | RESOLVED (basic meaning only). Profile mechanics unspecified. |
| Venue | "Venue Name" is one component of an Event's address (Venue Name, Street, City, State, ZIP). Whether Venue is a separate reusable entity is not stated. | PARTIAL: "Venue Name" as an address component only; Venue as an entity is UNDECIDED. |
| Revival | Used in the source as the general theme ("revival meetings", "revival map", "revival types") but also covers items such as Baptisms and Conferences; no precise definition. | UNDECIDED (relationship to Event unresolved). Do not use "Revival" and "Event" interchangeably in code or UI. |
| Church | Appears only inside "Church/Ministry", "church revivals", and phase 3+ directories. | UNDECIDED as a standalone term (distinction from Ministry unresolved). |
| Ministry | Appears only inside "Church/Ministry" and later-phase concepts. | UNDECIDED as a standalone term. |
| Organizer | Not used in the source. | UNDECIDED |
| Gathering | Appears only in later-phase product names ("Fire Gatherings", "Revival Gatherings") and in the Revival Type "Prayer gatherings". Not defined as a general domain term. | UNDECIDED (relationship to Event and Revival unresolved) |

Rich should not need to re-decide resolved terms. When Rich resolves another term, record its meaning, its relationship to neighboring terms, and (separately) the technical identifier used in code/DB, then remove UNDECIDED.

User-facing legacy slogan wording "Prayed on the ROCK" (Phase 2) is unresolved branding; see `/docs/product/product-plan.md` section K.

## 4. Process

* New terms are added here in the same PR that introduces them, after Rich approves them.
* Terminology changes update affected feature specs and documentation (documentation drift rule, `/docs/product-development.md`).
