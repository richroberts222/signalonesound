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

No feature specifications exist yet.
