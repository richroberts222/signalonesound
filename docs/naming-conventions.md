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
* Docs and README use "Signal One"; the mobile Expo `name` is "Signal One"; the home UI concept (Issue #57) displays "Signal One".
* Tooling ledger schema `signalone_tooling`.
* No Expo bundle/application IDs, database names, or Neon/Clerk/Vercel project names are recorded in the repository.

**These are NOT to be renamed to conform to this document.** Renaming package names, URLs, environment variables, database identifiers, application/bundle IDs, or external-service identifiers requires first evaluating migration and compatibility impact, and an approved issue. Existing UI copy that says "Signal One" is not changed by this document; changing it is a separate approved slice. "Signal One" in internal engineering docs is historical platform shorthand.

## 3. Domain terminology

No canonical domain meanings have been established in the repository. Until Rich defines them, every term below is **UNDECIDED**. Do not treat similar terms as interchangeable, and do not infer meanings from the placeholder mock data in the home UI concept.

| Term | Canonical meaning | Status |
| --- | --- | --- |
| Event | n/a | UNDECIDED |
| Revival | n/a | UNDECIDED |
| Church | n/a | UNDECIDED |
| Ministry | n/a | UNDECIDED |
| Church/Ministry | n/a | UNDECIDED (relationship between Church and Ministry unresolved) |
| Organizer | n/a | UNDECIDED |
| Speaker | n/a | UNDECIDED |
| Revival Type | n/a | UNDECIDED |
| Gathering | n/a | UNDECIDED (relationship to Event and Revival unresolved) |
| Venue | n/a | UNDECIDED |

When Rich resolves a term, record its meaning, its relationship to neighboring terms, and (separately) the technical identifier used in code/DB, then remove UNDECIDED.

## 4. Process

* New terms are added here in the same PR that introduces them, after Rich approves them.
* Terminology changes update affected feature specs and documentation (documentation drift rule, `/docs/product-development.md`).
