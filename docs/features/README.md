# Feature Specifications

Each meaningful product feature has a specification at `docs/features/<feature-slug>.md`. An approved specification defines approved feature behavior; the product plan defines direction only.

Use only the sections that apply; do not add irrelevant sections to satisfy a template.

Suggested sections: feature name; product requirement/source (cite `/docs/product/product-plan.md`); user/customer need; scope; out of scope; user flow; requirements; acceptance criteria; UI behavior; API behavior; business rules; authentication/authorization; data requirements; database implications (Database Design Checkpoint, `/docs/product-development.md`); error/failure behavior; edge cases; accessibility; testing strategy (Test Value Review result); manual exploratory checklist; known limitations; Definition of Done.

Use the terms in `/docs/naming-conventions.md`. Mark unresolved items UNDECIDED.

Every specification also states, so that the work has a clear stop line:

* **Numbered acceptance criteria** (AC1, AC2, ...). Each is a testable statement, and each gets a test whose title carries its number (`/docs/automation/acceptance.md`).
* **Controls inventory**: every button, input, select, link and toggle in the feature, each with the action it performs and the effect to check.
* **Scope fence**: what is in and what is explicitly out. Work beyond the fence is a recommendation in the pull request, not part of the feature.
* **Done checklist**: the acceptance criteria and controls ticked off with the test or manual step that proves each (`/docs/product-development.md` section 9). The feature is done when every item is ticked or listed as not automated with the reason; then work stops.

## Index

All specifications below are **DRAFT, not approved**. They are drafts of the Phase 1 slices in `/docs/product/blueprint.md`, awaiting an independent review and the owner's approval. A draft authorizes no work.

| Slice | Specification |
| --- | --- |
| S0 | `s0-walking-skeleton.md` |
| S1 | `s1-identity-and-policy.md` |
| S2 | `s2-organizations-and-roles.md` |
| S3 | `s3-events-church-portal.md` |
| S4 | `s4-discover-web.md` |
| S5 | `s5-discover-mobile.md` |
| S6 | `s6-saved-events-and-invites.md` |
| S7 | `s7-alerts-and-push.md` |
| S8 | `s8-admin-and-moderation.md` |
| S9 | `s9-launch-gate.md` |

**Owner decisions recorded 2026-10-09 (apply to all specifications):** (1) analytics are private and server-side, counts only, no user identifiers, no phone SDK; (2) no session replay or heatmaps on signed-in screens; (3) error tracking and log redaction before launch, vendor chosen later with the owner's approval; (4) attendee privacy: anonymous browsing, minimal saves, coarse location; (5) organizer verification: a Church/Ministry is claimed and approved before it can publish. Items the source plan marks UNDECIDED stay undecided.
